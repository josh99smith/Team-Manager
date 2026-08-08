"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  saveAnthropicApiKey,
  removeAnthropicApiKey,
  type FormState,
} from "@/lib/actions/team";
import { ConfirmButton } from "@/components/confirm-button";

const STATUS_COPY: Record<"saved" | "environment" | "none", { label: string; className: string }> = {
  saved: { label: "✓ Configured — saved here in Settings", className: "text-green-600" },
  environment: { label: "✓ Configured — using the ANTHROPIC_API_KEY environment variable", className: "text-green-600" },
  none: { label: "Not configured — AI photo import won't work yet", className: "text-slate-500" },
};

export function ApiKeyForm({ status }: { status: "saved" | "environment" | "none" }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveAnthropicApiKey,
    { error: null }
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Never leave a pasted key sitting in the field once it's saved.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const copy = STATUS_COPY[state.ok ? "saved" : status];

  return (
    <div className="card p-6 space-y-4 max-w-xl">
      <div>
        <h2 className="font-semibold">AI photo import</h2>
        <p className="text-sm text-slate-500 mt-1">
          Powers the schedule and roster photo import features. Get a key at{" "}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            console.anthropic.com
          </a>
          .
        </p>
      </div>

      <p className={`text-sm font-medium ${copy.className}`}>{copy.label}</p>

      <form ref={formRef} action={formAction} className="space-y-3">
        <div>
          <label className="label" htmlFor="anthropicApiKey">
            {status === "saved" ? "Replace saved key" : "Anthropic API key"}
          </label>
          <input
            id="anthropicApiKey"
            name="anthropicApiKey"
            type="password"
            autoComplete="off"
            placeholder="sk-ant-..."
            className="input font-mono text-xs"
          />
        </div>
        {state.error && (
          <p className="text-sm text-red-600 font-medium">⚠ {state.error}</p>
        )}
        {state.ok && !pending && (
          <p className="text-sm text-green-600 font-medium">✓ Key saved.</p>
        )}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save key"}
          </button>
          {status === "saved" && (
            <ConfirmButton
              action={removeAnthropicApiKey}
              confirmText="Remove the saved API key? AI photo import will fall back to the ANTHROPIC_API_KEY environment variable, or stop working if that isn't set either."
              className="btn-secondary"
            >
              Remove saved key
            </ConfirmButton>
          )}
        </div>
      </form>
    </div>
  );
}
