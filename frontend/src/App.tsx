"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Webcam from "react-webcam"
import axios from "axios"

const API_URL = "http://127.0.0.1:5000"

interface AttendanceRecord {
  userId: string
  timestamp: string
  status: "success" | "failed"
}

const App: React.FC = () => {
  const [mode, setMode] = useState<"register" | "recognize">("recognize")
  const [userId, setUserId] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [webcamReady, setWebcamReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([])
  const [showInstructions, setShowInstructions] = useState(false)
  const webcamRef = useRef<Webcam>(null)

  // Animation classes for elements that appear
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    setFadeIn(true)

    // Simulate fetching recent records
    const mockRecords: AttendanceRecord[] = [
      { userId: "john.doe", timestamp: new Date(Date.now() - 3600000).toLocaleString(), status: "success" },
      { userId: "jane.smith", timestamp: new Date(Date.now() - 7200000).toLocaleString(), status: "success" },
      { userId: "unknown", timestamp: new Date(Date.now() - 10800000).toLocaleString(), status: "failed" },
    ]

    // Stagger the appearance of records
    setTimeout(() => {
      setRecentRecords(mockRecords)
    }, 500)
  }, [])

  const handleWebcamError = (error: string | DOMException) => {
    console.error("Webcam error:", error)
    setWebcamError(typeof error === "string" ? error : "Could not access camera. Please check permissions.")
  }

  const startCapture = () => {
    setCapturedImage(null)
    setMessage("")

    // Start countdown
    setCountdown(3)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval)
          capture()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const capture = async () => {
    if (!webcamRef.current) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) {
      setMessage("Failed to capture image. Please try again.")
      return
    }

    setCapturedImage(imageSrc)
    setShowConfirmation(true)
  }

  const registerFace = async (imageData: string, userId: string) => {
    try {
      const formData = new FormData();
      const blob = await fetch(imageData).then(res => res.blob());
      formData.append('file', blob, 'photo.jpg');
      formData.append('user_id', userId);

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      setMessage('Face registered successfully!');
      return data;
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Registration failed'}`);
      throw error;
    }
  };

  const recognizeFace = async (imageData: string) => {
    try {
      setLoading(true);
      setMessage("");
      
      const formData = new FormData();
      const blob = await fetch(imageData).then(res => res.blob());
      formData.append('file', blob, 'capture.jpg');
  
      const response = await fetch(`${API_URL}/recognize`, {
        method: 'POST',
        body: formData,
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Recognition failed');
      }
  
      setMessage(`Welcome ${data.user_id}! (${data.confidence}% match)`);
      return data;
      
    } catch (error) {
      let errorMessage = "Recognition failed";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error codes from backend
        if (error.message.includes('NO_MATCH')) {
          errorMessage = "No matching face found. Please register first.";
        }
      }
      
      setMessage(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getAttendance = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/attendance/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance');
      }
      return await response.json();
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to fetch attendance'}`);
      throw error;
    }
  };

  const confirmCapture = async () => {
    if (!capturedImage) return;

    setLoading(true);
    setMessage("");
    setShowConfirmation(false);

    try {
      if (mode === "register") {
        if (!userId) {
          setMessage("Please enter a user ID");
          setLoading(false);
          return;
        }
        await registerFace(capturedImage, userId);
      } else {
        await recognizeFace(capturedImage);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setCapturedImage(null);
    }
  };

  const cancelCapture = () => {
    setCapturedImage(null)
    setShowConfirmation(false)
  }

  // SVG icons (since we can't use Lucide with CDN)
  const CameraIconLarge = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
      <circle cx="12" cy="13" r="3"></circle>
    </svg>
  )

  const CameraIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
      <circle cx="12" cy="13" r="3"></circle>
    </svg>
  )

  const UserPlusIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <line x1="19" y1="8" x2="19" y2="14"></line>
      <line x1="16" y1="11" x2="22" y2="11"></line>
    </svg>
  )

  const UserCheckIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <polyline points="16 11 18 13 22 9"></polyline>
    </svg>
  )

  const AlertCircleIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  )

  const CheckCircleIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )

  const LoaderIcon = () => (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
  )

  const InfoIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  )

  const ChevronDownIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-700 py-8 text-gray-800">
      <style>
        {`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
          
          .animate-scale-in {
            animation: scale-in 0.3s ease-out forwards;
          }
        `}
      </style>
      <div
        className={`container mx-auto px-4 transition-all duration-1000 ease-out transform ${fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
        <div className="max-w-4xl mx-auto">
          {/* Main Card */}
          <div className="bg-white bg-opacity-95 backdrop-filter backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white border-opacity-20 transition-all duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white relative overflow-hidden">
              {/* Animated background elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <div className="absolute w-40 h-40 rounded-full bg-white bg-opacity-10 -top-20 -left-20"></div>
                <div className="absolute w-56 h-56 rounded-full bg-white bg-opacity-10 -bottom-32 -right-20"></div>
              </div>

              <div className="relative z-10">
                <h1 className="text-4xl font-bold text-center flex items-center justify-center gap-3 mb-2">
                  <span className="h-10 w-10 animate-pulse">
                    <CameraIconLarge />
                  </span>
                  <span className="bg-clip-text h-12 text-transparent bg-gradient-to-r from-white to-purple-100">
                    Face Recognition
                  </span>
                </h1>
                <p className="text-center text-purple-100 text-xl font-light">
                  {mode === "register" ? "Register a new face" : "Mark your attendance"}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Mode Toggle */}
              <div className="flex justify-center space-x-4 mb-8 transition-all duration-300 transform hover:scale-105">
                <button
                  onClick={() => setMode("register")}
                  className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    mode === "register"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:-translate-y-1 hover:shadow-md"
                  }`}
                >
                  <span className="h-5 w-5">
                    <UserPlusIcon />
                  </span>
                  Register Face
                </button>
                <button
                  onClick={() => setMode("recognize")}
                  className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    mode === "recognize"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:-translate-y-1 hover:shadow-md"
                  }`}
                >
                  <span className="h-5 w-5">
                    <UserCheckIcon />
                  </span>
                  Mark Attendance
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="transition-all duration-500 transform hover:scale-[1.02]">
                  {/* User ID Input */}
                  {mode === "register" && (
                    <div className="mb-6 animate-fade-in">
                      <label className="block text-gray-700 text-sm font-bold mb-2">User ID</label>
                      <input
                        type="text"
                        placeholder="Enter your ID"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                  )}

                  {/* Webcam */}
                  <div className="mb-6 rounded-2xl overflow-hidden shadow-xl relative transition-all duration-300 transform hover:shadow-2xl">
                    {webcamError ? (
                      <div className="bg-red-50 p-8 text-center rounded-2xl border border-red-200 animate-fade-in">
                        <div className="h-16 w-16 text-red-500 mx-auto mb-4 animate-bounce">
                          <AlertCircleIcon />
                        </div>
                        <p className="text-red-700 font-medium">{webcamError}</p>
                        <button
                          onClick={() => setWebcamError(null)}
                          className="mt-6 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : showConfirmation && capturedImage ? (
                      <div className="relative">
                        <img src={capturedImage || "/placeholder.svg"} alt="Captured" className="w-full" />
                        <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-filter backdrop-blur-sm flex items-center justify-center animate-fade-in">
                          <div className="bg-white p-8 rounded-2xl max-w-xs w-full shadow-2xl transform transition-all duration-500 animate-scale-in">
                            <h3 className="font-bold text-xl mb-4 text-gray-800">Confirm Image</h3>
                            <p className="text-gray-600 mb-6">
                              {mode === "register"
                                ? "Use this image to register your face?"
                                : "Use this image to mark your attendance?"}
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={cancelCapture}
                                className="flex-1 px-4 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 font-medium"
                              >
                                Retake
                              </button>
                              <button
                                onClick={confirmCapture}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 font-medium"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="w-full"
                          videoConstraints={{
                            facingMode: "user",
                          }}
                          onUserMedia={() => setWebcamReady(true)}
                          onUserMediaError={handleWebcamError}
                        />

                        {!webcamReady && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-filter backdrop-blur-sm">
                            <div className="flex flex-col items-center">
                              <div className="h-12 w-12 text-purple-400 animate-spin mb-4">
                                <LoaderIcon />
                              </div>
                              <span className="text-white text-lg font-medium">Initializing camera...</span>
                            </div>
                          </div>
                        )}

                        {countdown !== null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-filter backdrop-blur-sm">
                            <div className="text-6xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 h-32 w-32 rounded-full flex items-center justify-center animate-pulse shadow-2xl">
                              {countdown}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Capture Button */}
                  <button
                    onClick={startCapture}
                    disabled={loading || !webcamReady || webcamError !== null || showConfirmation}
                    className={`w-full py-4 px-6 rounded-xl text-white font-bold transition-all duration-300 flex items-center justify-center ${
                      loading || !webcamReady || webcamError !== null || showConfirmation
                        ? "bg-gray-400 cursor-not-allowed opacity-70"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-xl transform hover:scale-[1.02]"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 mr-3">
                          <LoaderIcon />
                        </div>
                        Processing...
                      </div>
                    ) : mode === "register" ? (
                      <>
                        <span className="h-5 w-5 mr-2 animate-pulse">
                          <CameraIcon />
                        </span>
                        Register Face
                      </>
                    ) : (
                      <>
                        <span className="h-5 w-5 mr-2 animate-pulse">
                          <CameraIcon />
                        </span>
                        Mark Attendance
                      </>
                    )}
                  </button>

                  {/* Message Display */}
                  {message && (
                    <div
                      className={`mt-6 p-5 rounded-xl flex items-start transform transition-all duration-500 animate-fade-in ${
                        message.includes("Error")
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {message.includes("Error") ? (
                        <span className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5 animate-bounce">
                          <AlertCircleIcon />
                        </span>
                      ) : (
                        <span className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5 animate-bounce">
                          <CheckCircleIcon />
                        </span>
                      )}
                      <span className="text-lg">{message}</span>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-50 rounded-2xl p-6 shadow-lg border border-gray-100 transition-all duration-500 transform hover:shadow-xl">
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                    <span className="bg-gradient-to-r from-purple-600 to-indigo-600 h-8 w-1 rounded-full mr-3"></span>
                    Recent Activity
                  </h2>

                  {recentRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="h-16 w-16 mx-auto mb-4 text-gray-300 animate-pulse">
                        <LoaderIcon />
                      </div>
                      No recent activity to display
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentRecords.map((record, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border transform transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fade-in ${
                            record.status === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                          }`}
                          style={{ animationDelay: `${index * 150}ms` }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-lg">{record.userId}</h3>
                              <p className="text-sm text-gray-500">{record.timestamp}</p>
                            </div>
                            {record.status === "success" ? (
                              <span className="h-6 w-6 text-green-500 animate-pulse">
                                <CheckCircleIcon />
                              </span>
                            ) : (
                              <span className="h-6 w-6 text-red-500 animate-pulse">
                                <AlertCircleIcon />
                              </span>
                            )}
                          </div>
                          <p className="text-sm mt-2 font-medium">
                            {record.status === "success"
                              ? "Successfully marked attendance"
                              : "Failed to recognize face"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-white bg-opacity-95 backdrop-filter backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white border-opacity-20 transition-all duration-500 transform hover:shadow-2xl">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="h-6 w-6 text-purple-600 mr-3">
                  <InfoIcon />
                </span>
                How It Works
              </h2>
              <span
                className={`h-6 w-6 text-gray-500 transition-transform duration-300 transform ${showInstructions ? "rotate-180" : ""}`}
              >
                <ChevronDownIcon />
              </span>
            </div>

            <div
              className={`grid md:grid-cols-2 gap-6 overflow-hidden transition-all duration-500 ${
                showInstructions ? "max-h-96 opacity-100 mt-6" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-3 p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 transition-all duration-500 transform hover:shadow-lg">
                <h3 className="font-medium text-lg flex items-center gap-2 text-purple-700">
                  <span className="h-5 w-5 text-purple-600">
                    <UserPlusIcon />
                  </span>
                  Registration
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li className="transition-all duration-300 hover:translate-x-1">Switch to "Register Face" mode</li>
                  <li className="transition-all duration-300 hover:translate-x-1">Enter your User ID</li>
                  <li className="transition-all duration-300 hover:translate-x-1">Position your face in the camera</li>
                  <li className="transition-all duration-300 hover:translate-x-1">
                    Click "Register Face" and follow the countdown
                  </li>
                  <li className="transition-all duration-300 hover:translate-x-1">Confirm the captured image</li>
                </ol>
              </div>
              <div className="space-y-3 p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 transition-all duration-500 transform hover:shadow-lg">
                <h3 className="font-medium text-lg flex items-center gap-2 text-indigo-700">
                  <span className="h-5 w-5 text-indigo-600">
                    <UserCheckIcon />
                  </span>
                  Attendance
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li className="transition-all duration-300 hover:translate-x-1">Switch to "Mark Attendance" mode</li>
                  <li className="transition-all duration-300 hover:translate-x-1">Position your face in the camera</li>
                  <li className="transition-all duration-300 hover:translate-x-1">
                    Click "Mark Attendance" and follow the countdown
                  </li>
                  <li className="transition-all duration-300 hover:translate-x-1">Confirm the captured image</li>
                  <li className="transition-all duration-300 hover:translate-x-1">
                    Your attendance will be recorded automatically
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-white text-sm opacity-70">
            <p>© {new Date().getFullYear()} Face Recognition Attendance System</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

