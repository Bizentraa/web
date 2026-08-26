"use client";

import type { AccessOverview, BusinessFoundationSummary } from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Field,
  FormFooter,
  FormGrid,
  Kicker,
  PageHeader,
  SelectField,
  Stack,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import { Dialog, Drawer, Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface AccessData {
  access: AccessOverview;
  foundation: BusinessFoundationSummary;
}

export default function AccessPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const { data, state, error, reload } = useResource<AccessData>(async (client, businessId) => {
    const [access, foundation] = await Promise.all([
      client.getAccessOverview(businessId),
      client.getBusinessFoundation(businessId),
    ]);
    return { access, foundation };
  });

  const [tab, setTab] = useState("users");
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRoleOpen, setNewRoleOpen] = useState(false);

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

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    const ok = await run("Invitation created.", () =>
      api.inviteUser(identity.businessId, {
        email: readText(form, "email"),
        displayName: readText(form, "displayName"),
        roleIds: form
          .getAll("roleIds")
          .filter((value): value is string => typeof value === "string"),
        branchIds: form
          .getAll("branchIds")
          .filter((value): value is string => typeof value === "string"),
      }),
    );
    if (ok) setInviteOpen(false);
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !editingUser) return;
    const form = new FormData(event.currentTarget);
    const ok = await run("User updated.", () =>
      api.updateMembership(identity.businessId, editingUser, {
        displayName: readText(form, "displayName"),
        status: readText(form, "status", "ACTIVE") as "INVITED" | "ACTIVE" | "SUSPENDED",
        roleIds: form
          .getAll("roleIds")
          .filter((value): value is string => typeof value === "string"),
        branchIds: form
          .getAll("branchIds")
          .filter((value): value is string => typeof value === "string"),
      }),
    );
    if (ok) setEditingUser(null);
  };

  const createRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    const templateCode = readText(form, "templateCode");
    const ok = await run("Role created.", () =>
      api.createRole(identity.businessId, {
        code: readText(form, "code"),
        name: readText(form, "name"),
        description: readText(form, "description") || undefined,
        permissions: [],
        ...(templateCode ? { templateCode } : {}),
      }),
    );
    if (ok) setNewRoleOpen(false);
  };

  const saveRolePermissions = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !editingRole) return;
    const form = new FormData(event.currentTarget);
    const ok = await run("Role permissions saved.", () =>
      api.updateRole(identity.businessId, editingRole, {
        name: readText(form, "name"),
        permissions: form
          .getAll("permissions")
          .filter((value): value is string => typeof value === "string"),
      }),
    );
    if (ok) setEditingRole(null);
  };

  const memberships = data?.access.memberships ?? [];
  const roles = data?.access.roles ?? [];
  const branches = data?.foundation.branches ?? [];
  const catalog = data?.access.permissionCatalog ?? [];
  const areas = [...new Set(catalog.map((permission) => permission.area))];
  const activeUser = memberships.find((member) => member.membershipId === editingUser);
  const activeRole = roles.find((role) => role.id === editingRole);

  return (
    <Workspace
      activeHref="/access"
      description="Users, Roles and the fine-grained permissions that decide who can do what."
      eyebrow="Common Core · P0"
      title="Users and roles"
      headerActions={
        <Button disabled={!data} onClick={() => setInviteOpen(true)}>
          Invite user
        </Button>
      }
    >
      <Stack>
        <PageHeader
          eyebrow="CC-P0-005 and CC-P0-006"
          title="Access control"
          description="A user sees only the actions their Role allows. Denied actions explain the missing permission instead of failing silently."
          status={<StatusChip tone="success">{memberships.length} user(s)</StatusChip>}
        />

        <Tabs
          onChange={setTab}
          value={tab}
          tabs={[
            { value: "users", label: "Users", badge: String(memberships.length) },
            { value: "roles", label: "Roles", badge: String(roles.length) },
            { value: "permissions", label: "Permission catalogue", badge: String(catalog.length) },
          ]}
        />

        <ResourceState error={error} onRetry={reload} state={state} title="Access control">
          {data ? (
            <>
              {tab === "users" ? (
                <Card>
                  <CardHeader>
                    <div>
                      <Kicker>CC-P0-005</Kicker>
                      <CardTitle>People with access</CardTitle>
                    </div>
                    <Button onClick={() => setInviteOpen(true)} size="quiet">
                      Invite user
                    </Button>
                  </CardHeader>
                  <DataTable
                    caption="Every person who can sign in to this Business."
                    getRowKey={(member) => member.membershipId}
                    rows={memberships}
                    empty="Invite the people who will use the system."
                    columns={[
                      { header: "Name", render: (member) => <strong>{member.displayName}</strong> },
                      { header: "Email", render: (member) => member.email },
                      {
                        header: "Roles",
                        render: (member) =>
                          member.roles.length
                            ? member.roles.map((role) => role.name).join(", ")
                            : "No Role yet",
                      },
                      {
                        header: "Branches",
                        hideOnMobile: true,
                        render: (member) =>
                          member.branches.length
                            ? member.branches.map((branch) => branch.code).join(", ")
                            : "All",
                      },
                      {
                        header: "Status",
                        render: (member) => (
                          <Badge
                            tone={
                              member.status === "ACTIVE"
                                ? "success"
                                : member.status === "INVITED"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {member.status}
                          </Badge>
                        ),
                      },
                      {
                        header: "Actions",
                        align: "right",
                        render: (member) => (
                          <div className="ui-row">
                            {member.status === "INVITED" ? (
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  api && identity
                                    ? void run("User activated.", () =>
                                        api.updateMembership(
                                          identity.businessId,
                                          member.membershipId,
                                          { status: "ACTIVE" },
                                        ),
                                      )
                                    : undefined
                                }
                                size="quiet"
                              >
                                Activate
                              </Button>
                            ) : null}
                            <Button
                              onClick={() => setEditingUser(member.membershipId)}
                              size="quiet"
                              variant="secondary"
                            >
                              Manage
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>
              ) : null}

              {tab === "roles" ? (
                <Card>
                  <CardHeader>
                    <div>
                      <Kicker>CC-P0-006</Kicker>
                      <CardTitle>Roles</CardTitle>
                    </div>
                    <Button onClick={() => setNewRoleOpen(true)} size="quiet">
                      New Role
                    </Button>
                  </CardHeader>
                  <CardDescription>
                    The Owner Role always keeps full access. Every other Role can be edited, and a
                    Role in use cannot lose the Business its last Owner.
                  </CardDescription>
                  <DataTable
                    caption="Roles and how many people use them."
                    getRowKey={(role) => role.id}
                    rows={roles}
                    empty="Create a Role such as Cashier or Store Keeper."
                    columns={[
                      { header: "Code", render: (role) => <strong>{role.code}</strong> },
                      { header: "Name", render: (role) => role.name },
                      { header: "People", align: "right", render: (role) => role.memberCount },
                      {
                        header: "Permissions",
                        align: "right",
                        render: (role) => role.permissions.length,
                      },
                      {
                        header: "Type",
                        render: (role) => (
                          <Badge tone={role.isSystem ? "information" : "neutral"}>
                            {role.isSystem ? "System" : "Custom"}
                          </Badge>
                        ),
                      },
                      {
                        header: "Actions",
                        align: "right",
                        render: (role) => (
                          <Button
                            disabled={role.isSystem}
                            onClick={() => setEditingRole(role.id)}
                            size="quiet"
                            variant="secondary"
                          >
                            {role.isSystem ? "Locked" : "Edit permissions"}
                          </Button>
                        ),
                      },
                    ]}
                  />
                </Card>
              ) : null}

              {tab === "permissions" ? (
                <Stack>
                  {areas.map((area) => (
                    <Card key={area}>
                      <CardHeader>
                        <CardTitle>{area}</CardTitle>
                        <Badge tone="neutral">
                          {catalog.filter((permission) => permission.area === area).length}
                        </Badge>
                      </CardHeader>
                      <DataTable
                        caption={`Permissions in the ${area} area.`}
                        getRowKey={(permission) => permission.code}
                        rows={catalog.filter((permission) => permission.area === area)}
                        columns={[
                          {
                            header: "Code",
                            render: (permission) => <code>{permission.code}</code>,
                          },
                          { header: "What it allows", render: (permission) => permission.name },
                          { header: "Phase", render: (permission) => permission.phase },
                          {
                            header: "Sensitive",
                            render: (permission) =>
                              permission.sensitive ? (
                                <Badge tone="warning">Needs care</Badge>
                              ) : (
                                <span className="ui-card-description">Normal</span>
                              ),
                          },
                        ]}
                      />
                    </Card>
                  ))}
                  {!areas.length ? (
                    <StatePanel state="empty" title="No permissions loaded">
                      The permission catalogue is created with the Business foundation.
                    </StatePanel>
                  ) : null}
                </Stack>
              ) : null}
            </>
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog
        description="The person receives access as soon as an administrator activates the invitation."
        onClose={() => setInviteOpen(false)}
        open={inviteOpen}
        title="Invite a user"
      >
        <form className="ui-stack" onSubmit={(event) => void invite(event)}>
          <FormGrid>
            <Field label="Full name" name="displayName" placeholder="Nimal Perera" required />
            <Field label="Email" name="email" type="email" required />
          </FormGrid>
          <SelectField
            hint="Hold Ctrl or Cmd to choose more than one Role."
            label="Roles"
            multiple
            name="roleIds"
            size={Math.min(roles.length || 1, 5)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            hint="Leave empty to give access to every Branch."
            label="Branches"
            multiple
            name="branchIds"
            size={Math.min(branches.length || 1, 5)}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectField>
          <FormFooter>
            <Button onClick={() => setInviteOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Send invitation
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Drawer
        eyebrow="User"
        onClose={() => setEditingUser(null)}
        open={editingUser !== null}
        title={activeUser?.displayName ?? "User"}
      >
        {activeUser ? (
          <form className="ui-stack" onSubmit={(event) => void saveUser(event)}>
            <Field label="Full name" name="displayName" defaultValue={activeUser.displayName} />
            <SelectField label="Status" name="status" defaultValue={activeUser.status}>
              <option value="INVITED">Invited</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </SelectField>
            <SelectField
              hint="A user with no Role cannot do anything."
              label="Roles"
              multiple
              name="roleIds"
              defaultValue={activeUser.roles.map((role) => role.id)}
              size={Math.min(roles.length || 1, 6)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Branches"
              multiple
              name="branchIds"
              defaultValue={activeUser.branches.map((branch) => branch.id)}
              size={Math.min(branches.length || 1, 6)}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </SelectField>
            <FormFooter>
              <Button onClick={() => setEditingUser(null)} variant="secondary">
                Cancel
              </Button>
              <Button disabled={busy} type="submit">
                Save user
              </Button>
            </FormFooter>
          </form>
        ) : null}
      </Drawer>

      <Dialog
        description="Start from a template and adjust the permissions afterwards."
        onClose={() => setNewRoleOpen(false)}
        open={newRoleOpen}
        title="New Role"
      >
        <form className="ui-stack" onSubmit={(event) => void createRole(event)}>
          <FormGrid>
            <Field label="Role code" name="code" placeholder="STOREKEEPER" required />
            <Field label="Role name" name="name" placeholder="Store Keeper" required />
          </FormGrid>
          <Field label="Description" name="description" placeholder="Receives and counts stock" />
          <SelectField label="Start from template" name="templateCode" defaultValue="">
            <option value="">No template - choose permissions later</option>
            {(data?.access.roleTemplates ?? []).map((template) => (
              <option key={template.code} value={template.code}>
                {template.name}
              </option>
            ))}
          </SelectField>
          <FormFooter>
            <Button onClick={() => setNewRoleOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create Role
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        description="Tick only what this Role needs. Sensitive actions are marked."
        onClose={() => setEditingRole(null)}
        open={editingRole !== null}
        title={activeRole ? `Permissions for ${activeRole.name}` : "Role permissions"}
        wide
      >
        {activeRole ? (
          <form className="ui-stack" onSubmit={(event) => void saveRolePermissions(event)}>
            <Field label="Role name" name="name" defaultValue={activeRole.name} />
            {areas.map((area) => (
              <Card key={area}>
                <CardTitle>{area}</CardTitle>
                <div className="ui-form-grid">
                  {catalog
                    .filter((permission) => permission.area === area)
                    .map((permission) => (
                      <label className="ui-check-field" key={permission.code}>
                        <input
                          defaultChecked={activeRole.permissions.includes(permission.code)}
                          name="permissions"
                          type="checkbox"
                          value={permission.code}
                        />
                        <span>
                          <strong>{permission.name}</strong>
                          <small>
                            {permission.code}
                            {permission.sensitive ? " · sensitive" : ""}
                          </small>
                        </span>
                      </label>
                    ))}
                </div>
              </Card>
            ))}
            <FormFooter>
              <Button onClick={() => setEditingRole(null)} variant="secondary">
                Cancel
              </Button>
              <Button disabled={busy} type="submit">
                Save permissions
              </Button>
            </FormFooter>
          </form>
        ) : null}
      </Dialog>
    </Workspace>
  );
}
