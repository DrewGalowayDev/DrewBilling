const Select = ({ value, onChange, options, children, className = "", ...props }) => {
    return (
      <select
        value={value}
        onChange={onChange}
        className={`w-full p-2 border rounded focus:ring focus:ring-blue-200 focus:outline-none ${className}`}
        {...props}
      >
        {options ? (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
    );
  };
  
  export default Select;
  