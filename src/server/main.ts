import http from "http"
import express, { Request, Response } from "express";
import ViteExpress from "vite-express";

import { v4 as uuidv4 } from "uuid"
import { Redis } from 'ioredis'
import { MutexManager } from "./mutexManager"
import { ObjectStore } from "./objectStore"
import type { Run, ClientRun, ParticipantRunTracker } from "./types"
import { RunSchema, ClientRunSchema, ParticipantRunTrackerSchema } from "./types"
import * as initialize from "./initialize"

// INITIALIZE

const mutexManager = new MutexManager()
const redisClient = new Redis()
const store = new ObjectStore(redisClient);
await store.clear() 

const app = express();
app.use(express.json());

const allParameterRunIds = initialize.getAllParameterRunIds()
await initialize.initializeRuns(store)


// HELPERS

async function getParticipantRunTracker(participantId: string): Promise<ParticipantRunTracker> {
  /**
 * Retrieves the run tracker for a given participant. If the tracker does not exist, a new one is created and saved.
 *
 * @async
 * @function getParticipantRunTracker
 * @param {string} participantId - The unique identifier of the participant.
 * @returns {Promise<ParticipantRunTracker>} A promise that resolves to the participant's run tracker.
 *
 * @throws {Error} If there is an error loading or saving the tracker.
 *
 */
  const tracker = await store.loadValidation<ParticipantRunTracker>(`participantid:${participantId}`, ParticipantRunTrackerSchema)
  if (tracker === undefined) {
    const newTracker: ParticipantRunTracker = {
      participantId: participantId,
      hasUpdatedRunIds: [],
      completed: false,
    }
    await store.save(`participantid:${participantId}`, newTracker)
    return newTracker
  } else {
    return tracker
  }
}

// GET

async function getClientRun(participantId: string): Promise<ClientRun | undefined> {
  const tracker = await getParticipantRunTracker(participantId)
  const uncompletedRunIds = allParameterRunIds.filter(id => !tracker.hasUpdatedRunIds.includes(id))

  for (const runId of uncompletedRunIds) {
    const isRunLocked = await mutexManager.isLocked(runId)
    if (!isRunLocked) {

      // lock mutex 
      await mutexManager.lock(runId)

      // update checkValue
      const run = await store.loadValidation<Run>(`run:${runId}`, RunSchema)
      if (run === undefined) { break }
      run.checkValue = uuidv4()
      await store.save(`run:${runId}`, run)

      console.log(`[Get Api] sending ${runId} to ${participantId}`)
      return { 
        id: runId, 
        checkValue: run.checkValue, 
        parameters: run.currentParameters 
      }
    }
  }
  console.log(`[Get Api] no eligible runs found for ${participantId}`)
}

app.get('/api', async (req: Request, res: Response) => {
    const participantId = req.query.participantId

    if (typeof participantId !== 'string') {
      return res.status(400).send('participantId must be a string');
    }

    const data = await getClientRun(participantId)
    if (data === undefined) {
      return res.status(400).send('Error happend or the participant is done');
    }

    console.log(`[Get Api] sending data: ${JSON.stringify(data)} to ${participantId}`)
    return res.status(200).json(data)
});


// POST 

async function postClientRun(participantId: string, clientRunResults: ClientRun): Promise<void> {
  const runId = clientRunResults.id
  const tracker = await getParticipantRunTracker(participantId)
  const run = await store.loadValidation<Run>(`run:${runId}`, RunSchema)
  if (run === undefined) { return }

  // if update succesfull update trackers and runs on the server and release the lock
  if (
    run.checkValue === clientRunResults.checkValue &&
    run.currentParameters.length === clientRunResults.parameters.length &&
    !run.updatedBy.includes(participantId)
  ) {
    run.currentParameters = clientRunResults.parameters
    run.updatedBy.push(participantId)
    tracker.hasUpdatedRunIds.push(runId)
    await store.save(`run:${runId}`, run)
    await store.save(`participantid:${participantId}`, tracker)
    await mutexManager.release(runId)

    console.log(`[Post Api] update successfull ${runId} from ${participantId}`)
  } else {
    console.log(`[Post Api] update rejected ${runId} from ${participantId}`)
  }
}


app.post('/api', async (req: Request, res: Response) => {
    const participantId = req.query.participantId
    const data = req.body;

    console.log(`[Post Api] received ${JSON.stringify(data)} from ${participantId}`)

    // input validation
    if (typeof participantId !== 'string') {
      return res.status(400).send('participantId must be a string');
    }

    const result = ClientRunSchema.safeParse(data)
    if (!result.success) {
      return res.status(400).send(`Data not in the correct format: ${result.error}`)
    }

    await postClientRun(participantId, result.data)
    return res.status(200).send("Success")
});


// START SERVER

const port = 3000
const server = http.createServer(app)

ViteExpress.bind(app, server, async () => {
  // Vite tries forces a page reload before the server is ready
  // This prevents the server from being reached alltogether unless its ready
  server.listen(port, () => {
    console.log("Server is ready")
  })
});

