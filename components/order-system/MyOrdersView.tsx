import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Order } from '../../types';
import { getOrdersByEmployee } from '../../services/orderService';
import { useToast } from '../../contexts/ToastContext';
import { Loader } from '../Loader';

interface MyOrdersViewProps {
    onBack: () => void;
    onEditOrder: (order: Order) => void;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({ onBack, onEditOrder }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        const fetchOrders = async () => {
            if (!user?.email) {
                setError("User not found.");
                setIsLoading(false);
                return;
            }
            try {
                const userOrders = await getOrdersByEmployee(user.email);
                setOrders(userOrders);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch your orders.');
                addToast('Failed to fetch your orders.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [user, addToast]);

    if (isLoading) {
        return <div className="flex justify-center items-center p-10"><Loader /></div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case 'Dispatched': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case 'Delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Orders</h1>
                <button onClick={onBack} className="text-sm font-semibold text-blue-600 hover:underline">
                    &larr; Back to Dashboard
                </button>
            </div>

            {orders.length === 0 ? (
                <p className="text-center py-10 text-gray-500">You haven't placed any orders yet.</p>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{order.outletName}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                    {order.status === 'Pending' && (
                                        <button onClick={() => onEditOrder(order)} className="text-sm font-medium text-blue-600 hover:underline">
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                                <p className="text-sm font-semibold mb-2">Items ({order.totalQuantity} total):</p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    {order.items.map(item => (
                                        <li key={item.productName} className="text-gray-700 dark:text-gray-300">
                                            {item.productName} - <strong>{item.quantity}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
