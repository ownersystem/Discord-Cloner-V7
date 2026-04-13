import { DiscordClient } from "../api/client";
import { CreateEmojiPayload } from "../types";
import { Logger } from "../ui/logger";
import { Spinner } from "../ui/spinner";
import { sleep, withRetry, withTimeout } from "../utils/api";

const EMOJI_LIMIT_CODES = new Set([30008, 30010]);

function isEmojiLimitError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const response = (err as Record<string, unknown>)["response"];
  if (response === null || typeof response !== "object") return false;
  const data = (response as Record<string, unknown>)["data"];
  if (data === null || typeof data !== "object") return false;
  const code = (data as Record<string, unknown>)["code"];
  return typeof code === "number" && EMOJI_LIMIT_CODES.has(code);
}

export async function cloneEmojis(
  client: DiscordClient,
  sourceGuildId: string,
  targetGuildId: string,
  errors: string[]
): Promise<{ cloned: number }> {
  const spinner = new Spinner("Загрузка эмодзи...", "dots").start();

  const [sourceEmojis, targetEmojis] = await Promise.all([
    client.getGuildEmojis(sourceGuildId),
    client.getGuildEmojis(targetGuildId),
  ]);

  spinner.stop();

  let cloned = 0;

  if (targetEmojis.length > 0) {
    Logger.step(`Удаление ${targetEmojis.length} существующих эмодзи с целевого сервера`);
    for (const emoji of targetEmojis) {
      if (emoji.managed) continue;
      try {
        await withTimeout(() => client.deleteEmoji(targetGuildId, emoji.id), 6000);
        Logger.delete("Эмодзи удалён", emoji.name);
      } catch {
        errors.push(`Ошибка удаления эмодзи: ${emoji.name}`);
      }
      await sleep(400);
    }
    await sleep(1000);
  }

  const clonable = sourceEmojis.filter((e) => !e.managed && e.available !== false);

  Logger.step(`Клонирование ${clonable.length} эмодзи...`);

  const BATCH_SIZE = 10;
  const BATCH_PAUSE_MS = 9000;
  let limitReached = false;

  for (let i = 0; i < clonable.length; i++) {
    if (limitReached) break;

    const emoji = clonable[i]!;

    if (i > 0 && i % BATCH_SIZE === 0) {
      Logger.dim(`Пауза перед следующей партией (${i}/${clonable.length})...`);
      await sleep(BATCH_PAUSE_MS);
    }

    try {
      const animated = emoji.animated === true;
      const url = client.emojiUrl(emoji.id, animated);
      const buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
      const mimeType = animated ? "image/gif" : "image/png";
      const imageData = `data:${mimeType};base64,${buffer.toString("base64")}`;

      const payload: CreateEmojiPayload = { name: emoji.name, image: imageData };

      await withRetry(
        () => withTimeout(() => client.createEmoji(targetGuildId, payload), 8000),
        3,
        1200
      );
      cloned++;
      Logger.clone("Эмодзи создан", emoji.name);
    } catch (err: unknown) {
      if (isEmojiLimitError(err)) {
        limitReached = true;
        const remaining = clonable.length - i;
        Logger.warn(
          `Достигнут лимит эмодзи сервера — скопировано ${cloned} из ${clonable.length}`,
          `пропущено ${remaining} шт.`
        );
        Logger.warn(
          "Для увеличения лимита повысьте уровень буста целевого сервера",
          "Уровень 1 → 100 | Уровень 2 → 150 | Уровень 3 → 250"
        );
        errors.push(
          `Лимит эмодзи сервера достигнут на ${i + 1}/${clonable.length} — скопировано ${cloned}`
        );
      } else {
        const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
        errors.push(`Ошибка клонирования эмодзи "${emoji.name}": ${msg}`);
        Logger.error("Ошибка клонирования эмодзи", emoji.name);
      }
    }
    await sleep(700);
  }

  return { cloned };
}
