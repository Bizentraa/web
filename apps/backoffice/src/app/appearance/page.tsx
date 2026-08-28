import { AppearanceSettings } from "./appearance-settings";
import { Workspace } from "../lib/workspace";

export default function AppearancePage() {
  return (
    <Workspace
      title="Colour theme"
      description="Choose one controlled industry preset, optionally add brand colours, and define how light and dark modes behave across Bizentra."
    >
      <AppearanceSettings />
    </Workspace>
  );
}
