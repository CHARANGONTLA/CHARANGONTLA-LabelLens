import React, { useState, useRef, useEffect, WheelEvent, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';

const ZoomInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);
const ZoomOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
);
const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
    </svg>
);
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface ImageZoomProps {
  src: string;
  onClose: () => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 8;
const ZOOM_SENSITIVITY = 0.005;

export const ImageZoom: React.FC<ImageZoomProps> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0, initialPosition: { x: 0, y: 0 } });
  const pinchStartRef = useRef({ distance: 0, initialScale: 1 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -ZOOM_SENSITIVITY;
    setScale(prev => Math.min(Math.max(prev + delta * prev, MIN_SCALE), MAX_SCALE));
  };
  
  const getPinchDistance = (touches: TouchList | React.TouchList) => {
      return Math.sqrt(
          Math.pow(touches[0].clientX - touches[1].clientX, 2) + 
          Math.pow(touches[0].clientY - touches[1].clientY, 2)
      );
  }

  const handleMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPosition: { ...position }
    };
  }
  
  const handleTouchStart = (e: ReactTouchEvent) => {
    // Prevent default to avoid page scroll/zoom on touch devices
    e.preventDefault();
    if (e.touches.length === 1) {
        setIsDragging(true);
        dragStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            initialPosition: { ...position }
        };
    } else if (e.touches.length === 2) {
        setIsDragging(false); // Stop panning
        pinchStartRef.current = {
            distance: getPinchDistance(e.touches),
            initialScale: scale
        };
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        setPosition({
            x: dragStartRef.current.initialPosition.x + (deltaX / scale),
            y: dragStartRef.current.initialPosition.y + (deltaY / scale),
        });
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
            const deltaX = e.touches[0].clientX - dragStartRef.current.x;
            const deltaY = e.touches[0].clientY - dragStartRef.current.y;
            setPosition({
                x: dragStartRef.current.initialPosition.x + (deltaX / scale),
                y: dragStartRef.current.initialPosition.y + (deltaY / scale),
            });
        } else if (e.touches.length === 2 && pinchStartRef.current.distance > 0) {
            const newDistance = getPinchDistance(e.touches);
            const scaleMultiplier = newDistance / pinchStartRef.current.distance;
            const newScale = pinchStartRef.current.initialScale * scaleMultiplier;
            setScale(Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE));
        }
    };

    const handleUp = () => {
        setIsDragging(false);
        pinchStartRef.current = { distance: 0, initialScale: 1 }; // Reset pinch on release
    };
    
    // Mouse move events
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleUp);
    }
    // Touch move events are handled separately
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleUp);
    }
  }, [isDragging, scale]);

  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const zoomIn = () => setScale(s => Math.min(s * 1.5, MAX_SCALE));
  const zoomOut = () => setScale(s => Math.max(s / 1.5, MIN_SCALE));

  const controlButtonClasses = "p-2 bg-gray-800/70 text-white rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white transition-colors";

  return (
    <div role="dialog" aria-modal="true" aria-label="Image zoom view" className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in" onClick={onClose}>
      
      <div className="absolute top-4 right-4 z-[51] flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={zoomIn} aria-label="Zoom in" title="Zoom In" className={controlButtonClasses}><ZoomInIcon/></button>
        <button onClick={zoomOut} aria-label="Zoom out" title="Zoom Out" className={controlButtonClasses}><ZoomOutIcon/></button>
        <button onClick={reset} aria-label="Reset zoom" title="Reset Zoom" className={controlButtonClasses}><ResetIcon/></button>
        <button onClick={onClose} aria-label="Close zoom view" title="Close (Esc)" className={`${controlButtonClasses} ml-4`}><CloseIcon/></button>
      </div>

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ touchAction: 'none' }}
      >
        <img
          src={src}
          alt="Zoomable product label"
          className="max-w-none max-h-none transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          draggable="false"
        />
      </div>
       <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};