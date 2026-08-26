"use client";

import { useBusinessTheme } from "@bizentra/design-system/theme";
import {
  DEFAULT_BUSINESS_THEME,
  getThemePaletteName,
  getThemePreset,
  THEME_PRESETS,
  type ThemeMode,
  type ThemePreset,
} from "@bizentra/themes";
import { type FormEvent, useEffect, useState } from "react";

interface ThemeDraft {
  preset: ThemePreset;
  defaultMode: ThemeMode;
  allowUserModeChange: boolean;
  brandPrimary: string | null;
  brandAccent: string | null;
}

export function AppearanceSettings() {
  const theme = useBusinessTheme();
  const [draft, setDraft] = useState<ThemeDraft>(() => toDraft(theme.settings));
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => setDraft(toDraft(theme.settings)), [theme.settings]);

  if (!theme.identity) return <DevelopmentIdentityForm />;

  const selectedPreset = getThemePreset(draft.preset);
  const selectedPaletteName = getThemePaletteName(draft.preset);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSavedMessage(null);
    try {
      await theme.saveTheme({
        ...draft,
        expectedRevision: theme.settings.revision,
      });
      setSavedMessage("Theme saved. POS and Back Office will use it for this Business.");
    } catch {
      // The provider exposes the API error in the page and keeps the last valid cached theme.
    }
  };

  const resetToDefault = () => {
    setDraft({
      preset: DEFAULT_BUSINESS_THEME.preset,
      defaultMode: DEFAULT_BUSINESS_THEME.defaultMode,
      allowUserModeChange: DEFAULT_BUSINESS_THEME.allowUserModeChange,
      brandPrimary: null,
      brandAccent: null,
    });
    setSavedMessage("Default theme selected. Save to apply it for this Business.");
  };

  return (
    <form className="theme-settings" onSubmit={(event) => void save(event)}>
      <section className="theme-panel theme-context-panel theme-compact-panel">
        <div>
          <span className="theme-kicker">Active Business</span>
          <strong>{theme.identity.businessId}</strong>
          <small>Theme changes apply to Back Office and POS after save.</small>
        </div>
        <div className="theme-context-actions">
          <span className={`theme-sync-state theme-sync-state--${theme.status}`}>
            {statusLabel(theme.status)}
          </span>
          <button
            className="theme-text-button"
            type="button"
            onClick={() => void theme.refreshTheme()}
          >
            Refresh
          </button>
          <button
            className="theme-text-button"
            type="button"
            onClick={theme.clearDevelopmentIdentity}
          >
            Change local identity
          </button>
        </div>
      </section>

      {theme.error ? <p className="theme-message theme-message--error">{theme.error}</p> : null}
      {savedMessage ? <p className="theme-message theme-message--success">{savedMessage}</p> : null}

      <section className="theme-panel theme-overview-panel">
        <div>
          <span className="theme-kicker">Selected palette</span>
          <h2>{selectedPaletteName}</h2>
          <p className="theme-help">
            Internally this is saved as the compatible preset code `{draft.preset}`. The owner sees
            the colour style name, not the business-type name.
          </p>
        </div>
        <div className="theme-preview-card">
          <span className="theme-swatches" aria-hidden="true">
            <span style={{ background: draft.brandPrimary ?? selectedPreset.lightPrimary }} />
            <span style={{ background: selectedPreset.darkPrimary }} />
            <span style={{ background: draft.brandAccent ?? selectedPreset.accent }} />
          </span>
          <strong>Live workspace preview</strong>
          <small>
            {draft.defaultMode === "SYSTEM" ? "Follows device setting" : draft.defaultMode}
          </small>
        </div>
      </section>

      <div className="theme-workspace-grid">
        <section className="theme-panel theme-palette-panel">
          <div className="theme-section-heading">
            <div>
              <span className="theme-kicker">Step 1</span>
              <h2>Choose a colour palette</h2>
            </div>
            <span>{THEME_PRESETS.length} controlled palettes</span>
          </div>
          <div className="theme-grid">
            {THEME_PRESETS.map((preset) => (
              <button
                aria-pressed={draft.preset === preset.code}
                className="theme-preset-card"
                key={preset.code}
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    preset: preset.code,
                    defaultMode: preset.defaultMode,
                  }))
                }
              >
                <span className="theme-swatches" aria-hidden="true">
                  <span style={{ background: preset.lightPrimary }} />
                  <span style={{ background: preset.darkPrimary }} />
                  <span style={{ background: preset.accent }} />
                </span>
                <strong>{getThemePaletteName(preset.code)}</strong>
                <small>{preset.character}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="theme-side-stack">
          <section className="theme-panel">
            <span className="theme-kicker">Step 2</span>
            <h2>Business brand override</h2>
            <p className="theme-help">
              Keep the preset colours, or set a controlled primary/accent pair. Status colours such
              as danger, warning and success never change.
            </p>
            <ColourOverride
              label="Primary colour"
              fallback={selectedPreset.lightPrimary}
              value={draft.brandPrimary}
              onChange={(brandPrimary) => setDraft((current) => ({ ...current, brandPrimary }))}
            />
            <ColourOverride
              label="Accent colour"
              fallback={selectedPreset.accent}
              value={draft.brandAccent}
              onChange={(brandAccent) => setDraft((current) => ({ ...current, brandAccent }))}
            />
          </section>

          <section className="theme-panel">
            <span className="theme-kicker">Step 3</span>
            <h2>Display mode</h2>
            <label className="theme-field">
              <span>Business default</span>
              <select
                value={draft.defaultMode}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    defaultMode: event.target.value as ThemeMode,
                  }))
                }
              >
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">Follow device system</option>
              </select>
            </label>
            <label className="theme-check-field">
              <input
                checked={draft.allowUserModeChange}
                type="checkbox"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    allowUserModeChange: event.target.checked,
                  }))
                }
              />
              <span>
                <strong>Allow a per-device choice</strong>
                <small>Useful for bar, kitchen, workshop and bright counter terminals.</small>
              </span>
            </label>
            <label className="theme-field">
              <span>This browser</span>
              <select
                disabled={!draft.allowUserModeChange}
                value={theme.deviceMode}
                onChange={(event) =>
                  theme.setDeviceMode(
                    event.target.value as Parameters<typeof theme.setDeviceMode>[0],
                  )
                }
              >
                <option value="BUSINESS_DEFAULT">Use Business default</option>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">Follow device system</option>
              </select>
            </label>
            <p className="theme-help">
              Currently rendered in {theme.resolvedMode.toLowerCase()} mode.
            </p>
          </section>
        </aside>
      </div>

      <div className="theme-save-bar">
        <div>
          <strong>{selectedPaletteName}</strong>
          <span>Revision {theme.settings.revision}</span>
        </div>
        <div className="theme-save-actions">
          <button className="theme-text-button" type="button" onClick={resetToDefault}>
            Reset to default
          </button>
          <button
            className="theme-primary-button"
            disabled={theme.status === "saving"}
            type="submit"
          >
            {theme.status === "saving" ? "Saving…" : "Save Business theme"}
          </button>
        </div>
      </div>
    </form>
  );
}

function DevelopmentIdentityForm() {
  const theme = useBusinessTheme();
  const [businessId, setBusinessId] = useState("");
  const [userId, setUserId] = useState("");

  return (
    <form
      className="theme-panel theme-identity-form"
      onSubmit={(event) => {
        event.preventDefault();
        theme.setDevelopmentIdentity({ businessId: businessId.trim(), userId: userId.trim() });
      }}
    >
      <span className="theme-kicker">Local development only</span>
      <h2>Select the Business Owner identity</h2>
      <p className="theme-help">
        Until OIDC sign-in is connected, enter the IDs returned by the Business foundation setup
        endpoint. Shared and production environments will derive these from the signed-in user.
      </p>
      <label className="theme-field">
        <span>Business ID</span>
        <input
          required
          value={businessId}
          onChange={(event) => setBusinessId(event.target.value)}
        />
      </label>
      <label className="theme-field">
        <span>Owner user ID</span>
        <input required value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>
      <button className="theme-primary-button" type="submit">
        Load Business theme
      </button>
    </form>
  );
}

function ColourOverride({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | null;
  fallback: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="theme-colour-field">
      <label>
        <span>{label}</span>
        <span className="theme-colour-input">
          <input
            aria-label={label}
            type="color"
            value={value ?? fallback}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
          <code>{value ?? `${fallback} (preset)`}</code>
        </span>
      </label>
      <button
        className="theme-text-button"
        disabled={value === null}
        type="button"
        onClick={() => onChange(null)}
      >
        Use preset
      </button>
    </div>
  );
}

function toDraft(settings: ReturnType<typeof useBusinessTheme>["settings"]): ThemeDraft {
  return {
    preset: settings.preset,
    defaultMode: settings.defaultMode,
    allowUserModeChange: settings.allowUserModeChange,
    brandPrimary: settings.brandPrimary,
    brandAccent: settings.brandAccent,
  };
}

function statusLabel(status: ReturnType<typeof useBusinessTheme>["status"]): string {
  const labels = {
    idle: "Waiting for Business",
    loading: "Checking database…",
    ready: "Synced with database",
    saving: "Saving…",
    cached: "Using browser cache",
    error: "Needs attention",
  } as const;
  return labels[status];
}
