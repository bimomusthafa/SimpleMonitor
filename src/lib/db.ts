import fs from "fs/promises";
import path from "path";

const dbPath = path.join(process.cwd(), "data.json");

export async function getDb() {
  try {
    const data = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Return empty state if file doesn't exist
    return { patients: [], devices: [] };
  }
}

export async function saveDb(data: any) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8");
}
