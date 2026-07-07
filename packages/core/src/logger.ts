interface LogEntry {
  time: Date;
  category: string;
  message: string;
}

const MAX_ENTRIES = 2000;
const entries: LogEntry[] = [];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTs(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function log(category: string, message: string): void {
  if (entries.length >= MAX_ENTRIES) entries.shift();
  entries.push({ time: new Date(), category, message });
}

export function getLogText(): string {
  return entries
    .map((e) => `[${formatTs(e.time)}] [${e.category}]：${e.message}`)
    .join('\n');
}
