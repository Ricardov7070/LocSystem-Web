import React, { useEffect, useState } from "react";

interface AlertProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: () => void;
}


const CustomAlert: React.FC<AlertProps> = ({ message, type = "info", duration = 3000, onClose }) => {
const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500);
    }, duration);

    return () => clearTimeout(timer);

  }, [duration, onClose]);

  return visible ? (
    <div className={`custom-alert ${type} px-4 py-3 rounded shadow-lg min-w-[250px] max-w-sm mb-2 text-white bg-opacity-90 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
      {message}
    </div>
  ) : null;
  
};

export default CustomAlert;