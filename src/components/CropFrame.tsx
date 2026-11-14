import type { Crop } from '../lib/types';
import { useSignedUrl } from '../lib/images';

// Рамка 4:3 с картинкой. Если задана обрезка — показываем только выбранный фрагмент,
// сама картинка при этом не меняется (полную можно открыть значком в углу).
export function CropFrame({ src, crop, alt, className = '' }: { src: string | null; crop: Crop | null; alt: string; className?: string }) {
  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden bg-bark ${className}`}>
      <div className="card-zoom absolute inset-0">
        {src ? (
          crop ? (
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className="absolute max-w-none"
              style={{ width: `${10000 / crop.w}%`, left: `${(-crop.x * 100) / crop.w}%`, top: `${(-crop.y * 100) / crop.h}%` }}
            />
          ) : (
            <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gold/40" aria-hidden>❖</div>
        )}
      </div>
    </div>
  );
}

export function CroppedImg({ path, crop, alt, className }: { path: string | null; crop: Crop | null; alt: string; className?: string }) {
  const url = useSignedUrl(path);
  if (path && !url) return <div className={`aspect-[4/3] w-full animate-pulse bg-bark ${className ?? ''}`} aria-hidden />;
  return <CropFrame src={url} crop={crop} alt={alt} className={className} />;
}
