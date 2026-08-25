"use client";

import { StatusCard } from "@bizentra/design-system";
import { useBusinessTheme } from "@bizentra/design-system/theme";
import { getThemePreset } from "@bizentra/themes";

export function ThemeStatusCard() {
  const theme = useBusinessTheme();
  const preset = getThemePreset(theme.settings.preset);

  return (
    <StatusCard title="Business appearance" status={theme.identity ? "ready" : "attention"}>
      <p>
        {theme.identity
          ? `${preset.label} is active in ${theme.resolvedMode.toLowerCase()} mode. This POS origin keeps its own browser cache and refreshes from the shared Business record.`
          : "Configure the local development identity to load the saved Business theme."}
      </p>
    </StatusCard>
  );
}
