import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import type { Crop } from '../lib/types';

export default function ImageCropper({ src, initial, onDone, onCancel }: { src: string; initial: Crop | null; onDone: (c: Crop | null) => void; onCancel: () => void }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <div role="dialog" aria-modal="true" aria-label="Обрезка картинки" className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      <p className="p-3 text-center text-sm text-vellum">Двигайте и приближайте картинку: в рамке то, что увидят в карточке. Полная картинка останется в записи.</p>
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={pos}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setPos}
          onZoomChange={setZoom}
          onCropComplete={(a) => setArea(a)}
          initialCroppedAreaPercentages={initial ? { x: initial.x, y: initial.y, width: initial.w, height: initial.h } : undefined}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-ink p-3">
        <label className="flex flex-1 items-center gap-2 text-sm text-vellum">
          Масштаб
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[rgb(var(--c-gold))]" />
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDone(null)}>Без обрезки</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Отмена</button>
        <button type="button" className="btn btn-gold btn-sm" disabled={!area}
          onClick={() => area && onDone({ x: area.x, y: area.y, w: area.width, h: area.height })}>Готово</button>
      </div>
    </div>
  );
}
