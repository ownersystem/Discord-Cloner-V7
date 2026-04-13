import chalk from "chalk";

const BLUE_BRIGHT = chalk.hex("#7289DA").bold;
const BLUE_DIM = chalk.hex("#4752C4");
const CYAN = chalk.hex("#00D4FF");
const WHITE = chalk.white;
const GRAY = chalk.hex("#99AAB5");

const ASCII_LOGO = `
██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ██████╗
██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
██║  ██║██║███████╗██║     ██║   ██║██████╔╝██║  ██║
██║  ██║██║╚════██║██║     ██║   ██║██╔══██╗██║  ██║
██████╔╝██║███████║╚██████╗╚██████╔╝██║  ██║██████╔╝
╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
 ██████╗██╗      ██████╗ ███╗   ██╗███████╗██████╗
██╔════╝██║     ██╔═══██╗████╗  ██║██╔════╝██╔══██╗
██║     ██║     ██║   ██║██╔██╗ ██║█████╗  ██████╔╝
██║     ██║     ██║   ██║██║╚██╗██║██╔══╝  ██╔══██╗
╚██████╗███████╗╚██████╔╝██║ ╚████║███████╗██║  ██║
 ╚═════╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝`;

const LINE = BLUE_DIM("─".repeat(70));

export function renderBanner(): void {
  console.clear();

  const logoLines = ASCII_LOGO.split("\n").filter((l) => l.trim().length > 0);

  console.log();
  console.log(LINE);
  console.log();

  logoLines.forEach((line) => {
    console.log(BLUE_BRIGHT(line));
  });

  console.log();
  console.log(LINE);
  console.log();

  const metaLeft = `${GRAY("система")}  ${CYAN("DiscordCloner")}    ${GRAY("версия")}  ${WHITE("7.0")}`;
  const metaRight = `${GRAY("владелец")}   ${CYAN("ownersystem")}    ${GRAY("сборка")}    ${WHITE("stable")}`;

  console.log(
    `   ${metaLeft}`
  );
  console.log(
    `   ${metaRight}`
  );
  console.log();
  console.log(LINE);
  console.log();
  console.log(
    `   ${GRAY("Введите ID серверов и токен для начала клонирования.")}`
  );
  console.log();
}

export function renderSectionHeader(title: string): void {
  const pad = "─".repeat(Math.max(0, 68 - title.length - 4));
  console.log();
  console.log(BLUE_DIM(`┌── ${title} ${pad}┐`));
  console.log();
}

export function renderSectionFooter(): void {
  console.log();
  console.log(BLUE_DIM("└" + "─".repeat(69) + "┘"));
  console.log();
}
