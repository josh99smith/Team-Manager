import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteStaff } from "@/lib/actions/staff";
import { ROLE_LABELS } from "@/lib/constants";
import { StaffForm } from "./staff-form";
import { ConfirmButton } from "@/components/confirm-button";

export default async function StaffPage() {
  const session = await auth();
  const isHeadCoach = session?.user.role === "HEAD_COACH";

  const users = await prisma.user.findMany({
    where: { role: { not: "PLAYER" } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Coaching staff</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="card divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-xs text-slate-500">
                  {ROLE_LABELS[u.role] ?? u.role}
                  {u.positionGroup ? ` · ${u.positionGroup}` : ""} · {u.email}
                </div>
              </div>
              {isHeadCoach && u.id !== session?.user.id && (
                <ConfirmButton
                  action={deleteStaff.bind(null, u.id)}
                  confirmText={`Remove ${u.name} from the staff? They will no longer be able to sign in.`}
                  className="btn-danger text-xs px-2 py-1"
                >
                  Remove
                </ConfirmButton>
              )}
            </div>
          ))}
        </div>

        {isHeadCoach ? (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Add staff member</h2>
            <StaffForm />
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Only the head coach can add or remove staff.
          </p>
        )}
      </div>
    </div>
  );
}
