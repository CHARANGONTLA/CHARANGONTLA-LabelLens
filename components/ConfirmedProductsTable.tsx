import React, { useState, useMemo, useEffect } from 'react';
import { ProductDetails, HistoricProduct } from '../types';
import { useToast } from '../contexts/ToastContext';
import { ImageZoom } from './ImageZoom';

declare var XLSX: any;

interface ConfirmedProductsTableProps {
  products: HistoricProduct[];
  onDeleteProduct: (index: number) => void;
  onEditProduct: (index: number) => void;
  onDeleteAll: () => void;
  saveStatus: 'idle' | 'saving' | 'saved';
}

type SortableKeys = keyof ProductDetails;
type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: SortableKeys | null;
  direction: SortDirection;
}

const tableHeaders: (keyof ProductDetails)[] = [
    "Product Name",
    "Weight",
    "Batch No",
    "Manufacturing Date",
    "Expiry Date",
    "MRP",
    "Quantity",
    "Bag No"
];

// Helper to parse DD.MM.YY date strings
const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'Not found' || !/^\d{2}\.\d{2}\.\d{2}$/.test(dateStr)) {
        return null;
    }
    const [day, month, year] = dateStr.split('.').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    const fullYear = 2000 + year;
    const date = new Date(fullYear, month - 1, day);
    
    // Validate that the created date is correct (e.g., handles "32.01.24")
    if (date.getFullYear() !== fullYear || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }
    return date;
};

// Helper to determine product status based on expiry date
const getProductStatus = (expiryDateStr: string): { status: 'Expired' | 'Nearing Expiry' | 'Valid' | 'Unknown' } => {
    const expiryDate = parseDate(expiryDateStr);
    if (!expiryDate) return { status: 'Unknown' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { status: 'Expired' };
    }
    if (diffDays <= 30) {
        return { status: 'Nearing Expiry' };
    }
    return { status: 'Valid' };
};

const getHeaderLabel = (header: keyof ProductDetails): string => {
    if (header === "Manufacturing Date") return "Mfg. Date";
    if (header === "Expiry Date") return "Exp. Date";
    return header;
};

const SaveStatusIndicator: React.FC<{ status: 'idle' | 'saving' | 'saved' }> = ({ status }) => {
  const content = useMemo(() => {
    switch (status) {
      case 'saving':
        return (
          <>
            <svg className="animate-spin h-5 w-5 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400">Saving...</span>
          </>
        );
      case 'saved':
        return (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-600 dark:text-green-400">All changes saved</span>
          </>
        );
      default:
        return null;
    }
  }, [status]);

  return (
    <div className={`flex items-center gap-2 transition-opacity duration-300 h-5 ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
      {content}
    </div>
  );
};


export const ConfirmedProductsTable: React.FC<ConfirmedProductsTableProps> = ({ products, onDeleteProduct, onEditProduct, onDeleteAll, saveStatus }) => {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const filteredAndSortedProducts = useMemo(() => {
    let filteredProducts = products.filter(product => {
        const term = searchTerm.toLowerCase();
        return (
            product.details["Product Name"]?.toLowerCase().includes(term) ||
            product.details["Batch No"]?.toLowerCase().includes(term)
        );
    });

    if (sortConfig.key !== null) {
      filteredProducts.sort((a, b) => {
          const aValue = a.details[sortConfig.key!];
          const bValue = b.details[sortConfig.key!];

          // Push "Not found" or empty values to the bottom
          const isANotFound = aValue === 'Not found' || aValue === '' || aValue === null;
          const isBNotFound = bValue === 'Not found' || bValue === '' || bValue === null;
          if (isANotFound && !isBNotFound) return 1;
          if (!isANotFound && isBNotFound) return -1;
          if (isANotFound && isBNotFound) return 0;

          let comparison = 0;

          if (sortConfig.key === 'Expiry Date' || sortConfig.key === 'Manufacturing Date') {
              const dateA = parseDate(aValue as string);
              const dateB = parseDate(bValue as string);
              if (dateA && dateB) {
                  comparison = dateA.getTime() - dateB.getTime();
              }
          } else if (['MRP', 'Quantity', 'Weight'].includes(sortConfig.key)) {
              const numA = parseFloat(String(aValue).replace(/[^0-9.]/g, ''));
              const numB = parseFloat(String(bValue).replace(/[^0-9.]/g, ''));
              if (!isNaN(numA) && !isNaN(numB)) {
                  comparison = numA - numB;
              }
          } else {
              comparison = String(aValue).localeCompare(String(bValue));
          }

          return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    } else {
      // Default sort: Last-in, First-out (reverse chronological).
      // The original `products` array is chronological, so we just reverse the filtered result for display.
      // This does not mutate the original `products` array, preserving S.No calculations.
      filteredProducts.reverse();
    }

    return filteredProducts;
  }, [products, searchTerm, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleExport = () => {
    // The `products` array is the source of truth and is already in chronological (S.No) order.
    // Using it directly ensures the export is always complete and sorted by S.No,
    // regardless of on-screen filters or sorting.
    const exportData = products.map((product) => {
      const { details } = product;
      const orderedProduct: { [key: string]: string | number } = {
        "Serial No": products.indexOf(product) + 1,
      };
      tableHeaders.forEach(header => {
        orderedProduct[header] = details[header];
      });
      return orderedProduct;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `ConfirmedProducts_${formattedDate}.xlsx`);
    addToast('Data exported to Excel!', 'success');
  };

  const SortIndicator = ({ columnKey }: { columnKey: SortableKeys }) => {
    if (sortConfig.key !== columnKey) return null;
    return <span className="ml-1">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>;
  };

  const StatusBadge = ({ expiryDate }: { expiryDate: string }) => {
    const { status } = getProductStatus(expiryDate);
    const badgeClasses = {
        Expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Nearing Expiry': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        Valid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses[status]}`}>
            {status}
        </span>
    );
  };
  
  if (products.length === 0) {
    return null;
  }
  
  return (
    <>
    {zoomedImageUrl && (
        <ImageZoom src={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />
    )}
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product History ({products.length})</h2>
            <SaveStatusIndicator status={saveStatus} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900"
            >
              Export to Excel
            </button>
            <button
              onClick={onDeleteAll}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
              aria-label="Delete all confirmed products"
            >
              Delete All
            </button>
          </div>
        </div>

        <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Product Name or Batch No..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full leading-5 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredAndSortedProducts.map((product) => (
            <div key={product.timestamp} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start gap-3">
                  <button type="button" onClick={() => setZoomedImageUrl(product.imageUrl)} className="flex-shrink-0">
                      <img src={product.imageUrl} alt={product.details['Product Name']} className="h-16 w-16 object-cover rounded-md" />
                  </button>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{product.details["Product Name"]}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">S.No: {products.indexOf(product) + 1}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge expiryDate={product.details['Expiry Date']} />
                  </div>
                </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {tableHeaders.slice(1).map(header => (
                  <React.Fragment key={header}>
                    <div className="font-medium text-gray-600 dark:text-gray-400">{getHeaderLabel(header)}</div>
                    <div className="text-gray-800 dark:text-gray-200 truncate">{product.details[header]}</div>
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
                <button
                  onClick={() => onEditProduct(products.indexOf(product))}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  aria-label={`Edit product ${product.details["Product Name"]}`}
                >Edit</button>
                <button
                  onClick={() => onDeleteProduct(products.indexOf(product))}
                  className="text-sm font-medium text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  aria-label={`Delete product ${product.details["Product Name"]}`}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/70">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S.No</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image</th>
                {tableHeaders.map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button onClick={() => requestSort(header)} className="flex items-center uppercase font-medium">
                      {getHeaderLabel(header)} <SortIndicator columnKey={header} />
                    </button>
                  </th>
                ))}
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedProducts.map((product) => (
                <tr key={product.timestamp} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{products.indexOf(product) + 1}</td>
                  <td className="px-4 py-3">
                    <button 
                      type="button" 
                      onClick={() => setZoomedImageUrl(product.imageUrl)}
                      className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 rounded-md"
                    >
                      <img src={product.imageUrl} alt={product.details['Product Name']} className="h-12 w-12 object-cover rounded-md" />
                    </button>
                  </td>
                  {tableHeaders.map(header => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{product.details[header]}</td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge expiryDate={product.details['Expiry Date']} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onEditProduct(products.indexOf(product))}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      aria-label={`Edit product ${product.details["Product Name"]}`}
                    >Edit</button>
                    <button
                      onClick={() => onDeleteProduct(products.indexOf(product))}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      aria-label={`Delete product ${product.details["Product Name"]}`}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAndSortedProducts.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">No products match your search.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};