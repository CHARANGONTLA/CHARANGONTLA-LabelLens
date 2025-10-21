import React, { useState } from 'react';
import { OrderDashboard } from './components/order-system/OrderDashboard';
import { TakeOrderForm } from './components/order-system/TakeOrderForm';
import { MyOrdersView } from './components/order-system/MyOrdersView';

type OrderSystemView = 'dashboard' | 'takeOrder' | 'myOrders';

const OrderSystem: React.FC = () => {
    const [view, setView] = useState<OrderSystemView>('dashboard');
    const [editingOrder, setEditingOrder] = useState<any | null>(null);

    const navigateTo = (newView: OrderSystemView) => {
        setEditingOrder(null);
        setView(newView);
    };

    const handleEditOrder = (order: any) => {
        setEditingOrder(order);
        setView('takeOrder');
    };

    const renderContent = () => {
        switch (view) {
            case 'takeOrder':
                return <TakeOrderForm onBack={() => navigateTo('dashboard')} orderToEdit={editingOrder} />;
            case 'myOrders':
                return <MyOrdersView onBack={() => navigateTo('dashboard')} onEditOrder={handleEditOrder} />;
            case 'dashboard':
            default:
                return <OrderDashboard setView={navigateTo} />;
        }
    };

    return (
        <div>
            {renderContent()}
        </div>
    );
};

export default OrderSystem;
