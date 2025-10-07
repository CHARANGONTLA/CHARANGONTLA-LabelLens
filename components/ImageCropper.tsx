import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import { getCroppedImage, rotateImage } from '../utils/imageUtils';

interface ImageCropperProps {
  src: string;
  onCropComplete: (file: File) => void;
  onCancel: () => void;
}

const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8A5 5 0 009 9V5" />
    </svg>
);

const RedoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H5a5 5 0 005 5v-2" />
    </svg>
);

const RotateLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-6-6m6 6V9a6 6 0 0112 0v3" />
    </svg>
);

const RotateRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6 6m0 0l6-6m-6 6V9a6 6 0 00-12 0v3" />
    </svg>
);

const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
    </svg>
);


export const ImageCropper: React.FC<ImageCropperProps> = ({ src, onCropComplete, onCancel }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isProcessing, setIsProcessing] = useState(false);
    
    // State for undo/redo functionality
    const [history, setHistory] = useState<string[]>([src]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
    const imageSrc = history[currentHistoryIndex];

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, height > width ? 4/5 : 16 / 9, width, height),
            width,
            height
        );
        setCrop(initialCrop);
    }
    
    const handleHistoryChange = (newImageSrc: string) => {
        // If we've undone something, a new action clears the 'redo' history.
        const newHistory = history.slice(0, currentHistoryIndex + 1);
        
        setHistory([...newHistory, newImageSrc]);
        setCurrentHistoryIndex(newHistory.length);
        setCrop(undefined);
        setCompletedCrop(undefined);
    };

    const handleRotate = async (degrees: number) => {
        if (!imageSrc) return;
        setIsProcessing(true);
        try {
            const rotatedImageSrc = await rotateImage(imageSrc, degrees);
            handleHistoryChange(rotatedImageSrc);
        } catch (error) {
            console.error("Failed to rotate image:", error);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleUndo = () => {
        if (currentHistoryIndex > 0) {
            setCurrentHistoryIndex(prev => prev - 1);
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    };

    const handleRedo = () => {
        if (currentHistoryIndex < history.length - 1) {
            setCurrentHistoryIndex(prev => prev + 1);
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    };
    
    const handleReset = () => {
        // Resetting just goes back to the first image in history
        setCurrentHistoryIndex(0);
        setCrop(undefined);
        setCompletedCrop(undefined);
    };

    const handleConfirmCrop = async () => {
        if (completedCrop?.width && completedCrop?.height && imgRef.current) {
            setIsProcessing(true);
            try {
                const croppedImageBlob = await getCroppedImage(imgRef.current, completedCrop);
                if (croppedImageBlob) {
                    const file = new File([croppedImageBlob], `cropped-${Date.now()}.png`, { type: 'image/png' });
                    onCropComplete(file);
                } else {
                   console.error("Cropping resulted in an empty image.");
                   onCancel();
                }
            } catch (e) {
                console.error("Cropping failed", e);
                onCancel();
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const canUndo = currentHistoryIndex > 0;
    const canRedo = currentHistoryIndex < history.length - 1;
    const isPristine = currentHistoryIndex === 0;

    return (
        <div className="w-full flex flex-col items-center">
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4 max-w-lg">Rotate and crop to focus on the product label.</p>
            
            <div className="max-w-lg w-full bg-black p-2 rounded-lg relative">
                {isProcessing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 rounded-lg">
                        <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    minWidth={100}
                    disabled={isProcessing}
                >
                    <img
                        ref={imgRef}
                        alt="Crop me"
                        src={imageSrc}
                        onLoad={onImageLoad}
                        className="w-full h-auto"
                        style={{ opacity: isProcessing ? 0.7 : 1 }}
                    />
                </ReactCrop>
            </div>

            <div className="mt-4 w-full max-w-lg flex flex-col items-center gap-4">
                {/* Tool buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => handleRotate(-90)} disabled={isProcessing} className="flex items-center justify-center p-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 disabled:opacity-50">
                        <RotateLeftIcon /> Rotate Left
                    </button>
                    <button onClick={() => handleRotate(90)} disabled={isProcessing} className="flex items-center justify-center p-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 disabled:opacity-50">
                        <RotateRightIcon /> Rotate Right
                    </button>
                    <button onClick={handleUndo} disabled={isProcessing || !canUndo} className="flex items-center justify-center p-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 disabled:opacity-50">
                        <UndoIcon /> Undo
                    </button>
                    <button onClick={handleRedo} disabled={isProcessing || !canRedo} className="flex items-center justify-center p-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 disabled:opacity-50">
                        <RedoIcon /> Redo
                    </button>
                     <button onClick={handleReset} disabled={isProcessing || isPristine} className="flex items-center justify-center p-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 disabled:opacity-50">
                        <ResetIcon /> Reset
                    </button>
                </div>
                {/* Action buttons */}
                <div className="w-full flex justify-center items-center gap-4">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out text-gray-700 dark:text-gray-200 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-900 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmCrop}
                        disabled={isProcessing || !completedCrop?.width}
                        className="flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};
