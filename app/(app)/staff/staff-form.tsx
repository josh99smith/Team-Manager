"use client";

import { useActionState } from "react";
import { createStaff } from "@/lib/actions/staff";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export function StaffForm() {
  const [state, formAction, pending] = useActionState(createStaff, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="staff-name">
          Name
        </label>
        <input id="staff-name" name="name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="staff-email">
          Email
        </label>
        <input id="staff-email" name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="staff-password">
          Temporary password
        </label>
        <input
          id="staff-password"
          name="password"
          type="text"
          required
          minLength={8}
          className="input"
          placeholder="At least 8 characters"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="staff-role">
            Role
          </label>
          <select id="staff-role" name="role" className="input" defaultValue="ASSISTANT">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="staff-positionGroup">
            Position group
          </label>
          <input
            id="staff-positionGroup"
            name="positionGroup"
            placeholder="e.g. WR, OL, DBs"
            className="input"
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Adding…" : "Add staff member"}
      </button>
    </form>
  );
}
