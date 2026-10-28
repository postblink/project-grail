import assert from "node:assert/strict";
import { test } from "node:test";
import * as o from "oauth4webapi";
import { authConfig, DISCORD_ISSUER } from "./auth.config";

type ProviderLike = { id?: string; options?: { issuer?: string } };

test("Discord provider declares Discord's issuer", () => {
  const discord = (authConfig.providers as ProviderLike[]).find(
    (p) => p.id === "discord"
  );
  assert.ok(discord, "discord provider is configured");
  assert.equal(discord.options?.issuer, DISCORD_ISSUER);
});

test("Discord's iss parameter passes the Auth.js callback check", () => {
  const client = { client_id: "test" };
  const params = new URLSearchParams({
    code: "c",
    state: "s",
    iss: "https://discord.com",
  });
  const validate = (issuer: string) =>
    o.validateAuthResponse({ issuer }, client, params, "s");

  assert.doesNotThrow(() => validate(DISCORD_ISSUER));
  // The pre-fix fallback issuer, which is what broke production sign-in.
  assert.throws(() => validate("https://authjs.dev"), /iss/);
});
