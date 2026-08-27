"use client";

import type { BusinessFoundationSummary, LocationType } from "@bizentra/contracts";
import {
  Badge,
  Button,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Field,
  FormCard,
  FormFooter,
  FormGrid,
  Kicker,
  SelectField,
  Stack,
  StatusChip,
} from "@bizentra/design-system";
import { ConfirmDialog, Dialog, Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

const LOCATION_TYPES: LocationType[] = [
  "SHOP_FLOOR",
  "WAREHOUSE",
  "KITCHEN",
  "VAN",
  "SERVICE_BAY",
  "QUARANTINE",
  "OTHER",
];

export default function SetupPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const { data, state, error, reload } = useResource<BusinessFoundationSummary>(
    (client, businessId) => client.getBusinessFoundation(businessId),
  );
  const [tab, setTab] = useState("business");
  const [busy, setBusy] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState<string | null>(null);
  const [deactivate, setDeactivate] = useState<{ id: string; name: string } | null>(null);

  const run = async (message: string, work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: message, tone: "success" });
      return true;
    } catch (cause) {
      toasts.push({
        title: "That change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveBusiness = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    await run("Business details saved.", () =>
      api.updateBusiness(identity.businessId, {
        name: readText(form, "name"),
        legalName: readOptionalText(form, "legalName") ?? null,
        email: readOptionalText(form, "email") ?? null,
        phone: readOptionalText(form, "phone") ?? null,
        defaultCurrency: readText(form, "defaultCurrency"),
        timeZone: readText(form, "timeZone"),
        countryCode: readText(form, "countryCode"),
      }),
    );
  };

  const createBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    const ok = await run("Branch created.", () =>
      api.createBranch(identity.businessId, {
        code: readText(form, "code"),
        name: readText(form, "name"),
        firstLocation: {
          code: readText(form, "locationCode", "SHOP"),
          name: readText(form, "locationName", "Shop Floor"),
          type: readText(form, "locationType", "SHOP_FLOOR") as LocationType,
        },
      }),
    );
    if (ok) setBranchDialog(false);
  };

  const createLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !locationDialog) return;
    const form = new FormData(event.currentTarget);
    const ok = await run("Location created.", () =>
      api.createLocation(identity.businessId, {
        branchId: locationDialog,
        code: readText(form, "code"),
        name: readText(form, "name"),
        type: readText(form, "type", "SHOP_FLOOR") as LocationType,
      }),
    );
    if (ok) setLocationDialog(null);
  };

  const branches = data?.branches ?? [];
  const locations = branches.flatMap((branch) =>
    branch.locations.map((location) => ({
      ...location,
      branchName: branch.name,
      branchId: branch.id,
    })),
  );

  return (
    <Workspace
      requirements="CC-P0-001 to CC-P0-004"
      status={<StatusChip tone="success">{branches.length} Branch(es)</StatusChip>}
      description="The Business, its Branches and the Locations where stock and work are managed."
      eyebrow="Common Core · P0"
      title="Business setup"
      headerActions={
        <Button onClick={() => setBranchDialog(true)} disabled={!data}>
          New Branch
        </Button>
      }
    >
      <Stack>
        <Tabs
          onChange={setTab}
          value={tab}
          tabs={[
            { value: "business", label: "Business details" },
            { value: "branches", label: "Branches", badge: String(branches.length) },
            { value: "locations", label: "Locations", badge: String(locations.length) },
          ]}
        />

        <ResourceState error={error} onRetry={reload} state={state} title="Business setup">
          {data ? (
            <>
              {tab === "business" ? (
                <FormCard onSubmit={(event) => void saveBusiness(event)}>
                  <CardHeader>
                    <div>
                      <Kicker>CC-P0-001</Kicker>
                      <CardTitle>Business details</CardTitle>
                    </div>
                    <Badge tone={data.business.status === "ACTIVE" ? "success" : "neutral"}>
                      {data.business.status}
                    </Badge>
                  </CardHeader>
                  <CardDescription>
                    Currency, time zone and country drive pricing, receipts and reporting for every
                    Branch.
                  </CardDescription>
                  <FormGrid>
                    <Field
                      label="Business name"
                      name="name"
                      defaultValue={data.business.name}
                      required
                    />
                    <Field
                      label="Legal name"
                      name="legalName"
                      defaultValue={data.business.legalName ?? ""}
                    />
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      defaultValue={data.business.email ?? ""}
                    />
                    <Field label="Phone" name="phone" defaultValue={data.business.phone ?? ""} />
                    <Field
                      label="Default currency"
                      name="defaultCurrency"
                      defaultValue={data.business.defaultCurrency}
                      hint="Three letter code, for example LKR"
                      maxLength={3}
                      required
                    />
                    <Field
                      label="Time zone"
                      name="timeZone"
                      defaultValue={data.business.timeZone}
                      hint="For example Asia/Colombo"
                      required
                    />
                    <Field
                      label="Country"
                      name="countryCode"
                      defaultValue={data.business.countryCode}
                      hint="Two letter code, for example LK"
                      maxLength={2}
                      required
                    />
                  </FormGrid>
                  <FormFooter>
                    <span className="ui-card-description">
                      Changing the currency does not convert prices that are already saved.
                    </span>
                    <Button disabled={busy} type="submit">
                      {busy ? "Saving..." : "Save Business"}
                    </Button>
                  </FormFooter>
                </FormCard>
              ) : null}

              {tab === "branches" ? (
                <DataTable
                  caption="Branches"
                  summary="Stock and work Locations belong to a Branch and are used by inventory and operations later."
                  kicker="CC-P0-003"
                  toolbar={<Button onClick={() => setBranchDialog(true)}>New Branch</Button>}
                  getRowKey={(branch) => branch.id}
                  rows={branches}
                  empty="Create the first Branch to start trading."
                  columns={[
                    { header: "Code", render: (branch) => <strong>{branch.code}</strong> },
                    { header: "Name", render: (branch) => branch.name },
                    {
                      header: "Locations",
                      align: "right",
                      render: (branch) => branch.locations.length,
                    },
                    {
                      header: "Status",
                      render: (branch) => (
                        <Badge tone={branch.status === "ACTIVE" ? "success" : "neutral"}>
                          {branch.status}
                        </Badge>
                      ),
                    },
                    {
                      header: "Actions",
                      align: "right",
                      render: (branch) => (
                        <div className="ui-row">
                          <Button
                            onClick={() => setLocationDialog(branch.id)}
                            size="quiet"
                            variant="secondary"
                          >
                            Add Location
                          </Button>
                          {branch.status === "ACTIVE" ? (
                            <Button
                              onClick={() => setDeactivate({ id: branch.id, name: branch.name })}
                              size="quiet"
                              variant="ghost"
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              disabled={busy}
                              onClick={() =>
                                api && identity
                                  ? void run("Branch activated.", () =>
                                      api.updateBranch(identity.businessId, branch.id, {
                                        status: "ACTIVE",
                                      }),
                                    )
                                  : undefined
                              }
                              size="quiet"
                              variant="secondary"
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              ) : null}

              {tab === "locations" ? (
                <DataTable
                  caption="Locations"
                  kicker="CC-P0-004"
                  toolbar={
                    <CardDescription>
                      Stock and work Locations belong to a Branch and are used by inventory and
                      operations later.
                    </CardDescription>
                  }
                  getRowKey={(location) => location.id}
                  rows={locations}
                  empty="Add a Location such as Shop Floor or Warehouse."
                  columns={[
                    { header: "Code", render: (location) => <strong>{location.code}</strong> },
                    { header: "Name", render: (location) => location.name },
                    { header: "Branch", render: (location) => location.branchName },
                    { header: "Type", render: (location) => readableType(location.type) },
                    {
                      header: "Status",
                      render: (location) => (
                        <Badge tone={location.status === "ACTIVE" ? "success" : "neutral"}>
                          {location.status}
                        </Badge>
                      ),
                    },
                    {
                      header: "Actions",
                      align: "right",
                      render: (location) => (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            api && identity
                              ? void run("Location updated.", () =>
                                  api.updateLocation(identity.businessId, location.id, {
                                    status: location.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                  }),
                                )
                              : undefined
                          }
                          size="quiet"
                          variant="secondary"
                        >
                          {location.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </Button>
                      ),
                    },
                  ]}
                />
              ) : null}
            </>
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog
        onClose={() => setBranchDialog(false)}
        open={branchDialog}
        title="New Branch"
        description="A Branch needs a short code, a name and at least one Location."
      >
        <form className="ui-stack" onSubmit={(event) => void createBranch(event)}>
          <FormGrid>
            <Field label="Branch code" name="code" placeholder="WEST" required />
            <Field label="Branch name" name="name" placeholder="West Branch" required />
            <Field label="First Location code" name="locationCode" defaultValue="SHOP" required />
            <Field
              label="First Location name"
              name="locationName"
              defaultValue="Shop Floor"
              required
            />
            <SelectField label="Location type" name="locationType" defaultValue="SHOP_FLOOR">
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {readableType(type)}
                </option>
              ))}
            </SelectField>
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setBranchDialog(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create Branch
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        onClose={() => setLocationDialog(null)}
        open={locationDialog !== null}
        title="New Location"
        description="Locations describe where stock or work actually sits inside a Branch."
      >
        <form className="ui-stack" onSubmit={(event) => void createLocation(event)}>
          <FormGrid>
            <Field label="Location code" name="code" placeholder="WH01" required />
            <Field label="Location name" name="name" placeholder="Main Warehouse" required />
            <SelectField label="Type" name="type" defaultValue="WAREHOUSE">
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {readableType(type)}
                </option>
              ))}
            </SelectField>
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setLocationDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create Location
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <ConfirmDialog
        busy={busy}
        confirmLabel="Deactivate Branch"
        consequence={`${deactivate?.name ?? "This Branch"} will stop appearing in the POS and in new documents. Existing sales and history stay exactly as they are.`}
        onCancel={() => setDeactivate(null)}
        onConfirm={() => {
          if (!api || !identity || !deactivate) return;
          void run("Branch deactivated.", () =>
            api.updateBranch(identity.businessId, deactivate.id, { status: "INACTIVE" }),
          ).then((ok) => {
            if (ok) setDeactivate(null);
          });
        }}
        open={deactivate !== null}
        title="Deactivate this Branch?"
      />
    </Workspace>
  );
}

function readableType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => (part[0]?.toUpperCase() ?? "") + part.slice(1))
    .join(" ");
}
