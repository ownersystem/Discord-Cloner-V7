import { DiscordClient } from "../api/client";
import { Spinner, animateTokenCheck } from "../ui/spinner";
import { Logger } from "../ui/logger";

export interface AuthResult {
  client: DiscordClient;
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
}

function normalizeToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("Bot ") || trimmed.startsWith("Bearer ")) {
    return trimmed;
  }
  return trimmed;
}

export async function authenticate(rawToken: string): Promise<AuthResult> {
  const token = normalizeToken(rawToken);

  await new Promise<void>((resolve) =>
    animateTokenCheck(resolve)
  );

  const spinner = new Spinner("Проверка учётных данных...", "pulse").start();

  try {
    const client = new DiscordClient(token);
    const user = await client.getMe();

    spinner.succeed("Аутентификация успешна");
    Logger.userCard(user);

    return { client, user };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Ошибка аутентификации";

    const isUnauthorized =
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      (err as { response?: { status?: number } }).response?.status === 401;

    if (isUnauthorized) {
      spinner.fail("Недействительный токен — аутентификация отклонена");
    } else {
      spinner.fail(`Ошибка соединения: ${message}`);
    }

    throw new Error("Ошибка аутентификации");
  }
}
