import { useRef, useState } from "react";
import { Crop, RotateCcw, Upload, X } from "lucide-react";
import { TeamLogo } from "./shared";

const SIZE = 224;
const MIN_SIZE = 72;

export default function LogoEditorModal({ team, onClose, onSave }) {
  const inputRef = useRef(null);
  const gestureRef = useRef(null);
  const [source, setSource] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: SIZE });
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
      setCrop({ x: 0, y: 0, size: SIZE });
      setError("");
    };
    image.onerror = () => setError("That image could not be opened.");
    image.src = url;
  };

  const begin = (event, mode) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { mode, id: event.pointerId, x: event.clientX, y: event.clientY, crop };
  };

  const move = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.mode === "move") {
      setCrop({
        ...gesture.crop,
        x: clamp(gesture.crop.x + dx, 0, SIZE - gesture.crop.size),
        y: clamp(gesture.crop.y + dy, 0, SIZE - gesture.crop.size),
      });
    } else {
      const size = clamp(gesture.crop.size + Math.max(dx, dy), MIN_SIZE, SIZE - Math.max(gesture.crop.x, gesture.crop.y));
      setCrop({ ...gesture.crop, size });
    }
  };

  const save = async () => {
    if (!source) return;
    setSaving(true);
    try {
      const image = new Image();
      image.src = source.url;
      await image.decode();
      const scale = Math.max(SIZE / source.width, SIZE / source.height);
      const displayWidth = source.width * scale;
      const displayHeight = source.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const context = canvas.getContext("2d");
      context.drawImage(
        image,
        (crop.x - (SIZE - displayWidth) / 2) / scale,
        (crop.y - (SIZE - displayHeight) / 2) / scale,
        crop.size / scale,
        crop.size / scale,
        0, 0, 512, 512,
      );
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not crop that image.");
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ember-500">Team branding</p><h2 className="mt-0.5 font-display text-lg font-bold">Replace {team.abbr} logo</h2></div>
          <button type="button" onClick={onClose} disabled={saving} className="p-2 text-[var(--text-muted)]"><X size={18} /></button>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[224px_1fr]">
          <div>
            <div className="relative mx-auto h-56 w-56 overflow-hidden bg-[var(--panel-soft)]" onPointerMove={move} onPointerUp={() => { gestureRef.current = null; }} onPointerCancel={() => { gestureRef.current = null; }}>
              {source ? <><img src={source.url} alt="Logo crop source" draggable="false" className="absolute h-full w-full object-cover" /><div className="absolute cursor-move touch-none border-2 border-ember-400 shadow-[0_0_0_999px_rgba(0,0,0,0.55)]" style={{ left: crop.x, top: crop.y, width: crop.size, height: crop.size }} onPointerDown={(event) => begin(event, "move")}><span className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-ember-500 shadow" onPointerDown={(event) => begin(event, "resize")} /></div></> : <div className="flex h-full items-center justify-center"><TeamLogo team={team} size={104} fontSize={30} /></div>}
            </div>
            <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{source ? "Drag frame · resize corner" : "Square crop preview"}</p>
          </div>
          <div className="flex flex-col">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} className="hidden" />
            <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-sm border border-ember-500/35 bg-ember-500/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ember-400"><Upload size={14} /> {source ? "Choose another image" : "Choose image"}</button>
            {source && <div className="mt-5 rounded-sm border border-[var(--line)] bg-[var(--panel-soft)] p-3 text-[10px] leading-relaxed text-[var(--text-muted)]"><span className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-ember-400"><Crop size={13} /> Free crop</span>Drag the square over the part you want, then resize it from the round corner handle.<button type="button" onClick={() => setCrop({ x: 0, y: 0, size: SIZE })} className="mt-3 flex items-center gap-1.5 font-bold uppercase tracking-wider hover:text-ember-400"><RotateCcw size={12} /> Reset crop</button></div>}
            {error && <p className="mt-3 text-xs text-blood-500">{error}</p>}
            <button type="button" onClick={save} disabled={!source || saving} className="mt-auto rounded-sm bg-ember-500 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-40">{saving ? "Saving…" : "Save cropped logo"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
