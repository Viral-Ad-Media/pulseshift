import React, { useState } from "react";
export function WorkspaceSetup({
  name,
  initialError,
  onSubmit,
  onLogout,
}: {
  name: string;
  initialError?: string | null;
  onSubmit: (payload: {
    orgName: string;
    inviteToken?: string;
    timezone: string;
  }) => Promise<void>;
  onLogout: () => void;
}) {
  const [orgName, setOrgName] = useState(""),
    [inviteToken, setInviteToken] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError || "");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        className="w-full max-w-xl space-y-5 rounded-3xl bg-white p-8 shadow-xl"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await onSubmit({
              orgName,
              inviteToken: inviteToken || undefined,
              timezone:
                Intl.DateTimeFormat().resolvedOptions().timeZone ||
                "America/Chicago",
            });
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="text-3xl font-bold">Finish your workspace setup</h1>
        <p>
          Welcome, {name}. Your account is ready. Create a workspace or enter an
          invitation token to join your team.
        </p>
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
        <label className="block">
          Workspace name
          <input
            required={!inviteToken}
            disabled={Boolean(inviteToken) || busy}
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="block">
          Invitation token (optional)
          <input
            disabled={busy}
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <button
          disabled={busy}
          className="w-full rounded-xl bg-slate-950 p-3 text-white"
        >
          {busy
            ? "Saving..."
            : inviteToken
              ? "Join workspace"
              : "Create workspace"}
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          className="w-full p-2"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
