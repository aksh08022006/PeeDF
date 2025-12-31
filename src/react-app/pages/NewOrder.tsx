import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import {
  FileText,
  Upload,
  ChevronRight,
  Trash2,
  MapPin,
  Phone,
} from "lucide-react";

interface FileUpload {
  fileKey: string;
  originalFilename: string;
  size: number;
  estimatedPages: number;
  pageCount: number;
  colorType: "bw" | "color";
  isDoubleSided: boolean;
  pagesPerSide: 1 | 2 | 4;
  copies: number;
  comments: string;
}

const HOSTELS = [
  "Hostel A",
  "Hostel B",
  "Hostel C",
  "Hostel D",
  "Hostel E",
  "Girls Hostel 1",
  "Girls Hostel 2",
  "PG Block",
];

export default function NewOrderPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Delivery details
  const [deliveryHostel, setDeliveryHostel] = useState("");
  const [deliveryGate, setDeliveryGate] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    setUploading(true);

    for (const file of Array.from(selectedFiles)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setFiles((prev) => [
            ...prev,
            {
              fileKey: data.fileKey,
              originalFilename: data.originalFilename,
              size: data.size,
              estimatedPages: data.estimatedPages,
              pageCount: data.estimatedPages,
              colorType: "bw",
              isDoubleSided: false,
              pagesPerSide: 1,
              copies: 1,
              comments: "",
            },
          ]);
        }
      } catch (error) {
        console.error("Upload failed:", error);
        alert("Failed to upload " + file.name);
      }
    }

    setUploading(false);
    e.target.value = "";
  };

  const updateFile = (index: number, updates: Partial<FileUpload>) => {
    setFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, ...updates } : file))
    );
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const calculatePrice = () => {
    // Simplified pricing - would match backend logic
    let total = 0;
    files.forEach((file) => {
      const effectivePages = file.isDoubleSided
        ? Math.ceil(file.pageCount / 2)
        : file.pageCount;
      const pagePrice =
        file.colorType === "color"
          ? file.isDoubleSided
            ? 8
            : 10
          : file.isDoubleSided
          ? 1.5
          : 2;
      total += effectivePages * pagePrice * file.copies;
    });
    total += 20; // delivery fee
    return total;
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("Please upload at least one file");
      return;
    }

    if (!deliveryHostel || !deliveryGate || !deliveryPhone) {
      alert("Please fill in all delivery details");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: files.map((f) => ({
            fileKey: f.fileKey,
            originalFilename: f.originalFilename,
            pageCount: f.pageCount,
            colorType: f.colorType,
            isDoubleSided: f.isDoubleSided,
            pagesPerSide: f.pagesPerSide,
            copies: f.copies,
            comments: f.comments || undefined,
          })),
          deliveryHostel,
          deliveryGate,
          deliveryPhone,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/orders/${data.orderId}`);
      } else {
        alert("Failed to create order");
      }
    } catch (error) {
      console.error("Order creation failed:", error);
      alert("Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending || !user) {
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
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <FileText className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                New Print Order
              </h1>
              <img 
                src="https://019b741a-bc4b-7e3e-8f78-c221199765d6.mochausercontent.com/image.png_6332.png" 
                alt="BITS Pilani"
                className="h-10 w-10 object-contain"
              />
            </div>
            <p className="text-xs text-gray-500 ml-14">
              Step {step} of 2: {step === 1 ? "Upload Files" : "Delivery Details"}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 1 ? (
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed border-indigo-300 hover:border-indigo-500 transition-colors">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="text-center">
                  <Upload className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {uploading ? "Uploading..." : "Upload PDF Files"}
                  </h3>
                  <p className="text-gray-600">
                    Click to browse or drag and drop files here
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Maximum file size: 50MB</p>
                </div>
              </label>
            </div>

            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Uploaded Files ({files.length})
                </h3>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <FileText className="w-6 h-6 text-indigo-500 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {file.originalFilename}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pages
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={file.pageCount}
                          onChange={(e) =>
                            updateFile(index, {
                              pageCount: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color Type
                        </label>
                        <select
                          value={file.colorType}
                          onChange={(e) =>
                            updateFile(index, {
                              colorType: e.target.value as "bw" | "color",
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="bw">Black & White</option>
                          <option value="color">Color</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={file.isDoubleSided}
                            onChange={(e) =>
                              updateFile(index, { isDoubleSided: e.target.checked })
                            }
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Double-sided printing
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Copies
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={file.copies}
                          onChange={(e) =>
                            updateFile(index, {
                              copies: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comments (Optional)
                        </label>
                        <input
                          type="text"
                          value={file.comments}
                          onChange={(e) =>
                            updateFile(index, { comments: e.target.value })
                          }
                          placeholder="Any special instructions..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Continue Button */}
            {files.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 inline-flex items-center space-x-2"
                >
                  <span>Continue to Delivery</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Delivery Details Form */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <MapPin className="w-6 h-6 text-indigo-500 mr-2" />
                Delivery Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hostel *
                  </label>
                  <select
                    value={deliveryHostel}
                    onChange={(e) => setDeliveryHostel(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select hostel</option>
                    {HOSTELS.map((hostel) => (
                      <option key={hostel} value={hostel}>
                        {hostel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gate Number *
                  </label>
                  <input
                    type="text"
                    value={deliveryGate}
                    onChange={(e) => setDeliveryGate(e.target.value)}
                    placeholder="e.g., Gate 1, Main Gate"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special delivery instructions..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Files:</span>
                  <span className="font-medium text-gray-900">{files.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pages:</span>
                  <span className="font-medium text-gray-900">
                    {files.reduce((sum, f) => sum + f.pageCount * f.copies, 0)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total Amount:</span>
                    <span className="text-indigo-600">₹{calculatePrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Files
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
