import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Order, OrderItem, OrderStatus } from '../types';

const ORDERS_COLLECTION = 'orders';

// Add a new order
export const addOrder = async (orderData: { employeeEmail: string; outletName: string; items: OrderItem[] }) => {
    const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
    try {
        await addDoc(collection(db, ORDERS_COLLECTION), {
            ...orderData,
            createdAt: serverTimestamp(),
            status: 'Pending',
            totalQuantity,
        });
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Could not save the order.");
    }
};

// A helper function to safely map a Firestore doc to a plain, serializable Order object.
const docToOrder = (doc: any): Order => {
    const data = doc.data();
    
    // Manually reconstruct the items array to ensure each item is a plain object.
    // This is a robust way to prevent circular reference errors when dealing with nested
    // data from the Firestore SDK.
    const plainItems: OrderItem[] = (data.items || []).map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
    }));

    // Create a new, plain Order object from the Firestore data. This strips any
    // internal circular references from the `doc` object.
    const plainOrder: Order = {
        id: doc.id,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        employeeEmail: data.employeeEmail,
        outletName: data.outletName,
        items: plainItems,
        status: data.status,
        totalQuantity: data.totalQuantity,
    };
    
    return plainOrder;
};

// Get all orders for a specific employee
export const getOrdersByEmployee = async (employeeEmail: string): Promise<Order[]> => {
    const q = query(
        collection(db, ORDERS_COLLECTION),
        where("employeeEmail", "==", employeeEmail),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToOrder);
};

// Get all orders (for admin)
export const getAllOrders = async (): Promise<Order[]> => {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToOrder);
};

// Update an order's status
export const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, { status });
};

// Update order items (for editing)
export const updateOrderItems = async (orderId: string, items: OrderItem[]) => {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    await updateDoc(orderRef, { items, totalQuantity });
};
