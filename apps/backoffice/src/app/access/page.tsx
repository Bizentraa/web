"use client";

import type {
  AccessOverview,
  MembershipStatus,
  BusinessFoundationSummary,
} from "@bizentra/contracts";
import {
  Avatar,
  Badge,
  Button,
  CheckField,
  Card,
  CardDescription,
  CardTitle,
  DataTable,
  DescriptionList,
  Field,
  FormFooter,
  FormGrid,
  SelectField,
  Stack,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import { Dialog, Drawer, Tabs, useToasts, VerticalTabs } from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

type PermissionRow = AccessOverview["permissionCatalog"][number];
type PermissionAwareMember = AccessOverview["memberships"][number];

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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoles, setInviteRoles] = useState<string[]>([]);
  const [inviteBranches, setInviteBranches] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<MembershipStatus>("ACTIVE");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editBranches, setEditBranches] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [permissionArea, setPermissionArea] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionRow | null>(null);

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

  /** Derived only as a suggestion; the person still confirms the name that will be shown. */
  const suggestedName = inviteEmail.includes("@")
    ? (inviteEmail.split("@")[0] ?? "")
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
        .trim()
    : "";
  const inviteNameValue = inviteName || suggestedName;
  const canInvite = /.+@.+\..+/.test(inviteEmail) && inviteNameValue.trim().length >= 2;

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteRoles([]);
    setInviteBranches([]);
  };

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((value) => value !== id) : [...list, id];

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !canInvite) return;
    const ok = await run("Invitation created.", () =>
      api.inviteUser(identity.businessId, {
        email: inviteEmail.trim(),
        displayName: inviteNameValue.trim(),
        roleIds: inviteRoles,
        branchIds: inviteBranches,
      }),
    );
    if (ok) closeInvite();
  };

  /** Opens the drawer with the membership's current values, so the form starts from the truth. */
  const openUser = (member: PermissionAwareMember) => {
    setEditingUser(member.membershipId);
    setEditName(member.displayName);
    setEditStatus(member.status);
    setEditRoles(member.roles.map((role) => role.id));
    setEditBranches(member.branches.map((branch) => branch.id));
  };

  const closeUser = () => setEditingUser(null);

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !editingUser || editName.trim().length < 2) return;
    const ok = await run("User updated.", () =>
      api.updateMembership(identity.businessId, editingUser, {
        displayName: editName.trim(),
        status: editStatus,
        roleIds: editRoles,
        branchIds: editBranches,
      }),
    );
    if (ok) closeUser();
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
  /* Falls back to the first area rather than storing a default that a reload could invalidate. */
  const activeArea =
    permissionArea && areas.includes(permissionArea) ? permissionArea : (areas[0] ?? "");
  const activeUser = memberships.find((member) => member.membershipId === editingUser);
  const activeRole = roles.find((role) => role.id === editingRole);

  return (
    <Workspace
      status={<StatusChip tone="success">{memberships.length} user(s)</StatusChip>}
      description="Users, Roles and the fine-grained permissions that decide who can do what."
      eyebrow="Access"
      title="Users and roles"
      headerActions={
        <Button disabled={!data} onClick={() => setInviteOpen(true)}>
          Invite user
        </Button>
      }
    >
      <Stack>
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
                <DataTable
                  caption="People with access"
                  summary="The Owner Role always keeps full access. Every other Role can be edited, and a Role in use cannot lose the Business its last Owner."
                  kicker="Users"
                  toolbar={<Button onClick={() => setInviteOpen(true)}>Invite user</Button>}
                  getRowKey={(member) => member.membershipId}
                  rows={memberships}
                  empty="Invite the people who will use the system."
                  columns={[
                    {
                      header: "Person",
                      render: (member) => (
                        <span className="ui-person">
                          <Avatar name={member.displayName} />
                          <div>
                            <strong>
                              {member.displayName}
                              {member.userId === identity?.userId ? " (you)" : ""}
                            </strong>
                            <small>{member.email}</small>
                          </div>
                        </span>
                      ),
                    },
                    {
                      header: "Role",
                      render: (member) => {
                        /*
                         * Nobody edits their own access. Without this an administrator can drop
                         * their own Role and lock themselves out of the screen they are standing
                         * on, and the server would accept it as a legitimate request.
                         */
                        const isSelf = member.userId === identity?.userId;
                        return (
                          <select
                            aria-label={`Role for ${member.displayName}`}
                            className="ui-inline-select"
                            disabled={busy || isSelf || !api || !identity}
                            onChange={(event) => {
                              const roleId = event.target.value;
                              if (!api || !identity || !roleId) return;
                              void run("Role updated.", () =>
                                api.updateMembership(identity.businessId, member.membershipId, {
                                  roleIds: [roleId],
                                }),
                              );
                            }}
                            title={isSelf ? "You cannot change your own Role." : undefined}
                            value={member.roles[0]?.id ?? ""}
                          >
                            <option value="">No Role yet</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        );
                      },
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
                      render: (member) => {
                        const isSelf = member.userId === identity?.userId;
                        if (isSelf) {
                          /* Same rule as the Role control: an account never administers itself. */
                          return (
                            <span className="ui-card-description">Ask another administrator</span>
                          );
                        }
                        return (
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
                              >
                                Activate
                              </Button>
                            ) : null}
                            {member.status === "ACTIVE" ? (
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  api && identity
                                    ? void run("Access suspended.", () =>
                                        api.updateMembership(
                                          identity.businessId,
                                          member.membershipId,
                                          { status: "SUSPENDED" },
                                        ),
                                      )
                                    : undefined
                                }
                                variant="ghost"
                              >
                                Suspend
                              </Button>
                            ) : null}
                            {member.status === "SUSPENDED" ? (
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  api && identity
                                    ? void run("Access restored.", () =>
                                        api.updateMembership(
                                          identity.businessId,
                                          member.membershipId,
                                          { status: "ACTIVE" },
                                        ),
                                      )
                                    : undefined
                                }
                              >
                                Restore
                              </Button>
                            ) : null}
                            <Button onClick={() => openUser(member)} variant="secondary">
                              Manage
                            </Button>
                          </div>
                        );
                      },
                    },
                  ]}
                />
              ) : null}

              {tab === "roles" ? (
                <DataTable
                  caption="Roles"
                  kicker="Roles"
                  toolbar={<Button onClick={() => setNewRoleOpen(true)}>New Role</Button>}
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
              ) : null}

              {tab === "permissions" ? (
                areas.length ? (
                  <VerticalTabs
                    onChange={setPermissionArea}
                    value={activeArea}
                    tabs={areas.map((area) => ({
                      value: area,
                      label: area,
                      badge: String(
                        catalog.filter((permission) => permission.area === area).length,
                      ),
                    }))}
                  >
                    <DataTable
                      caption={activeArea}
                      kicker="Permission area"
                      getRowKey={(permission) => permission.code}
                      rows={catalog.filter((permission) => permission.area === activeArea)}
                      onRowSelect={setPermission}
                      summary="Select a permission to see what it allows and which Roles carry it."
                      columns={[
                        {
                          header: "Code",
                          render: (permission) => (
                            <span className="ui-code">{permission.code}</span>
                          ),
                        },
                        { header: "What it allows", render: (permission) => permission.name },
                        {
                          header: "Phase",
                          hideOnMobile: true,
                          render: (permission) => permission.phase,
                        },
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
                  </VerticalTabs>
                ) : (
                  <StatePanel state="empty" title="No permissions loaded">
                    The permission catalogue is created with the Business foundation.
                  </StatePanel>
                )
              ) : null}
            </>
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog
        description="Access is created immediately, but the person cannot sign in until an administrator activates the invitation."
        onClose={closeInvite}
        open={inviteOpen}
        title="Invite a user"
        wide
        footer={
          <>
            <span className="ui-card-description">
              {canInvite
                ? `${inviteNameValue.trim()} will join with ${
                    inviteRoles.length
                      ? `${inviteRoles.length} Role(s)`
                      : "no Role yet, so they will see nothing until one is given"
                  }.`
                : "An email address and a name are needed before an invitation can be sent."}
            </span>
            <div className="ui-row">
              <Button onClick={closeInvite} variant="secondary">
                Cancel
              </Button>
              <Button disabled={busy || !canInvite} form="invite-user" type="submit">
                Send invitation
              </Button>
            </div>
          </>
        }
      >
        <form className="ui-stack" id="invite-user" onSubmit={(event) => void invite(event)}>
          {/* Who is being invited, shown the way they will appear in the list afterwards. */}
          <div className="access-invite-preview">
            <Avatar name={inviteNameValue || "?"} />
            <div>
              <strong>{inviteNameValue.trim() || "New user"}</strong>
              <small>{inviteEmail.trim() || "No email address yet"}</small>
            </div>
            <Badge tone={canInvite ? "success" : "neutral"}>
              {canInvite ? "Ready to send" : "Incomplete"}
            </Badge>
          </div>

          <FormGrid>
            <Field
              autoComplete="email"
              hint="This is the address they will sign in with."
              label="Email"
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="nimal@business.lk"
              required
              type="email"
              value={inviteEmail}
            />
            <Field
              hint={
                suggestedName && !inviteName
                  ? `Taken from the email address. Edit it if that is not their name.`
                  : "The name shown on records this person touches."
              }
              label="Full name"
              onChange={(event) => setInviteName(event.target.value)}
              placeholder={suggestedName || "Nimal Perera"}
              value={inviteName}
            />
          </FormGrid>

          <section className="access-choice">
            <header>
              <div>
                <strong>Roles</strong>
                <small>What this person is allowed to do. A Role can be changed later.</small>
              </div>
              <Badge tone={inviteRoles.length ? "information" : "warning"}>
                {inviteRoles.length ? `${inviteRoles.length} selected` : "None yet"}
              </Badge>
            </header>
            <div className="ui-choice-list">
              {roles.map((role) => (
                <CheckField
                  checked={inviteRoles.includes(role.id)}
                  description={
                    role.description ??
                    `${role.permissions.length} permission(s) · ${role.memberCount} member(s)`
                  }
                  key={role.id}
                  label={role.name}
                  onChange={() => setInviteRoles((current) => toggle(current, role.id))}
                />
              ))}
              {!roles.length ? (
                <p className="ui-card-description">
                  No Role exists yet. Create one first, or invite the person and give them a Role
                  afterwards.
                </p>
              ) : null}
            </div>
          </section>

          <section className="access-choice">
            <header>
              <div>
                <strong>Branches</strong>
                <small>Which Branches this person can work in.</small>
              </div>
              <Badge tone={inviteBranches.length ? "information" : "success"}>
                {inviteBranches.length ? `${inviteBranches.length} selected` : "Every Branch"}
              </Badge>
            </header>
            <div className="ui-choice-list">
              {branches.map((branch) => (
                <CheckField
                  checked={inviteBranches.includes(branch.id)}
                  description={branch.code}
                  key={branch.id}
                  label={branch.name}
                  onChange={() => setInviteBranches((current) => toggle(current, branch.id))}
                />
              ))}
            </div>
          </section>
        </form>
      </Dialog>

      <Drawer
        eyebrow="User"
        onClose={closeUser}
        open={editingUser !== null}
        title={activeUser?.displayName ?? "User"}
      >
        {activeUser ? (
          <form className="ui-stack" onSubmit={(event) => void saveUser(event)}>
            {/* The same preview the invite dialog shows, so a person looks the same either way. */}
            <div className="access-invite-preview">
              <Avatar name={editName || activeUser.displayName} />
              <div>
                <strong>{editName.trim() || activeUser.displayName}</strong>
                <small>{activeUser.email}</small>
              </div>
              <Badge
                tone={
                  editStatus === "ACTIVE"
                    ? "success"
                    : editStatus === "INVITED"
                      ? "warning"
                      : "neutral"
                }
              >
                {editStatus}
              </Badge>
            </div>

            <FormGrid>
              <Field
                hint="The name shown on records this person touches."
                label="Full name"
                onChange={(event) => setEditName(event.target.value)}
                required
                value={editName}
              />
              <SelectField
                hint={
                  editStatus === "SUSPENDED"
                    ? "A suspended person keeps their history but cannot sign in."
                    : editStatus === "INVITED"
                      ? "An invited person cannot sign in until they are activated."
                      : "This person can sign in and use their Roles."
                }
                label="Status"
                onChange={(event) => setEditStatus(event.target.value as MembershipStatus)}
                value={editStatus}
              >
                <option value="INVITED">Invited</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </SelectField>
            </FormGrid>

            <section className="access-choice">
              <header>
                <div>
                  <strong>Roles</strong>
                  <small>What this person is allowed to do.</small>
                </div>
                <Badge tone={editRoles.length ? "information" : "warning"}>
                  {editRoles.length ? `${editRoles.length} selected` : "None yet"}
                </Badge>
              </header>
              <div className="ui-choice-list">
                {roles.map((role) => (
                  <CheckField
                    checked={editRoles.includes(role.id)}
                    description={
                      role.description ??
                      `${role.permissions.length} permission(s) · ${role.memberCount} member(s)`
                    }
                    key={role.id}
                    label={role.name}
                    onChange={() => setEditRoles((current) => toggle(current, role.id))}
                  />
                ))}
              </div>
            </section>

            <section className="access-choice">
              <header>
                <div>
                  <strong>Branches</strong>
                  <small>Which Branches this person can work in.</small>
                </div>
                <Badge tone={editBranches.length ? "information" : "success"}>
                  {editBranches.length ? `${editBranches.length} selected` : "Every Branch"}
                </Badge>
              </header>
              <div className="ui-choice-list">
                {branches.map((branch) => (
                  <CheckField
                    checked={editBranches.includes(branch.id)}
                    description={branch.code}
                    key={branch.id}
                    label={branch.name}
                    onChange={() => setEditBranches((current) => toggle(current, branch.id))}
                  />
                ))}
              </div>
            </section>

            <FormFooter>
              <span className="ui-card-description">
                {editRoles.length
                  ? `Saved as ${editStatus.toLowerCase()} with ${editRoles.length} Role(s).`
                  : "With no Role this person can sign in and see nothing."}
              </span>
              <div className="ui-row">
                <Button onClick={closeUser} variant="secondary">
                  Cancel
                </Button>
                <Button disabled={busy || editName.trim().length < 2} type="submit">
                  Save user
                </Button>
              </div>
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

      <Drawer
        eyebrow="Permission"
        onClose={() => setPermission(null)}
        open={Boolean(permission)}
        title={permission?.name ?? ""}
      >
        {permission ? (
          <Stack>
            <DescriptionList
              items={[
                { label: "Code", value: <span className="ui-code">{permission.code}</span> },
                { label: "Area", value: permission.area },
                { label: "Phase", value: permission.phase },
                {
                  label: "Handling",
                  value: permission.sensitive ? (
                    <Badge tone="warning">Needs care</Badge>
                  ) : (
                    <Badge tone="neutral">Normal</Badge>
                  ),
                },
              ]}
            />
            <CardDescription>
              {permission.sensitive
                ? "A Role carrying this permission can take an action that is hard to reverse. Grant it deliberately and expect it in the approval history."
                : "A Role carrying this permission can use this action anywhere it appears in the Back Office."}
            </CardDescription>
          </Stack>
        ) : null}
      </Drawer>
    </Workspace>
  );
}
