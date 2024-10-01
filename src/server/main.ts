import http from "http"
import express, { Request, Response } from "express";
import ViteExpress from "vite-express";
import { Redis } from 'ioredis'

import { MutexManager } from "./mutexManager"
import { ObjectStore } from "./objectStore"
import { ClientRunSchema } from "./types"
import * as initialize from "./initialize"
import { 
  getOrCreateParticipantTracker,
  getClientRun,
  postClientRun,
  validateQuery,
} from "./helpers"


// INITIALIZE STUDY

const mutexManager = new MutexManager()
const redisClient = new Redis()
const store = new ObjectStore(redisClient);
await store.clear() 

const app = express();
app.use(express.json());

const allParameterRunIds = initialize.getAllParameterRunIds()
await initialize.initializeRuns(store)


// API


app.get('/api', validateQuery, async (req: Request, res: Response) => {
  const { participantId, studyId } = req.query

  const tracker = await getOrCreateParticipantTracker(store, studyId, participantId)
  const uncompletedRunIds = allParameterRunIds.filter(id => !tracker.hasUpdatedRunIds.includes(id))

  if (uncompletedRunIds.length === 0) {
    return res.status(400).send('Participant is done, no runs left to process')
  }

  const data = await getClientRun(mutexManager, store, uncompletedRunIds)
  if (data === undefined) {
    return res.status(400).send('No runs are available');
  } else {
    console.log(`[Get Api] sending data: ${JSON.stringify(data)} to ${participantId}`)
    return res.status(200).json(data)
  }
});


app.post('/api', validateQuery, async (req: Request, res: Response) => {

  const { participantId, studyId } = req.query
  const data = req.body;

  console.log(`[Post Api] received ${JSON.stringify(data)} from ${participantId}`)

  const result = ClientRunSchema.safeParse(data)
  if (!result.success) {
    return res.status(400).send(`Data not in the correct format: ${result.error}`)
  }

  await postClientRun(mutexManager, store, studyId, participantId, result.data)
  return res.status(200).send("Success")
});


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

