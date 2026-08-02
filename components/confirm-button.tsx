"use client";

import { useTransition } from "react";

export function ConfirmButton({
  action,
  confirmText,
  children,
  className = "btn-danger",
}: {
  action: () => Promise<void>;
  confirmText: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (window.confirm(confirmText)) {
          startTransition(() => action());
        }
      }}
    >
      {children}
    </button>
  );
}
