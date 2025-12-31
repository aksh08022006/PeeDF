import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import {
  FileText,
  ArrowLeft,
  Clock,
  CheckCircle,
  Truck,
  Package,
  MapPin,
  Phone,
  User,
} from "lucide-react";

interface OrderFile {
  id: number;
  file_key: string;
  original_filename: string;
  page_count: number;
  color_type: string;
  is_double_sided: boolean;
  pages_per_side: number;
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
  expected_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor_name: string | null;
  vendor_phone: string | null;
  files: OrderFile[];
}

export default function OrderDetailsPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchOrder();
      // Auto-refresh order every 10 seconds
      const interval = setInterval(fetchOrder, 10000);
      return () => clearInterval(interval);
    }
  }, [user, id]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch order:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: "pending", label: "Order Placed", icon: Clock },
      { key: "accepted", label: "Accepted", icon: Package },
      { key: "printing", label: "Printing", icon: FileText },
      { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
      { key: "delivered", label: "Delivered", icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex((s) => s.key === order?.status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  if (isPending || loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="backdrop-blur-sm bg-white/70 border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Order #{order.id}
              </h1>
              <img 
                src="https://019b741a-bc4b-7e3e-8f78-c221199765d6.mochausercontent.com/image.png_6332.png" 
                alt="BITS Pilani"
                className="h-10 w-10 object-contain"
              />
            </div>
            <p className="text-xs text-gray-500 ml-14">
              Placed on{" "}
              {new Date(order.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Timeline */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h3>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
                style={{
                  width: `${
                    (statusSteps.filter((s) => s.completed).length / statusSteps.length) *
                    100
                  }%`,
                }}
              />
            </div>

            {/* Status Steps */}
            <div className="relative flex justify-between">
              {statusSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        step.completed
                          ? "bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-600"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          step.completed ? "text-white" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <p
                      className={`text-xs mt-2 text-center max-w-[80px] ${
                        step.completed ? "text-gray-900 font-medium" : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Delivery Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 text-indigo-500 mr-2" />
              Delivery Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Hostel</p>
                <p className="font-medium text-gray-900">{order.delivery_hostel}</p>
              </div>
              <div>
                <p className="text-gray-500">Gate</p>
                <p className="font-medium text-gray-900">{order.delivery_gate}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <p className="font-medium text-gray-900">{order.delivery_phone}</p>
              </div>
              {order.notes && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-gray-500">Notes</p>
                  <p className="font-medium text-gray-900">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 text-indigo-500 mr-2" />
              Vendor Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Shop Name</p>
                <p className="font-medium text-gray-900">
                  {order.vendor_name || "Being assigned..."}
                </p>
              </div>
              {order.vendor_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{order.vendor_phone}</p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ₹{order.total_price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Files ({order.files.length})
          </h3>
          <div className="space-y-3">
            {order.files.map((file) => (
              <div
                key={file.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{file.original_filename}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
                      <span>{file.page_count} pages</span>
                      <span>{file.color_type === "color" ? "Color" : "B&W"}</span>
                      <span>{file.is_double_sided ? "Double-sided" : "Single-sided"}</span>
                      <span>{file.copies} {file.copies === 1 ? "copy" : "copies"}</span>
                    </div>
                    {file.comments && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{file.comments}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
