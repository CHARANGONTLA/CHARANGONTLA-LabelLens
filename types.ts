export interface ProductDetails {
  "Product Name": string;
  "Bag No": string;
  "Batch No": string;
  "Manufacturing Date": "Not found" | string;
  "Expiry Date": "Not found" | string;
  "MRP": "Not found" | string;
  "Weight": "Not found" | string;
  "Quantity": string;
}

export interface HistoricProduct {
  details: ProductDetails;
  imageUrl: string;
  timestamp: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}
