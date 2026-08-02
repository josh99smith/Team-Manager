"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card p-10 max-w-lg mx-auto mt-12 text-center">
      <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
      <p className="text-sm text-slate-500 mb-1">
        The last action didn&apos;t complete — nothing was saved.
      </p>
      {error?.message && (
        <p className="text-xs text-red-600 mb-4 break-words">{error.message}</p>
      )}
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
