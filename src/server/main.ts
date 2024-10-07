import http from "http"
import express, { Request, Response } from "express";
import ViteExpress from "vite-express";

import { MutexManager } from "./mutexManager"
import { validateQuery } from "./helpers"
import * as database from "./database"
import { sleep } from "./helpers"
import { 
  QueryParameters,
  ClientRun, 
  ClientRunSchema,
} from "./types"


// INITIALIZE STUDY

const mutexManager = new MutexManager()
await database.initialize()

const app = express();
app.use(express.json());


app.get('/api', validateQuery, async (req: Request, res: Response) => {
  const params: QueryParameters  = req.query as any
  const { participantId, studyId } = params

  await database.upsertParticipant(participantId)
  const uncompletedRunIds = await database.getUncompletedRuns(studyId, participantId)

  let clientRun: ClientRun | undefined = undefined
  const maxAttempts = 3
  tryRuns: for (const runId of uncompletedRunIds) {
     for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const isRunLocked = await mutexManager.isLocked(runId)
      if (!isRunLocked) {

        // 1. lock run 
        // 2. update checkValue
        // 3. create model for client
        await mutexManager.lock(runId)
        const newCheckValue = await database.updateRunCheckValue(runId)
        const model = await database.getRunModel(runId)

        clientRun = { 
          id: runId,
          checkValue: newCheckValue,
          model: model,
        }
        break tryRuns
      }
    }
    await sleep(1000)
  }

  if (clientRun === undefined) {
    return res.status(400).send('No runs are available');
  } else {
    console.log(`[Get Api] sending data: ${JSON.stringify(clientRun)} to ${participantId}`)
    return res.status(200).json(clientRun)
  }
});



app.post('/api', validateQuery, async (req: Request, res: Response) => {
  const params: QueryParameters  = req.query as any
  const { participantId } = params

  // validate input
  const result = ClientRunSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).send(`Request body not in the correct format: ${result.error}`)
  }
  const { id, checkValue, model } = result.data

  const checkValuesMatch = (await database.getRunCheckValue(id)) === checkValue
  const isNotAlreadyUpdated = !(await database.isRunUpdatedByParticipant(id, participantId))
  if (
    checkValuesMatch &&
    isNotAlreadyUpdated
  ) {
    await database.updateRunModel(id, model)
    await database.createUpdate(id, participantId) // add entry in update table
    await mutexManager.release(id)
    console.log(`[Post Api] Success, participant: ${participantId} updatet run: ${id}`)

    return res.status(200).send("Success")
  } else {
    return res.status(200).send("Not updated")
  }
})


// START SERVER

const port = 3000
const server = http.createServer(app)

ViteExpress.bind(app, server, async () => {
  // Vite tries forces a page reload before the server is ready
  // This prevents the server from being reached alltogether unless its ready
  server.listen(port, () => {
    console.log(`Server is ready at port ${port}`)
  })
});
