import * as readline from "readline";
import chalk from "chalk";

const BLUE = chalk.hex("#5865F2");
const CYAN = chalk.hex("#00D4FF");
const GRAY = chalk.hex("#99AAB5");
const WHITE = chalk.white;

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();
    const formatted = `   ${BLUE("›")} ${WHITE(question)} ${GRAY("›")} `;
    rl.question(formatted, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const formatted = `   ${BLUE("›")} ${WHITE(question)} ${GRAY("›")} `;
    process.stdout.write(formatted);

    let input = "";
    const stdin = process.stdin as NodeJS.ReadStream;
    let rawModeActive = false;

    const cleanup = (onData: (c: string) => void): void => {
      stdin.removeListener("data", onData);
      if (rawModeActive) {
        try { stdin.setRawMode(false); } catch {}
      }
      stdin.pause();
    };

    const hasRawMode =
      "setRawMode" in stdin &&
      typeof stdin.setRawMode === "function" &&
      stdin.isTTY === true;

    if (hasRawMode) {
      try {
        stdin.setRawMode(true);
        rawModeActive = true;
        stdin.resume();
        stdin.setEncoding("utf8");

        const onData = (char: string): void => {
          for (const c of char) {
            if (c === "\n" || c === "\r" || c === "\u0004") {
              cleanup(onData);
              process.stdout.write("\n");
              resolve(input);
              return;
            }
            if (c === "\u0003") {
              cleanup(onData);
              process.stdout.write("\n");
              process.exit(0);
            }
            if (c === "\u007f") {
              if (input.length > 0) {
                input = input.slice(0, -1);
                process.stdout.write("\b \b");
              }
              continue;
            }
            input += c;
            process.stdout.write(BLUE("•"));
          }
        };

        stdin.on("data", onData);
      } catch {
        const rl = createReadlineInterface();
        rl.question("", (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      }
    } else {
      const rl = createReadlineInterface();
      rl.question("", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export async function promptConfirm(question: string): Promise<boolean> {
  while (true) {
    const answer = await prompt(`${question} ${GRAY("(y/n)")}`);
    const lower = answer.toLowerCase().trim();
    if (lower === "y" || lower === "yes") return true;
    if (lower === "n" || lower === "no") return false;
    console.log(
      `   ${chalk.hex("#ED4245")("✖")}  Введите ${WHITE("y")} (да) или ${GRAY("n")} (нет).`
    );
  }
}

export async function selectFromList<T extends { id: string; name: string }>(
  label: string,
  items: T[]
): Promise<T> {
  console.log();
  console.log(`   ${CYAN(label)}`);
  console.log();

  items.forEach((item, i) => {
    const num = BLUE(`[${String(i + 1).padStart(2, " ")}]`);
    console.log(`   ${num}  ${WHITE(item.name)}  ${GRAY(item.id)}`);
  });

  console.log();

  while (true) {
    const raw = await prompt("Введите номер");
    const idx = parseInt(raw, 10) - 1;

    if (idx >= 0 && idx < items.length) {
      return items[idx]!;
    }

    console.log(
      `   ${chalk.hex("#ED4245")("✖")}  Неверный выбор. Введите число от 1 до ${items.length}.`
    );
  }
}
