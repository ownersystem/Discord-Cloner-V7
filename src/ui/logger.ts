import chalk from "chalk";

const BLUE = chalk.hex("#5865F2");
const GREEN = chalk.hex("#57F287");
const RED = chalk.hex("#ED4245");
const YELLOW = chalk.hex("#FEE75C");
const CYAN = chalk.hex("#00D4FF");
const GRAY = chalk.hex("#99AAB5");
const WHITE = chalk.white;
const DIM_BLUE = chalk.hex("#4752C4");

type LogLevel = "info" | "success" | "error" | "warn" | "clone" | "delete" | "step" | "dim";

const ICONS: Record<LogLevel, string> = {
  info: "◆",
  success: "✔",
  error: "✖",
  warn: "▲",
  clone: "+",
  delete: "−",
  step: "›",
  dim: "·",
};

const COLORS: Record<LogLevel, (s: string) => string> = {
  info: BLUE,
  success: GREEN,
  error: RED,
  warn: YELLOW,
  clone: GREEN,
  delete: RED,
  step: CYAN,
  dim: GRAY,
};

function timestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return GRAY(`[${h}:${m}:${s}]`);
}

function log(level: LogLevel, message: string, detail?: string): void {
  const color = COLORS[level];
  const icon = color(ICONS[level]);
  const ts = timestamp();
  const msg = WHITE(message);
  const det = detail ? GRAY(` ${detail}`) : "";
  console.log(`   ${ts} ${icon}  ${msg}${det}`);
}

export const Logger = {
  info: (message: string, detail?: string) => log("info", message, detail),
  success: (message: string, detail?: string) => log("success", message, detail),
  error: (message: string, detail?: string) => log("error", message, detail),
  warn: (message: string, detail?: string) => log("warn", message, detail),
  clone: (message: string, detail?: string) => log("clone", message, detail),
  delete: (message: string, detail?: string) => log("delete", message, detail),
  step: (message: string, detail?: string) => log("step", message, detail),
  dim: (message: string, detail?: string) => log("dim", message, detail),
  blank: () => console.log(),

  preCloneStats(stats: {
    roles: number;
    channels: number;
    emojis: number;
    stickers: number;
    copyEmojis: boolean;
    copyStickers: boolean;
  }): void {
    const MS_PER_ROLE = 1400;
    const MS_PER_CHANNEL = 1600;
    const MS_PER_EMOJI = 1900;
    const MS_PER_STICKER = 2600;
    const BASE_OVERHEAD = 12000;

    const totalMs =
      stats.roles * MS_PER_ROLE +
      stats.channels * MS_PER_CHANNEL +
      (stats.copyEmojis ? stats.emojis * MS_PER_EMOJI : 0) +
      (stats.copyStickers ? stats.stickers * MS_PER_STICKER : 0) +
      BASE_OVERHEAD;

    const totalSec = Math.ceil(totalMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;

    const finishAt = new Date(Date.now() + totalMs);
    const fh = String(finishAt.getHours()).padStart(2, "0");
    const fm = String(finishAt.getMinutes()).padStart(2, "0");

    const line = DIM_BLUE("─".repeat(70));

    console.log();
    console.log(line);
    console.log();
    console.log(`   ${CYAN("СТАТИСТИКА ИСХОДНОГО СЕРВЕРА")}`);
    console.log();
    console.log(`   ${GRAY("Ролей")}              ${WHITE(String(stats.roles))}`);
    console.log(`   ${GRAY("Каналов")}            ${WHITE(String(stats.channels))}`);
    console.log(`   ${GRAY("Эмодзи")}             ${WHITE(String(stats.emojis))}`);
    console.log(`   ${GRAY("Стикеров")}           ${WHITE(String(stats.stickers))}`);
    console.log();
    console.log(
      `   ${GRAY("Расчётное время")}    ${YELLOW(mins > 0 ? `${mins} мин ${secs} сек` : `${secs} сек`)}`
    );
    console.log(
      `   ${GRAY("Завершение около")}   ${YELLOW(`${fh}:${fm}`)}`
    );
    console.log();
    console.log(line);
    console.log();
  },

  summary(result: {
    rolesCloned: number;
    channelsCloned: number;
    permissionsApplied: number;
    emojisCloned: number;
    stickersCloned: number;
    errors: string[];
    duration: number;
  }): void {
    const line = BLUE(chalk.hex("#4752C4")("─".repeat(70)));
    console.log();
    console.log(line);
    console.log();
    console.log(`   ${CYAN("ИТОГИ КЛОНИРОВАНИЯ")}`);
    console.log();
    console.log(`   ${GRAY("Ролей клонировано")}          ${GREEN(String(result.rolesCloned))}`);
    console.log(`   ${GRAY("Каналов клонировано")}        ${GREEN(String(result.channelsCloned))}`);
    console.log(`   ${GRAY("Разрешений применено")}       ${GREEN(String(result.permissionsApplied))}`);
    console.log(`   ${GRAY("Эмодзи клонировано")}         ${GREEN(String(result.emojisCloned))}`);
    console.log(`   ${GRAY("Стикеров клонировано")}       ${GREEN(String(result.stickersCloned))}`);
    console.log(
      `   ${GRAY("Ошибки")}                    ${result.errors.length > 0 ? RED(String(result.errors.length)) : GREEN("0")}`
    );
    console.log(
      `   ${GRAY("Длительность")}              ${WHITE(`${(result.duration / 1000).toFixed(2)}с`)}`
    );

    if (result.errors.length > 0) {
      console.log();
      console.log(`   ${RED("Ошибки:")}`);
      result.errors.forEach((e) => {
        console.log(`   ${RED("✖")} ${GRAY(e)}`);
      });
    }

    console.log();
    console.log(line);
    console.log();
  },

  userCard(user: { id: string; username: string; discriminator: string }): void {
    const tag =
      user.discriminator === "0"
        ? user.username
        : `${user.username}#${user.discriminator}`;
    console.log();
    console.log(
      `   ${GRAY("Вход выполнен как")}   ${CYAN(tag)}   ${GRAY("ID:")} ${WHITE(user.id)}`
    );
    console.log();
  },
};
