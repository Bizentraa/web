"use client";

import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CheckField,
  Field,
  FormGrid,
  Kicker,
  SelectField,
  Stack,
  StatePanel,
} from "@bizentra/design-system";
import { useBusinessTheme } from "@bizentra/design-system/theme";
import {
  DEFAULT_BUSINESS_THEME,
  getThemePaletteName,
  getThemePreset,
  resolveTheme,
  THEME_PRESETS,
  themeTokensToCss,
  type ResolvedThemeMode,
  type ThemeMode,
  type ThemePreset,
} from "@bizentra/themes";
import { type CSSProperties, type FormEvent, useEffect, useState } from "react";

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
  const [previewMode, setPreviewMode] = useState<ResolvedThemeMode>("LIGHT");

  useEffect(() => setDraft(toDraft(theme.settings)), [theme.settings]);
  useEffect(() => {
    setPreviewMode(draft.defaultMode === "DARK" ? "DARK" : "LIGHT");
  }, [draft.defaultMode]);

  if (!theme.identity) return <DevelopmentIdentityForm />;

  const selectedPreset = getThemePreset(draft.preset);
  const selectedPaletteName = getThemePaletteName(draft.preset);

  /*
   * The preview runs the real resolver, not an approximation - the same function the application
   * calls on every theme change, given the unsaved draft and a fixed mode. What is on screen here
   * is therefore exactly what saving would produce, including the derived hover, soft and
   * foreground colours that a row of three swatches could never show.
   */
  const previewTokens = themeTokensToCss(
    resolveTheme({ ...theme.settings, ...draft }, previewMode, previewMode === "DARK").tokens,
  ) as CSSProperties;

  const dirty =
    draft.preset !== theme.settings.preset ||
    draft.defaultMode !== theme.settings.defaultMode ||
    draft.allowUserModeChange !== theme.settings.allowUserModeChange ||
    draft.brandPrimary !== theme.settings.brandPrimary ||
    draft.brandAccent !== theme.settings.brandAccent;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSavedMessage(null);
    try {
      await theme.saveTheme({ ...draft, expectedRevision: theme.settings.revision });
      setSavedMessage("Theme saved. Back Office and POS use it for this Business from now on.");
    } catch {
      // The provider surfaces the API error below and keeps the last valid cached theme.
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
    setSavedMessage(null);
  };

  return (
    <form className="ui-screen-grid" onSubmit={(event) => void save(event)}>
      <main className="ui-screen-main">
        <Stack>
          {theme.error ? (
            <StatePanel state="error" title="The saved theme could not be loaded">
              {theme.error}
            </StatePanel>
          ) : null}

          <Card>
            <CardHeader>
              <div>
                <Kicker>CC-P0-008</Kicker>
                <CardTitle>Colour palette</CardTitle>
              </div>
              <Badge tone="neutral">{THEME_PRESETS.length} palettes</Badge>
            </CardHeader>
            <CardDescription>
              Each palette is a controlled pair of light and dark primaries with a matching accent.
              Status colours never change, so success stays green and danger stays red whatever is
              chosen here.
            </CardDescription>
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
          </Card>

          <Card>
            <CardHeader>
              <div>
                <Kicker>Optional</Kicker>
                <CardTitle>Brand colours</CardTitle>
              </div>
              <Badge tone={(draft.brandPrimary ?? draft.brandAccent) ? "information" : "neutral"}>
                {(draft.brandPrimary ?? draft.brandAccent) ? "Overridden" : "Using the palette"}
              </Badge>
            </CardHeader>
            <CardDescription>
              Replace the palette&rsquo;s primary or accent with the Business&rsquo;s own colour.
              Everything derived from it - hover, soft fills, readable text on top - is
              recalculated, which the preview shows.
            </CardDescription>
            <FormGrid>
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
            </FormGrid>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <Kicker>Light and dark</Kicker>
                <CardTitle>Display mode</CardTitle>
              </div>
              <Badge tone="neutral">Now showing {theme.resolvedMode.toLowerCase()}</Badge>
            </CardHeader>
            <FormGrid>
              <SelectField
                hint="What every device uses unless it is allowed to choose."
                label="Business default"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    defaultMode: event.target.value as ThemeMode,
                  }))
                }
                value={draft.defaultMode}
              >
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">Follow the device setting</option>
              </SelectField>
              <SelectField
                disabled={!draft.allowUserModeChange}
                hint={
                  draft.allowUserModeChange
                    ? "Applies to this browser only, and is not saved to the Business."
                    : "Turn on the per-device choice below to use this."
                }
                label="This browser"
                onChange={(event) =>
                  theme.setDeviceMode(
                    event.target.value as Parameters<typeof theme.setDeviceMode>[0],
                  )
                }
                value={theme.deviceMode}
              >
                <option value="BUSINESS_DEFAULT">Use the Business default</option>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">Follow the device setting</option>
              </SelectField>
            </FormGrid>
            <CheckField
              checked={draft.allowUserModeChange}
              description="A bar, kitchen or bright counter terminal can then pick the mode that suits its own light."
              label="Allow a per-device choice"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  allowUserModeChange: event.target.checked,
                }))
              }
            />
          </Card>
        </Stack>
      </main>

      <aside className="ui-screen-side">
        <div className="ui-sticky-panel">
          <Stack>
            <Card>
              <CardHeader>
                <div>
                  <Kicker>Live preview</Kicker>
                  <CardTitle>{selectedPaletteName}</CardTitle>
                </div>
                <div className="ui-row">
                  <Button
                    aria-pressed={previewMode === "LIGHT"}
                    onClick={() => setPreviewMode("LIGHT")}
                    size="quiet"
                    type="button"
                    variant={previewMode === "LIGHT" ? "primary" : "secondary"}
                  >
                    Light
                  </Button>
                  <Button
                    aria-pressed={previewMode === "DARK"}
                    onClick={() => setPreviewMode("DARK")}
                    size="quiet"
                    type="button"
                    variant={previewMode === "DARK" ? "primary" : "secondary"}
                  >
                    Dark
                  </Button>
                </div>
              </CardHeader>

              <div className="theme-preview" style={previewTokens}>
                <div className="theme-preview-rail">
                  <span className="theme-preview-brand" />
                  <span className="theme-preview-nav theme-preview-nav--active" />
                  <span className="theme-preview-nav" />
                  <span className="theme-preview-nav" />
                </div>
                <div className="theme-preview-body">
                  <div className="theme-preview-bar">
                    <span />
                    <em>Sales and shifts</em>
                  </div>
                  <div className="theme-preview-card">
                    <strong>LKR 3,851.00</strong>
                    <small>4 sales in total</small>
                    <div className="theme-preview-actions">
                      <span className="theme-preview-button">Open sales</span>
                      <span className="theme-preview-button theme-preview-button--quiet">
                        Manage
                      </span>
                    </div>
                  </div>
                  <div className="theme-preview-chips">
                    <span data-tone="success">Active</span>
                    <span data-tone="warning">Pending</span>
                    <span data-tone="danger">Refused</span>
                  </div>
                </div>
              </div>

              <CardDescription>
                Status colours are fixed by the design system, so they stay readable on every
                palette.
              </CardDescription>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <Kicker>Revision {theme.settings.revision}</Kicker>
                  <CardTitle>{dirty ? "Unsaved changes" : "Saved"}</CardTitle>
                </div>
                <Badge tone={dirty ? "warning" : "success"}>
                  {dirty ? "Not applied yet" : statusLabel(theme.status)}
                </Badge>
              </CardHeader>
              <CardDescription>
                {dirty
                  ? "Nothing on any device changes until this is saved."
                  : "Back Office and POS are using this theme."}
              </CardDescription>
              {savedMessage ? <p className="ui-card-description">{savedMessage}</p> : null}
              <div className="theme-save-actions">
                <Button onClick={resetToDefault} type="button" variant="ghost">
                  Reset to default
                </Button>
                <Button disabled={theme.status === "saving" || !dirty} type="submit">
                  {theme.status === "saving" ? "Saving..." : "Save theme"}
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <Kicker>Active Business</Kicker>
                  <CardTitle>Identity</CardTitle>
                </div>
              </CardHeader>
              <p className="ui-card-description">
                <span className="ui-code">{theme.identity.businessId}</span>
              </p>
              <div className="theme-save-actions">
                <Button onClick={() => void theme.refreshTheme()} type="button" variant="secondary">
                  Refresh from database
                </Button>
                <Button onClick={theme.clearDevelopmentIdentity} type="button" variant="ghost">
                  Change identity
                </Button>
              </div>
            </Card>
          </Stack>
        </div>
      </aside>
    </form>
  );
}

function DevelopmentIdentityForm() {
  const theme = useBusinessTheme();
  const [businessId, setBusinessId] = useState("");
  const [userId, setUserId] = useState("");

  return (
    <Card>
      <CardHeader>
        <div>
          <Kicker>Local development only</Kicker>
          <CardTitle>Select the Business Owner identity</CardTitle>
        </div>
      </CardHeader>
      <CardDescription>
        Until OIDC sign-in is connected, enter the IDs returned by the Business foundation setup
        endpoint. Shared and production environments derive these from the signed-in user.
      </CardDescription>
      <form
        className="ui-stack"
        onSubmit={(event) => {
          event.preventDefault();
          theme.setDevelopmentIdentity({ businessId: businessId.trim(), userId: userId.trim() });
        }}
      >
        <FormGrid>
          <Field
            label="Business ID"
            onChange={(event) => setBusinessId(event.target.value)}
            required
            value={businessId}
          />
          <Field
            label="Owner user ID"
            onChange={(event) => setUserId(event.target.value)}
            required
            value={userId}
          />
        </FormGrid>
        <div className="theme-save-actions">
          <Button type="submit">Load Business theme</Button>
        </div>
      </form>
    </Card>
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
          <code className="ui-code">{value ?? fallback}</code>
        </span>
      </label>
      <Button
        disabled={value === null}
        onClick={() => onChange(null)}
        size="quiet"
        type="button"
        variant="ghost"
      >
        {value === null ? "From palette" : "Use palette colour"}
      </Button>
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
    loading: "Checking database...",
    ready: "Synced",
    saving: "Saving...",
    cached: "Using browser cache",
    error: "Needs attention",
  } as const;
  return labels[status];
}
