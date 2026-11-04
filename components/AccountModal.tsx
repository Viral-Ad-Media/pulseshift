import React, { useState } from "react";
import { Modal } from "./Modal";
import { api, setAuthToken } from "../services/api";
export function AccountModal({
  onClose,
  onSessionChange,
}: {
  onClose: () => void;
  onSessionChange: (token: string | null) => void;
}) {
  const [currentPassword, setCurrent] = useState(""),
    [newPassword, setNew] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Modal
      label="Account security"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="mx-auto max-w-lg space-y-5 rounded-3xl bg-white p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setMessage("");
          try {
            const result = await api.post("/api/auth/change-password", {
              currentPassword,
              newPassword,
              revokeOtherSessions: true,
            });
            if (result.token) {
              setAuthToken(result.token);
              onSessionChange(result.token);
            }
            setMessage(
              "Password changed. Other sessions have been signed out.",
            );
            setCurrent("");
            setNew("");
          } catch (error: any) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-2xl font-bold">Account security</h2>
        <label className="block">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="block">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        {message && <p role="status">{message}</p>}
        <button
          disabled={busy}
          className="rounded-xl bg-slate-950 px-4 py-3 text-white"
        >
          {busy ? "Saving..." : "Change password"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="px-4 py-3"
        >
          Close
        </button>
      </form>
    </Modal>
  );
}
