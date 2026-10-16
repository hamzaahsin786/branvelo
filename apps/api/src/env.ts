/** API env - validated once at boot. */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[mezban-api] Missing required env var: ${name}`);
  return v;
}

export const env = {
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  PORT: Number(process.env.PORT || 3001),
  WEB_ORIGIN: (process.env.WEB_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
