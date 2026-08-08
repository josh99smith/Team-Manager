"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/import/image";
import { parseSchedulePhoto, bulkImportEvents } from "@/lib/actions/ai-import";
import type { ParsedScheduleRow } from "@/lib/import/schedule";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/constants";

export function CalendarImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedScheduleRow[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [extractError, setExtractError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [extracting, startExtracting] = useTransition();
  const [importing, startImporting] = useTransition();

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setExtractError(null);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  function extract() {
    if (!file) return;
    startExtracting(async () => {
      try {
        const { base64, mediaType } = await compressImageFile(file);
        const result = await parseSchedulePhoto(base64, mediaType);
        if (!result.rows) {
          setExtractError(result.error);
          return;
        }
        setExtractError(null);
        setImportedCount(null);
        setRows(result.rows);
        setExcluded(new Set());
      } catch (e) {
        setExtractError(e instanceof Error ? e.message : "Something went wrong reading that photo.");
      }
    });
  }

  function toggle(key: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startOver() {
    setRows(null);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function doImport() {
    if (!rows) return;
    const toImport = rows.filter((r) => !excluded.has(r.key));
    startImporting(async () => {
      const result = await bulkImportEvents(
        toImport.map((r) => ({
          type: r.type,
          title: r.title,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          location: r.location,
          opponent: r.opponent,
          notes: r.notes,
        }))
      );
      if (result.error) {
        setImportError(result.error);
      } else {
        setImportError(null);
        setImportedCount(result.count);
        startOver();
        router.refresh();
      }
    });
  }

  const includedCount = rows ? rows.length - excluded.size : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {!rows && (
        <div className="card p-6 space-y-3">
          <label className="label" htmlFor="schedule-photo">
            Upload or snap a photo of the schedule
          </label>
          <input
            ref={fileInputRef}
            id="schedule-photo"
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="input"
          />
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected schedule photo"
              className="max-h-64 rounded-lg border border-slate-200"
            />
          )}
          {extractError && (
            <p className="text-sm text-red-600 font-medium">⚠ {extractError}</p>
          )}
          {importedCount != null && (
            <p className="text-sm text-green-600 font-medium">
              ✓ Imported {importedCount} event{importedCount === 1 ? "" : "s"}. Check the{" "}
              <a href="/calendar" className="link">
                calendar
              </a>
              , or upload another photo below.
            </p>
          )}
          <button
            type="button"
            onClick={extract}
            disabled={!file || extracting}
            className="btn-primary"
          >
            {extracting ? "Reading photo…" : "Extract schedule"}
          </button>
        </div>
      )}

      {rows && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold">
                {includedCount} of {rows.length} event{rows.length === 1 ? "" : "s"} will be
                imported
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Uncheck anything that&apos;s wrong, already on the calendar, or a
                misread — you can always add it manually later.
              </p>
            </div>
            <button type="button" onClick={startOver} className="btn-secondary">
              ← Start over
            </button>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3"></th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Date / time</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOut = excluded.has(r.key);
                  const flagged = !!(r.duplicateWarning || r.conflictWarning);
                  return (
                    <tr
                      key={r.key}
                      className={`border-b border-slate-100 last:border-0 align-top ${
                        isOut ? "opacity-40" : ""
                      } ${flagged ? "bg-amber-50" : ""}`}
                    >
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={!isOut}
                          onChange={() => toggle(r.key)}
                          aria-label={`Include ${r.title || r.opponent || r.type}`}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`badge ${EVENT_TYPE_COLORS[r.type] ?? ""}`}>
                          {EVENT_TYPE_LABELS[r.type] ?? r.type}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-medium">
                        {r.title || (r.opponent ? `vs ${r.opponent}` : "—")}
                        {r.notes && (
                          <div className="text-xs font-normal text-slate-500 whitespace-normal max-w-xs">
                            {r.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {r.date}
                        {r.startTime ? ` · ${r.startTime}` : ""}
                        {r.endTime ? `–${r.endTime}` : ""}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{r.location || "—"}</td>
                      <td className="py-2 pr-3 whitespace-normal max-w-xs">
                        {r.duplicateWarning && (
                          <div className="text-xs text-amber-700">⚠ {r.duplicateWarning}</div>
                        )}
                        {r.conflictWarning && (
                          <div className="text-xs text-amber-700">⚠ {r.conflictWarning}</div>
                        )}
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
            disabled={importing || includedCount === 0}
            className="btn-primary"
          >
            {importing
              ? "Importing…"
              : `Import ${includedCount} event${includedCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}
