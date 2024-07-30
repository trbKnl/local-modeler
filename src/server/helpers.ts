import { promises as fs } from 'fs';

export function getRandomInt(min: number, max: number): number {
  /**
   * Generates a random integer between min (inclusive) and max (inclusive).
   * @param min - The minimum integer value.
   * @param max - The maximum integer value.
   * @returns A random integer between min and max.
   */
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function writeObjectToJsonFile(path: string, obj: any): Promise<void> {
    try {
        const data = JSON.stringify(obj, null, 2);
        await fs.writeFile(path, data, 'utf8');
    } catch (error) {
        console.error(`Error writing to file ${path}:`, error);
    }
}
