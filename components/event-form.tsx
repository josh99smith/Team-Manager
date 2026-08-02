"use client";

import { useState, useActionState } from "react";
import type { Event } from "@prisma/client";
import type { FormState } from "@/lib/actions/events";
import { EVENT_TYPES, EVENT_TYPE_LABELS, WEEKDAYS } from "@/lib/constants";

// Renders as local time for datetime-local inputs
function toLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  action,
  event,
  submitLabel,
  allowRecurrence = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  event?: Event;
  submitLabel: string;
  allowRecurrence?: boolean;
}) {
  const [type, setType] = useState(event?.type ?? "PRACTICE");
  const [repeat, setRepeat] = useState(false);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="type">
              Type
            </label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="title">
              Title (optional)
            </label>
            <input
              id="title"
              name="title"
              defaultValue={event?.title ?? ""}
              placeholder="e.g. Two-a-day, Film session"
              className="input"
            />
          </div>
          {(type === "GAME" || type === "SCRIMMAGE") && (
            <div className="col-span-2">
              <label className="label" htmlFor="opponent">
                Opponent
              </label>
              <input
                id="opponent"
                name="opponent"
                defaultValue={event?.opponent ?? ""}
                className="input"
              />
            </div>
          )}
          <div>
            <label className="label" htmlFor="startsAt">
              Starts *
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={toLocal(event?.startsAt)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="endsAt">
              Ends
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocal(event?.endsAt)}
              className="input"
            />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              name="location"
              defaultValue={event?.location ?? ""}
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes / plan
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={event?.notes ?? ""}
            className="input"
          />
        </div>
      </div>

      {allowRecurrence && (
        <div className="card p-6 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
            />
            Repeat weekly
          </label>
          {repeat && (
            <div className="space-y-4">
              <div>
                <span className="label">On days</span>
                <div className="flex gap-2">
                  {WEEKDAYS.map((d) => (
                    <label
                      key={d.value}
                      className="flex items-center justify-center border border-slate-300 rounded-lg w-11 py-1.5 text-sm cursor-pointer has-checked:bg-slate-900 has-checked:text-white has-checked:border-slate-900"
                    >
                      <input
                        type="checkbox"
                        name="repeatDays"
                        value={d.value}
                        className="sr-only"
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="max-w-xs">
                <label className="label" htmlFor="repeatUntil">
                  Until
                </label>
                <input
                  id="repeatUntil"
                  name="repeatUntil"
                  type="date"
                  required={repeat}
                  className="input"
                />
              </div>
              <p className="text-xs text-slate-500">
                One event is created for each selected weekday between the start
                date and the end date (max 60).
              </p>
            </div>
          )}
        </div>
      )}

      {state.error && (
        <p className="text-sm text-red-600 font-medium">⚠ {state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
