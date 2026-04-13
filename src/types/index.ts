export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
  premium_type?: number;
  flags?: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: {
    bot_id?: string;
    integration_id?: string;
    premium_subscriber?: null;
  };
}

export interface PermissionOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

export interface DiscordChannel {
  id: string;
  type: ChannelType;
  guild_id?: string;
  position?: number;
  permission_overwrites?: PermissionOverwrite[];
  name?: string;
  topic?: string | null;
  nsfw?: boolean;
  last_message_id?: string | null;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  parent_id?: string | null;
  rtc_region?: string | null;
  video_quality_mode?: number;
  default_auto_archive_duration?: number;
  flags?: number;
  default_sort_order?: number | null;
  default_forum_layout?: number;
  available_tags?: ForumTag[];
  default_reaction_emoji?: DefaultReaction | null;
  default_thread_rate_limit_per_user?: number;
}

export interface ForumTag {
  id: string;
  name: string;
  moderated: boolean;
  emoji_id: string | null;
  emoji_name: string | null;
}

export interface DefaultReaction {
  emoji_id: string | null;
  emoji_name: string | null;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  splash: string | null;
  banner: string | null;
  owner_id: string;
  afk_channel_id: string | null;
  afk_timeout: number;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: DiscordRole[];
  channels: DiscordChannel[];
  system_channel_id: string | null;
  system_channel_flags: number;
  rules_channel_id: string | null;
  description: string | null;
  premium_tier: number;
  preferred_locale: string;
  nsfw_level: number;
  mfa_level: number;
}

export interface DiscordEmoji {
  id: string;
  name: string;
  animated?: boolean;
  available?: boolean;
  managed?: boolean;
  require_colons?: boolean;
  roles?: string[];
}

export interface DiscordSticker {
  id: string;
  name: string;
  description: string | null;
  tags: string;
  format_type: number;
  available?: boolean;
  sort_value?: number;
}

export interface CreateEmojiPayload {
  name: string;
  image: string;
  roles?: string[];
}

export const enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  AnnouncementThread = 10,
  PublicThread = 11,
  PrivateThread = 12,
  GuildStageVoice = 13,
  GuildDirectory = 14,
  GuildForum = 15,
  GuildMedia = 16,
}

export const enum StickerFormat {
  PNG = 1,
  APNG = 2,
  LOTTIE = 3,
  GIF = 4,
}

export interface CreateRolePayload {
  name: string;
  permissions: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
}

export interface CreateChannelPayload {
  name: string;
  type: number;
  topic?: string;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  position?: number;
  permission_overwrites?: PermissionOverwrite[];
  parent_id?: string;
  nsfw?: boolean;
  rtc_region?: string | null;
  video_quality_mode?: number;
  default_auto_archive_duration?: number;
  default_sort_order?: number;
  default_forum_layout?: number;
  available_tags?: ForumTag[];
  default_reaction_emoji?: DefaultReaction | null;
  default_thread_rate_limit_per_user?: number;
}

export interface RoleIdMap {
  [oldId: string]: string;
}

export interface ChannelIdMap {
  [oldId: string]: string;
}

export interface CloneOptions {
  sourceGuildId: string;
  targetGuildId: string;
}

export interface CloneResult {
  rolesCloned: number;
  channelsCloned: number;
  permissionsApplied: number;
  emojisCloned: number;
  stickersCloned: number;
  errors: string[];
  duration: number;
}

export interface ApiError {
  code: number;
  message: string;
  errors?: Record<string, unknown>;
}
