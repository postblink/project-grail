import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export function getBuildSteps(vercelEnv) {
  const steps = [];
  if (vercelEnv === "production") {
    steps.push({ command: "npx", args: ["prisma", "migrate", "deploy"] });
  }
  steps.push({ command: "npm", args: ["run", "build"] });
  return steps;
}

export function executeBuild(vercelEnv, spawn = spawnSync) {
  for (const { command, args } of getBuildSteps(vercelEnv)) {
    const result = spawn(command, args, { stdio: "inherit" });
    if (result.error) {
      console.error(`Could not start ${command}: ${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  process.exitCode = executeBuild(process.env.VERCEL_ENV);
}
