import { DiscordClient } from "../api/client";
import { RoleIdMap, CreateRolePayload } from "../types";
import { Logger } from "../ui/logger";
import { Spinner } from "../ui/spinner";
import { sleep, withRetry, withTimeout } from "../utils/api";

export async function cloneRoles(
  client: DiscordClient,
  sourceGuildId: string,
  targetGuildId: string,
  errors: string[]
): Promise<{ roleIdMap: RoleIdMap; cloned: number }> {
  const spinner = new Spinner("Загрузка ролей...", "dots").start();

  const [sourceRoles, targetRoles] = await Promise.all([
    client.getGuildRoles(sourceGuildId),
    client.getGuildRoles(targetGuildId),
  ]);

  spinner.stop();

  const roleIdMap: RoleIdMap = {};
  let cloned = 0;

  const deletableTargetRoles = targetRoles.filter(
    (r) => r.name !== "@everyone" && !r.managed
  );

  if (deletableTargetRoles.length > 0) {
    Logger.step(`Удаление ${deletableTargetRoles.length} существующих ролей с целевого сервера`);

    for (const role of deletableTargetRoles) {
      try {
        await withTimeout(() => client.deleteRole(targetGuildId, role.id), 6000);
        Logger.delete("Роль удалена", role.name);
      } catch {
        errors.push(`Ошибка удаления роли: ${role.name}`);
      }
      await sleep(350);
    }

    await sleep(1000);
  }

  const sortedRoles = [...sourceRoles]
    .filter((r) => r.name !== "@everyone" && !r.managed)
    .sort((a, b) => a.position - b.position);

  Logger.step(`Клонирование ${sortedRoles.length} ролей по порядку...`);

  const createdRoles: Array<{ oldId: string; newId: string; position: number }> = [];

  for (const sourceRole of sortedRoles) {
    const payload: CreateRolePayload = {
      name: sourceRole.name,
      permissions: sourceRole.permissions,
      color: sourceRole.color,
      hoist: sourceRole.hoist,
      mentionable: sourceRole.mentionable,
    };

    if (sourceRole.unicode_emoji !== undefined && sourceRole.unicode_emoji !== null) {
      payload.unicode_emoji = sourceRole.unicode_emoji;
    }

    try {
      const newRole = await withRetry(
        () => withTimeout(() => client.createRole(targetGuildId, payload), 8000),
        3,
        600
      );
      roleIdMap[sourceRole.id] = newRole.id;
      createdRoles.push({ oldId: sourceRole.id, newId: newRole.id, position: sourceRole.position });
      cloned++;
      Logger.clone("Роль создана", sourceRole.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      errors.push(`Ошибка создания роли "${sourceRole.name}": ${msg}`);
      Logger.error("Ошибка создания роли", sourceRole.name);
    }
    await sleep(400);
  }

  if (createdRoles.length > 0) {
    Logger.step("Сортировка позиций ролей...");
    const positionPayload = createdRoles
      .sort((a, b) => a.position - b.position)
      .map((r, i) => ({ id: r.newId, position: i + 1 }));

    try {
      await client.modifyRolePositions(targetGuildId, positionPayload);
      Logger.success("Позиции ролей применены");
    } catch {
      errors.push("Ошибка изменения порядка ролей");
    }
  }

  const everyoneSource = sourceRoles.find((r) => r.name === "@everyone");
  const everyoneTarget = targetRoles.find((r) => r.name === "@everyone");

  if (everyoneSource && everyoneTarget) {
    roleIdMap[everyoneSource.id] = everyoneTarget.id;
  }

  return { roleIdMap, cloned };
}
