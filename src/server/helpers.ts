import { promises as fs } from "fs"
import { v4 as uuidv4 } from "uuid"
import { z } from 'zod'
import { 
  Request,
  Response,
  NextFunction,
} from "express"

import { ObjectStore } from './objectStore' 
import { MutexManager } from './mutexManager' 
import { 
  ParticipantTrackerSchema,
  QueryParameterSchema,
  RunSchema,
} from "./types"
import type { 
  ParticipantTracker,
  ClientRun, 
  Run,
} from "./types"
import { PROJECTROOT } from "./initialize"


export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function writeObjectToJsonFile(path: string, obj: any): Promise<void> {
    try {
        const data = JSON.stringify(obj, null, 2);
        await fs.writeFile(path, data, 'utf8');
    } catch (error) {
        console.error(`Error writing to file ${path}:`, error);
    }
}


export async function getOrCreateParticipantTracker(
  store: ObjectStore,
  studyId: string,
  participantId: string): 
Promise<ParticipantTracker> {
  let tracker: ParticipantTracker
  try {
    tracker = await loadParticipantTracker(store, studyId, participantId)
  } catch {
    tracker = {
      participantId: participantId,
      studyId: studyId,
      hasUpdatedRunIds: [],
    }
    await saveParticipantTracker(store, studyId, participantId, tracker)
  }
  return tracker
}


export async function getClientRun(
  mutexManager: MutexManager,
  store: ObjectStore,
  uncompletedRunIds: string[],
  maxAttempts = 3
): Promise<ClientRun | undefined> {
  // Sends model to the client for training
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const runId of uncompletedRunIds) {
      const isRunLocked = await mutexManager.isLocked(runId)
      if (!isRunLocked) {

        // lock mutex 
        await mutexManager.lock(runId)

        // update checkValue
        const run = await loadRun(store, runId)
        run.checkValue = uuidv4()
        await saveRun(store, runId, run)

        const clientRun: ClientRun = { 
          id: runId, 
          checkValue: run.checkValue, 
          model: run.model,
        }

        return clientRun
      }
    }
    await sleep(1000)
  }
}


export async function postClientRun(
  mutexManager: MutexManager,
  store: ObjectStore,
  studyId: string, 
  participantId: string, 
  clientRunResults: ClientRun
): Promise<void> {
  const runId = clientRunResults.id
  const tracker = await loadParticipantTracker(store, studyId, participantId)
  const run = await loadRun(store, runId)

  // if update succesfull update trackers and runs on the server and release the lock
  if (
    run.checkValue === clientRunResults.checkValue &&
    !run.updatedBy.includes(participantId)
  ) {
    run.model = clientRunResults.model
    run.updatedBy.push(participantId)
    tracker.hasUpdatedRunIds.push(runId)

    await saveRun(store, runId, run)
    await saveParticipantTracker(store, studyId, participantId, tracker)
    await mutexManager.release(runId)

    console.log(`[Post Api] update successfull ${runId} from ${participantId}`)
    await writeObjectToJsonFile(`${PROJECTROOT}/study-results/${studyId}-${runId}.json`, run)
  } else {
    console.log(`[Post Api] update rejected, studyId ${studyId}: runId: ${runId}, participantId: ${participantId}`)
  }
}


async function saveRun(store: ObjectStore, runId: string, run: Run): Promise<void> {
    await store.save(`run:${runId}`, run)
}


async function loadRun(store: ObjectStore, runId: string): Promise<Run> {
    const run = await store.loadValidation<Run>(`run:${runId}`, RunSchema)
    if (run === undefined) { 
      throw new Error('The run you are trying to load does not exist');
    }
    return run
}

async function saveParticipantTracker(
  store: ObjectStore,
  studyId: string,
  participantId: string,
  participantTracker: ParticipantTracker
): Promise<void> {
    const objectId = `participant:${studyId}:${participantId}`
    await store.save(objectId, participantTracker)
}


async function loadParticipantTracker(
  store: ObjectStore,
  studyId: string,
  participantId: string,
): Promise<ParticipantTracker> {
    const objectId = `participant:${studyId}:${participantId}`
    const tracker = await store.loadValidation<ParticipantTracker>(objectId, ParticipantTrackerSchema)
    if (tracker === undefined) { 
      throw new Error('Participant tracker does not exists');
    }
    return tracker
}

export function validateQuery(req: Request, res: Response, next: NextFunction) {
  try {
    QueryParameterSchema.parse(req.query);
    next() 
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).send('participantId and/or studyId must be valid');
    }
    next(err);
  }
}
