"use client";

import { useActionState, useState } from "react";
import { saveTeamSettings, type FormState } from "@/lib/actions/team";
import { TeamColorPicker } from "@/components/team-color-picker";

export function TeamSettingsForm({
  name,
  season,
  primaryColor,
  secondaryColor,
}: {
  name: string;
  season: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveTeamSettings,
    { error: null }
  );
  const [teamName, setTeamName] = useState(name);

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Team info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="name">
              Team name
            </label>
            <input
              id="name"
              name="name"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="season">
              Season
            </label>
            <input id="season" name="season" defaultValue={season} className="input" />
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Team colors</h2>
          <p className="text-sm text-slate-500 mt-1">
            Primary colors the buttons, links, and highlighted selections.
            Secondary colors the navigation bar. Very light colors are
            automatically deepened a touch so text stays readable.
          </p>
        </div>
        <TeamColorPicker
          defaultPrimary={primaryColor}
          defaultSecondary={secondaryColor}
          previewName={teamName}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 font-medium">⚠ {state.error}</p>
      )}
      {state.ok && !pending && (
        <p className="text-sm text-green-600 font-medium">
          ✓ Saved — the new colors are live across the app now.
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save team settings"}
      </button>
    </form>
  );
}
