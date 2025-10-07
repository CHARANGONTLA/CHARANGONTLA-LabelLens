import React from 'react';

interface BatchProgressProps {
  current: number;
  total: number;
}

export const BatchProgress: React.FC<BatchProgressProps> = ({ current, total }) => {
  if (total <= 1) {
    return null;
  }

  const progressPercentage = (current / total) * 100;

  return (
    <div className="text-center mb-6">
      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        Processing Image {current} of {total}
      </p>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 shadow-inner">
        <div 
          className="bg-gradient-to-r from-blue-500 to-teal-400 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};