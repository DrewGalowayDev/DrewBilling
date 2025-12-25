const Badge = ({ children, className = '', variant = 'default' }) => {
    const variantClasses = {
      default: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${variantClasses[variant]} ${className}`}>
        {children}
      </span>
    );
  };
  
  export default Badge;
  