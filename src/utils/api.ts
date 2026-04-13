export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 600
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(baseDelay * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms = 8000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Превышено время ожидания операции")),
        ms
      )
    ),
  ]);
}
