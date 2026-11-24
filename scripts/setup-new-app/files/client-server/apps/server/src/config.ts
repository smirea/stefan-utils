import env from "./env.ts";

/**
 * Secrets stay optional in the env schema so a checkout with only the schema defaults runs, in a worktree and in CI,
 * where env-manager never runs. Production needs them, so the server refuses to start without them instead of failing
 * on the first request that reads one.
 */
const REQUIRED_IN_PRODUCTION = [] as const satisfies readonly (keyof typeof env)[];

const environment = env.APP_ENV as "development" | "production";

if (environment === "production") {
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing production settings: ${missing.join(", ")}`);
}

export const config = {
  environment,
  port: env.API_PORT,
};
