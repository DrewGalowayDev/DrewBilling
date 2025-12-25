import { useState, useEffect, useRef } from "react";
import axios from "../utils/api";

const PaymentStatus = ({ transactionId, onStatusChange }) => {
  const [status, setStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [remainingTime, setRemainingTime] = useState(300);
  const countdownRef = useRef(null);

  useEffect(() => {
    if (!transactionId) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/payments/status/${transactionId}`);
        const newStatus = response.data.status;

        setStatus(newStatus);
        setPaymentDetails(response.data);
        if (onStatusChange) onStatusChange(newStatus, response.data);
        setError(null);
      } catch (err) {
        setError("Unable to fetch payment status");
        console.error("Error fetching payment status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(() => {
      if (!["Confirmed", "Failed", "Expired"].includes(status)) {
        fetchStatus();
      } else {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [transactionId, onStatusChange]);

  useEffect(() => {
    if (["Pending", "Processing"].includes(status) && remainingTime > 0) {
      countdownRef.current = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const statusDisplayMap = {
    Confirmed: {
      icon: "✅", color: "bg-green-100 text-green-800 border-green-200", message: "Payment successful! Your WiFi access is now active."
    },
    Failed: {
      icon: "❌", color: "bg-red-100 text-red-800 border-red-200", message: "Payment failed. Please try again."
    },
    Processing: {
      icon: "⏳", color: "bg-yellow-100 text-yellow-800 border-yellow-200", message: "Processing your payment..."
    },
    Expired: {
      icon: "⏰", color: "bg-gray-100 text-gray-800 border-gray-200", message: "Payment request expired. Please try again."
    },
    Pending: {
      icon: "🔄", color: "bg-blue-100 text-blue-800 border-blue-200", message: "Waiting for your payment..."
    },
  };

  const statusDisplay = statusDisplayMap[status] || statusDisplayMap.Pending;

  return (
    <div className={`rounded-lg border p-4 mt-4 ${statusDisplay.color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xl mr-2">{statusDisplay.icon}</span>
          <span className="font-medium">Payment Status: {status}</span>
        </div>
        {loading && <span className="animate-pulse">Updating...</span>}
      </div>
      <p className="text-sm mt-2">{statusDisplay.message}</p>
      {(["Pending", "Processing"].includes(status) && remainingTime > 0) && (
        <div className="mt-2 text-sm">
          <p>Time remaining: <span className="font-medium">{formatTime(remainingTime)}</span></p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 overflow-hidden">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${(remainingTime / 300) * 100}%` }}></div>
          </div>
        </div>
      )}
      {paymentDetails && status === "Confirmed" && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <h4 className="font-medium text-sm">Transaction Details</h4>
          <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
            <div>Transaction ID:</div><div className="font-mono">{transactionId}</div>
            {paymentDetails.phoneNumber && <><div>Phone Number:</div><div>{paymentDetails.phoneNumber}</div></>}
            {paymentDetails.amount && <><div>Amount:</div><div>Ksh {paymentDetails.amount}</div></>}
            {paymentDetails.timestamp && <><div>Date:</div><div>{new Date(paymentDetails.timestamp).toLocaleString()}</div></>}
          </div>
        </div>
      )}
      {status === "Failed" && (
        <button className="mt-3 px-4 py-1.5 bg-white text-gray-800 rounded border border-gray-300 text-sm hover:bg-gray-50" onClick={() => window.location.reload()}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default PaymentStatus;
