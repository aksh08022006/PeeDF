import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { FileText, Clock, Truck, Shield } from "lucide-react";

export default function HomePage() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (isPending) {
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
              <p className="text-xs text-gray-500 ml-14">Express Delivery</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/vendor/login")}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Vendor Login
              </button>
              <button
                onClick={redirectToLogin}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
            <Clock className="w-4 h-4 mr-2" />
            Save time during exam season
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Print & Deliver to Your{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Hostel Gate
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Upload your PDFs, configure print settings, and get your documents delivered 
            right to your hostel. Focus on studying, not waiting in line.
          </p>

          <button
            onClick={redirectToLogin}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 inline-flex items-center space-x-2"
          >
            <span>Get Started</span>
            <FileText className="w-5 h-5" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Easy Upload</h3>
            <p className="text-gray-600 leading-relaxed">
              Upload multiple PDFs at once with custom print settings for each document. 
              Color, B&W, single or double-sided.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Quick Turnaround</h3>
            <p className="text-gray-600 leading-relaxed">
              Orders processed rapidly during exam time. Real-time tracking from 
              printing to delivery.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Hostel Delivery</h3>
            <p className="text-gray-600 leading-relaxed">
              Delivered directly to your hostel gate. No need to waste precious 
              study time traveling to print shops.
            </p>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-50 border border-green-200">
            <Shield className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">Secure & Trusted by Students</span>
          </div>
        </div>
      </div>
    </div>
  );
}
