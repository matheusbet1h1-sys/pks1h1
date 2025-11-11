import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from './LanguageProvider';
import { XIcon, CropIcon } from './icons';

interface ImageCropModalProps {
  src: string;
  onClose: () => void;
  onCropComplete: (blob: Blob) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ src, onClose, onCropComplete }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const CROP_SIZE = 256;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.complete || image.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseScale = Math.max(CROP_SIZE / image.naturalWidth, CROP_SIZE / image.naturalHeight);
    const scale = baseScale * zoom;
    
    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;

    const minX = CROP_SIZE - scaledWidth;
    const minY = CROP_SIZE - scaledHeight;

    const clampedX = Math.max(minX, Math.min(0, offset.x));
    const clampedY = Math.max(minY, Math.min(0, offset.y));

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.drawImage(image, clampedX, clampedY, scaledWidth, scaledHeight);
  }, [offset, zoom]);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.onload = () => {
      imageRef.current = image;
      const baseScale = Math.max(CROP_SIZE / image.naturalWidth, CROP_SIZE / image.naturalHeight);
      setOffset({
        x: (CROP_SIZE - image.naturalWidth * baseScale) / 2,
        y: (CROP_SIZE - image.naturalHeight * baseScale) / 2,
      });
      setZoom(1);
    };
  }, [src]);

  useEffect(() => {
    draw();
  }, [offset, zoom, draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
        if (blob) {
            onCropComplete(blob);
        }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div
      className="fixed inset-0 bg-krypton-gray-900/80 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl w-full max-w-sm flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-light-border dark:border-krypton-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center">
            <CropIcon className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold">{t('image_crop_title')}</h2>
          </div>
          <button onClick={onClose} className="text-light-text-secondary dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-5 flex flex-col justify-center items-center">
            <canvas
                ref={canvasRef}
                width={CROP_SIZE}
                height={CROP_SIZE}
                className="rounded-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
             <div className="w-full max-w-[256px] mt-4 flex items-center space-x-3">
                <span className="text-xs font-medium text-light-text-secondary dark:text-krypton-gray-400">ZOOM</span>
                <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="0.01" 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-krypton-gray-700 rounded-lg appearance-none cursor-pointer"
                    aria-label="Zoom slider"
                />
            </div>
        </main>
        <footer className="p-4 border-t border-light-border dark:border-krypton-gray-700 flex-shrink-0 flex justify-end">
             <button
                onClick={handleSave}
                className="w-32 flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500"
             >
                {t('image_crop_save_button')}
             </button>
        </footer>
      </div>
    </div>
  );
};

export default ImageCropModal;