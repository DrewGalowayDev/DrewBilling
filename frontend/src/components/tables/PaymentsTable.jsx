import Badge from "../ui/Badge";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const PaymentsTable = ({ payments, loading }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
        <thead>
          <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left">User</th>
            <th className="py-3 px-6 text-left">Amount</th>
            <th className="py-3 px-6 text-left">Status</th>
            <th className="py-3 px-6 text-left">Date</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 text-sm">
          {loading ? (
            <tr>
              <td colSpan="4" className="py-4 text-center">Loading payments...</td>
            </tr>
          ) : payments.length > 0 ? (
            payments.map((payment, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3 px-6">{payment.user}</td>
                <td className="py-3 px-6">${payment.amount}</td>
                <td className="py-3 px-6">
                  <Badge className={statusColors[payment.status] || "bg-gray-100 text-gray-700"}>
                    {payment.status}
                  </Badge>
                </td>
                <td className="py-3 px-6">{new Date(payment.date).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="py-4 text-center">No payments found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentsTable;
