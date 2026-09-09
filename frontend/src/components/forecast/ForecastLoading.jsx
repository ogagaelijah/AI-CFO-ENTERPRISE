/**
 * Forecast Loading Component
 * Skeleton loading state for forecast dashboard
 */

import React from 'react';

const ForecastLoading = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-36 mt-4 sm:mt-0"></div>
      </div>

      {/* Executive Summary skeleton */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full mt-3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mt-2"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 text-center">
              <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-24 mx-auto"></div>
              <div className="h-3 bg-gray-200 rounded w-20 mx-auto mt-1"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastLoading;