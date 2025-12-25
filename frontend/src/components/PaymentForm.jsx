import { useState, useEffect } from "react";
import axios from "../utils/api";
import Select from "@/components/ui/Select";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const PaymentForm = () => {
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("30");
  const [transactionId, setTransactionId] = useState(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneRegex = /^(?:254|07|01)[0-9]{8}$/;

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!phoneRegex.test(phone)) {
      setStatus("Invalid phone number. Use 07XXXXXXXX or 2547XXXXXXXX.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setStatus("Processing...");
      
      const response = await axios.post("/mpesa/stkpush", { phone, amount: plan });
      
      setTransactionId(response.data.transactionId);
    } catch (error) {
      setStatus("Payment failed. Try again.");
      console.error("Payment error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!transactionId) return;

    let interval = setInterval(async () => {
      try {
        const res = await axios.get(`/payments/status/${transactionId}`);
        setStatus(res.data.status);

        if (["Confirmed", "Failed"].includes(res.data.status)) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [transactionId]);

  const getStatusIcon = () => {
    switch (status) {
      case "Confirmed": return <CheckCircle className="text-green-600" />;
      case "Failed": return <XCircle className="text-red-600" />;
      default: return <Clock className="text-blue-600" />;
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Buy WiFi Access</h2>
      
      <form onSubmit={handlePayment}>
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone Number (M-Pesa)
          </label>
          <input
            id="phone"
            type="text"
            placeholder="e.g., 07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 border rounded focus:ring focus:ring-blue-200 focus:outline-none"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="plan" className="block text-sm font-medium mb-1">
            Select Plan
          </label>
          <Select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            options={[
              { value: "30", label: "24Hrs - Ksh 30" },
              { value: "20", label: "12Hrs - Ksh 20" },
              { value: "15", label: "4Hrs - Ksh 15" },
              { value: "10", label: "1Hr - Ksh 10" }
            ]}
          />
        </div>
        
        <div className="mb-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            {isSubmitting ? "Processing..." : `Pay ${plan} Ksh with M-Pesa`}
          </button>
        </div>
      </form>
      
      {status && (
        <div className={`mt-4 p-3 flex items-center gap-2 rounded text-center`}>
          {getStatusIcon()}
          <p className="font-medium">{status}</p>
          {status === "Confirmed" && (
            <p className="text-sm mt-1">You can now connect to the WiFi network</p>
          )}
        </div>
      )}
      
      {transactionId && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Transaction ID: {transactionId}
        </p>
      )}
    </div>
  );
};

export default PaymentForm;
