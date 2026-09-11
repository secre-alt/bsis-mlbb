import { useRef, useState } from "react";
import { Move, RotateCcw, Upload, X, ZoomIn } from "lucide-react";
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

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > 8 * 1024 * 1024) return setError("Choose an image smaller than 8 MB.");
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSource({ url, width: image.naturalWidth, height: image.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setError("");
    };
    image.onerror = () => setError("That image could not be opened.");
    image.src = url;
  };

  const startDrag = (event) => {
    if (!source) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, offset };
  };

  const dragImage = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const scale = OUTPUT_SIZE / PREVIEW_SIZE;
    setOffset({
      x: clamp(drag.offset.x + (event.clientX - drag.x) * scale, -220, 220),
      y: clamp(drag.offset.y + (event.clientY - drag.y) * scale, -220, 220),
    });
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
      canvas.width = canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      const scale = Math.max(OUTPUT_SIZE / source.width, OUTPUT_SIZE / source.height) * zoom;
      const width = source.width * scale;
      const height = source.height * scale;
      context.drawImage(image, (OUTPUT_SIZE - width) / 2 + offset.x, (OUTPUT_SIZE - height) / 2 + offset.y, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
      if (!blob) throw new Error("Could not create the cropped logo.");
      const result = await onSave(new File([blob], `${team.abbr}-logo.png`, { type: "image/png" }));
      if (result?.error) return setError(result.error);
      URL.revokeObjectURL(source.url);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Could not save the logo.");
    } finally {
      setSaving(false);
    }
  };

  const previewScale = source ? Math.max(PREVIEW_SIZE / source.width, PREVIEW_SIZE / source.height) * zoom : 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logo-editor-title">
      <div className="w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ember-500">Team branding</p><h2 id="logo-editor-title" className="mt-0.5 font-display text-lg font-bold">Replace {team.abbr} logo</h2></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close logo editor" className="p-2 text-[var(--text-muted)]"><X size={18} /></button>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[224px_1fr]">
          <div>
            <div className={`relative mx-auto h-56 w-56 overflow-hidden bg-[var(--panel-soft)] shadow-[inset_0_0_0_1px_var(--line)] ${source ? "cursor-grab touch-none active:cursor-grabbing" : ""}`} onPointerDown={startDrag} onPointerMove={dragImage} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
              {source ? <img src={source.url} alt="Logo crop preview" draggable="false" className="absolute max-w-none" style={{ width: source.width * previewScale, height: source.height * previewScale, left: `calc(50% + ${(offset.x * PREVIEW_SIZE) / OUTPUT_SIZE}px)`, top: `calc(50% + ${(offset.y * PREVIEW_SIZE) / OUTPUT_SIZE}px)`, transform: "translate(-50%, -50%)" }} /> : <div className="flex h-full items-center justify-center"><TeamLogo team={team} size={104} fontSize={30} /></div>}
              {source && <><span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(to right, transparent 33.1%, rgba(255,255,255,0.55) 33.3%, transparent 33.7%, transparent 66.3%, rgba(255,255,255,0.55) 66.5%, transparent 66.9%), linear-gradient(to bottom, transparent 33.1%, rgba(255,255,255,0.55) 33.3%, transparent 33.7%, transparent 66.3%, rgba(255,255,255,0.55) 66.5%, transparent 66.9%)" }} /><span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ember-400/90 shadow-[0_0_8px_rgba(255,90,31,0.8)]" /></>}
              <span className="pointer-events-none absolute inset-0 border-2 border-ember-500/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45)]" />
            </div>
            <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{source ? "Drag image to position" : "Square crop preview"}</p>
          </div>
          <div className="flex flex-col">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} className="hidden" />
            <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-sm border border-ember-500/35 bg-ember-500/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ember-400"><Upload size={14} /> {source ? "Choose another image" : "Choose image"}</button>
            {source && <div className="mt-5 space-y-4"><Control label="Zoom" icon={<ZoomIn size={13} />}><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-ember-500" /></Control><Control label="Horizontal position" icon={<Move size={13} />}><input type="range" min="-220" max="220" value={offset.x} onChange={(event) => setOffset((current) => ({ ...current, x: Number(event.target.value) }))} className="w-full accent-ember-500" /></Control><Control label="Vertical position" icon={<Move size={13} />}><input type="range" min="-220" max="220" value={offset.y} onChange={(event) => setOffset((current) => ({ ...current, y: Number(event.target.value) }))} className="w-full accent-ember-500" /></Control><button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-ember-400"><RotateCcw size={12} /> Reset crop</button></div>}
            {error && <p className="mt-3 text-xs text-blood-500">{error}</p>}
            <button type="button" onClick={save} disabled={!source || saving} className="mt-auto rounded-sm bg-ember-500 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-40">{saving ? "Saving…" : "Save cropped logo"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Control({ label, icon, children }) { return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{icon} {label}</span>{children}</label>; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
