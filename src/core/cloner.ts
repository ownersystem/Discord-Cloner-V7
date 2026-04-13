import { DiscordClient } from "../api/client";
import { CloneOptions, CloneResult } from "../types";
import { Logger } from "../ui/logger";
import { Spinner } from "../ui/spinner";
import { cloneRoles } from "../modules/roles";
import { cloneChannels } from "../modules/channels";
import { cloneEmojis } from "../modules/emojis";
import { cloneStickers } from "../modules/stickers";
import { renderSectionHeader, renderSectionFooter } from "../ui/banner";
import { promptConfirm, selectFromList } from "../ui/prompt";
import { sleep } from "../utils/api";
import { saveLog } from "../utils/logSaver";

async function sectionPause(label: string): Promise<void> {
  const spinner = new Spinner(`Ожидание стабилизации API после раздела "${label}"...`, "dots").start();
  await sleep(2500);
  spinner.stop();
}

export class Cloner {
  constructor(private readonly client: DiscordClient) {}

  async clone(options: CloneOptions): Promise<CloneResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const spinner = new Spinner("Загрузка информации о серверах...", "circle").start();

    let sourceName = "";
    let targetName = "";
    let sourceIconHash: string | null = null;
    let sourceBannerHash: string | null = null;
    let sourceId = options.sourceGuildId;

    try {
      const [source, target] = await Promise.all([
        this.client.getGuild(options.sourceGuildId),
        this.client.getGuild(options.targetGuildId),
      ]);

      sourceName = source.name;
      targetName = target.name;
      sourceIconHash = source.icon;
      sourceBannerHash = source.banner;
      sourceId = source.id;
      spinner.succeed("Серверы загружены");
    } catch (err: unknown) {
      spinner.fail("Ошибка загрузки данных серверов");
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      throw new Error(`Ошибка получения серверов: ${msg}`);
    }

    const statsSpinner = new Spinner("Сбор статистики сервера...", "dots").start();
    let rolesCount = 0;
    let channelsCount = 0;
    let emojisCount = 0;
    let stickersCount = 0;

    try {
      const [roles, channels, emojis, stickers] = await Promise.all([
        this.client.getGuildRoles(options.sourceGuildId),
        this.client.getGuildChannels(options.sourceGuildId),
        this.client.getGuildEmojis(options.sourceGuildId),
        this.client.getGuildStickers(options.sourceGuildId),
      ]);
      rolesCount = roles.filter((r) => r.name !== "@everyone" && !r.managed).length;
      channelsCount = channels.length;
      emojisCount = emojis.filter((e) => !e.managed && e.available !== false).length;
      stickersCount = stickers.filter((s) => s.available !== false).length;
      statsSpinner.stop();
    } catch {
      statsSpinner.stop();
    }

    Logger.info("Исходный сервер", sourceName);
    Logger.info("Целевой сервер", targetName);
    console.log();

    const MODE_ITEMS = [
      {
        id: "full",
        name: `Клонировать всё — роли, каналы, настройки  (без эмодзи и стикеров)`,
      },
      {
        id: "media",
        name: `Только эмодзи и стикеры  (эмодзи: ${emojisCount}, стикеры: ${stickersCount})`,
      },
    ];

    const { id: mode } = await selectFromList("РЕЖИМ КЛОНИРОВАНИЯ", MODE_ITEMS);
    console.log();

    if (mode === "media") {
      Logger.info("Эмодзи для копирования", String(emojisCount));
      Logger.info("Стикеров для копирования", String(stickersCount));
      console.log();

      const confirmedMedia = await promptConfirm("Начать копирование эмодзи и стикеров?");
      if (!confirmedMedia) {
        Logger.info("Копирование отменено.");
        process.exit(0);
      }

      console.log();

      let emojisCloned = 0;
      let stickersCloned = 0;

      if (emojisCount > 0) {
        renderSectionHeader("ЭМОДЗИ");
        const { cloned: ec } = await cloneEmojis(
          this.client,
          options.sourceGuildId,
          options.targetGuildId,
          errors
        );
        emojisCloned = ec;
        Logger.success(`${emojisCloned} эмодзи успешно скопировано`);
        renderSectionFooter();
      }

      if (stickersCount > 0) {
        if (emojisCount > 0) await sectionPause("ЭМОДЗИ");
        renderSectionHeader("СТИКЕРЫ");
        const { cloned: sc } = await cloneStickers(
          this.client,
          options.sourceGuildId,
          options.targetGuildId,
          errors
        );
        stickersCloned = sc;
        Logger.success(`${stickersCloned} стикеров успешно скопировано`);
        renderSectionFooter();
      }

      const mediaDuration = Date.now() - startTime;
      const mediaResult = {
        rolesCloned: 0,
        channelsCloned: 0,
        permissionsApplied: 0,
        emojisCloned,
        stickersCloned,
        errors,
        duration: mediaDuration,
      };

      saveLog({
        date: new Date().toISOString(),
        sourceGuild: { id: options.sourceGuildId, name: sourceName },
        targetGuild: { id: options.targetGuildId, name: targetName },
        result: mediaResult,
      });

      return mediaResult;
    }

    Logger.warn("Эта операция УДАЛИТ все существующие каналы и роли на целевом сервере.");
    Logger.warn("Это действие НЕОБРАТИМО.");
    console.log();

    const copyName = await promptConfirm(`Скопировать название сервера? (${sourceName})`);
    const copyIcon =
      sourceIconHash !== null
        ? await promptConfirm("Скопировать аватарку сервера?")
        : false;
    const copyBanner =
      sourceBannerHash !== null
        ? await promptConfirm("Скопировать баннер сервера?")
        : false;

    console.log();

    const confirmedFull = await promptConfirm("Подтвердить клонирование?");
    if (!confirmedFull) {
      Logger.info("Клонирование отменено.");
      process.exit(0);
    }

    console.log();

    Logger.preCloneStats({
      roles: rolesCount,
      channels: channelsCount,
      emojis: emojisCount,
      stickers: stickersCount,
      copyEmojis: false,
      copyStickers: false,
    });

    if (copyName || copyIcon || copyBanner) {
      renderSectionHeader("НАСТРОЙКИ СЕРВЕРА");
      await this.syncGuildSettings(
        options.sourceGuildId,
        sourceId,
        options.targetGuildId,
        sourceIconHash,
        sourceBannerHash,
        sourceName,
        copyName,
        copyIcon,
        copyBanner,
        errors
      );
      renderSectionFooter();
      await sectionPause("НАСТРОЙКИ");
    }

    renderSectionHeader("РОЛИ");

    const { roleIdMap, cloned: rolesCloned } = await cloneRoles(
      this.client,
      options.sourceGuildId,
      options.targetGuildId,
      errors
    );

    Logger.success(`${rolesCloned} ролей успешно клонировано`);
    renderSectionFooter();

    await sectionPause("РОЛИ");

    renderSectionHeader("КАНАЛЫ");

    const { cloned: channelsCloned, permissionsApplied } = await cloneChannels(
      this.client,
      options.sourceGuildId,
      options.targetGuildId,
      roleIdMap,
      errors
    );

    Logger.success(`${channelsCloned} каналов успешно клонировано`);
    renderSectionFooter();

    if (!copyName && !copyIcon && !copyBanner) {
      renderSectionHeader("НАСТРОЙКИ СЕРВЕРА");
      await this.syncGuildSettings(
        options.sourceGuildId,
        sourceId,
        options.targetGuildId,
        sourceIconHash,
        sourceBannerHash,
        sourceName,
        false,
        false,
        false,
        errors
      );
      renderSectionFooter();
    }

    const duration = Date.now() - startTime;

    const cloneResult = {
      rolesCloned,
      channelsCloned,
      permissionsApplied,
      emojisCloned: 0,
      stickersCloned: 0,
      errors,
      duration,
    };

    saveLog({
      date: new Date().toISOString(),
      sourceGuild: { id: options.sourceGuildId, name: sourceName },
      targetGuild: { id: options.targetGuildId, name: targetName },
      result: cloneResult,
    });

    return cloneResult;
  }

  private async syncGuildSettings(
    sourceGuildId: string,
    sourceId: string,
    targetGuildId: string,
    iconHash: string | null,
    bannerHash: string | null,
    sourceName: string,
    copyName: boolean,
    copyIcon: boolean,
    copyBanner: boolean,
    errors: string[]
  ): Promise<void> {
    try {
      const source = await this.client.getGuild(sourceGuildId);

      const patch: Partial<{
        name: string;
        icon: string | null;
        banner: string | null;
        verification_level: number;
        default_message_notifications: number;
        explicit_content_filter: number;
        afk_timeout: number;
        system_channel_flags: number;
        preferred_locale: string;
      }> = {
        verification_level: source.verification_level,
        default_message_notifications: source.default_message_notifications,
        explicit_content_filter: source.explicit_content_filter,
        afk_timeout: source.afk_timeout,
        system_channel_flags: source.system_channel_flags,
        preferred_locale: source.preferred_locale,
      };

      if (copyName) {
        patch.name = sourceName;
        Logger.step("Копирование названия сервера...");
      }

      if (copyIcon && iconHash !== null) {
        try {
          const url = this.client.iconUrl(sourceId, iconHash);
          const buffer = await this.client.downloadBuffer(url);
          const mime = iconHash.startsWith("a_") ? "image/gif" : "image/png";
          patch.icon = `data:${mime};base64,${buffer.toString("base64")}`;
          Logger.step("Копирование аватарки сервера...");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
          errors.push(`Ошибка загрузки аватарки: ${msg}`);
          Logger.error("Ошибка загрузки аватарки");
        }
      }

      if (copyBanner && bannerHash !== null) {
        try {
          const url = this.client.bannerUrl(sourceId, bannerHash);
          const buffer = await this.client.downloadBuffer(url);
          const mime = bannerHash.startsWith("a_") ? "image/gif" : "image/png";
          patch.banner = `data:${mime};base64,${buffer.toString("base64")}`;
          Logger.step("Копирование баннера сервера...");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
          errors.push(`Ошибка загрузки баннера: ${msg}`);
          Logger.error("Ошибка загрузки баннера");
        }
      }

      await this.client.modifyGuild(targetGuildId, patch);
      Logger.success("Настройки сервера синхронизированы");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      errors.push(`Ошибка синхронизации настроек сервера: ${msg}`);
      Logger.error("Ошибка синхронизации настроек сервера");
    }
  }
}
