import { ObjectStore } from "./objectStore"
import type { Run } from "./types"

// INITIALIZE PARAMETER RUNS

const runs: Run[] = [
  {
    id: "asd1",
    initialParameters: { values: [-1231, 2], length: 2},
    currentParameters: { values: [1, 9238], length: 2},
    updatedBy: ["UserA", "UserB"],
    checkValue: "1"
  },
  {
    id: "asd2",
    initialParameters: { values: [1, 747], length: 2},
    currentParameters: { values: [1, 2], length: 2},
    updatedBy: ["UserA", "UserB"],
    checkValue: "2"
  },
  {
    id: "asd3",
    initialParameters: { values: [1, 2], length: 2},
    currentParameters: { values: [1, 2], length: 2},
    updatedBy: ["UserA", "UserB"],
    checkValue: "3"
  },
  {
    id: "asd4",
    initialParameters: { values: [1, 2], length: 2},
    currentParameters: { values: [1, 2], length: 2},
    updatedBy: ["UserA", "UserB"],
    checkValue: "4"
  },
  {
    id: "asd5",
    initialParameters: { values: [1, 2], length: 2},
    currentParameters: { values: [1, 2], length: 2},
    updatedBy: ["UserA", "UserB"],
    checkValue: "5"
  },
];

export function getAllParameterRunIds(): string[] {
 return runs.map(item => item["id"]);
}

export async function initializeRuns(store: ObjectStore): Promise<void> {
  for (const run of runs) {
    await store.save(`run:${run.id}`, run);
  }
  console.log("[initialize] initialize runs")
}
