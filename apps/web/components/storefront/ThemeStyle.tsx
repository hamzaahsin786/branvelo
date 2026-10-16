import type { Theme } from "@mezban/shared";

/** Emits per-tenant brand tokens as CSS variables (one codebase, unlimited skins). */
export function ThemeStyle({ theme }: { theme: Theme }) {
  const css = [
    `--brand:${theme.primary || "#15803d"}`,
    `--brand-dark:${theme.dark || "#14532d"}`,
    `--accent:${theme.accent || "#FFC400"}`,
    `--ink:${theme.ink || "#1a1a1a"}`,
    `--muted:${theme.muted || "#f3f4f6"}`,
  ].join(";");
  return <style dangerouslySetInnerHTML={{ __html: `:root{${css}}` }} />;
}
