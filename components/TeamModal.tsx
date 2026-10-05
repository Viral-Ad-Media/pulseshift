import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Role, User } from "../types";
import { Modal } from "./Modal";
interface Invitation {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
  accepted_at?: string;
  revoked_at?: string;
}
export function TeamModal({
  orgId,
  users,
  isAdmin,
  onClose,
  onRefresh,
  onAccept,
}: {
  orgId: string;
  users: User[];
  isAdmin: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onAccept: (token: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [role, setRole] = useState<Role>(Role.NURSE),
    [token, setToken] = useState(""),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [invitations, setInvitations] = useState<Invitation[]>([]);
  const load = async () => {
    if (isAdmin)
      setInvitations((await api.get(`/orgs/${orgId}/invitations`)).invitations);
  };
  useEffect(() => {
    let active = true;
    if (isAdmin)
      api
        .get(`/orgs/${orgId}/invitations`)
        .then((d) => {
          if (active) setInvitations(d.invitations);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [orgId, isAdmin]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await onRefresh();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal label="Workspace team" onClose={onClose}>
      <div className="rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex justify-between gap-4">
          <h2 className="text-2xl font-bold">Workspace team</h2>
          <button onClick={onClose}>Close</button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-rose-700">
            {error}
          </p>
        )}
        <ul className="mt-6 space-y-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
            >
              <span>
                {user.name} — {user.role}
              </span>
              {isAdmin && (
                <div className="flex gap-2">
                  <select
                    aria-label={`Role for ${user.name}`}
                    value={user.role}
                    disabled={busy}
                    onChange={(e) =>
                      run(async () => {
                        await api.put(`/orgs/${orgId}/members/${user.id}`, {
                          role: e.target.value,
                        });
                      })
                    }
                  >
                    <option value="NURSE">Nurse</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  <button
                    disabled={busy}
                    className="text-rose-700"
                    onClick={() => {
                      if (confirm(`Remove ${user.name} from this workspace?`))
                        run(async () => {
                          await api.del(`/orgs/${orgId}/members/${user.id}`);
                        });
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {isAdmin && (
          <form
            className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const result = await api.post(`/orgs/${orgId}/invitations`, {
                  email,
                  role,
                });
                setLink(
                  `${window.location.origin}${window.location.pathname}#invite=${result.token}`,
                );
                setEmail("");
              });
            }}
          >
            <h3 className="font-bold">Invite a team member</h3>
            <p className="text-sm text-slate-600">
              Share the invitation link with the person named below. It expires
              in seven days and reserves a seat. Email delivery is not
              configured.
            </p>
            <input
              aria-label="Invitation email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border p-3"
            />
            <select
              aria-label="Invitation role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="NURSE">Nurse</option>
              <option value="ADMIN">Administrator</option>
            </select>
            <button
              disabled={busy}
              className="rounded-xl bg-slate-950 px-4 py-3 text-white"
            >
              Create invitation
            </button>
            {link && (
              <label className="block">
                Copy this invitation link
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>
            )}
          </form>
        )}
        {isAdmin &&
          invitations
            .filter(
              (i) =>
                !i.accepted_at &&
                !i.revoked_at &&
                new Date(i.expires_at) > new Date(),
            )
            .map((i) => (
              <div
                key={i.id}
                className="mt-3 flex justify-between gap-3 border p-3"
              >
                <span>{i.email} — invitation pending</span>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api.del(`/orgs/${orgId}/invitations/${i.id}`);
                    })
                  }
                >
                  Revoke
                </button>
              </div>
            ))}
        <form
          className="mt-6 space-y-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await onAccept(token);
              setToken("");
              onClose();
            });
          }}
        >
          <h3 className="font-bold">Join another workspace</h3>
          <p className="text-sm text-slate-600">
            Paste the token from your invitation link. Sign in with the invited
            email address.
          </p>
          <input
            aria-label="Invitation token"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-xl border p-3"
          />
          <button disabled={busy} className="rounded-xl border px-4 py-3">
            Accept invitation
          </button>
        </form>
      </div>
    </Modal>
  );
}
