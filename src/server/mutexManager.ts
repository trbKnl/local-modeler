import { Mutex } from 'async-mutex';

const TIMEOUT = 5 * 60 * 1000
//const TIMEOUT = 3000

export class MutexManager {
    private mutexes: Map<string, Mutex>;

    constructor() {
        this.mutexes = new Map<string, Mutex>();
    }

    async get(key: string): Promise<Mutex> {
        let mutex = this.mutexes.get(key);

        if (!mutex) {
            mutex = new Mutex();
            this.mutexes.set(key, mutex);
        }

        return mutex;
    }

  async isLocked(key: string): Promise<boolean> {
    const mutex = await this.get(key)
    return mutex.isLocked()
  }

  async lock(key: string): Promise<void> {
    const mutex = await this.get(key)
    if (!mutex.isLocked()) {
      await mutex.acquire()

      // performs clean-up
      // whichever resolves first, so it doenst get released twice
      const cancelToken = { cancelled: false }
      Promise.race([releaseTimer(mutex, cancelToken), waitForUnlock(mutex, cancelToken)])
    }
  }

  async release(key: string): Promise<void> {
    const mutex = await this.get(key)
    mutex.release()
  }
}


async function releaseTimer(mutex: Mutex, cancelToken: { cancelled: boolean }): Promise<void> {
  await sleep(TIMEOUT)
  if (!cancelToken.cancelled) {
    cancelToken.cancelled = true;
    mutex.release()
  }
}

async function waitForUnlock(mutex: Mutex, cancelToken: { cancelled: boolean }): Promise<void> {
  await mutex.waitForUnlock()
  if (!cancelToken.cancelled) {
    cancelToken.cancelled = true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

