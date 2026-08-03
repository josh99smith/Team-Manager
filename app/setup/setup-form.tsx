"use client";

import { useActionState, useState } from "react";
import { completeSetup } from "@/lib/actions/auth-actions";
import { SPORTS } from "@/lib/ratings/presets";
import { TeamColorPicker } from "@/components/team-color-picker";

export function SetupForm() {
  const [state, formAction, pending] = useActionState(completeSetup, {
    error: null,
  });
  const [teamName, setTeamName] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="teamName">
            Team name
          </label>
          <input
            id="teamName"
            name="teamName"
            required
            className="input"
            placeholder="Eastside Eagles"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="season">
            Season
          </label>
          <input id="season" name="season" className="input" placeholder="2026" />
        </div>
      </div>
      <div>
        <span className="label">Team colors</span>
        <TeamColorPicker previewName={teamName} />
      </div>
      <div>
        <label className="label" htmlFor="sport">
          Sport
        </label>
        <select id="sport" name="sport" className="input" defaultValue="Football">
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">
          Sets the positions, rating attributes, and stat book for your team.
        </p>
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
