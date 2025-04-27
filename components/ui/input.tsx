import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
  error?: string;
}

export function Input({
  className = '',
  fullWidth = false,
  error,
  ...props
}: InputProps) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      <input
        className={`
          px-3 py-2 bg-white border border-gray-300 rounded-md text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default Input;
