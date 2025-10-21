import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ImageCropper } from './ImageCropper';

interface ImageUploaderProps {
  onFilesSelected: (files: FileList) => void;
  disabled: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelected, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const dragCounter = useRef(0);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isFlashAvailable, setIsFlashAvailable] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    videoTrackRef.current = null;
    setIsFlashAvailable(false);
    setIsFlashOn(false);
  }, []);

  useEffect(() => {
    if (isCameraOpen) {
      const startCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            streamRef.current = mediaStream;

            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrackRef.current = videoTrack;
                const capabilities = videoTrack.getCapabilities();
                // FIX: Cast capabilities to any to access non-standard 'torch' property.
                if ((capabilities as any).torch) {
                    setIsFlashAvailable(true);
                }
            }
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert("Could not access the camera. Please check permissions and try again.");
          setIsCameraOpen(false);
        }
      };
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isCameraOpen, stopCamera]);

  const processFileList = useCallback((files: FileList) => {
    if (files.length === 0) return;

    if (files.length === 1) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') {
          setImageToCrop(reader.result);
        }
      });
      reader.readAsDataURL(files[0]);
    } else {
      onFilesSelected(files);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFilesSelected]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFileList(event.target.files);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const imageUrl = canvas.toDataURL('image/png');
      setImageToCrop(imageUrl);
      setIsCameraOpen(false);
    }
  };

  const handleCropComplete = (file: File) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    onFilesSelected(dataTransfer.files);
    setImageToCrop(null);
  };

  const handleCancelCrop = () => {
    setImageToCrop(null);
  };

  const handleToggleFlash = async () => {
    if (videoTrackRef.current && isFlashAvailable) {
      try {
        const nextFlashState = !isFlashOn;
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: nextFlashState } as any],
        });
        setIsFlashOn(nextFlashState);
      } catch (err) {
        console.error("Failed to toggle flash:", err);
        alert("Could not toggle the camera flash. This feature may not be fully supported on your device/browser.");
      }
    }
  };
  
  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (disabled || (e.dataTransfer.items && e.dataTransfer.items.length === 0)) return;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    dragCounter.current = 0;
    setIsDraggingOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
        const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        // FIX: Used a type guard to ensure that only File objects are processed, resolving potential type inference issues.
        const imageFilesArray = Array.from(droppedFiles).filter(
            (file): file is File => file instanceof File && acceptedTypes.includes(file.type)
        );
        
        if (imageFilesArray.length === 0) {
            alert('Please drop only image files (PNG, JPG, WEBP).');
            return;
        }

        const dataTransfer = new DataTransfer();
        imageFilesArray.forEach(file => dataTransfer.items.add(file));
        processFileList(dataTransfer.files);
    }
  };


  if (imageToCrop) {
    return <ImageCropper src={imageToCrop} onCropComplete={handleCropComplete} onCancel={handleCancelCrop} />;
  }

  if (isCameraOpen) {
    const isCaptureDisabled = disabled || !isCameraReady;
    return (
      <div className="w-full flex flex-col items-center">
        <div className="relative w-full max-w-lg rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-black">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-auto" 
            onLoadedMetadata={() => setIsCameraReady(true)}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {isFlashAvailable && (
            <button
              onClick={handleToggleFlash}
              className={`absolute top-2 right-2 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white ${
                isFlashOn 
                  ? 'bg-yellow-400 text-gray-800' 
                  : 'bg-gray-800 bg-opacity-50 text-white hover:bg-opacity-75'
              }`}
              aria-label={`Turn camera flash ${isFlashOn ? 'off' : 'on'}`}
              aria-pressed={isFlashOn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 my-4 max-w-lg px-4 sm:px-0">
          Position the label in the frame and capture a clear image. You'll be able to crop it in the next step.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-lg px-4 sm:px-0">
          <button 
            onClick={handleCapture} 
            disabled={isCaptureDisabled} 
            className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-full transition-all duration-300 ease-in-out text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                isCaptureDisabled 
                ? 'bg-green-800 opacity-70 cursor-wait' 
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isCameraReady ? 'Capture Photo' : 'Preparing Camera...'}
          </button>
          <button 
            onClick={() => setIsCameraOpen(false)} 
            disabled={disabled} 
            className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-full transition-all duration-300 ease-in-out text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 bg-gray-500 hover:bg-gray-600 focus:ring-gray-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
        className="w-full relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
        {isDraggingOver && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 dark:bg-blue-900 dark:bg-opacity-30 border-4 border-dashed border-blue-600 dark:border-blue-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none z-10 transition-opacity duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-xl font-semibold text-blue-700 dark:text-blue-200">Drop Image(s) Here</p>
            </div>
        )}
        <div className={`w-full flex flex-col items-center border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${isDraggingOver ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".png,.jpg,.jpeg,.webp"
              disabled={disabled}
              multiple
            />
            <div className="flex flex-col items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Drag & drop files, or click to upload</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">or use your camera</p>
            </div>
            
            <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-4 mt-4">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className={`inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 text-base font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload from Files
                </button>
                
                <button
                    type="button"
                    onClick={() => {
                        setIsCameraReady(false);
                        setIsCameraOpen(true);
                    }}
                    disabled={disabled}
                    className={`inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 text-base font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Capture with Camera
                </button>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">PNG, JPG or WEBP. Max 10MB.</p>
        </div>
    </div>
  );
};
