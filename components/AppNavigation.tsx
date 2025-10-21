import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserRole } from '../types';

type AppView = 'labelLens' | 'orderSystem' | 'admin';

interface AppNavigationProps {
    activeView: AppView;
    setActiveView: (view: AppView) => void;
    userRole: UserRole;
}

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);


export const AppNavigation: React.FC<AppNavigationProps> = ({ activeView, setActiveView, userRole }) => {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const navButtonBaseClasses = "px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900";
    const activeClasses = "bg-blue-600 text-white shadow";
    const inactiveClasses = "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";
    
    return (
        <header className="relative pb-8">
            <div className="absolute top-0 right-0 flex items-center space-x-2">
                <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">
                    {user?.email}
                </p>
                <button
                    onClick={signOut}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
                    aria-label="Sign Out"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
             <div className="flex flex-col items-center text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-500 dark:to-teal-300">
                    Satish Distributor
                </h1>
                <p className="mt-3 max-w-2xl mx-auto text-base md:text-lg text-gray-600 dark:text-gray-400">
                    Smart Order System & Product Scanner
                </p>
            </div>

            <nav className="mt-6 flex justify-center items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                <button
                    onClick={() => setActiveView('labelLens')}
                    className={`${navButtonBaseClasses} ${activeView === 'labelLens' ? activeClasses : inactiveClasses}`}
                >
                    LabelLens Scanner
                </button>
                <button
                    onClick={() => setActiveView('orderSystem')}
                    className={`${navButtonBaseClasses} ${activeView === 'orderSystem' ? activeClasses : inactiveClasses}`}
                >
                    Order System
                </button>
                {userRole === 'admin' && (
                    <button
                        onClick={() => setActiveView('admin')}
                        className={`${navButtonBaseClasses} ${activeView === 'admin' ? activeClasses : inactiveClasses}`}
                    >
                        Admin Panel
                    </button>
                )}
            </nav>
        </header>
    );
};
