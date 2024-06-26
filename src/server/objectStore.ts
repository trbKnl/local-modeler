import { encode, decode } from "@msgpack/msgpack"
import { Redis } from 'ioredis' 
import { ZodError } from "zod"

const TTL = 1000000

type Schema<T> = {
  safeParse: (data: unknown) => { success: true; data: T; } | { success: false; error: ZodError; };
};


export class ObjectStore {
  private redisClient: Redis

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  async load(key: string): Promise<any | undefined> {
    const dataBuf = await this.redisClient.hgetBuffer(`store:${key}`, "object");
    if (dataBuf !== null) {
      const data = decode(dataBuf)
      return data
    } else {
      return undefined
    }
  }

  async save(key: string, object: any) {
    const encodedData = Buffer.from(encode(object));
    await this.redisClient.multi().hset(
      `store:${key}`,
      "object",
      encodedData,
    )
    //.expire(`store:${key}`, TTL) no expiration
    .exec();
  }

  async loadValidation<T>(key: string, schema: Schema<T>): Promise<T | undefined> {
      const data = await this.load(key);
      if (data === undefined) { return undefined }
      const result = schema.safeParse(data);
      if (result.success) {
          return result.data;
      } else {
          throw new Error("Data validation failed");
      }
    }

  async saveValidation<T>(key: string, object: any, schema: Schema<T>) {
      const result = schema.safeParse(object);
      if (result.success) {
        await this.save(key, object)
      } else {
          throw new Error("Data validation failed");
      }
    }
}

