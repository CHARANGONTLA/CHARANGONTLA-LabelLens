import React, { useState, useEffect } from 'react';
import { ProductDetails } from '../types';
import { QueuedItem } from '../utils/db';
import { Loader } from './Loader';

interface OfflineQueueProps {
  files: QueuedItem[];
  onRemove: (id: number) => void;
  onDetailsChange: (id: number, field: keyof ProductDetails, value: string) => void;
  processingStatus: Record<number, 'processing' | 'synced' | 'failed'>;
}

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


interface OfflineQueueItemProps {
    item: QueuedItem;
    onRemove: (id: number) => void;
    onDetailsChange: (id: number, field: keyof ProductDetails, value: string) => void;
    status?: 'processing' | 'synced' | 'failed';
}


const OfflineQueueItem: React.FC<OfflineQueueItemProps> = ({ item, onRemove, onDetailsChange, status }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!item.file) return;
        const url = URL.createObjectURL(item.file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [item.file]);

    const handleDetailChange = (field: keyof ProductDetails, value: string) => {
        onDetailsChange(item.id!, field, value);
    };
    
    const EditModal = () => (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby={`modal-title-${item.id}`}
            onClick={() => setIsModalOpen(false)}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="md:w-1/2 flex-shrink-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                     {objectUrl && <img src={objectUrl} alt={`Preview of ${item.file.name}`} className="max-w-full max-h-[80vh] object-contain rounded-md" />}
                </div>
                <div className="md:w-1/2 p-6 flex flex-col overflow-y-auto">
                    <h3 id={`modal-title-${item.id}`} className="text-lg font-bold text-gray-900 dark:text-white">Edit Details for Offline Item</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-4">{item.file.name}</p>
                    
                    <div className="space-y-4 flex-grow">
                        <div>
                            <label htmlFor={`product-name-${item.id}`} className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Product Name <span className="text-red-500">*</span></label>
                            <input
                                id={`product-name-${item.id}`}
                                type="text"
                                value={item.productDetails?.["Product Name"] || ''}
                                onChange={(e) => handleDetailChange("Product Name", e.target.value.toUpperCase())}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                style={{ textTransform: 'uppercase' }}
                                placeholder="e.g., INSTANT NOODLES"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={`bag-no-${item.id}`} className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Bag No <span className="text-red-500">*</span></label>
                                <input
                                    id={`bag-no-${item.id}`}
                                    type="text"
                                    value={item.productDetails?.["Bag No"] || ''}
                                    onChange={(e) => handleDetailChange("Bag No", e.target.value.toUpperCase())}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    style={{ textTransform: 'uppercase' }}
                                    placeholder="e.g., B01"
                                />
                            </div>
                            <div>
                                <label htmlFor={`quantity-${item.id}`} className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity <span className="text-red-500">*</span></label>
                                <input
                                    id={`quantity-${item.id}`}
                                    type="number"
                                    min="1"
                                    value={item.productDetails?.["Quantity"] || ''}
                                    onChange={(e) => handleDetailChange("Quantity", e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <button
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 text-sm font-semibold rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                        >
                          Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const itemClasses = {
        synced: 'bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500',
        failed: 'bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500',
        processing: 'opacity-70',
        default: 'bg-gray-100 dark:bg-gray-700/50',
    };
    
    const currentClass = status ? itemClasses[status] : itemClasses.default;
    const statusText = {
        processing: 'Syncing...',
        synced: 'Synced',
        failed: 'Sync Failed',
        default: 'Pending upload...'
    }

    return (
        <>
            {isModalOpen && <EditModal />}
            <div className={`rounded-lg transition-all duration-300 p-3 ${currentClass}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        {objectUrl ? (
                            <img src={objectUrl} alt={item.file.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{status ? statusText[status] : statusText.default}</p>
                        </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 ml-2 space-x-1">
                        {status === 'processing' && (
                            <div className="p-1.5" aria-label="Processing...">
                                <Loader className="h-5 w-5 text-blue-500" />
                            </div>
                        )}
                        {status === 'synced' && (
                            <div className="p-1.5 text-green-500" aria-label="Synced successfully">
                                <CheckCircleIcon />
                            </div>
                        )}
                        {status === 'failed' && (
                            <div className="p-1.5 text-red-500" title="Processing failed. Please review details.">
                                <ExclamationCircleIcon />
                            </div>
                        )}
                        
                        {status !== 'processing' && status !== 'synced' && (
                             <>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="View and edit details"
                                    title="View & Edit"
                                >
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                </button>
                                <button
                                    onClick={() => onRemove(item.id!)}
                                    className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    aria-label={`Remove ${item.file.name} from queue`}
                                    title="Remove from queue"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                             </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export const OfflineQueue: React.FC<OfflineQueueProps> = ({ files, onRemove, onDetailsChange, processingStatus }) => {
    if (files.length === 0) return null;

    return (
        <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Offline Queue</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    These {files.length} image(s) will be analyzed automatically when you're back online.
                </p>
                <div className="space-y-3">
                    {files.map(item => (
                        <OfflineQueueItem 
                          key={item.id} 
                          item={item} 
                          onRemove={onRemove} 
                          onDetailsChange={onDetailsChange} 
                          status={item.id ? processingStatus[item.id] : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};