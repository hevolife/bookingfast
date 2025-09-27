import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} border-4 border-purple-200 rounded-full animate-spin`}></div>
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} border-4 border-purple-600 rounded-full animate-spin border-t-transparent`}></div>
    </div>
  );
}