import http from "http"
import express, { Request, Response } from "express";
import ViteExpress from "vite-express";

import { v4 as uuidv4 } from "uuid"
import { Redis } from 'ioredis'
import { MutexManager } from "./mutexManager"
import { ObjectStore } from "./objectStore"
import type { Run, ClientRun, ParticipantRunTracker } from "./types"
import { RunSchema, ClientRunSchema, ParticipantRunTrackerSchema } from "./types"

const redisClient = new Redis()
const mutexManager = new MutexManager()
const store = new ObjectStore(redisClient);

const app = express();

app.use(express.json());

// INITIALIZE PARAMETER RUNS

var runs: Run[] = [
  {
    id: "asd1",
    initialParameters: { values: [1, 2, 3], length: 3},
    currentParameters: { values: [1, 2, 3], length: 3},
    updatedBy: ["UserA", "UserB"],
    checkValue: "1"
  },
  {
    id: "asd2",
    initialParameters: { values: [1, 2, 3], length: 3},
    currentParameters: { values: [1, 2, 3], length: 3},
    updatedBy: ["UserA", "UserB"],
    checkValue: "2"
  },
  {
    id: "asd3",
    initialParameters: { values: [1, 2, 3], length: 3},
    currentParameters: { values: [1, 2, 3], length: 3},
    updatedBy: ["UserA", "UserB"],
    checkValue: "3"
  },
  {
    id: "asd4",
    initialParameters: { values: [1, 2, 3], length: 3},
    currentParameters: { values: [1, 2, 3], length: 3},
    updatedBy: ["UserA", "UserB"],
    checkValue: "4"
  },
  {
    id: "asd5",
    initialParameters: { values: [1, 2, 3], length: 3},
    currentParameters: { values: [1, 2, 3], length: 3},
    updatedBy: ["UserA", "UserB"],
    checkValue: "5"
  },
];

var allParameterRunIds = runs.map(item => item["id"])

for (const run of runs) {
  console.log(run)
  await store.save(`run:${run.id}`, run)
}


// HELPERS

async function getParticipantRunTracker(participantId: string): Promise<ParticipantRunTracker> {
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


// GET API

async function getApiTest(participantId: string): Promise<ClientRun | undefined> {
  const tracker = await getParticipantRunTracker(participantId)
  const uncompletedRunIds = allParameterRunIds.filter(id => !tracker.hasUpdatedRunIds.includes(id))

  for (const runId of uncompletedRunIds) {
    const isRunLocked = await mutexManager.isLocked(runId)
    if (!isRunLocked) {

      // lock mutex 
      await mutexManager.lock(runId)

      // update checkValue
      const run = await store.loadValidation<Run>(`run:${runId}`, RunSchema)
      if (run === undefined) { return }
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


// POST API

async function postApiTest(participantId: string, clientRunResults: ClientRun): Promise<void> {
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


// GET

app.get('/api', async (req: Request, res: Response) => {
    const participantId = req.query.participantId

    if (typeof participantId !== 'string') {
      return res.status(400).send('participantId must be a string');
    }

    const data = await getApiTest(participantId)
    if (data === undefined) {
      return res.status(400).send('Error happend or the participant is done');
    }

    console.log(`[Get Api] sending data: ${JSON.stringify(data)} to ${participantId}`)
    return res.status(200).json(data)
});

// POST 

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

    await postApiTest(participantId, result.data)
    return res.status(200).send("Success")
});


// Start server

const port = 3000
const server = http.createServer(app)

ViteExpress.bind(app, server, async () => {
  // Vite tries forces a page reload before the server is ready
  // This prevents the server from being reached alltogether unless its ready
  server.listen(port, () => {
    console.log("Server is ready")
  })
});

