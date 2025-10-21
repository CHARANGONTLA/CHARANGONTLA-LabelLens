import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../types';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import { useToast } from '../contexts/ToastContext';
import { Loader } from './Loader';

declare var XLSX: any;

export const AdminDashboard: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({ search: '', date: '' });
    const { addToast } = useToast();

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const allOrders = await getAllOrders();
            setOrders(allOrders);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch orders.');
            addToast('Failed to fetch orders.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
        const originalOrders = [...orders];
        const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
        );
        setOrders(updatedOrders);

        try {
            await updateOrderStatus(orderId, newStatus);
            addToast(`Order status updated to ${newStatus}.`, 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to update order status. Reverting changes.', 'error');
            setOrders(originalOrders); // Revert on failure
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchTerm = filters.search.toLowerCase();
            const searchMatch =
                order.outletName.toLowerCase().includes(searchTerm) ||
                order.employeeEmail.toLowerCase().includes(searchTerm) ||
                order.items.some(item => item.productName.toLowerCase().includes(searchTerm));

            const dateMatch = filters.date
                ? new Date(order.createdAt).toISOString().slice(0, 10) === filters.date
                : true;

            return searchMatch && dateMatch;
        });
    }, [orders, filters]);

    const handleExport = () => {
        const exportData = filteredOrders.flatMap(order => 
            order.items.map(item => ({
                'Order ID': order.id,
                'Date': new Date(order.createdAt).toLocaleString(),
                'Employee': order.employeeEmail,
                'Outlet': order.outletName,
                'Product': item.productName,
                'Quantity': item.quantity,
                'Status': order.status,
            }))
        );

        if (exportData.length === 0) {
            addToast("No data to export.", "info");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
        XLSX.writeFile(workbook, `AllOrders_${new Date().toISOString().slice(0,10)}.xlsx`);
        addToast('Data exported to Excel!', 'success');
    };

    if (isLoading) {
        return <div className="flex justify-center items-center p-10"><Loader /></div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                 <button onClick={handleExport} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900">
                    Export to Excel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input
                    type="search"
                    placeholder="Search by Outlet, Employee, or Product..."
                    value={filters.search}
                    onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-4 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                    type="date"
                    value={filters.date}
                    onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full pl-4 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/70">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outlet</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Products</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Qty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{order.employeeEmail}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{order.outletName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                    <ul className="list-disc list-inside">
                                        {order.items.map(item => <li key={item.productName}>{item.productName} ({item.quantity})</li>)}
                                    </ul>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-bold">{order.totalQuantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <select
                                        value={order.status}
                                        onChange={e => handleStatusChange(order.id, e.target.value as Order['status'])}
                                        className="py-1 px-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Dispatched">Dispatched</option>
                                        <option value="Delivered">Delivered</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredOrders.length === 0 && <p className="text-center py-8 text-gray-500">No orders found.</p>}
            </div>
        </div>
    );
};
