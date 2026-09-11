import { useRef, useState } from "react";
import { Hand, Move, RotateCcw, Upload, X, ZoomIn } from "lucide-react";
import { TeamLogo } from "./shared";

const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 224;

export default function LogoEditorModal({ team, onClose, onSave }) {
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const [source, setSource] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose an image smaller than 8 MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSource({ url, width: image.naturalWidth, height: image.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setError("");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That image could not be opened.");
    };
    image.src = url;
  };

  const save = async () => {
    if (!source) return;
    setSaving(true);
    setError("");
    try {
      const image = new Image();
      image.src = source.url;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      const baseScale = Math.max(
        OUTPUT_SIZE / source.width,
        OUTPUT_SIZE / source.height,
      );
      const scale = baseScale * zoom;
      const width = source.width * scale;
      const height = source.height * scale;
      const x = (OUTPUT_SIZE - width) / 2 + offset.x;
      const y = (OUTPUT_SIZE - height) / 2 + offset.y;
      context.drawImage(image, x, y, width, height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.92),
      );
      if (!blob) throw new Error("Could not create the cropped logo.");

      const file = new File([blob], `${team.abbr.toLowerCase()}-logo.png`, {
        type: "image/png",
      });
      const result = await onSave(file);
      if (result?.error) {
        setError(result.error);
        return;
      }
      URL.revokeObjectURL(source.url);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Could not save the logo.");
    } finally {
      setSaving(false);
    }
  };

  const previewScale = source
    ? Math.max(PREVIEW_SIZE / source.width, PREVIEW_SIZE / source.height) * zoom
    : 1;

  const resetCrop = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const startDrag = (event) => {
    if (!source) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset,
    };
  };

  const dragImage = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const scaleToOutput = OUTPUT_SIZE / PREVIEW_SIZE;
    setOffset({
      x: Math.max(-180, Math.min(180, drag.offset.x + (event.clientX - drag.x) * scaleToOutput)),
      y: Math.max(-180, Math.min(180, drag.offset.y + (event.clientY - drag.y) * scaleToOutput)),
    });
  };

  const stopDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logo-editor-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ember-500">
              Team branding
            </p>
            <h2 id="logo-editor-title" className="mt-0.5 font-display text-lg font-bold text-[var(--text)]">
              Replace {team.abbr} logo
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close logo editor"
            className="rounded-sm p-2 text-[var(--text-muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[224px_1fr]">
          <div>
            <div
              className={`relative mx-auto h-56 w-56 overflow-hidden bg-[var(--panel-soft)] shadow-[inset_0_0_0_1px_var(--line)] ${source ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
              onPointerDown={startDrag}
              onPointerMove={dragImage}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
            >
              {source ? (
                <img
                  src={source.url}
                  alt="Logo crop preview"
                  className="absolute max-w-none"
                  style={{
                    width: source.width * previewScale,
                    height: source.height * previewScale,
                    left: `calc(50% + ${(offset.x * PREVIEW_SIZE) / OUTPUT_SIZE}px)`,
                    top: `calc(50% + ${(offset.y * PREVIEW_SIZE) / OUTPUT_SIZE}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <TeamLogo team={team} size={104} fontSize={30} />
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 border-2 border-ember-500/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45)]" />
            </div>
            <p className="mt-2 text-center text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {source ? "Drag image to position" : "Square crop preview"}
            </p>
          </div>

          <div className="flex flex-col">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectImage}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-sm border border-ember-500/35 bg-ember-500/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ember-400 transition hover:bg-ember-500/20"
            >
              <Upload size={14} /> {source ? "Choose another image" : "Choose image"}
            </button>

            {source && (
              <div className="mt-5 space-y-4">
                <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
                  <span className="mr-1 inline-flex align-text-bottom text-ember-500"><Hand size={13} /></span>
                  Drag the image in the preview, then use the controls below for fine adjustments.
                </div>
                <Control label="Zoom" icon={<ZoomIn size={13} />}>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="w-full accent-ember-500"
                  />
                </Control>
                <Control label="Horizontal position" icon={<Move size={13} />}>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={offset.x}
                    onChange={(event) => setOffset((current) => ({ ...current, x: Number(event.target.value) }))}
                    className="w-full accent-ember-500"
                  />
                </Control>
                <Control label="Vertical position" icon={<Move size={13} />}>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={offset.y}
                    onChange={(event) => setOffset((current) => ({ ...current, y: Number(event.target.value) }))}
                    className="w-full accent-ember-500"
                  />
                </Control>
                <button
                  type="button"
                  onClick={resetCrop}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] transition hover:text-ember-400"
                >
                  <RotateCcw size={12} /> Reset crop
                </button>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-blood-500">{error}</p>}
            <button
              type="button"
              onClick={save}
              disabled={!source || saving}
              className="mt-auto rounded-sm bg-ember-500 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save cropped logo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Control({ label, icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
