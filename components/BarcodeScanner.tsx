import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  onScanSuccess: (text: string) => void;
  onCancel: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;
    
    const startScanner = async () => {
      try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        if (videoInputDevices.length > 0) {
          // Prefer the rear camera if available
          const rearCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back')) || videoInputDevices[0];
          
          if (videoRef.current) {
            setIsLoading(false);
            codeReader.decodeFromInputVideoDevice(rearCamera.deviceId, videoRef.current)
              .then(result => {
                onScanSuccess(result.getText());
              })
              .catch(err => {
                if (!(err instanceof NotFoundException)) {
                   console.error("Barcode scanning error:", err);
                   setError("An unexpected error occurred while scanning.");
                }
              });
          }
        } else {
            setError("No camera found on this device.");
            setIsLoading(false);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Could not access the camera. Please check permissions.");
        setIsLoading(false);
      }
    };
    
    startScanner();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, [onScanSuccess]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only cancel if the click is on the background overlay itself, not its children
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col justify-center items-center cursor-pointer" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="barcode-scanner-title"
        onClick={handleOverlayClick}
        title="Click outside the video to close"
    >
        <div className="relative w-full max-w-lg aspect-square p-4 cursor-default">
            <video ref={videoRef} className="w-full h-full object-cover rounded-lg" />
            
            {/* Viewfinder UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/3 border-4 border-white border-opacity-75 rounded-lg shadow-lg relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse"></div>
                </div>
            </div>

             {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 rounded-lg">
                    <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-white">Starting Camera...</p>
                </div>
            )}
        </div>
        
        <div className="text-center text-white p-4 cursor-default">
            <h3 id="barcode-scanner-title" className="text-lg font-bold">Scan Barcode</h3>
            <p className="text-sm">Position the barcode inside the frame. Click the background to close.</p>
            {error && <p className="mt-2 text-sm text-red-400 bg-red-900/50 p-2 rounded">{error}</p>}
        </div>
    </div>
  );
};