import chalk from "chalk";
import { renderBanner } from "./ui/banner";
import { Logger } from "./ui/logger";
import { prompt, promptSecret, promptConfirm } from "./ui/prompt";
import { authenticate } from "./core/auth";
import { Cloner } from "./core/cloner";

const BLUE = chalk.hex("#5865F2");
const GRAY = chalk.hex("#99AAB5");
const RED = chalk.hex("#ED4245");

function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id.trim());
}

async function gracefulExit(code = 0): Promise<never> {
  console.log();
  console.log(`   ${GRAY("Сессия завершена.")}`);
  console.log();
  process.exit(code);
}

async function main(): Promise<void> {
  renderBanner();

  let authResult: Awaited<ReturnType<typeof authenticate>>;

  while (true) {
    const token = await promptSecret("Discord Токен");

    if (!token) {
      Logger.error("Токен не может быть пустым");
      continue;
    }

    try {
      authResult = await authenticate(token);
      break;
    } catch {
      Logger.error("Ошибка аутентификации. Попробуйте снова или нажмите Ctrl+C для выхода.");
    }
  }

  console.log();
  console.log(`   ${BLUE("─".repeat(68))}`);
  console.log();

  let sourceGuildId = "";
  while (true) {
    sourceGuildId = await prompt("ID Исходного Сервера (сервер для клонирования)");
    if (isValidSnowflake(sourceGuildId)) break;
    Logger.error("Неверный формат ID сервера. Должен содержать 17-20 цифр.");
  }

  let targetGuildId = "";
  while (true) {
    targetGuildId = await prompt("ID Целевого Сервера (сервер для копирования)");
    if (isValidSnowflake(targetGuildId)) break;
    Logger.error("Неверный формат ID сервера. Должен содержать 17-20 цифр.");
  }

  if (sourceGuildId === targetGuildId) {
    Logger.error("Исходный и целевой серверы не могут совпадать.");
    await gracefulExit(1);
  }

  console.log();

  const cloner = new Cloner(authResult.client);

  try {
    const result = await cloner.clone({
      sourceGuildId,
      targetGuildId,
    });

    Logger.summary(result);

    if (result.errors.length === 0) {
      Logger.success("Клонирование завершено без ошибок.");
    } else {
      Logger.warn(`Клонирование завершено с ${result.errors.length} ошибок(ами).`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Произошла неизвестная ошибка";
    Logger.error("Критическая ошибка клонирования", msg);
    await gracefulExit(1);
  }

  console.log();
  const again = await promptConfirm("Клонировать другой сервер?");

  if (again) {
    await main();
  } else {
    await gracefulExit(0);
  }
}

process.on("SIGINT", async () => {
  console.log();
  Logger.warn("Прервано пользователем.");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.log();
  console.log(`   ${RED("✖")}  Необработанное исключение: ${err.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.log();
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.log(`   ${RED("✖")}  Необработанный отказ: ${msg}`);
  process.exit(1);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
