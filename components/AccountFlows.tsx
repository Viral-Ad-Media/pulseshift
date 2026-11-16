import React, { useState, useEffect } from "react";
import { api, setAuthToken } from "../services/api";
import { Modal } from "./Modal";
const input = "mt-2 w-full rounded-xl border p-3";
const button =
  "rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50";
export function SecondFactorCard({
  challenge,
  onComplete,
  onCancel,
}: {
  challenge: string;
  onComplete: (session: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <form
        className="w-full max-w-md space-y-5 rounded-3xl border bg-white p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await onComplete(
              await api.post("/auth/two-factor", { challenge, code, backup }),
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="text-2xl font-bold">Verify your sign-in</h1>
        <p className="text-sm text-slate-500">
          Enter a code from your authenticator app, or use a saved backup code.
        </p>
        <label className="block text-sm font-semibold">
          Verification code
          <input
            className={input}
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={backup}
            onChange={(e) => setBackup(e.target.checked)}
          />
          Use a backup code
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        <button className={button} disabled={busy}>
          {busy ? "Verifying…" : "Complete sign-in"}
        </button>
        <button
          type="button"
          className="ml-3 text-sm"
          disabled={busy}
          onClick={onCancel}
        >
          Start again
        </button>
      </form>
    </main>
  );
}
export function RecoveryScreen({
  onBack,
  resetToken,
}: {
  onBack: () => void;
  resetToken?: string | null;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <form
        className="w-full max-w-md space-y-5 rounded-3xl border bg-white p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            const result = await api.post(
              resetToken ? "/auth/recovery/reset" : "/auth/recovery",
              resetToken
                ? { token: resetToken, newPassword: value }
                : { email: value },
            );
            setMessage(result.message);
            setValue("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Request failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="text-2xl font-bold">
          {resetToken ? "Choose a new password" : "Recover your account"}
        </h1>
        <p className="text-sm text-slate-500">
          {resetToken
            ? "Your reset link is single-use and expires after one hour."
            : "If your account exists, we will email you a password-reset link when email delivery is configured."}
        </p>
        <label className="block text-sm font-semibold">
          {resetToken ? "New password" : "Email address"}
          <input
            className={input}
            type={resetToken ? "password" : "email"}
            autoComplete={resetToken ? "new-password" : "email"}
            required
            minLength={resetToken ? 12 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {message && (
          <p role="status" className="text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        <button className={button} disabled={busy}>
          {busy
            ? "Working…"
            : resetToken
              ? "Reset password"
              : "Send reset link"}
        </button>
        <button type="button" className="ml-3 text-sm" onClick={onBack}>
          Back to sign in
        </button>
      </form>
    </main>
  );
}
export function TwoFactorSettings({
  onClose,
  onSessionChange,
}: {
  onClose: () => void;
  onSessionChange: (token: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get("/auth/security")
      .then((result) => {
        if (active) setStatus(result.twoFactorEnabled);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const perform = async (action: string, body: any) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/auth/security/" + action, body);
      if (result.token) {
        setAuthToken(result.token);
        onSessionChange(result.token);
      }
      if (action === "enable") setSetup(result);
      if (action === "verify") {
        setStatus(true);
        setSetup(null);
        setMessage(
          "Two-step verification enabled. Keep your backup codes safe.",
        );
      }
      if (action === "disable") {
        setStatus(false);
        setSetup(null);
        setMessage("Two-step verification disabled.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Security request failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      label="Two-step verification"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <section className="mx-auto max-w-lg space-y-5 rounded-3xl bg-white p-6">
        <h2 className="text-2xl font-bold">Two-step verification</h2>
        <p className="text-sm text-slate-500">
          Status:{" "}
          {status === null ? "Checking…" : status ? "Enabled" : "Not enabled"}
        </p>
        <label className="block text-sm font-semibold">
          Current password
          <input
            className={input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {!status && (
          <button
            className={button}
            disabled={busy || !password}
            onClick={() => void perform("enable", { password })}
          >
            Set up authenticator app
          </button>
        )}
        {status && (
          <button
            className={button}
            disabled={busy || !password}
            onClick={() => void perform("disable", { password })}
          >
            Disable two-step verification
          </button>
        )}
        {setup && (
          <>
            <p className="text-sm">
              Add this setup key to an authenticator app. Do not share it.
            </p>
            <label className="block text-sm font-semibold">
              Authenticator setup URI
              <textarea
                className={`${input} h-24 break-all font-mono text-xs`}
                readOnly
                value={setup.totpURI}
              />
            </label>
            <label className="block text-sm font-semibold">
              Manual setup key
              <input
                className={`${input} font-mono text-xs`}
                readOnly
                value={new URL(setup.totpURI).searchParams.get("secret") || ""}
              />
            </label>
            <p className="text-xs text-slate-500">
              Choose a time-based account in your authenticator app and enter
              this key. Keep it private.
            </p>
            <details open>
              <summary className="text-sm font-bold">
                Save these one-use backup codes now
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">
                {setup.backupCodes.join("\n")}
              </pre>
            </details>
            <label className="block text-sm font-semibold">
              Authenticator code
              <input
                className={input}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button
              className={button}
              disabled={busy || !code}
              onClick={() => void perform("verify", { code })}
            >
              Verify and enable
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-emerald-700">
            {message}
          </p>
        )}
        <button className="ml-3 text-sm" disabled={busy} onClick={onClose}>
          Back to account
        </button>
      </section>
    </Modal>
  );
}
export function OfflineSchedule({ onBack }: { onBack: () => void }) {
  let snapshot: any = null;
  try {
    const key = localStorage.getItem("pulseshift-offline-last");
    if (key && localStorage.getItem("pulseshift_token"))
      snapshot = JSON.parse(localStorage.getItem(key) || "null");
    if (
      snapshot &&
      snapshot.userId !== localStorage.getItem("pulseshift_current_user")
    )
      snapshot = null;
  } catch {
    /* A malformed cache must not affect sign-in. */
  }
  return (
    <main className="min-h-screen bg-slate-50 p-5">
      <section className="mx-auto max-w-3xl space-y-5 rounded-3xl border bg-white p-6">
        <h1 className="text-2xl font-bold">Downloaded schedule · read-only</h1>
        {snapshot ? (
          <>
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
            >
              {snapshot.orgName} · Last downloaded{" "}
              {new Date(snapshot.savedAt).toLocaleString()}. This copy may be
              outdated. Reconnect before making any changes.
            </p>
            {snapshot.shifts.map((s: any) => (
              <article key={s.id} className="rounded-xl border p-4">
                <h2 className="font-bold">{s.title}</h2>
                <p className="mt-2 text-sm">
                  {s.localStart.replace("T", " ")} –{" "}
                  {s.localEnd.replace("T", " ")} · {snapshot.timezone}
                </p>
                <p className="mt-2 text-sm">
                  {s.location} ·{" "}
                  {s.assignments
                    .map((a: any) => snapshot.names[a.userId] || "Staff")
                    .join(", ") || "Open shift"}
                </p>
              </article>
            ))}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            No downloaded schedule is available. Sign in online and choose
            Download offline schedule on your dashboard.
          </p>
        )}
        <button className={button} onClick={onBack}>
          Back to sign in
        </button>
      </section>
    </main>
  );
}
