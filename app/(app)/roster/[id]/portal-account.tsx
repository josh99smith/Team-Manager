"use client";

import { useActionState } from "react";
import { createPlayerAccount } from "@/lib/actions/portal";

export function PortalAccountForm({ playerId }: { playerId: string }) {
  const [state, formAction, pending] = useActionState(
    createPlayerAccount.bind(null, playerId),
    { error: null }
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="player@email.com"
          className="input"
          aria-label="Portal email"
        />
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="Temporary password"
          className="input"
          aria-label="Portal password"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-secondary text-sm">
        {pending ? "Creating…" : "Create portal login"}
      </button>
    </form>
  );
}
