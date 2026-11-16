import React, { useEffect, useRef, useState } from "react";
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
    [linkEmail, setLinkEmail] = useState(""),
    [copied, setCopied] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [invitations, setInvitations] = useState<Invitation[]>([]);
  const inProgress = useRef(false);
  const linkInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (link) {
      linkInput.current?.focus();
      linkInput.current?.select();
    }
  }, [link]);
  const createInvitation = async (inviteEmail: string, inviteRole: Role) => {
    const result = await api.post(`/orgs/${orgId}/invitations`, {
      email: inviteEmail,
      role: inviteRole,
    });
    if (!result.token)
      throw new Error(
        "The server did not return an invitation link. Please retry.",
      );
    const url = new URL(window.location.pathname, window.location.origin);
    url.hash = new URLSearchParams({ invite: result.token }).toString();
    setLink(url.href);
    setLinkEmail(result.invitation?.email || inviteEmail.trim());
    setCopied(false);
    setEmail("");
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      setError(
        "Select the invitation link and copy it with Ctrl+C or Command+C.",
      );
    }
  };
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
    if (inProgress.current) return;
    inProgress.current = true;
    setBusy(true);
    setError("");
    let saved = false;
    try {
      await action();
      saved = true;
      await onRefresh();
      await load();
    } catch (e: any) {
      setError(
        saved
          ? `Your change was saved, but the team list could not refresh: ${e.message}`
          : e.message,
      );
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      label="Workspace team"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex justify-between gap-4">
          <h2 className="text-2xl font-bold">Workspace team</h2>
          <button disabled={busy} onClick={onClose}>
            Close
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-rose-700">
            {error}
          </p>
        )}
        {isAdmin && link && (
          <section
            role="status"
            className="mt-5 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          >
            <h3 className="font-bold text-emerald-950">
              Invitation created for {linkEmail}
            </h3>
            <p className="text-sm text-emerald-900">
              Copy this link and share it yourself. No invitation email was
              sent. The person must use {linkEmail} to join.
            </p>
            <label className="block text-sm font-semibold text-emerald-950">
              Invitation link
              <input
                ref={linkInput}
                aria-label="Invitation link"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className="mt-2 w-full rounded-xl border border-emerald-300 bg-white p-3 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white"
            >
              {copied ? "Link copied" : "Copy invitation link"}
            </button>
            <p className="text-xs text-emerald-900">
              For local testing, open the link in a private window on this
              computer. A localhost link cannot reach this app from another
              person's device.
            </p>
          </section>
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
              void run(() => createInvitation(email, role));
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
              {busy ? "Creating…" : "Create invitation"}
            </button>
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
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    className="font-semibold text-sky-800"
                    onClick={() => {
                      if (
                        confirm(
                          "Create a new invitation link? Any previous unused link for this person will stop working.",
                        )
                      )
                        void run(() => createInvitation(i.email, i.role));
                    }}
                  >
                    Generate new link
                  </button>
                  <button
                    disabled={busy}
                    className="text-rose-700"
                    onClick={() =>
                      void run(async () => {
                        await api.del(`/orgs/${orgId}/invitations/${i.id}`);
                        if (linkEmail.toLowerCase() === i.email.toLowerCase()) {
                          setLink("");
                          setLinkEmail("");
                          setCopied(false);
                        }
                      })
                    }
                  >
                    Revoke
                  </button>
                </div>
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
