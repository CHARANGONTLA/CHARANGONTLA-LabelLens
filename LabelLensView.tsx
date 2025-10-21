import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ProductDetails, HistoricProduct } from './types';
// FIX: Import API_KEY instead of GEMINI_API_KEY to align with guidelines.
import { extractProductDetailsFromImage, API_KEY } from './services/geminiService';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultsDisplay } from './components/ResultsDisplay';
import { sampleProductDetails } from './constants';
import { ConfirmedProductsTable } from './components/ConfirmedProductsTable';
import { BatchProgress } from './components/BatchProgress';
import { useToast } from './contexts/ToastContext';
import * as db from './utils/db';
import { QueuedItem, DBHistoricProduct } from './utils/db';
import { OfflineQueue } from './components/OfflineQueue';
import { HistoryView } from './components/HistoryView';

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const LabelLensView: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [imageQueue, setImageQueue] = useState<QueuedItem[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<QueuedItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const [confirmedProducts, setConfirmedProducts] = useState<HistoricProduct[]>([]);
  const objectUrlsRef = useRef<string[]>([]); // To manage and revoke object URLs
  
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState<boolean>(false);
  const [isHistoryViewOpen, setIsHistoryViewOpen] = useState<boolean>(false);
  const processingIndexRef = useRef<number | null>(null);
  const { addToast } = useToast();

  const [processingStatus, setProcessingStatus] = useState<Record<number, 'processing' | 'synced' | 'failed'>>({});
  const isSyncingRef = useRef(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const loadProductsFromDB = useCallback(async () => {
    try {
        setSaveStatus('saving');
        const dbProducts = await db.getConfirmedProducts();
        
        // Revoke any existing object URLs to prevent memory leaks
        objectUrlsRef.current.forEach(URL.revokeObjectURL);
        objectUrlsRef.current = [];

        const uiProducts = dbProducts.map(p => {
            const imageUrl = URL.createObjectURL(p.image);
            objectUrlsRef.current.push(imageUrl); // Keep track of new URLs
            return {
                details: p.details,
                timestamp: p.timestamp,
                imageUrl,
            };
        });

        // Reverse to show newest first, which is the common expectation.
        setConfirmedProducts(uiProducts.reverse());
        setSaveStatus('saved');
    } catch (error) {
        console.error("Failed to load products from DB", error);
        addToast("Could not load product history.", "error");
        setSaveStatus('idle');
    }
  }, [addToast]);

  useEffect(() => {
    loadProductsFromDB();

    // Cleanup object URLs on unmount
    return () => {
        objectUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, [loadProductsFromDB]);


  const loadOfflineQueueFromDB = useCallback(async () => {
    if(isSyncingRef.current) return;
    const queuedItems = await db.getQueuedFiles();
    setOfflineQueue(queuedItems);
  }, []);

  const isProcessingSession = imageQueue.length > 0 && currentQueueIndex < imageQueue.length;

  const processOfflineQueue = useCallback(async () => {
    if (isSyncingRef.current || isProcessingSession) return;

    const itemsToProcess = await db.getQueuedFiles();
    if (itemsToProcess.length === 0) return;

    isSyncingRef.current = true;
    addToast(`Syncing ${itemsToProcess.length} offline item(s)...`, 'info');
    setOfflineQueue(itemsToProcess);

    for (const item of itemsToProcess) {
        if (!item.id) continue;

        setProcessingStatus(prev => ({ ...prev, [item.id!]: 'processing' }));

        try {
            let imageBlob: Blob;
            const base64String = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    // Convert to blob
                    fetch(dataUrl).then(res => res.blob()).then(blob => {
                        imageBlob = blob;
                        resolve(dataUrl.split(',')[1]);
                    });
                }
                reader.onerror = reject;
                reader.readAsDataURL(item.file);
            });

            const details = await extractProductDetailsFromImage(base64String, item.file.type);
            
            const finalDetails: ProductDetails = {
                ...details,
                "Product Name": item.productDetails?.["Product Name"] || details["Product Name"],
                "Quantity": item.productDetails?.Quantity || "",
                "Bag No": item.productDetails?.["Bag No"] || ""
            };

            const dbProduct: DBHistoricProduct = {
                details: finalDetails,
                image: imageBlob!,
                timestamp: Date.now()
            }
            
            await db.addConfirmedProduct(dbProduct);
            
            setProcessingStatus(prev => ({ ...prev, [item.id!]: 'synced' }));
            await db.deleteFileFromQueue(item.id!);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            setOfflineQueue(prev => prev.filter(qItem => qItem.id !== item.id));
            setProcessingStatus(prev => {
                const newStatus = { ...prev };
                delete newStatus[item.id!];
                return newStatus;
            });

        } catch (e) {
            console.error(`Failed to process offline item ${item.id}:`, e);
            addToast(`Failed to process ${item.file.name}.`, 'error');
            setProcessingStatus(prev => ({ ...prev, [item.id!]: 'failed' }));
        }
    }
    
    isSyncingRef.current = false;
    addToast('Offline sync complete.', 'success');
    await loadProductsFromDB(); // Reload main list

  }, [isProcessingSession, addToast, loadProductsFromDB]);

  useEffect(() => {
    loadOfflineQueueFromDB();

    const handleOnline = () => {
      addToast("You're back online!", 'success');
      processOfflineQueue();
    };
    const handleOffline = () => addToast("You've gone offline. Images can be queued.", 'info');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if(navigator.onLine) {
       processOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue, loadOfflineQueueFromDB]);

  const processImage = useCallback(async (file: File, index: number) => {
    if (processingIndexRef.current !== index) return;

    setIsLoading(true);
    setError(null);
    setProductDetails(null);

    let base64String: string;
    let imageUrl: string;

    try {
        const result = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        imageUrl = result;
        base64String = result.split(',')[1];
        setImageUrl(imageUrl);
    } catch (readError) {
        console.error("File reading error:", readError);
        setError("Could not read the selected file. It might be corrupted or in an unsupported format.");
        setIsLoading(false);
        return;
    }

    if (processingIndexRef.current !== index) return;

    try {
        const queuedItem = imageQueue[index];
        const prefilledDetails = queuedItem.productDetails || {};

        const details = await extractProductDetailsFromImage(base64String, file.type);
        if (processingIndexRef.current !== index) return;
        
        setProductDetails({ 
            ...details, 
            "Product Name": prefilledDetails["Product Name"] || details["Product Name"],
            "Quantity": prefilledDetails.Quantity || "",
            "Bag No": prefilledDetails["Bag No"] || ""
        });

    } catch (e) {
        if (processingIndexRef.current !== index) return;
        console.error(e);
        const errorMessage = imageQueue.length > 1 
            ? `Failed to analyze "${file.name}". Please correct the details or skip.`
            : 'Failed to analyze the image. Please try another one.';
        setError(errorMessage);
        setProductDetails({
            ...sampleProductDetails,
            ...(imageQueue[index]?.productDetails || {})
        });
    } finally {
        if (processingIndexRef.current === index) {
            setIsLoading(false);
        }
    }
  }, [imageQueue]);

  useEffect(() => {
    if (currentQueueIndex < imageQueue.length) {
      processingIndexRef.current = currentQueueIndex;
      const fileToProcess = imageQueue[currentQueueIndex].file;
      processImage(fileToProcess, currentQueueIndex);
    } else if (imageQueue.length > 0) {
      handleReset();
    }
  }, [currentQueueIndex, imageQueue, processImage]);

  const handleFilesSelected = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    if (!navigator.onLine) {
        addToast(`You're offline. Queuing ${files.length} image(s).`, 'info');
        for (const file of Array.from(files)) {
            await db.addFileToQueue(file);
        }
        await loadOfflineQueueFromDB();
        return;
    }

    if (files.length > 0) {
      setImageQueue(Array.from(files).map((file, i) => ({ id: Date.now() + i, file, productDetails: {} })));
      setCurrentQueueIndex(0);
    }
  }, [addToast, loadOfflineQueueFromDB]);

  const handleReset = () => {
    processingIndexRef.current = null;
    setImageUrl(null);
    setProductDetails(null);
    setError(null);
    setIsLoading(false);
    setEditingProductIndex(null);
    setImageQueue([]);
    setCurrentQueueIndex(0);
    loadOfflineQueueFromDB();
  };
  
  // FIX: Use API_KEY to check for missing key, as per guidelines.
  const isApiKeyMissing = !API_KEY;
  const isEditing = editingProductIndex !== null;
  const isInBatchMode = imageQueue.length > 1;

  const advanceQueue = useCallback(async () => {
    const currentItem = imageQueue[currentQueueIndex];
    if (currentItem && await db.getQueuedFiles().then(files => files.some(f => f.id === currentItem.id))) {
      await db.deleteFileFromQueue(currentItem.id);
    }
    setCurrentQueueIndex(prev => prev + 1);
  }, [imageQueue, currentQueueIndex]);


  const handleCancelOrSkip = () => {
    const canAdvance = isInBatchMode && (currentQueueIndex < imageQueue.length - 1);
    if (canAdvance) {
        advanceQueue();
    } else {
        const currentItem = imageQueue[currentQueueIndex];
        if (currentItem) {
            db.getQueuedFiles().then(files => {
                if(files.some(f => f.id === currentItem.id)) {
                    db.deleteFileFromQueue(currentItem.id).then(handleReset);
                } else {
                    handleReset();
                }
            });
        } else {
            handleReset();
        }
    }
  };

  const handleDetailChange = (field: keyof ProductDetails, value: string) => {
    setProductDetails(prevDetails => {
        if (!prevDetails) return null;
        return { ...prevDetails, [field]: value };
    });
  };

  const handleConfirmDetails = async () => {
    if (!productDetails) return;
    
    setSaveStatus('saving');
    try {
        if (editingProductIndex !== null) {
            const productToUpdate = confirmedProducts[editingProductIndex];
            await db.updateConfirmedProduct(productToUpdate.timestamp, productDetails);
            addToast('Product updated successfully!', 'success');
        } else if (imageUrl) {
            const response = await fetch(imageUrl);
            const imageBlob = await response.blob();
            
            const newDbProduct: DBHistoricProduct = {
                details: productDetails,
                image: imageBlob,
                timestamp: Date.now(),
            };
            await db.addConfirmedProduct(newDbProduct);
            addToast('Product added successfully!', 'success');
        }

        await loadProductsFromDB();

        if (editingProductIndex === null) { // New product logic
            if (imageQueue.length > 0) {
                advanceQueue();
            } else {
                handleReset();
            }
        } else { // Editing logic
             handleReset();
        }

    } catch (error) {
        console.error("Failed to save product to DB:", error);
        addToast("Failed to save changes.", "error");
        setSaveStatus('idle');
    }
  };
  
  const handleDeleteProduct = async (indexToDelete: number) => {
    const productToDelete = confirmedProducts[indexToDelete];
    if (!productToDelete) return;

    const originalProducts = [...confirmedProducts];
    setConfirmedProducts(current => current.filter((_, index) => index !== indexToDelete));

    try {
        setSaveStatus('saving');
        await db.deleteConfirmedProduct(productToDelete.timestamp);
        addToast('Product deleted.', 'info');
        setSaveStatus('saved');
    } catch (error) {
        console.error("Failed to delete product from DB:", error);
        addToast("Failed to delete product.", "error");
        setConfirmedProducts(originalProducts); // Rollback on failure
        setSaveStatus('idle');
    }
  };

  const handleEditProduct = (indexToEdit: number) => {
    const productToEdit = confirmedProducts[indexToEdit];
    if (productToEdit) {
      handleReset();
      setProductDetails({ ...productToEdit.details });
      setImageUrl(productToEdit.imageUrl);
      setEditingProductIndex(indexToEdit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteAllProducts = async () => {
    const originalProducts = [...confirmedProducts];
    setConfirmedProducts([]);
    setIsDeleteAllConfirmOpen(false);
    
    try {
        setSaveStatus('saving');
        await db.deleteAllConfirmedProducts();
        addToast('All products have been deleted.', 'info');
        setSaveStatus('saved');
    } catch (error) {
        console.error("Failed to delete all products from DB:", error);
        addToast("Failed to delete all products.", "error");
        setConfirmedProducts(originalProducts);
        setSaveStatus('idle');
    }
  };

  const handleRemoveFromOfflineQueue = useCallback(async (id: number) => {
    await db.deleteFileFromQueue(id);
    await loadOfflineQueueFromDB();
    addToast('Image removed from queue.', 'info');
  }, [addToast, loadOfflineQueueFromDB]);

  const handleOfflineDetailChange = useCallback(async (id: number, field: keyof ProductDetails, value: string) => {
      await db.updateQueuedItemDetails(id, { [field]: value });
      setOfflineQueue(currentQueue =>
        currentQueue.map(item =>
          item.id === id
            ? { ...item, productDetails: { ...(item.productDetails || {}), [field]: value } }
            : item
        )
      );
  }, []);


  return (
    <>
        <Header />
        
        {isApiKeyMissing && (
            <div className="max-w-4xl mx-auto mt-8 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-600 shadow-md">
                <h2 className="font-bold text-lg">Configuration Error: Gemini API Key is Missing</h2>
                <p className="mt-2 text-sm">
                    The application cannot connect to the AI service. To fix this, you need to provide your Gemini API key.
                </p>
                <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                    <li>Create a new file named <code>.env</code> in the root directory of this project.</li>
                    <li>Add the following line to the <code>.env</code> file:</li>
                </ol>
                <pre className="mt-2 p-2 bg-gray-800 text-white rounded-md text-sm">
                    {/* FIX: Updated environment variable name to API_KEY as per guidelines. */}
                    <code>API_KEY="YOUR_API_KEY_HERE"</code>
                </pre>
                <p className="mt-2 text-sm">
                    Replace <code>"YOUR_API_KEY_HERE"</code> with your actual key. After saving the file, you must restart the application.
                </p>
                <p className="mt-3 text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                    SECURITY WARNING: Do not commit your <code>.env</code> file or expose your API key in a public repository. This method is for development only.
                </p>
            </div>
        )}

        <div className="max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 md:p-8">
            
            {isInBatchMode && isProcessingSession && (
              <BatchProgress current={currentQueueIndex + 1} total={imageQueue.length} />
            )}
            
            {!isProcessingSession && !isEditing && (
                <ImageUploader onFilesSelected={handleFilesSelected} disabled={isLoading || isApiKeyMissing || isSyncingRef.current} />
            )}
            
            {isEditing && !imageUrl && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Editing Product</h2>
                <p className="text-gray-500 dark:text-gray-400">Modify the details below and click "Update".</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="my-6 text-center p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">
                <p>{error}</p>
              </div>
            )}

            <div className="mt-8">
              {(imageUrl || productDetails) && (isProcessingSession || isEditing) ? (
                <ResultsDisplay 
                  imageUrl={imageUrl} 
                  productDetails={productDetails}
                  isLoading={isLoading}
                  error={error}
                  onDetailChange={handleDetailChange}
                  onConfirm={handleConfirmDetails}
                  onReset={handleCancelOrSkip}
                  isEditing={isEditing}
                  editingSerialNumber={editingProductIndex !== null ? confirmedProducts.findIndex(p => p.timestamp === confirmedProducts[editingProductIndex]?.timestamp) + 1 : undefined}
                  onSkip={advanceQueue}
                  showSkipButton={isInBatchMode}
                  onCancelAnalysis={handleCancelOrSkip}
                  isInBatchMode={isInBatchMode}
                  confirmedProducts={confirmedProducts}
                />
              ) : (
                 <div className="text-center py-10">
                    <div className="mx-auto h-24 w-24 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Awaiting Image(s)</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload one or more images to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isProcessingSession && (
           <OfflineQueue 
              files={offlineQueue} 
              onRemove={handleRemoveFromOfflineQueue} 
              onDetailsChange={handleOfflineDetailChange}
              processingStatus={processingStatus}
            />
        )}

        {confirmedProducts.length > 0 && (
            <div className="max-w-4xl mx-auto mt-12">
                 <div className="flex justify-end mb-4">
                    <button 
                        onClick={() => setIsHistoryViewOpen(true)}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out bg-gray-600 hover:bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900"
                        aria-label="View full scan history"
                    >
                        <HistoryIcon />
                        View Full History
                    </button>
                </div>
                <ConfirmedProductsTable 
                    products={confirmedProducts} 
                    onDeleteProduct={handleDeleteProduct}
                    onEditProduct={handleEditProduct}
                    onDeleteAll={() => setIsDeleteAllConfirmOpen(true)}
                    saveStatus={saveStatus}
                />
            </div>
        )}

        {isDeleteAllConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-all-dialog-title">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-center">
              <h3 id="delete-all-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete all {confirmedProducts.length} confirmed products? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => setIsDeleteAllConfirmOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-full text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllProducts}
                  className="px-4 py-2 text-sm font-semibold rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
        
        {isHistoryViewOpen && (
            <HistoryView
                products={confirmedProducts}
                onClose={() => setIsHistoryViewOpen(false)}
                onSelectProduct={(index) => {
                    handleEditProduct(index);
                    setIsHistoryViewOpen(false);
                }}
                onDeleteProduct={handleDeleteProduct}
            />
        )}
    </>
  );
};

export default LabelLensView;
