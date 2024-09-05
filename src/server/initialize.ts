import { z } from 'zod'
import fs from 'fs/promises';
import { ObjectStore } from "./objectStore"
import type { Run } from "./types"
import { fileURLToPath } from 'url';
import path from 'path';
import { getRandomInt } from './helpers.ts';
import { v4 as uuidv4 } from "uuid"

// CONFIG FILE DIR

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONFIGPATH = path.join(__dirname, 'config', 'config.json')


// STUDY CONFIG TYPE

const ConfigSchema = z.object({
  study: z.object({
    nruns: z.number().int().positive(),
  })
})

type Config = z.infer<typeof ConfigSchema>

async function readConfig(filePath: string): Promise<Config> {
  try {

    const fileContents = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContents);
    const result = ConfigSchema.safeParse(jsonData);
    
    if (result.success) {
      return result.data;
    } else {
      console.error('Config validation failed:', result.error.errors);
      throw new Error('Invalid configuration');
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Invalid JSON in config file:', error.message);
    } else if (error instanceof Error) {
      console.error('Error reading or parsing config file:', error.message);
    } else {
      console.error('Unknown error occurred')
    }
    throw error;
  }
}

const config = await readConfig(CONFIGPATH);


// LOG SETTINGS

console.log("Study is started with these parameter settings")
console.log(config)


// INITIALIZE RUNS

function generateRun(): Run {
  const id = uuidv4()
  const checkValue = uuidv4()
  const run: Run = {
    id: id,
    model: "not initialized",
    updatedBy: [],
    checkValue: checkValue
  }

  return run
}

const runs: Run[] = []

for (let i = 0; i < config.study.nruns; i++) {
    runs.push(generateRun())
}

export function getAllParameterRunIds(): string[] {
 return runs.map(item => item["id"]);
}

export async function initializeRuns(store: ObjectStore): Promise<void> {
  for (const run of runs) {
    await store.save(`run:${run.id}`, run);
  }
  console.log("[initialize] initialize runs")
}
