const Card = ({ className = "", children }) => {
    return (
      <div className={`bg-white shadow-md rounded-lg p-4 ${className}`.trim()}>
        {children}
      </div>
    );
  };
  
  export const CardHeader = ({ className = "", children }) => {
    return <div className={`mb-4 ${className}`.trim()}>{children}</div>;
  };
  
  export const CardTitle = ({ className = "", children }) => {
    return <h3 className={`text-lg font-semibold ${className}`.trim()}>{children}</h3>;
  };
  
  export const CardContent = ({ className = "", children }) => {
    return <div className={`p-4 ${className}`.trim()}>{children}</div>;
  };
  
  export default Card;
  