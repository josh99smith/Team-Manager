"use client";

import { useActionState } from "react";
import type { Player } from "@prisma/client";
import type { Archetype } from "@/lib/ratings/presets";
import type { FormState } from "@/lib/actions/players";
import { PLAYER_STATUSES, PLAYER_STATUS_LABELS } from "@/lib/constants";

export function PlayerForm({
  action,
  player,
  submitLabel,
  positions,
  archetypes,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  player?: Player;
  submitLabel: string;
  positions: string[];
  archetypes: Archetype[];
}) {
  const selectedPositions = new Set(
    (player?.positions ?? "").split(",").filter(Boolean)
  );
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Basics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="firstName">
              First name *
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              defaultValue={player?.firstName}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="lastName">
              Last name *
            </label>
            <input
              id="lastName"
              name="lastName"
              required
              defaultValue={player?.lastName}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="jersey">
              Jersey #
            </label>
            <input
              id="jersey"
              name="jersey"
              type="number"
              min={0}
              max={99}
              defaultValue={player?.jersey ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="classYear">
              Class year
            </label>
            <input
              id="classYear"
              name="classYear"
              placeholder="e.g. 2027 or Junior"
              defaultValue={player?.classYear ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="heightIn">
              Height (inches)
            </label>
            <input
              id="heightIn"
              name="heightIn"
              type="number"
              min={0}
              defaultValue={player?.heightIn ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="weightLb">
              Weight (lb)
            </label>
            <input
              id="weightLb"
              name="weightLb"
              type="number"
              min={0}
              defaultValue={player?.weightLb ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="birthdate">
              Birthdate
            </label>
            <input
              id="birthdate"
              name="birthdate"
              type="date"
              defaultValue={
                player?.birthdate
                  ? player.birthdate.toISOString().slice(0, 10)
                  : ""
              }
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={player?.status ?? "ACTIVE"}
              className="input"
            >
              {PLAYER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PLAYER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="label">Positions</span>
          <div className="flex flex-wrap gap-2">
            {positions.map((pos) => (
              <label
                key={pos}
                className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm cursor-pointer transition-colors has-checked:bg-[var(--brand)] has-checked:text-[var(--brand-ink)] has-checked:border-[var(--brand)]"
              >
                <input
                  type="checkbox"
                  name="positions"
                  value={pos}
                  defaultChecked={selectedPositions.has(pos)}
                  className="sr-only"
                />
                {pos}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="font-semibold">Rating preset</h2>
        <p className="text-sm text-slate-500">
          {player
            ? "Optionally re-roll this player's attribute ratings from a preset type. Leaving it on \"Keep current ratings\" changes nothing; picking a preset overwrites all current attribute ratings."
            : "Give this player a starting attribute profile. You can fine-tune individual attributes on their profile afterward."}
        </p>
        <select name="archetype" className="input" defaultValue="">
          <option value="">
            {player ? "Keep current ratings" : "Standard (everything starts at 60)"}
          </option>
          {archetypes.map((a) => (
            <option key={a.key} value={a.key}>
              {a.name} — {a.description}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Contact</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={player?.email ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={player?.phone ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="emergencyName">
              Emergency contact
            </label>
            <input
              id="emergencyName"
              name="emergencyName"
              defaultValue={player?.emergencyName ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="emergencyPhone">
              Emergency phone
            </label>
            <input
              id="emergencyPhone"
              name="emergencyPhone"
              defaultValue={player?.emergencyPhone ?? ""}
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-2">
        <label className="label" htmlFor="notes">
          Coach notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={player?.notes ?? ""}
          className="input"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 font-medium">⚠ {state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
