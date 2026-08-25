import { createApiClient } from "@bizentra/api-client";
import { AppShell, StatusCard } from "@bizentra/design-system";
import { connection } from "next/server";

async function readApiStatus(): Promise<"ready" | "attention"> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  try {
    const health = await createApiClient(baseUrl).health();
    return health.status === "ok" ? "ready" : "attention";
  } catch {
    return "attention";
  }
}

export default async function Home() {
  await connection();
  const apiStatus = await readApiStatus();

  return (
    <AppShell
      eyebrow="Common Core · Phase P0"
      title="Bizentra Back Office"
      description="The first working foundation for Businesses, Branches, Locations, access control, audit records and document numbering."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
        }}
      >
        <StatusCard title="API and PostgreSQL" status={apiStatus}>
          <p>
            {apiStatus === "ready"
              ? "The application can reach the P0 API and its database."
              : "Start Docker infrastructure and the API, then refresh this page."}
          </p>
        </StatusCard>
        <StatusCard title="Business foundation" status="ready">
          <p>
            The bootstrap endpoint creates the first Business, Branch, Location and owner access.
          </p>
        </StatusCard>
        <StatusCard title="Management screens" status="planned">
          <p>User, Role, approval-rule and feature-pack screens are the next P0 delivery slices.</p>
        </StatusCard>
      </div>
    </AppShell>
  );
}
