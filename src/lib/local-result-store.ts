import path from "node:path";
import type { ResultDatabase } from "./result-store";

const EMPTY_DATABASE: ResultDatabase = { results: [], events: [] };
let localWriteQueue = Promise.resolve();

function localDatabasePath(directory: string) {
  const workspaceRoot = process.cwd();
  const targetDirectory = path.resolve(/* turbopackIgnore: true */ workspaceRoot, directory);
  if (targetDirectory !== workspaceRoot && !targetDirectory.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error("Local results directory must remain inside the project directory");
  }
  return path.join(targetDirectory, "results.json");
}

export async function readLocalDatabase(directory: string): Promise<ResultDatabase> {
  const { readFile } = await import("node:fs/promises");
  try {
    const parsed = JSON.parse(await readFile(localDatabasePath(directory), "utf8")) as Partial<ResultDatabase>;
    return {
      results: Array.isArray(parsed.results) ? parsed.results : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY_DATABASE);
    throw error;
  }
}

export async function updateLocalDatabase(directory: string, update: (database: ResultDatabase) => void) {
  const operation = localWriteQueue.then(async () => {
    const database = await readLocalDatabase(directory);
    update(database);
    const target = localDatabasePath(directory);
    const { mkdir, rename, writeFile } = await import("node:fs/promises");
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    const temporary = `${target}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(database, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, target);
  });
  localWriteQueue = operation.catch(() => undefined);
  await operation;
}
