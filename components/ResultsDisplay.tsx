import React, { useState, useEffect, useMemo } from 'react';
import { ProductDetails, HistoricProduct } from '../types';
import { BarcodeScanner } from './BarcodeScanner';
import { Loader } from './Loader';
import { ImageZoom } from './ImageZoom';
import { AutocompleteInput } from './AutocompleteInput';

interface ResultsDisplayProps {
  imageUrl: string | null;
  productDetails: ProductDetails | null;
  isLoading: boolean;
  error: string | null;
  onDetailChange: (field: keyof ProductDetails, value: string) => void;
  onConfirm: () => void;
  onReset: () => void;
  isEditing: boolean;
  editingSerialNumber?: number;
  onSkip: () => void;
  showSkipButton: boolean;
  onCancelAnalysis: () => void;
  isInBatchMode: boolean;
  confirmedProducts: HistoricProduct[];
}

const BarcodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-4-12v8m-4-6v4m16-4v4m-4-6v8m-4-12v16" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4 mr-1.5 text-yellow-500 flex-shrink-0"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const fieldOrder: (keyof ProductDetails)[] = ["Product Name", "Bag No", "Batch No", "Manufacturing Date", "Expiry Date", "MRP", "Weight", "Quantity"];

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ imageUrl, productDetails, isLoading, error, onDetailChange, onConfirm, onReset, isEditing, editingSerialNumber, onSkip, showSkipButton, onCancelAnalysis, isInBatchMode, confirmedProducts }) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [expiryStatus, setExpiryStatus] = useState<'not-expired' | 'expired' | 'unknown'>('unknown');

  const productNameSuggestions = useMemo(() => {
    if (!confirmedProducts) return [];
    const names = confirmedProducts.map(p => p.details["Product Name"]);
    // Filter out empty/falsy names and return unique ones
    return [...new Set(names)].filter(Boolean);
  }, [confirmedProducts]);

  const handleProductNameSelect = (suggestion: string) => {
    const upperSuggestion = suggestion.toUpperCase();
    onDetailChange("Product Name", upperSuggestion);

    // Find the most recent product with this name. `confirmedProducts` is already sorted newest-first.
    const recentProduct = confirmedProducts.find(
      p => p.details["Product Name"].toUpperCase() === upperSuggestion
    );

    if (recentProduct) {
      const { Weight, MRP } = recentProduct.details;
      if (Weight && Weight !== "Not found") {
        onDetailChange("Weight", Weight);
      }
      if (MRP && MRP !== "Not found") {
        onDetailChange("MRP", MRP);
      }
    }
  };

  useEffect(() => {
    if (!productDetails) {
      setExpiryStatus('unknown');
      return;
    }

    const dateString = productDetails['Expiry Date'];
    if (dateString === 'Not found' || !/^\d{2}\.\d{2}\.\d{2}$/.test(dateString)) {
        setExpiryStatus('unknown');
        return;
    }

    try {
        const parts = dateString.split('.');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
        const year = parseInt(parts[2], 10) + 2000;
        
        const expiryDate = new Date(year, month, day);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
        
        if (isNaN(expiryDate.getTime())) {
            setExpiryStatus('unknown');
            return;
        }

        if (expiryDate < today) {
            setExpiryStatus('expired');
        } else {
            setExpiryStatus('not-expired');
        }
    } catch (e) {
        console.error("Error parsing date:", e);
        setExpiryStatus('unknown');
    }
  }, [productDetails]);

  const handleFocusClearNotFound = (field: keyof ProductDetails, currentValue: string) => {
    if (currentValue === 'Not found') {
      onDetailChange(field, '');
    }
  };

  const isDetailsValid = productDetails && productDetails['Product Name']?.trim() && productDetails['Bag No']?.trim() && parseInt(productDetails['Quantity'], 10) > 0;
  const isConfirmDisabled = isLoading || !isDetailsValid;

  const handleBarcodeScanned = (scannedCode: string) => {
    onDetailChange("Batch No", scannedCode.toUpperCase().replace(/\s/g, ''));
    setIsScannerOpen(false);
  };
  
  const AnalysisLoader = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
        <Loader />
        <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400">Analyzing image...</p>
        <p className="text-sm text-gray-500">This might take a moment.</p>
        <button
            onClick={onCancelAnalysis}
            className="mt-6 inline-flex items-center justify-center px-6 py-2.5 text-base font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
            aria-label={isInBatchMode ? "Skip this image and continue batch" : "Cancel image analysis"}
        >
            {isInBatchMode ? 'Skip This Image' : 'Cancel'}
        </button>
    </div>
  );

  return (
    <>
      {isScannerOpen && (
        <BarcodeScanner 
          onScanSuccess={handleBarcodeScanned}
          onCancel={() => setIsScannerOpen(false)}
        />
      )}
      {isZoomModalOpen && imageUrl && (
        <ImageZoom src={imageUrl} onClose={() => setIsZoomModalOpen(false)} />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {imageUrl && (
          <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Uploaded Image</h3>
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(true)}
                className="rounded-xl shadow-md overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 group"
                aria-label="Zoom in on image"
              >
                <img src={imageUrl} alt="Uploaded product label" className="rounded-xl max-h-96 w-auto transition-transform duration-300 group-hover:scale-105" />
              </button>
          </div>
        )}
        
        <div className={!imageUrl ? 'md:col-span-2' : ''}>
          { isLoading ? <AnalysisLoader /> : (
            productDetails && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center md:text-left">
                {isEditing && editingSerialNumber ? `Editing Details (S.No: ${editingSerialNumber})` : isEditing ? 'Edit Details' : error ? 'Review Details' : 'Extracted Details'}
              </h3>
              
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/70">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Field
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {fieldOrder.map((key) => {
                      const value = productDetails[key] ?? '';
                      const isBatchNoField = key === 'Batch No';
                      const isProductNameField = key === 'Product Name';
                      const isQuantityField = key === 'Quantity';
                      const isBagNoField = key === 'Bag No';
                      const isMrpField = key === 'MRP';
                      
                      const isProductNameEmpty = isProductNameField && (!value || String(value).trim() === '');
                      const isBagNoEmpty = isBagNoField && (!value || String(value).trim() === '');
                      const currentQuantityValue = isQuantityField ? parseInt(String(value), 10) : 0;
                      const isCurrentQuantityInvalid = isQuantityField && (isNaN(currentQuantityValue) || currentQuantityValue <= 0);

                      const isInvalid = isProductNameEmpty || isBagNoEmpty || isCurrentQuantityInvalid;
                      const isNotFound = value === 'Not found';

                      let placeholderText = '';
                      if (isProductNameField || isBagNoField || isQuantityField) {
                          placeholderText = 'Required field';
                      }

                      return (
                        <React.Fragment key={key}>
                          <tr className={`transition-colors duration-200 ${isInvalid ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {key}
                              {(isProductNameField || isBagNoField || isQuantityField) && <span className="text-red-500 ml-1">*</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              <div className="flex items-center">
                                {isNotFound && <WarningIcon />}

                                {isProductNameField ? (
                                    <AutocompleteInput
                                      suggestions={productNameSuggestions}
                                      value={String(value)}
                                      onFocus={() => handleFocusClearNotFound(key, value as string)}
                                      onChange={(e) => onDetailChange(key, e.target.value.toUpperCase())}
                                      onSuggestionSelect={handleProductNameSelect}
                                      className={`w-full bg-transparent border-0 p-0 focus:ring-0 focus:border-blue-500 ${isNotFound ? 'italic text-yellow-600 dark:text-yellow-400' : ''}`}
                                      style={{ textTransform: 'uppercase' }}
                                      autoCapitalize={'characters'}
                                      aria-label={`Edit ${key}`}
                                      placeholder={placeholderText}
                                      aria-required={isProductNameField}
                                    />
                                ) : (
                                    <input
                                      type={(isQuantityField || isMrpField) ? 'number' : 'text'}
                                      min={isQuantityField ? 1 : undefined}
                                      value={value}
                                      onFocus={() => handleFocusClearNotFound(key, value)}
                                      onChange={(e) => {
                                        let val = e.target.value;
                                        if (isMrpField) {
                                          val = val.replace(/[^0-9]/g, '');
                                        } else if (!isQuantityField) {
                                          val = val.toUpperCase();
                                          if (isBatchNoField) {
                                            val = val.replace(/\s/g, '');
                                          }
                                        }
                                        onDetailChange(key, val);
                                      }}
                                      className={`w-full bg-transparent border-0 p-0 focus:ring-0 focus:border-blue-500 ${isNotFound ? 'italic text-yellow-600 dark:text-yellow-400' : ''}`}
                                      style={!isQuantityField ? { textTransform: 'uppercase' } : {}}
                                      autoCapitalize={!isQuantityField ? 'characters' : 'none'}
                                      aria-label={`Edit ${key}`}
                                      placeholder={placeholderText}
                                      aria-required={isBagNoField || isQuantityField}
                                    />
                                )}
                                {isBatchNoField && (
                                    <button 
                                        onClick={() => setIsScannerOpen(true)}
                                        className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        title="Scan Barcode"
                                        aria-label="Scan barcode for batch number"
                                    >
                                        <BarcodeIcon />
                                    </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {key === 'Expiry Date' && expiryStatus !== 'unknown' && (
                            <tr className={`transition-colors duration-200 ${expiryStatus === 'expired' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}`}>
                              <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Status
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm">
                                  {expiryStatus === 'expired' ? (
                                    <div className="flex items-center font-semibold text-red-600 dark:text-red-400">
                                        <ExclamationCircleIcon />
                                        <span>Product Expired</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center font-semibold text-green-600 dark:text-green-400">
                                        <CheckCircleIcon />
                                        <span>Not Expired</span>
                                    </div>
                                  )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                    onClick={onConfirm}
                    disabled={isConfirmDisabled}
                    aria-disabled={isConfirmDisabled}
                    className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-base font-semibold rounded-full transition-all duration-300 ease-in-out text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 ${
                        isConfirmDisabled
                            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                    {isEditing ? 'Update Details' : 'Confirm & Add to List'}
                </button>
                
                {showSkipButton && !isEditing && (
                  <button
                      onClick={onSkip}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-base font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 dark:focus:ring-offset-gray-900"
                  >
                      Skip
                  </button>
                )}

                <button
                    onClick={onReset}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-base font-semibold rounded-full transition-all duration-300 ease-in-out text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-900"
                >
                    Cancel
                </button>
              </div>
              {isConfirmDisabled && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
                        Please fill out all required fields (*) to continue.
                    </p>
                )}
            </>
            ))
          }
        </div>
      </div>
    </>
  );
};
