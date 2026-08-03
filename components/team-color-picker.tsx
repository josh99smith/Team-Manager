"use client";

import { useState } from "react";
import { contrastText } from "@/lib/theme";

const PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: "Indigo", primary: "#4f46e5", secondary: "#0f172a" },
  { name: "Crimson & Black", primary: "#dc2626", secondary: "#111111" },
  { name: "Navy & Gold", primary: "#eab308", secondary: "#1e3a5f" },
  { name: "Green & White", primary: "#16a34a", secondary: "#052e16" },
  { name: "Orange & Blue", primary: "#f97316", secondary: "#1e3a8a" },
  { name: "Purple & Silver", primary: "#7c3aed", secondary: "#312e81" },
  { name: "Maroon & Gray", primary: "#9f1239", secondary: "#292524" },
  { name: "Sky & Navy", primary: "#0ea5e9", secondary: "#0c1e3e" },
];

export function TeamColorPicker({
  defaultPrimary = "#4f46e5",
  defaultSecondary = "#0f172a",
  previewName = "Your Team",
}: {
  defaultPrimary?: string;
  defaultSecondary?: string;
  previewName?: string;
}) {
  const [primary, setPrimary] = useState(defaultPrimary);
  const [secondary, setSecondary] = useState(defaultSecondary);

  return (
    <div className="space-y-4">
      <div>
        <span className="label">Presets</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setPrimary(p.primary);
                setSecondary(p.secondary);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 cursor-pointer"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: p.primary }}
              />
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: p.secondary }}
              />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="primaryColor">
            Primary — buttons &amp; links
          </label>
          <div className="flex items-center gap-2">
            <input
              id="primaryColor"
              name="primaryColor"
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="w-10 h-10 rounded-md border border-slate-300 cursor-pointer shrink-0"
            />
            <input
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="input font-mono"
              aria-label="Primary color hex code"
              maxLength={7}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="secondaryColor">
            Secondary — nav bar
          </label>
          <div className="flex items-center gap-2">
            <input
              id="secondaryColor"
              name="secondaryColor"
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="w-10 h-10 rounded-md border border-slate-300 cursor-pointer shrink-0"
            />
            <input
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="input font-mono"
              aria-label="Secondary color hex code"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      <div>
        <span className="label">Preview</span>
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div
            className="px-4 py-2.5 text-sm font-bold flex items-center justify-between"
            style={{ backgroundColor: secondary, color: contrastText(secondary) }}
          >
            {previewName || "Your Team"}
            <span className="text-xs font-normal opacity-70">Nav bar</span>
          </div>
          <div className="p-4 flex flex-wrap items-center gap-3 bg-white">
            <button
              type="button"
              tabIndex={-1}
              className="rounded-lg px-3.5 py-2 text-sm font-medium pointer-events-none"
              style={{ backgroundColor: primary, color: contrastText(primary) }}
            >
              Primary button
            </button>
            <span className="text-sm font-medium" style={{ color: primary }}>
              A link looks like this
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
