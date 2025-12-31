import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Clock,
  LogOut,
  RefreshCw
} from "lucide-react";

interface OrderFile {
  id: number;
  file_key: string;
  original_filename: string;
  page_count: number;
  color_type: string;
  is_double_sided: boolean;
  copies: number;
  comments: string | null;
}

interface Order {
  id: number;
  status: string;
  total_price: number;
  delivery_hostel: string;
  delivery_gate: string;
  delivery_phone: string;
  notes: string | null;
  created_at: string;
  user_email: string;
  user_name: string | null;
  files: OrderFile[];
}

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchOrders();
    // Auto-refresh orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/vendor/me");
      if (response.ok) {
        const data = await response.json();
        setVendorInfo(data);
      } else {
        navigate("/vendor/login");
      }
    } catch (error) {
      navigate("/vendor/login");
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/vendor/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    try {
      const response = await fetch(`/api/vendor/orders/${orderId}/accept`, {
        method: "POST",
      });
      
      if (response.ok) {
        fetchOrders();
      } else {
        alert("Failed to accept order");
      }
    } catch (error) {
      alert("Failed to accept order");
    }
  };

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      const response = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        fetchOrders();
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/vendor/logout", { method: "POST" });
      navigate("/vendor/login");
    } catch (error) {
      navigate("/vendor/login");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "accepted":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "printing":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "out_for_delivery":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="backdrop-blur-sm bg-white/70 border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  SUPrint
                </h1>
                <img 
                  src="https://019b741a-bc4b-7e3e-8f78-c221199765d6.mochausercontent.com/image.png_6332.png" 
                  alt="BITS Pilani"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <p className="text-xs text-gray-500 ml-2">Vendor Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              {vendorInfo && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{vendorInfo.shop_name}</p>
                  <p className="text-xs text-gray-500">{vendorInfo.contact_email}</p>
                </div>
              )}
              <button
                onClick={() => fetchOrders()}
                className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                title="Refresh orders"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors inline-flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Incoming Orders ({orders.length})
          </h2>
          <p className="text-gray-600 mt-1">
            Accept and manage print orders from students
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-12 border border-gray-200/50 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders</h3>
            <p className="text-gray-600">
              New orders will appear here automatically
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Order #{order.id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">
                      ₹{order.total_price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Student Info */}
                <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">Student</p>
                    <p className="font-medium text-gray-900">
                      {order.user_name || order.user_email}
                    </p>
                    <p className="text-sm text-gray-600">{order.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Delivery</p>
                    <p className="font-medium text-gray-900">
                      {order.delivery_hostel}, Gate {order.delivery_gate}
                    </p>
                    <p className="text-sm text-gray-600">{order.delivery_phone}</p>
                  </div>
                  {order.notes && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="text-sm text-gray-900">{order.notes}</p>
                    </div>
                  )}
                </div>

                {/* Files */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Files to Print ({order.files.length})
                  </h4>
                  <div className="space-y-2">
                    {order.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <FileText className="w-5 h-5 text-indigo-500" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {file.original_filename}
                            </p>
                            <p className="text-xs text-gray-600">
                              {file.page_count} pages • {file.color_type === "color" ? "Color" : "B&W"} • 
                              {file.is_double_sided ? " Double-sided" : " Single-sided"} • 
                              {file.copies} {file.copies === 1 ? "copy" : "copies"}
                            </p>
                            {file.comments && (
                              <p className="text-xs text-gray-500 italic mt-1">
                                "{file.comments}"
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={`/api/vendor/files/${file.file_key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors inline-flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-sm font-medium">Download</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {order.status === "pending" && (
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all inline-flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Accept Order</span>
                    </button>
                  )}
                  {order.status === "accepted" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "printing")}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all"
                    >
                      Start Printing
                    </button>
                  )}
                  {order.status === "printing" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "out_for_delivery")}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all"
                    >
                      Out for Delivery
                    </button>
                  )}
                  {order.status === "out_for_delivery" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "delivered")}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all"
                    >
                      Mark as Delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
