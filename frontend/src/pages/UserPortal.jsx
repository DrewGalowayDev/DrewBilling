import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, Clock, AlertTriangle, WifiIcon, Loader2 } from "lucide-react";
import { API_URL } from "../config/config";
import Skeleton from "../components/ui/Skeleton";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UserPortal = () => {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(30);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [macAddress, setMacAddress] = useState("UNKNOWN_MAC");
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  // Fallback packages (used if API fails)
  const fallbackPackages = [
    { label: "30mins", value: 1, price: "Ksh 1", duration: "Quick Access", speed: "2 Mbps", color: "from-yellow-500 to-orange-600" },
    { label: "1 Hour", value: 10, price: "Ksh 10", duration: "Quick Access", speed: "2 Mbps", color: "from-yellow-500 to-orange-600" },
    { label: "3 Hours", value: 15, price: "Ksh 15", duration: "Short Session", speed: "3 Mbps", color: "from-green-500 to-emerald-600" },
    { label: "6 Hours", value: 20, price: "Ksh 20", duration: "Half Day", speed: "4 Mbps", color: "from-blue-500 to-cyan-600" },
    { label: "12 Hours", value: 25, price: "Ksh 25", duration: "Quick Access", speed: "5 Mbps", color: "from-pink-500 to-orange-600" },
    { label: "24 Hours", value: 30, price: "Ksh 30", duration: "Full Day", speed: "5 Mbps", color: "from-purple-500 to-indigo-600" },
    { label: "2 Days", value: 50, price: "Ksh 50", duration: "Quick Access", speed: "6 Mbps", color: "from-gray-700 to-gray-900" },
    { label: "3 Days", value: 80, price: "Ksh 80", duration: "Quick Access", speed: "6 Mbps", color: "from-purple-500 to-pink-600" },
    { label: "1 week", value: 200, price: "Ksh 200", duration: "Quick Access", speed: "6 Mbps", color: "from-yellow-500 to-green-600" },
    { label: "2 weeks", value: 300, price: "Ksh 300", duration: "Quick Access", speed: "10 Mbps", color: "from-red-500 to-purple-600" },
    { label: "1 month", value: 500, price: "Ksh 500", duration: "Quick Access", speed: "10 Mbps", color: "from-teal-500 to-cyan-600" },
  ];

  useEffect(() => {
    fetchMacAddress();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setPackagesLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/packages/public`);
      
      if (response.data.success && response.data.packages?.length > 0) {
        setPackages(response.data.packages);
        console.log("✅ Packages loaded from API:", response.data.packages.length);
      } else {
        console.log("⚠️ No packages from API, using fallback");
        setPackages(fallbackPackages);
      }
    } catch (error) {
      console.error("❌ Error fetching packages:", error);
      setPackages(fallbackPackages);
    } finally {
      setPackagesLoading(false);
    }
  };

  const fetchMacAddress = async () => {
    try {
        // Get local network interfaces
        const networkRes = await axios.get(`${API_URL}/api/network/get-local-ip`);
        console.log("🔍 Network interfaces:", networkRes.data);
        
        if (networkRes.data.interfaces && networkRes.data.interfaces.length > 0) {
            // Use first available interface with MAC
            const firstInterface = networkRes.data.interfaces.find(i => i.mac);
            if (firstInterface && firstInterface.mac && firstInterface.mac !== "00:00:00:00:00:00") {
                setMacAddress(firstInterface.mac.toUpperCase());
                console.log("✅ MAC detected:", firstInterface.mac);
                return;
            }

            // Try getting MAC via ARP for first IP
            const firstIp = networkRes.data.interfaces[0].ip;
            const macRes = await axios.get(`${API_URL}/api/mac/get-mac?ip=${firstIp}`);
            console.log("📱 MAC via ARP:", macRes.data);
            
            if (macRes.data.mac && macRes.data.mac !== "UNKNOWN_MAC") {
                setMacAddress(macRes.data.mac);
                return;
            }
        }

        toast.warning("Could not detect device MAC. Using default.");
    } catch (error) {
        console.error("❌ Error fetching MAC address:", error);
        toast.warning("Device detection failed. Some features may be limited.");
    }
};

  const formatPhoneNumber = (phone) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If number starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.slice(1);
    }
    
    // If number starts with 7 or 1, add 254
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    }
    
    return cleaned;
};

const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setAmount(pkg.value);
    setShowPaymentModal(true);
    setPhone(""); // Reset phone input
    setStatus(""); // Reset status
};

const handlePayment = async () => {
    // Validate phone number
    if (!phone || phone.length < 10) {
        toast.error("Please enter a valid phone number (10 digits)");
        return;
    }

    setIsLoading(true);
    setStatus("processing");

    const formattedPhone = formatPhoneNumber(phone);

    try {
        const response = await axios.post(`${API_URL}/api/mpesa/pay`, {
            phone: formattedPhone,
            amount: parseInt(amount),
            mac_address: macAddress
        });

        console.log("Payment Response:", response.data);

        if (response.data.success) {
            setTransactionId(response.data.transactionId);
            toast.success("STK Push sent! Check your phone.");
            setStatus("pending");
            checkPaymentStatus(response.data.transactionId);
        } else {
            toast.error(response.data.message || "Payment initiation failed");
            setStatus("failed");
        }
    } catch (error) {
        console.error("Payment Error:", error);
        toast.error(error.response?.data?.message || "Payment failed. Please try again.");
        setStatus("failed");
    } finally {
        setIsLoading(false);
    }
};

const closeModal = () => {
    if (!isLoading) {
        setShowPaymentModal(false);
        setSelectedPackage(null);
        setPhone("");
        setStatus("");
    }
};

// Add this function to check payment status
const checkPaymentStatus = async (transactionId) => {
    try {
        const response = await axios.get(`${API_URL}/api/mpesa/status/${transactionId}`);
        console.log("💳 Payment status check:", response.data);
        
        if (response.data.status === "confirmed") {
            setStatus("confirmed");
            toast.success("Payment confirmed! You now have internet access.");
            setIsLoading(false);
        } else if (response.data.status === "failed") {
            setStatus("failed");
            toast.error("Payment failed!");
            setIsLoading(false);
        } else {
            // If still pending, check again after 5 seconds
            setTimeout(() => checkPaymentStatus(transactionId), 5000);
        }
    } catch (error) {
        console.error("Status check error:", error);
        // Keep checking even if there's an error (might be network issue)
        setTimeout(() => checkPaymentStatus(transactionId), 5000);
    }
};

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-800 to-black p-4">
      <div className="text-center text-white mb-6">
        <h1 className="text-3xl font-bold">Qonnect WiFi</h1>
        <p className="text-lg text-gray-200">Affordable and Reliable</p>
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl backdrop-blur-md bg-white/10 border border-white/20">
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 text-white flex flex-col items-center">
          <div className="bg-white/20 p-3 rounded-full mb-2">
            <WifiIcon className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Qonnect</h2>
          <p className="text-center text-blue-100 mt-1">Connect instantly to high-speed internet</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-white mb-2 text-lg font-semibold">Select Your Package</label>
            
            {packagesLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-2xl p-4 bg-white/20 animate-pulse h-24"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div 
                    key={pkg.id || pkg.value} 
                    className={`rounded-2xl p-4 cursor-pointer transition-all duration-300 border-2 shadow-xl bg-gradient-to-r ${pkg.color} hover:scale-105 hover:shadow-2xl border-transparent`}
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    <div className="flex flex-col items-center p-3 rounded-lg bg-white/10">
                      <div className="font-bold text-white text-lg">{pkg.label}</div>
                      <div className="text-sm text-white/80 font-semibold mt-1">{pkg.price}</div>
                      <div className="text-xs mt-1 text-white/70">{pkg.speed}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={'flex items-center justify-center text-white text-sm mt-4'}>
            <a href="">Copyright @ DrewgalowayDev22</a>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link to="/admin" className="text-white underline">Go to Admin Dashboard</Link>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 rounded-t-2xl text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">Complete Payment</h3>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
              <p className="text-blue-100 text-sm">Enter your phone number to receive payment prompt</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Selected Package Details */}
              <div className={`rounded-xl p-4 bg-gradient-to-r ${selectedPackage.color}`}>
                <div className="text-center text-white">
                  <div className="text-sm opacity-90 mb-1">Selected Package</div>
                  <div className="text-2xl font-bold">{selectedPackage.label}</div>
                  <div className="text-lg font-semibold mt-1">{selectedPackage.price}</div>
                  <div className="text-sm opacity-80 mt-1">{selectedPackage.speed} • {selectedPackage.duration}</div>
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="block text-gray-700 font-medium">Mobile Number (M-Pesa)</label>
                <input
                  type="tel"
                  placeholder="07XXXXXXXX or 01XXXXXXXX"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">Enter the phone number to receive STK push</p>
              </div>

              {/* Payment Status */}
              {status && (
                <div className={`flex items-center justify-center p-3 rounded-lg ${
                  status === "confirmed" ? "bg-green-100 text-green-800" 
                  : status === "pending" ? "bg-yellow-100 text-yellow-800" 
                  : "bg-red-100 text-red-800"
                }`}>
                  {status === "confirmed" && <CheckCircle className="text-green-500 mr-2" />}
                  {status === "pending" && <Clock className="text-yellow-500 mr-2" />}
                  {status === "failed" && <AlertTriangle className="text-red-500 mr-2" />}
                  <span className="font-medium capitalize">Payment Status: {status}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition duration-300"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className={`flex-1 py-3 rounded-xl text-white font-medium transition duration-300 ${
                    isLoading 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:scale-105"
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    "Send Payment Prompt"
                  )}
                </button>
              </div>

              {status === "pending" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 text-center">
                    <strong>Check your phone!</strong> Enter your M-Pesa PIN to complete the payment.
                  </p>
                </div>
              )}

              {status === "confirmed" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 text-center">
                    <strong>Success!</strong> Your internet access is now active. You can close this window.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPortal;
