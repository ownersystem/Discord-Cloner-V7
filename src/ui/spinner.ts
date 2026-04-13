import chalk from "chalk";

const BLUE = chalk.hex("#5865F2");
const GREEN = chalk.hex("#57F287");
const RED = chalk.hex("#ED4245");
const GRAY = chalk.hex("#99AAB5");
const WHITE = chalk.white;

const FRAMES_DOTS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAMES_CIRCLE = ["◜", "◠", "◝", "◞", "◡", "◟"];
const FRAMES_ARROWS = ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"];
const FRAMES_PULSE = ["█", "▓", "▒", "░", "▒", "▓"];

type SpinnerStyle = "dots" | "circle" | "arrows" | "pulse";

const FRAME_SETS: Record<SpinnerStyle, string[]> = {
  dots: FRAMES_DOTS,
  circle: FRAMES_CIRCLE,
  arrows: FRAMES_ARROWS,
  pulse: FRAMES_PULSE,
};

const CLEAR_LINE = "\x1B[2K\r";

export class Spinner {
  private frame = 0;
  private timer: NodeJS.Timeout | null = null;
  private readonly frames: string[];
  private currentText: string;
  private isRunning = false;

  constructor(initialText: string, style: SpinnerStyle = "dots") {
    this.frames = FRAME_SETS[style];
    this.currentText = initialText;
  }

  start(): this {
    this.isRunning = true;
    this.render();
    this.timer = setInterval(() => this.render(), 80);
    return this;
  }

  update(text: string): this {
    this.currentText = text;
    return this;
  }

  private render(): void {
    if (!this.isRunning) return;
    const frameChar = this.frames[this.frame % this.frames.length];
    const spinner = BLUE(frameChar);
    const text = WHITE(this.currentText);
    const ts = GRAY(new Date().toISOString().slice(11, 19));
    process.stdout.write(`${CLEAR_LINE}   ${GRAY("[" + ts + "]")} ${spinner}  ${text}`);
    this.frame++;
  }

  succeed(text?: string): void {
    this.stop();
    const msg = text ?? this.currentText;
    const ts = GRAY(new Date().toISOString().slice(11, 19));
    process.stdout.write(`${CLEAR_LINE}`);
    console.log(`   ${GRAY("[" + ts + "]")} ${GREEN("✔")}  ${WHITE(msg)}`);
  }

  fail(text?: string): void {
    this.stop();
    const msg = text ?? this.currentText;
    const ts = GRAY(new Date().toISOString().slice(11, 19));
    process.stdout.write(`${CLEAR_LINE}`);
    console.log(`   ${GRAY("[" + ts + "]")} ${RED("✖")}  ${RED(msg)}`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    process.stdout.write(CLEAR_LINE);
  }
}

export async function withSpinner<T>(
  text: string,
  fn: (spinner: Spinner) => Promise<T>,
  style: SpinnerStyle = "dots"
): Promise<T> {
  const spinner = new Spinner(text, style).start();
  try {
    const result = await fn(spinner);
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : "Произошла ошибка");
    throw err;
  }
}

export async function animateTokenCheck(onDone: () => void): Promise<void> {
  const phases = [
    { text: "Инициализация защищённого соединения", delay: 550 },
    { text: "Отправка запроса аутентификации", delay: 650 },
    { text: "Проверка подписи токена", delay: 750 },
    { text: "Получение данных аккаунта", delay: 500 },
    { text: "Установка сессии", delay: 400 },
  ];

  const spinner = new Spinner(phases[0]!.text, "pulse").start();

  for (const phase of phases) {
    spinner.update(phase.text);
    await new Promise((r) => setTimeout(r, phase.delay));
  }

  spinner.stop();
  onDone();
}
