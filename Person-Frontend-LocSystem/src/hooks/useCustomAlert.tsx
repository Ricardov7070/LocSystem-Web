import React, { useEffect, useState } from "react";

interface AlertProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: () => void;
}

const useCustomAlert: React.FC<AlertProps> = ({ message, type = "info", duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Define as cores com base no tipo de alerta
  const alertColors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-black",
    info: "bg-blue-500 text-white",
  };

  return visible ? (
    <div
      className={`p-4 rounded-md shadow-md ${alertColors[type]} transition-opacity duration-500`}
    >
      {message}
    </div>
  ) : null;
};

export default useCustomAlert;
