import { prisma } from "../../prisma/client"
import { v4 as uuidv4 } from "uuid"

const STUDYID = "test" 

async function createStudyData() {
  await prisma.study.create({
    data: {
      id: STUDYID,
    },
  })

  // Create runs for the study
  await Promise.all(
    Array.from({ length: 3 }, (_, i) =>
      prisma.run.create({
        data : {
          studyId: STUDYID,
          model: "not initialized",
          checkValue: uuidv4(),
        }
      })
    )
  )
}


export async function initialize() {
  const studyExists = await prisma.study.findUnique({
    where: {
      id: STUDYID,
    },
  });

  if (!studyExists) {
    await createStudyData()
  }
}


export async function getUncompletedRuns(
  studyId: string, 
  participantId: string): 
Promise<string[]> {
 const pendingRunIds = await prisma.run.findMany({
    where: {
      studyId: studyId,
      NOT: {
        updates: {
          some: {
            participantId: participantId
          }
        }
      }
    },
    select: {
      id: true
    }
  })
  const runIds = pendingRunIds.map(run => run.id)
  return runIds
}


export async function upsertParticipant(participantId: string) {
  const participant = await prisma.participant.upsert({
    where: {
      id: participantId,
    },
    update: {},
    create: {
      id: participantId
    }
  })
  return participant
}


export async function isRunUpdatedByParticipant(
  runId: string,
  participantId: string
): Promise<boolean> {
    const updateRecord = await prisma.update.findUnique({
      where: {
        participantId_runId: {
          participantId: participantId,
          runId: runId,
        }
      },
    });
  return updateRecord !== null
}


export async function createUpdate(runId: string, participantId: string) {
  await prisma.update.create({
    data : {
      runId: runId,
      participantId: participantId,
    }
  })
}

export async function updateRunModel(runId: string, model: string) {
  await prisma.run.update({
    where: { 
      id: runId 
    },
    data: {
      model: model, 
    },
  })
}


export async function getRunModel(runId: string): Promise<string> {
  const run = await prisma.run.findUnique({
    where: {
      id: runId,
    },
    select: {
      model: true,
    },
  });
  if (!run) {
    throw new Error(`Run with ID ${runId} not found.`); 
  }
  return run.model
}



export async function updateRunCheckValue(runId: string): Promise<string> {
  const newCheckValue = uuidv4()
  await prisma.run.update({
    where: { 
      id: runId 
    },
    data: {
      checkValue: newCheckValue
    },
  })
  return newCheckValue
}


export async function getRunCheckValue(runId: string): Promise<string> {
  const run = await prisma.run.findUnique({
    where: {
      id: runId,
    },
    select: {
      checkValue: true,
    },
  });
  if (!run) {
    throw new Error(`Run with ID ${runId} not found.`); 
  }
  return run.checkValue
}
