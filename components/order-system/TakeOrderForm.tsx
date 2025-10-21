import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { OrderItem, Order } from '../../types';
import { addOrder, updateOrderItems } from '../../services/orderService';
import { useToast } from '../../contexts/ToastContext';
import { AutocompleteInput } from '../AutocompleteInput';
import { ALL_PRODUCTS } from '../../data/products';
import { Loader } from '../Loader';

interface TakeOrderFormProps {
    onBack: () => void;
    orderToEdit?: Order | null;
}

export const TakeOrderForm: React.FC<TakeOrderFormProps> = ({ onBack, orderToEdit }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [outletName, setOutletName] = useState('');
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [currentItem, setCurrentItem] = useState<{ product: string; quantity: string }>({ product: '', quantity: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (orderToEdit) {
            setOutletName(orderToEdit.outletName);
            setOrderItems(orderToEdit.items);
        }
    }, [orderToEdit]);

    const addItem = () => {
        const quantity = parseInt(currentItem.quantity, 10);
        if (currentItem.product && !isNaN(quantity) && quantity > 0) {
            const existingItemIndex = orderItems.findIndex(item => item.productName === currentItem.product);
            if (existingItemIndex > -1) {
                const updatedItems = [...orderItems];
                updatedItems[existingItemIndex].quantity += quantity;
                setOrderItems(updatedItems);
            } else {
                setOrderItems([...orderItems, { productName: currentItem.product, quantity }]);
            }
            setCurrentItem({ product: '', quantity: '' });
        } else {
            addToast("Please select a product and enter a valid quantity.", "error");
        }
    };

    const removeItem = (productNameToRemove: string) => {
        setOrderItems(orderItems.filter(item => item.productName !== productNameToRemove));
    };

    const handleSubmit = async () => {
        if (!outletName.trim() || orderItems.length === 0) {
            addToast("Please provide an outlet name and add at least one product.", "error");
            return;
        }
        if (!user?.email) {
            addToast("You must be logged in to place an order.", "error");
            return;
        }

        setIsLoading(true);
        try {
            if (orderToEdit) {
                await updateOrderItems(orderToEdit.id, orderItems);
                addToast(`Order for ${outletName.toUpperCase()} updated successfully!`, 'success');
            } else {
                await addOrder({
                    employeeEmail: user.email,
                    outletName: outletName.trim().toUpperCase(),
                    items: orderItems,
                });
                addToast(`Order for ${outletName.toUpperCase()} placed successfully!`, 'success');
            }
            onBack();
        } catch (err) {
            console.error(err);
            addToast(`Failed to ${orderToEdit ? 'update' : 'place'} order.`, "error");
        } finally {
            setIsLoading(false);
        }
    };
    
    const totalQuantity = useMemo(() => orderItems.reduce((sum, item) => sum + item.quantity, 0), [orderItems]);
    const isFormValid = outletName.trim() && orderItems.length > 0 && !isLoading;

    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{orderToEdit ? 'Edit Order' : 'Take a New Order'}</h1>
                <button onClick={onBack} className="text-sm font-semibold text-blue-600 hover:underline" disabled={isLoading}>
                    &larr; Back to Dashboard
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label htmlFor="outletName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Outlet Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="outletName"
                        value={outletName}
                        onChange={e => setOutletName(e.target.value.toUpperCase())}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700"
                        style={{ textTransform: 'uppercase' }}
                        disabled={isLoading || !!orderToEdit}
                        placeholder="Enter outlet name"
                    />
                </div>

                <div className="border-t border-b border-gray-200 dark:border-gray-700 py-6 space-y-4">
                    <h3 className="font-semibold">Add Products</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2">
                             <label htmlFor="productName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Product <span className="text-red-500">*</span>
                            </label>
                           <AutocompleteInput
                                as="input"
                                id="productName"
                                suggestions={ALL_PRODUCTS}
                                value={currentItem.product}
                                onChange={e => setCurrentItem(prev => ({...prev, product: e.target.value.toUpperCase()}))}
                                onSuggestionSelect={p => setCurrentItem(prev => ({...prev, product: p}))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700"
                                style={{ textTransform: 'uppercase' }}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="quantity"
                                type="number"
                                min="1"
                                value={currentItem.quantity}
                                onChange={e => setCurrentItem(prev => ({...prev, quantity: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <div className="text-right">
                        <button onClick={addItem} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Add Item
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold">Current Order ({totalQuantity} items)</h3>
                    {orderItems.length === 0 ? (
                        <p className="text-sm text-gray-500 mt-2">No products added yet.</p>
                    ) : (
                        <ul className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-2">
                            {orderItems.map(item => (
                                <li key={item.productName} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                                    <span className="text-sm">{item.productName}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold">{item.quantity}</span>
                                        <button onClick={() => removeItem(item.productName)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={handleSubmit} disabled={!isFormValid} className={`w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-full transition-all duration-300 ease-in-out text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                        !isFormValid ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    }`}>
                        {isLoading ? <Loader className="h-6 w-6 text-white"/> : (orderToEdit ? 'Update Order' : 'Submit Order')}
                    </button>
                </div>
            </div>
        </div>
    );
};