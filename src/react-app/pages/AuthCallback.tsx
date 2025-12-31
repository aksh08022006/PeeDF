import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { AlertCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        
        // Verify email domain
        const response = await fetch("/api/users/me");
        if (response.status === 403) {
          const data = await response.json();
          setError(data.error || "Only BITS Pilani email addresses are allowed");
          return;
        }
        
        navigate("/dashboard");
      } catch (error) {
        console.error("Authentication failed:", error);
        setError("Authentication failed. Please try again.");
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-red-200 shadow-xl">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {error}
          </p>
          <p className="text-sm text-gray-500 text-center mb-6">
            Please sign in with your BITS Pilani email address ending in{" "}
            <span className="font-mono font-semibold">@pilani.bits-pilani.ac.in</span>
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Completing sign in...</p>
      </div>
    </div>
  );
}
