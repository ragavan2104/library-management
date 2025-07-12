import React from 'react';

// Individual book skeleton component
const BookSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    {/* Book Cover Skeleton */}
    <div className="h-48 bg-gray-200"></div>
    
    {/* Book Details Skeleton */}
    <div className="p-4">
      {/* Title */}
      <div className="h-6 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      
      {/* Author */}
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      
      {/* Genre */}
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-3"></div>
      
      {/* ISBN */}
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
      
      {/* Availability Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      
      {/* Action Button */}
      <div className="h-8 bg-gray-200 rounded w-full"></div>
    </div>
  </div>
);

// Main skeleton grid component
const BooksGridSkeleton = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <BookSkeleton key={index} />
      ))}
    </div>
  );
};

export default BooksGridSkeleton;
