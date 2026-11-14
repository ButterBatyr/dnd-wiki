import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSignedUrl, type Bucket } from '../lib/images';

// Показ картинки целиком поверх страницы (через portal, чтобы не ломаться внутри карточек)
export default function Lightbox({ path, alt, onClose, bucket = 'entry-images' }: { path: string; alt: string; onClose: () => void; bucket?: Bucket }) {
  const url = useSignedUrl(path, bucket);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3">
      <button className="absolute right-3 top-3 rounded-sm border border-gold/60 bg-ink/80 px-3 py-1 font-display text-gold-light"
        onClick={onClose} aria-label="Закрыть">✕</button>
      {url ? (
        <img src={url} alt={alt} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      ) : (
        <p className="text-dust">Загружаем…</p>
      )}
    </div>,
    document.body,
  );
}
