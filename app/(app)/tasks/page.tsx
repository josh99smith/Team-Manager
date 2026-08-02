import { prisma } from "@/lib/prisma";
import { createTask, setTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { TASK_STATUSES, TASK_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatShortDate } from "@/lib/format";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";

export default async function TasksPage() {
  const [tasks, users, players, upcomingEvents] = await Promise.all([
    prisma.task.findMany({
      include: { assigneeUser: true, assigneePlayer: true, event: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: { not: "PLAYER" } },
      orderBy: { name: "asc" },
    }),
    prisma.player.findMany({
      where: { status: { in: ["ACTIVE", "INJURED"] } },
      orderBy: { lastName: "asc" },
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
  ]);

  const byStatus = (s: string) => tasks.filter((t) => t.status === s);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>

      <div className="card p-6 mb-8 max-w-2xl">
        <h2 className="font-semibold mb-4">New task</h2>
        <form action={createTask} className="space-y-4">
          <input
            name="title"
            required
            placeholder="What needs to get done?"
            className="input"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Details (optional)"
            className="input"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Due date</label>
              <input name="dueDate" type="date" className="input" />
            </div>
            <div>
              <label className="label">Assign to</label>
              <select name="assignee" className="input" defaultValue="">
                <option value="">Unassigned</option>
                <optgroup label="Staff">
                  {users.map((u) => (
                    <option key={u.id} value={`user:${u.id}`}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Players">
                  {players.map((p) => (
                    <option key={p.id} value={`player:${p.id}`}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="label">Linked event</label>
              <select name="eventId" className="input" defaultValue="">
                <option value="">None</option>
                {upcomingEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {EVENT_TYPE_LABELS[e.type]} · {formatShortDate(e.startsAt)}
                    {e.opponent ? ` vs ${e.opponent}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SubmitButton pendingLabel="Adding…">Add task</SubmitButton>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TASK_STATUSES.map((status) => (
          <div key={status}>
            <h2 className="text-sm font-semibold text-slate-500 mb-3">
              {TASK_STATUS_LABELS[status]}{" "}
              <span className="text-slate-400">({byStatus(status).length})</span>
            </h2>
            <div className="space-y-2">
              {byStatus(status).length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  Nothing here
                </div>
              )}
              {byStatus(status).map((t) => (
                <div key={t.id} className="card p-4">
                  <div className="font-medium text-sm">{t.title}</div>
                  {t.description && (
                    <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">
                      {t.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                    {t.dueDate && <span>Due {formatDate(t.dueDate)}</span>}
                    {t.assigneeUser && <span>→ {t.assigneeUser.name}</span>}
                    {t.assigneePlayer && (
                      <span>
                        → {t.assigneePlayer.firstName} {t.assigneePlayer.lastName}
                      </span>
                    )}
                    {t.event && (
                      <span>
                        ↳ {EVENT_TYPE_LABELS[t.event.type]}{" "}
                        {formatShortDate(t.event.startsAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {status !== "OPEN" && (
                      <form
                        action={setTaskStatus.bind(
                          null,
                          t.id,
                          status === "DONE" ? "IN_PROGRESS" : "OPEN"
                        )}
                      >
                        <button className="btn-secondary text-xs px-2 py-1">
                          ← Back
                        </button>
                      </form>
                    )}
                    {status !== "DONE" && (
                      <form
                        action={setTaskStatus.bind(
                          null,
                          t.id,
                          status === "OPEN" ? "IN_PROGRESS" : "DONE"
                        )}
                      >
                        <button className="btn-secondary text-xs px-2 py-1">
                          {status === "OPEN" ? "Start" : "Complete ✓"}
                        </button>
                      </form>
                    )}
                    <ConfirmButton
                      action={deleteTask.bind(null, t.id)}
                      confirmText="Delete this task?"
                      className="btn-danger text-xs px-2 py-1"
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
