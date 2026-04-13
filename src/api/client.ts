import axios, { AxiosInstance, AxiosResponse } from "axios";
import FormData from "form-data";

const DISCORD_BASE_URL = "https://discord.com/api/v10";
const CDN_BASE_URL = "https://cdn.discordapp.com";
const MEDIA_BASE_URL = "https://media.discordapp.net";
const RATE_LIMIT_DELAY = 1000;
const REQUEST_DELAY = 300;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class DiscordClient {
  private readonly http: AxiosInstance;

  constructor(token: string) {
    this.http = axios.create({
      baseURL: DISCORD_BASE_URL,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    this.http.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err.response?.status === 429) {
          const retryAfter =
            (err.response.headers["retry-after"] ?? 1) * 1000 +
            RATE_LIMIT_DELAY;
          await sleep(retryAfter);
          return this.http.request(err.config);
        }
        return Promise.reject(err);
      }
    );
  }

  private async request<T>(
    method: "get" | "post" | "put" | "patch" | "delete",
    path: string,
    data?: unknown
  ): Promise<T> {
    await sleep(REQUEST_DELAY);
    let res: AxiosResponse<T>;
    if (method === "get" || method === "delete") {
      res = await this.http[method]<T>(path);
    } else {
      res = await this.http[method]<T>(path, data);
    }
    return res.data;
  }

  async downloadBuffer(url: string): Promise<Buffer> {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
    });
    return Buffer.from(res.data);
  }

  emojiUrl(emojiId: string, animated: boolean): string {
    const ext = animated ? "gif" : "png";
    return `${CDN_BASE_URL}/emojis/${emojiId}.${ext}`;
  }

  stickerUrl(stickerId: string, formatType: number): string {
    if (formatType === 4) {
      return `${MEDIA_BASE_URL}/stickers/${stickerId}.gif`;
    }
    if (formatType === 3) {
      return `${CDN_BASE_URL}/stickers/${stickerId}.json`;
    }
    return `${CDN_BASE_URL}/stickers/${stickerId}.png`;
  }

  iconUrl(guildId: string, hash: string): string {
    const ext = hash.startsWith("a_") ? "gif" : "png";
    return `${CDN_BASE_URL}/icons/${guildId}/${hash}.${ext}`;
  }

  bannerUrl(guildId: string, hash: string): string {
    const ext = hash.startsWith("a_") ? "gif" : "png";
    return `${CDN_BASE_URL}/banners/${guildId}/${hash}.${ext}`;
  }

  async getMe() {
    return this.request<{
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
    }>("get", "/users/@me");
  }

  async getGuild(guildId: string) {
    return this.request<import("../types").DiscordGuild>(
      "get",
      `/guilds/${guildId}?with_counts=true`
    );
  }

  async getGuildChannels(guildId: string) {
    return this.request<import("../types").DiscordChannel[]>(
      "get",
      `/guilds/${guildId}/channels`
    );
  }

  async getGuildRoles(guildId: string) {
    return this.request<import("../types").DiscordRole[]>(
      "get",
      `/guilds/${guildId}/roles`
    );
  }

  async getGuildEmojis(guildId: string) {
    return this.request<import("../types").DiscordEmoji[]>(
      "get",
      `/guilds/${guildId}/emojis`
    );
  }

  async createEmoji(
    guildId: string,
    payload: import("../types").CreateEmojiPayload
  ) {
    return this.request<import("../types").DiscordEmoji>(
      "post",
      `/guilds/${guildId}/emojis`,
      payload
    );
  }

  async deleteEmoji(guildId: string, emojiId: string) {
    return this.request<void>(
      "delete",
      `/guilds/${guildId}/emojis/${emojiId}`
    );
  }

  async getGuildStickers(guildId: string) {
    return this.request<import("../types").DiscordSticker[]>(
      "get",
      `/guilds/${guildId}/stickers`
    );
  }

  async createSticker(
    guildId: string,
    name: string,
    tags: string,
    description: string,
    fileBuffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<import("../types").DiscordSticker> {
    await sleep(REQUEST_DELAY);
    const form = new FormData();
    form.append("name", name);
    form.append("tags", tags || "sticker");
    form.append("description", description || "");
    form.append("file", fileBuffer, { filename, contentType: mimeType });
    const res = await this.http.post<import("../types").DiscordSticker>(
      `/guilds/${guildId}/stickers`,
      form,
      { headers: form.getHeaders() }
    );
    return res.data;
  }

  async deleteSticker(guildId: string, stickerId: string) {
    return this.request<void>(
      "delete",
      `/guilds/${guildId}/stickers/${stickerId}`
    );
  }

  async createRole(
    guildId: string,
    payload: import("../types").CreateRolePayload
  ) {
    return this.request<import("../types").DiscordRole>(
      "post",
      `/guilds/${guildId}/roles`,
      payload
    );
  }

  async modifyRolePositions(
    guildId: string,
    positions: Array<{ id: string; position: number }>
  ) {
    return this.request<import("../types").DiscordRole[]>(
      "patch",
      `/guilds/${guildId}/roles`,
      positions
    );
  }

  async deleteRole(guildId: string, roleId: string) {
    return this.request<void>("delete", `/guilds/${guildId}/roles/${roleId}`);
  }

  async createChannel(
    guildId: string,
    payload: import("../types").CreateChannelPayload
  ) {
    return this.request<import("../types").DiscordChannel>(
      "post",
      `/guilds/${guildId}/channels`,
      payload
    );
  }

  async modifyChannelPositions(
    guildId: string,
    positions: Array<{
      id: string;
      position: number;
      parent_id?: string | null;
      lock_permissions?: boolean;
    }>
  ) {
    return this.request<void>(
      "patch",
      `/guilds/${guildId}/channels`,
      positions
    );
  }

  async deleteChannel(channelId: string) {
    return this.request<import("../types").DiscordChannel>(
      "delete",
      `/channels/${channelId}`
    );
  }

  async editChannelPermissions(
    channelId: string,
    overwriteId: string,
    payload: { allow: string; deny: string; type: number }
  ) {
    return this.request<void>(
      "put",
      `/channels/${channelId}/permissions/${overwriteId}`,
      payload
    );
  }

  async modifyGuild(
    guildId: string,
    payload: Partial<{
      name: string;
      icon: string | null;
      banner: string | null;
      verification_level: number;
      default_message_notifications: number;
      explicit_content_filter: number;
      afk_timeout: number;
      system_channel_flags: number;
      preferred_locale: string;
    }>
  ) {
    return this.request<import("../types").DiscordGuild>(
      "patch",
      `/guilds/${guildId}`,
      payload
    );
  }
}
