import { useState } from "react";
import { Shield, Tag } from "react-feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accessRolesApi } from "../services/accessRolesService";
import { authApi } from "../services/authService";
import { documentsApi } from "../services/documentsService";
import { useDialog } from "../hooks/useDialog";
import { ApiError } from "../types/auth";

// An Access Role is deliberately separate from the system role (owner/admin/member,
// managed on UsersPage) — this page controls resource-tag grants, not who can invite
// or change system roles.
export function AccessRolesPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const [newRoleName, setNewRoleName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const rolesQuery = useQuery({ queryKey: ["access-roles"], queryFn: accessRolesApi.listRoles });
  const tagsQuery = useQuery({ queryKey: ["tags"], queryFn: documentsApi.listTags });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: authApi.listUsers });

  const invalidateRoles = () => queryClient.invalidateQueries({ queryKey: ["access-roles"] });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => accessRolesApi.createRole(name),
    onSuccess: invalidateRoles,
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to create Access Role"),
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) => documentsApi.createTag(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to create tag"),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => accessRolesApi.deleteRole(roleId),
    onSuccess: invalidateRoles,
  });

  const grantTagMutation = useMutation({
    mutationFn: ({ roleId, tagId }: { roleId: string; tagId: string }) =>
      accessRolesApi.grantTag(roleId, tagId),
    onSuccess: invalidateRoles,
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to grant tag"),
  });

  const revokeTagMutation = useMutation({
    mutationFn: ({ roleId, tagId }: { roleId: string; tagId: string }) =>
      accessRolesApi.revokeTag(roleId, tagId),
    onSuccess: invalidateRoles,
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      accessRolesApi.assignUser(roleId, userId),
    onSuccess: invalidateRoles,
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to assign member"),
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      accessRolesApi.removeUser(roleId, userId),
    onSuccess: invalidateRoles,
  });

  function handleCreateRole() {
    const name = newRoleName.trim();
    if (!name) return;
    createRoleMutation.mutate(name);
    setNewRoleName("");
  }

  function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    createTagMutation.mutate(name);
    setNewTagName("");
  }

  const tagName = (tagId: string) => tagsQuery.data?.find((t) => t.id === tagId)?.name ?? tagId;
  const userEmail = (userId: string) =>
    usersQuery.data?.find((u) => u.id === userId)?.email ?? userId;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <main className="page-enter p-6 sm:p-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Access Roles</h1>
            <p className="text-muted text-sm mt-2 max-w-2xl">
              Control which members can see documents and folders by assigning role tags.
            </p>
          </div>
        </div>

        <section className="rounded-[18px] border border-border bg-surface p-5 sm:p-6 mb-5" aria-label="Create an access role">
        <div className="flex items-center gap-2.5 mb-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Shield size={17} aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Create a role</h2><p className="text-xs text-muted">Give a set of members access to selected tags.</p></div></div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newRoleName}
            placeholder="New Access Role name (e.g. Finance Team)"
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
            className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCreateRole}
            disabled={createRoleMutation.isPending || !newRoleName.trim()}
            className="button-press text-sm bg-accent text-white rounded-xl px-5 py-2 hover:brightness-110 disabled:opacity-50"
          >
            Create
          </button>
        </div>
        </section>

        <section className="rounded-[18px] border border-border bg-surface p-5 sm:p-6 mb-8" aria-label="Document tags">
          <div className="flex items-center gap-2 mb-4"><Tag size={16} className="text-muted" aria-hidden="true" /><h2 className="text-sm font-semibold">Document tags</h2></div>
          <p className="text-xs text-muted mb-3">Create a tag, then grant it to a role to control access.</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {tagsQuery.data?.map((t) => (
              <span
                key={t.id}
                className="text-xs border border-border rounded-sm px-2 py-0.5 text-muted"
              >
                {t.name}
              </span>
            ))}
            <input
              value={newTagName}
              placeholder="+ new tag"
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              className="bg-bg border border-border rounded-sm px-2 py-0.5 text-xs w-24"
            />
          </div>
        </section>

        {rolesQuery.isLoading && <p className="text-muted text-sm">Loading…</p>}
        {rolesQuery.isError && <p className="text-danger text-sm">Failed to load Access Roles.</p>}
        {rolesQuery.data && rolesQuery.data.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-border px-6 py-10 text-center">
            <Shield size={20} className="mx-auto text-muted mb-3" aria-hidden="true" />
            <p className="text-muted text-sm">No Access Roles yet. Create one above to start granting tag-based access.</p>
          </div>
        )}

        <div className="space-y-4">
          {rolesQuery.data?.map((role) => {
            const grantableTags = (tagsQuery.data ?? []).filter(
              (t) => !role.tag_ids.includes(t.id),
            );
            const assignableUsers = (usersQuery.data ?? []).filter(
              (u) => !role.user_ids.includes(u.id),
            );
            return (
              <div
                key={role.id}
                className="bg-surface border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{role.name}</h2>
                  <button
                    type="button"
                    aria-label={`Delete ${role.name}`}
                    onClick={() => deleteRoleMutation.mutate(role.id)}
                    className="text-muted hover:text-danger text-sm"
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">Granted tags</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {role.tag_ids.map((tagId) => (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 text-xs border border-border rounded-sm px-2 py-0.5"
                      >
                        {tagName(tagId)}
                        <button
                          type="button"
                          aria-label={`Revoke ${tagName(tagId)} from ${role.name}`}
                          onClick={() =>
                            revokeTagMutation.mutate({ roleId: role.id, tagId })
                          }
                          className="text-muted hover:text-danger"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {grantableTags.length > 0 && (
                      <select
                        aria-label={`Grant a tag to ${role.name}`}
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          grantTagMutation.mutate({ roleId: role.id, tagId: e.target.value });
                          e.target.value = "";
                        }}
                        className="bg-bg border border-border rounded-sm text-xs px-1.5 py-0.5"
                      >
                        <option value="">+ grant tag</option>
                        {grantableTags.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted mb-1">Members</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {role.user_ids.map((userId) => (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1 text-xs border border-border rounded-sm px-2 py-0.5"
                      >
                        {userEmail(userId)}
                        <button
                          type="button"
                          aria-label={`Remove ${userEmail(userId)} from ${role.name}`}
                          onClick={() =>
                            removeUserMutation.mutate({ roleId: role.id, userId })
                          }
                          className="text-muted hover:text-danger"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {assignableUsers.length > 0 && (
                      <select
                        aria-label={`Assign a member to ${role.name}`}
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          assignUserMutation.mutate({ roleId: role.id, userId: e.target.value });
                          e.target.value = "";
                        }}
                        className="bg-bg border border-border rounded-sm text-xs px-1.5 py-0.5"
                      >
                        <option value="">+ assign member</option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
