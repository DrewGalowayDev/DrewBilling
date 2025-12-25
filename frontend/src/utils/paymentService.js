import axios from "./api";

export const initiatePayment = async (phone, amount) => {
  return axios.post("/mpesa/stkpush", { phone, amount });
};

export const checkPaymentStatus = async (transactionId) => {
  return axios.get(`/payments/status/${transactionId}`);
};
