import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod'
import { 
  Request,
  Response,
  NextFunction,
} from "express"
import { 
  QueryParameterSchema,
  ConfigSchema,
  Config,
} from "./types.ts"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const PROJECTROOT = path.join(__dirname, '../..')
const CONFIGPATH = path.join(__dirname, 'config', 'config.json')


export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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


export async function readConfig(): Promise<Config> {
  try {
    const fileContents = await fs.readFile(CONFIGPATH, 'utf-8');
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
