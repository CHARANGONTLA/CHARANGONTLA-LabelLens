import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProductDetails } from '../types';

export interface QueuedItem {
    id: number;
    file: File;
    productDetails?: Partial<ProductDetails>;
}

// This is what we'll store in IndexedDB. Note the image is a Blob.
export interface DBHistoricProduct {
    details: ProductDetails;
    image: Blob;
    timestamp: number;
}


interface LabelLensDB extends DBSchema {
  'image-queue': {
    key: number;
    value: { 
      file: File, 
      productDetails?: Partial<ProductDetails> 
    };
    indexes: { 'by-id': number };
  };
  'confirmed-products': {
      key: number; // Using timestamp as the key
      value: DBHistoricProduct;
      indexes: { 'by-timestamp': 'timestamp' };
  };
}

let dbPromise: Promise<IDBPDatabase<LabelLensDB>>;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LabelLensDB>('LabelLensDB', 2, { // Version bumped to 2
      upgrade(db, oldVersion) {
        // This switch statement with fall-through is a robust way to handle upgrades
        switch(oldVersion) {
            case 0:
                // If db doesn't exist, it's version 0, so we create the first store
                if (!db.objectStoreNames.contains('image-queue')) {
                    const queueStore = db.createObjectStore('image-queue', {
                      keyPath: 'id',
                      autoIncrement: true,
                    });
                    queueStore.createIndex('by-id', 'id');
                }
                // falls through
            case 1:
                // If db is version 1, it needs the new store
                if (!db.objectStoreNames.contains('confirmed-products')) {
                    const productsStore = db.createObjectStore('confirmed-products', {
                        keyPath: 'timestamp',
                    });
                    productsStore.createIndex('by-timestamp', 'timestamp');
                }
        }
      },
    });
  }
  return dbPromise;
}

// --- QUEUE FUNCTIONS (Unchanged) ---
export async function addFileToQueue(file: File): Promise<number> {
  const db = await getDB();
  const item = { file, productDetails: {} };
  const id = await db.add('image-queue', item);
  return id as number;
}

export async function getQueuedFiles(): Promise<QueuedItem[]> {
    const db = await getDB();
    const items = await db.getAll('image-queue');
    const keys = await db.getAllKeys('image-queue');
    return items.map((item, index) => ({
      ...item,
      id: keys[index]
    }));
}

export async function updateQueuedItemDetails(id: number, details: Partial<ProductDetails>): Promise<void> {
    const db = await getDB();
    const item = await db.get('image-queue', id);
    if (item) {
        const updatedItem = {
            ...item,
            productDetails: {
                ...(item.productDetails || {}),
                ...details,
            },
        };
        await db.put('image-queue', updatedItem, id);
    }
}


export async function deleteFileFromQueue(id: number): Promise<void> {
  const db = await getDB();
  if (!id || id < 0) return;
  try {
    await db.delete('image-queue', id);
  } catch (error) {
    console.error(`Failed to delete item with id ${id} from IndexedDB`, error);
  }
}

// --- CONFIRMED PRODUCTS FUNCTIONS (New) ---

export async function addConfirmedProduct(product: DBHistoricProduct): Promise<number> {
    const db = await getDB();
    return db.add('confirmed-products', product);
}

export async function getConfirmedProducts(): Promise<DBHistoricProduct[]> {
    const db = await getDB();
    // Return all products, sorted by timestamp ascending
    return db.getAllFromIndex('confirmed-products', 'by-timestamp');
}

export async function updateConfirmedProduct(timestamp: number, newDetails: ProductDetails): Promise<number> {
    const db = await getDB();
    const product = await db.get('confirmed-products', timestamp);
    if (!product) {
        throw new Error("Product not found for updating");
    }
    const updatedProduct: DBHistoricProduct = {
        ...product,
        details: newDetails,
    };
    return db.put('confirmed-products', updatedProduct);
}

export async function deleteConfirmedProduct(timestamp: number): Promise<void> {
    const db = await getDB();
    return db.delete('confirmed-products', timestamp);
}

export async function deleteAllConfirmedProducts(): Promise<void> {
    const db = await getDB();
    return db.clear('confirmed-products');
}
