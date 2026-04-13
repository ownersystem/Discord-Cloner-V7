import * as fs from "fs";
import * as path from "path";

export interface LogEntry {
  date: string;
  sourceGuild: { id: string; name: string };
  targetGuild: { id: string; name: string };
  result: {
    rolesCloned: number;
    channelsCloned: number;
    permissionsApplied: number;
    emojisCloned: number;
    stickersCloned: number;
    errors: string[];
    duration: number;
  };
}

function sanitizeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

export function saveLog(entry: LogEntry): void {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const now = new Date();
    const dateStr = now
      .toISOString()
      .replace(/:/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    const safeName = sanitizeName(entry.sourceGuild.name) || "server";
    const filename = `${safeName}_${dateStr}.json`;
    const filepath = path.join(logsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(entry, null, 2), "utf-8");
  } catch {
  }
}
