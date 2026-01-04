import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'md' | 'lg' | 'xl';
  highContrast?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  highContrast,
  className = '',
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-bold rounded-lg transition-all focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";

  const sizeStyles = {
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-5 text-2xl"
  };

  const variants = highContrast ? {
    primary: "bg-yellow-400 text-black border-4 border-yellow-400 hover:bg-yellow-500 focus:ring-yellow-300",
    secondary: "bg-black text-yellow-400 border-4 border-yellow-400 hover:bg-gray-900 focus:ring-yellow-300",
    danger: "bg-red-600 text-white border-4 border-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white border-4 border-white hover:bg-green-700 focus:ring-green-500"
  } : {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-lg hover:shadow-xl",
    secondary: "bg-white text-gray-800 border-2 border-gray-200 hover:bg-gray-50 focus:ring-gray-300 shadow-sm",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-md",
    success: "bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-md"
  };

  return (
    <button
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  highContrast?: boolean;
  className?: string;
  onClick?: () => void;
  tabIndex?: number;
}> = ({ children, highContrast, className = '', onClick, tabIndex }) => {
  return (
    <div
      onClick={onClick}
      tabIndex={tabIndex}
      className={`
        rounded-xl p-6 transition-all 
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${highContrast
          ? 'bg-black border-4 border-yellow-400 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
          : 'bg-white border border-gray-100 text-gray-800 shadow-xl shadow-slate-200/50'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
export const IconCheck = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
);
export const IconSpeaker = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
);
export const IconEye = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
);