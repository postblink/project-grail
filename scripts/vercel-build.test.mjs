import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeBuild, getBuildSteps } from "./vercel-build.mjs";

describe("Vercel build migration gate", () => {
  it("runs migrations before building only for production deployments", () => {
    assert.deepEqual(getBuildSteps("production"), [
      { command: "npx", args: ["prisma", "migrate", "deploy"] },
      { command: "npm", args: ["run", "build"] },
    ]);
    assert.deepEqual(getBuildSteps("preview"), [
      { command: "npm", args: ["run", "build"] },
    ]);
    assert.deepEqual(getBuildSteps(undefined), [
      { command: "npm", args: ["run", "build"] },
    ]);
  });

  it("does not start the app build if migration deployment fails", () => {
    const calls = [];
    const status = executeBuild("production", (command, args) => {
      calls.push({ command, args });
      return { status: 1 };
    });

    assert.equal(status, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "npx");
  });

  it("runs the build in non-production deployments without attempting migration", () => {
    const calls = [];
    const status = executeBuild("preview", (command, args) => {
      calls.push({ command, args });
      return { status: 0 };
    });

    assert.equal(status, 0);
    assert.deepEqual(calls, [{ command: "npm", args: ["run", "build"] }]);
  });
});
