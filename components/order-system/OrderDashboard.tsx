import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface OrderDashboardProps {
    setView: (view: 'takeOrder' | 'myOrders') => void;
}

const TakeOrderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const MyOrdersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

export const OrderDashboard: React.FC<OrderDashboardProps> = ({ setView }) => {
    const { user } = useAuth();
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {user?.email}!</h2>
                <p className="text-gray-600 dark:text-gray-400">What would you like to do today?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button
                    onClick={() => setView('takeOrder')}
                    className="group bg-white dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                    <TakeOrderIcon />
                    <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Take a New Order</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Create a new order for an outlet.</p>
                </button>
                <button
                    onClick={() => setView('myOrders')}
                    className="group bg-white dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                    <MyOrdersIcon />
                    <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">View My Orders</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Review and manage your past orders.</p>
                </button>
            </div>
        </div>
    );
};
