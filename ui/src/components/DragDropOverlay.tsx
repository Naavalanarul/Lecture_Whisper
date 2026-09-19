import React, { useState, useEffect } from 'react';
import { UploadCloud } from 'lucide-react';

interface DragDropOverlayProps {
  onFileDrop: (file: File) => void;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ onFileDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setDragCounter((prev) => prev + 1);
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragCounter((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsDragging(false);
          return 0;
        }
        return next;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragCounter(0);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('audio/') || /\.(wav|mp3|m4a|aac|ogg|flac)$/i.test(file.name)) {
          onFileDrop(file);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFileDrop]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-6 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="max-w-md w-full p-8 rounded-xl border-2 border-dashed border-accent bg-surface shadow-2xl text-center flex flex-col items-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-accent-tint flex items-center justify-center text-accent">
          <UploadCloud className="w-6 h-6 animate-bounce" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text">Drop audio file here</h3>
          <p className="text-xs text-muted mt-1">
            Supports .wav, .m4a, .mp3, .aac. Speech recognition and notes generation will run offline.
          </p>
        </div>
      </div>
    </div>
  );
};
