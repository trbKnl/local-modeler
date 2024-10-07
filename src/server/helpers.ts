import { z } from 'zod'
import { 
  Request,
  Response,
  NextFunction,
} from "express"
import { 
  QueryParameterSchema,
} from "./types.ts"


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
