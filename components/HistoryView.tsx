import React from 'react';
import { HistoricProduct } from '../types';

interface HistoryViewProps {
  products: HistoricProduct[];
  onSelectProduct: (index: number) => void;
  onDeleteProduct: (index: number) => void;
  onClose: () => void;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const EmptyState = () => (
    <div className="text-center py-20 flex flex-col items-center justify-center h-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Scan History</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Products you confirm will appear here.</p>
    </div>
);


export const HistoryView: React.FC<HistoryViewProps> = ({ products, onSelectProduct, onDeleteProduct, onClose }) => {

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="history-view-title"
    >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden m-4">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 id="history-view-title" className="text-xl font-bold text-gray-900 dark:text-white">Scan History</h2>
                <button 
                    onClick={onClose} 
                    aria-label="Close history view"
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <CloseIcon />
                </button>
            </header>

            {/* Content */}
            <main className="flex-grow overflow-y-auto p-4 md:p-6">
                {products.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ul className="space-y-4">
                        {products.map((product, index) => (
                            <li key={product.timestamp} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start gap-4">
                                <img src={product.imageUrl} alt={product.details['Product Name']} className="h-24 w-24 object-cover rounded-md flex-shrink-0" />
                                <div className="flex-grow min-w-0">
                                    <p className="text-lg font-bold text-gray-800 dark:text-white truncate" title={product.details["Product Name"]}>{product.details["Product Name"]}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        <strong>Batch:</strong> {product.details["Batch No"]}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                        Scanned on {formatTimestamp(product.timestamp)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 flex sm:flex-col justify-end items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                                    <button
                                        onClick={() => onSelectProduct(index)}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                                    >
                                        View/Edit
                                    </button>
                                    <button
                                        onClick={() => onDeleteProduct(index)}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
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