"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseHudlExport, type ImportRow } from "@/lib/import/hudl";
import { bulkImportPlayers } from "@/lib/actions/players";
import { formatHeight } from "@/lib/format";

export function RosterImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function preview() {
    const result = parseHudlExport(text);
    if (result.error) {
      setParseError(result.error);
      setRows(null);
      return;
    }
    if (result.rows.length === 0) {
      setParseError("No players found in that JSON.");
      setRows(null);
      return;
    }
    setParseError(null);
    setImportedCount(null);
    setRows(result.rows);
    setDuplicateNames(result.duplicateNames);
    setExcluded(new Set());
  }

  function toggle(key: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function doImport() {
    if (!rows) return;
    const toImport = rows.filter((r) => !excluded.has(r.key));
    startTransition(async () => {
      const result = await bulkImportPlayers(
        toImport.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          jersey: r.jersey,
          positions: r.positions,
          heightIn: r.heightIn,
          weightLb: r.weightLb,
          classYear: r.classYear,
        }))
      );
      if (result.error) {
        setImportError(result.error);
      } else {
        setImportError(null);
        setImportedCount(result.count);
        setRows(null);
        setText("");
        router.refresh();
      }
    });
  }

  const includedCount = rows ? rows.length - excluded.size : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {!rows && (
        <div className="card p-6 space-y-3">
          <label className="label" htmlFor="hudl-json">
            Paste exported roster JSON
          </label>
          <textarea
            id="hudl-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder='[{"fullName": "Jane Smith", "lastName": "Smith", "jerseyNumber": "7", "positions": ["WR", "CB"], ...}]'
            className="input font-mono text-xs"
          />
          {parseError && (
            <p className="text-sm text-red-600 font-medium">⚠ {parseError}</p>
          )}
          {importedCount != null && (
            <p className="text-sm text-green-600 font-medium">
              ✓ Imported {importedCount} player{importedCount === 1 ? "" : "s"}. Go
              check the{" "}
              <a href="/roster" className="link">
                roster
              </a>
              , or paste another batch below.
            </p>
          )}
          <button
            type="button"
            onClick={preview}
            disabled={!text.trim()}
            className="btn-primary"
          >
            Preview import
          </button>
        </div>
      )}

      {rows && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold">
                {includedCount} of {rows.length} player{rows.length === 1 ? "" : "s"}{" "}
                will be imported
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Uncheck anything that shouldn&apos;t come in — placeholder
                accounts, duplicates, staff entries, etc.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRows(null)}
              className="btn-secondary"
            >
              ← Start over
            </button>
          </div>

          {duplicateNames.length > 0 && (
            <p className="text-sm text-amber-600 font-medium">
              ⚠ Appears more than once: {duplicateNames.join(", ")} — double-check
              these aren&apos;t the same player before importing both.
            </p>
          )}

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3"></th>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Positions</th>
                  <th className="py-2 pr-3">Ht / Wt</th>
                  <th className="py-2 pr-3">Class</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isDup = duplicateNames.includes(`${r.firstName} ${r.lastName}`);
                  const isOut = excluded.has(r.key);
                  return (
                    <tr
                      key={r.key}
                      className={`border-b border-slate-100 last:border-0 ${
                        isOut ? "opacity-40" : ""
                      } ${isDup ? "bg-amber-50" : ""}`}
                    >
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={!isOut}
                          onChange={() => toggle(r.key)}
                          aria-label={`Include ${r.firstName} ${r.lastName}`}
                        />
                      </td>
                      <td className="py-2 pr-3 font-mono text-slate-500">
                        {r.jersey ?? "—"}
                      </td>
                      <td className="py-2 pr-3 font-medium">
                        {r.firstName} {r.lastName}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {r.positions || (
                          <span className="text-slate-400">
                            {r.sourcePositions ? `${r.sourcePositions} (unmapped)` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {formatHeight(r.heightIn)}
                        {r.weightLb ? ` / ${r.weightLb} lb` : ""}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {r.classYear || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {importError && (
            <p className="text-sm text-red-600 font-medium">⚠ {importError}</p>
          )}
          <button
            type="button"
            onClick={doImport}
            disabled={pending || includedCount === 0}
            className="btn-primary"
          >
            {pending ? "Importing…" : `Import ${includedCount} player${includedCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}
