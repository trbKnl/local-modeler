import http from "http"
import express, { Request, Response } from "express";
import ViteExpress from "vite-express";

import { MutexManager } from "./mutexManager"
import { validateQuery } from "./helpers"
import * as database from "./database"
import type { QueryParameters } from "./types"
import { sleep } from "./helpers"



// INITIALIZE STUDY

const mutexManager = new MutexManager()

const app = express();
app.use(express.json());


await database.initialize()


app.get('/api', validateQuery, async (req: Request, res: Response) => {
  const params: QueryParameters  = req.query as any
  const { participantId, studyId } = params

  await database.upsertParticipant(participantId)
  const uncompletedRunIds = await database.getUncompletedRuns(studyId, participantId)

  let clientRun
  const maxAttempts = 3
  attempts: for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const runId of uncompletedRunIds) {
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
          model: model
        }
        break attempts
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



//app.post('/api', validateQuery, async (req: Request, res: Response) => {
//  const params: QueryParameters  = req.query as any
//  const { participantId, studyId } = params
//  const { runId, checkValue, model} = req.body
//  // TODO: add validation
//  // return res.status(400).send(`Data not in the correct format: ${result.error}`)
//  console.log(`[Post Api] received ${JSON.stringify(req.body)} from ${participantId}`)
//  const oldCheckValue = await database.getRunCheckValue(runId)
//  const oldCheckValue = await database.isRunUpdatedByParticipant(runId, participantId)
//
//
//  // update database
//  // await postClientRun(mutexManager, store, studyId, participantId, result.data)
//  return res.status(200).send("Success")
//});



//export async function postClientRun(
//  mutexManager: MutexManager,
//  store: ObjectStore,
//  studyId: string, 
//  participantId: string, 
//  clientRunResults: ClientRun
//): Promise<void> {
//  const runId = clientRunResults.id
//  const tracker = await loadParticipantTracker(store, studyId, participantId)
//  const run = await loadRun(store, runId)
//
//  // if update succesfull update trackers and runs on the server and release the lock
//  if (
//    run.checkValue === clientRunResults.checkValue &&
//    !run.updatedBy.includes(participantId)
//  ) {
//    run.model = clientRunResults.model
//    run.updatedBy.push(participantId)
//    tracker.hasUpdatedRunIds.push(runId)
//
//    await saveRun(store, runId, run)
//    await saveParticipantTracker(store, studyId, participantId, tracker)
//    await mutexManager.release(runId)
//
//    console.log(`[Post Api] update successfull ${runId} from ${participantId}`)
//    await writeObjectToJsonFile(`${PROJECTROOT}/study-results/${studyId}-${runId}.json`, run)
//  } else {
//    console.log(`[Post Api] update rejected, studyId ${studyId}: runId: ${runId}, participantId: ${participantId}`)
//  }
//}




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

