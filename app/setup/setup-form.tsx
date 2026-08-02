"use client";

import { useActionState } from "react";
import { completeSetup } from "@/lib/actions/auth-actions";

export function SetupForm() {
  const [state, formAction, pending] = useActionState(completeSetup, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="teamName">
            Team name
          </label>
          <input id="teamName" name="teamName" required className="input" placeholder="Eastside Eagles" />
        </div>
        <div>
          <label className="label" htmlFor="season">
            Season
          </label>
          <input id="season" name="season" className="input" placeholder="2026" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="name">
          Your name
        </label>
        <input id="name" name="name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating…" : "Create team"}
      </button>
    </form>
  );
}
