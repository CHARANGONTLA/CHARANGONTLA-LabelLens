import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import LabelLensView from './LabelLensView';
import { AppNavigation } from './components/AppNavigation';
import OrderSystem from './OrderSystem';
import { AdminDashboard } from './components/AdminDashboard';

const LabelLensApp: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'labelLens' | 'orderSystem' | 'admin'>('labelLens');

  return (
    <div className="min-h-screen font-sans text-gray-800 dark:text-gray-200 antialiased">
        <main className="container mx-auto px-4 py-8 md:py-12">
            <AppNavigation
                activeView={activeView}
                setActiveView={setActiveView}
                userRole={user?.role || 'employee'}
            />

            {activeView === 'labelLens' && <LabelLensView />}
            {activeView === 'orderSystem' && <OrderSystem />}
            {activeView === 'admin' && user?.role === 'admin' && <AdminDashboard />}
            
            <footer className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
                <p>Powered by Google Gemini</p>
            </footer>
        </main>
    </div>
  );
};

export default LabelLensApp;
