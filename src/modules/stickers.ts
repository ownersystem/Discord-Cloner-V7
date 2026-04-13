import { DiscordClient } from "../api/client";
import { StickerFormat } from "../types";
import { Logger } from "../ui/logger";
import { Spinner } from "../ui/spinner";
import { sleep, withRetry, withTimeout } from "../utils/api";

function stickerMeta(formatType: number): { mimeType: string; filename: string } {
  if (formatType === StickerFormat.GIF) return { mimeType: "image/gif", filename: "sticker.gif" };
  if (formatType === StickerFormat.LOTTIE) return { mimeType: "application/json", filename: "sticker.json" };
  return { mimeType: "image/png", filename: "sticker.png" };
}

export async function cloneStickers(
  client: DiscordClient,
  sourceGuildId: string,
  targetGuildId: string,
  errors: string[]
): Promise<{ cloned: number }> {
  const spinner = new Spinner("Загрузка стикеров...", "dots").start();

  const [sourceStickers, targetStickers] = await Promise.all([
    client.getGuildStickers(sourceGuildId),
    client.getGuildStickers(targetGuildId),
  ]);

  spinner.stop();

  let cloned = 0;

  if (targetStickers.length > 0) {
    Logger.step(`Удаление ${targetStickers.length} существующих стикеров с целевого сервера`);
    for (const sticker of targetStickers) {
      try {
        await withTimeout(() => client.deleteSticker(targetGuildId, sticker.id), 6000);
        Logger.delete("Стикер удалён", sticker.name);
      } catch {
        errors.push(`Ошибка удаления стикера: ${sticker.name}`);
      }
      await sleep(450);
    }
    await sleep(1000);
  }

  const clonable = sourceStickers.filter((s) => s.available !== false);

  Logger.step(`Клонирование ${clonable.length} стикеров...`);

  for (const sticker of clonable) {
    try {
      const url = client.stickerUrl(sticker.id, sticker.format_type);
      const buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
      const { mimeType, filename } = stickerMeta(sticker.format_type);

      await withRetry(
        () =>
          withTimeout(
            () =>
              client.createSticker(
                targetGuildId,
                sticker.name,
                sticker.tags || "sticker",
                sticker.description ?? "",
                buffer,
                mimeType,
                filename
              ),
            10000
          ),
        3,
        800
      );

      cloned++;
      Logger.clone("Стикер создан", sticker.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      errors.push(`Ошибка клонирования стикера "${sticker.name}": ${msg}`);
      Logger.error("Ошибка клонирования стикера", sticker.name);
    }
    await sleep(600);
  }

  return { cloned };
}
