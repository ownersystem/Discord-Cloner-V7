import { DiscordClient } from "../api/client";
import {
  DiscordChannel,
  ChannelType,
  ChannelIdMap,
  RoleIdMap,
  CreateChannelPayload,
  PermissionOverwrite,
} from "../types";
import { Logger } from "../ui/logger";
import { sleep, withRetry, withTimeout } from "../utils/api";

function remapPermissionOverwrites(
  overwrites: PermissionOverwrite[],
  roleIdMap: RoleIdMap
): PermissionOverwrite[] {
  return overwrites.map((ow) => ({
    id: ow.type === 0 ? (roleIdMap[ow.id] ?? ow.id) : ow.id,
    type: ow.type,
    allow: ow.allow,
    deny: ow.deny,
  }));
}

function buildChannelPayload(
  channel: DiscordChannel,
  roleIdMap: RoleIdMap,
  parentId?: string
): CreateChannelPayload {
  const overwrites = channel.permission_overwrites
    ? remapPermissionOverwrites(channel.permission_overwrites, roleIdMap)
    : [];

  const base: CreateChannelPayload = {
    name: channel.name ?? "без-имени",
    type: channel.type,
    permission_overwrites: overwrites,
  };

  if (parentId) {
    base.parent_id = parentId;
  }

  switch (channel.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement: {
      if (channel.topic) base.topic = channel.topic;
      if (channel.nsfw !== undefined) base.nsfw = channel.nsfw;
      if (channel.rate_limit_per_user) base.rate_limit_per_user = channel.rate_limit_per_user;
      if (channel.default_auto_archive_duration)
        base.default_auto_archive_duration = channel.default_auto_archive_duration;
      break;
    }

    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice: {
      if (channel.bitrate && channel.bitrate > 0) base.bitrate = channel.bitrate;
      if (channel.user_limit !== undefined) base.user_limit = channel.user_limit;
      if (channel.rtc_region) base.rtc_region = channel.rtc_region;
      if (channel.video_quality_mode !== undefined)
        base.video_quality_mode = channel.video_quality_mode;
      break;
    }

    case ChannelType.GuildForum:
    case ChannelType.GuildMedia: {
      if (channel.topic) base.topic = channel.topic;
      if (channel.nsfw !== undefined) base.nsfw = channel.nsfw;
      if (channel.rate_limit_per_user) base.rate_limit_per_user = channel.rate_limit_per_user;
      if (channel.default_sort_order !== undefined && channel.default_sort_order !== null)
        base.default_sort_order = channel.default_sort_order;
      if (channel.default_forum_layout !== undefined)
        base.default_forum_layout = channel.default_forum_layout;
      if (channel.available_tags) {
        base.available_tags = channel.available_tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          moderated: tag.moderated,
          emoji_id: null,
          emoji_name: tag.emoji_name,
        }));
      }
      if (channel.default_reaction_emoji !== undefined) {
        if (
          channel.default_reaction_emoji !== null &&
          channel.default_reaction_emoji.emoji_id !== null
        ) {
          base.default_reaction_emoji = {
            emoji_id: null,
            emoji_name: channel.default_reaction_emoji.emoji_name,
          };
        } else {
          base.default_reaction_emoji = channel.default_reaction_emoji;
        }
      }
      if (channel.default_thread_rate_limit_per_user !== undefined)
        base.default_thread_rate_limit_per_user = channel.default_thread_rate_limit_per_user;
      break;
    }
  }

  return base;
}

export async function cloneChannels(
  client: DiscordClient,
  sourceGuildId: string,
  targetGuildId: string,
  roleIdMap: RoleIdMap,
  errors: string[]
): Promise<{ channelIdMap: ChannelIdMap; cloned: number; permissionsApplied: number }> {
  const [sourceChannels, targetChannels] = await Promise.all([
    client.getGuildChannels(sourceGuildId),
    client.getGuildChannels(targetGuildId),
  ]);

  const channelIdMap: ChannelIdMap = {};
  let cloned = 0;
  let permissionsApplied = 0;

  Logger.step(`Удаление ${targetChannels.length} существующих каналов с целевого сервера`);

  for (const ch of targetChannels) {
    try {
      await withTimeout(() => client.deleteChannel(ch.id), 6000);
      Logger.delete("Канал удалён", ch.name ?? ch.id);
    } catch {
      errors.push(`Ошибка удаления канала: ${ch.name ?? ch.id}`);
    }
    await sleep(450);
  }

  await sleep(1500);

  const categories = sourceChannels
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const nonCategories = sourceChannels
    .filter((c) => c.type !== ChannelType.GuildCategory)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  Logger.step(`Создание ${categories.length} категорий...`);

  for (const cat of categories) {
    const payload = buildChannelPayload(cat, roleIdMap);
    try {
      const created = await withRetry(
        () => withTimeout(() => client.createChannel(targetGuildId, payload), 8000),
        3,
        700
      );
      channelIdMap[cat.id] = created.id;
      cloned++;
      Logger.clone("Категория создана", cat.name ?? "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      errors.push(`Ошибка создания категории "${cat.name}": ${msg}`);
      Logger.error("Ошибка создания категории", cat.name ?? "");
    }
    await sleep(500);
  }

  await sleep(1000);

  Logger.step(`Создание ${nonCategories.length} каналов...`);

  const COMMUNITY_TYPES = [
    ChannelType.GuildAnnouncement,
    ChannelType.GuildForum,
    ChannelType.GuildMedia,
  ];

  for (const ch of nonCategories) {
    const resolvedParentId = ch.parent_id ? channelIdMap[ch.parent_id] : undefined;
    const payload = buildChannelPayload(ch, roleIdMap, resolvedParentId);

    try {
      const created = await withRetry(
        () => withTimeout(() => client.createChannel(targetGuildId, payload), 8000),
        3,
        700
      );
      channelIdMap[ch.id] = created.id;
      cloned++;
      permissionsApplied += ch.permission_overwrites?.length ?? 0;
      Logger.clone("Канал создан", ch.name ?? "");
    } catch (err: unknown) {
      if (COMMUNITY_TYPES.includes(ch.type)) {
        try {
          const minimalPayload: CreateChannelPayload = {
            name: payload.name,
            type: ch.type,
            permission_overwrites: payload.permission_overwrites ?? [],
          };
          if (resolvedParentId) minimalPayload.parent_id = resolvedParentId;
          if (payload.topic) minimalPayload.topic = payload.topic;
          if (payload.nsfw !== undefined) minimalPayload.nsfw = payload.nsfw;
          if (payload.rate_limit_per_user) minimalPayload.rate_limit_per_user = payload.rate_limit_per_user;

          const created = await withRetry(
            () => withTimeout(() => client.createChannel(targetGuildId, minimalPayload), 8000),
            3,
            700
          );
          channelIdMap[ch.id] = created.id;
          cloned++;
          permissionsApplied += ch.permission_overwrites?.length ?? 0;
          Logger.warn("Создан без тегов/реакций (параметры сброшены)", ch.name ?? "");
        } catch {
          try {
            const fallback: CreateChannelPayload = {
              name: payload.name,
              type: ChannelType.GuildText,
              permission_overwrites: payload.permission_overwrites ?? [],
            };
            if (resolvedParentId) fallback.parent_id = resolvedParentId;
            if (payload.topic) fallback.topic = payload.topic;
            if (payload.nsfw !== undefined) fallback.nsfw = payload.nsfw;
            if (payload.rate_limit_per_user) fallback.rate_limit_per_user = payload.rate_limit_per_user;

            const created = await withRetry(
              () => withTimeout(() => client.createChannel(targetGuildId, fallback), 8000),
              3,
              700
            );
            channelIdMap[ch.id] = created.id;
            cloned++;
            permissionsApplied += ch.permission_overwrites?.length ?? 0;
            Logger.warn("Создан как текстовый (нужно Сообщество)", ch.name ?? "");
          } catch (fallbackErr: unknown) {
            const msg2 = fallbackErr instanceof Error ? fallbackErr.message : "Неизвестная ошибка";
            errors.push(`Ошибка создания канала "${ch.name}": ${msg2}`);
            Logger.error("Ошибка создания канала", ch.name ?? "");
          }
        }
      } else {
        const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
        errors.push(`Ошибка создания канала "${ch.name}": ${msg}`);
        Logger.error("Ошибка создания канала", ch.name ?? "");
      }
    }
    await sleep(500);
  }

  return { channelIdMap, cloned, permissionsApplied };
}
