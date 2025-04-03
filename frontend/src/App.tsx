import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

const App: React.FC = () => {
  const [mode, setMode] = useState<'register' | 'recognize'>('recognize');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const capture = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      const blob = await fetch(imageSrc).then(res => res.blob());
      formData.append('file', blob, 'photo.jpg');

      if (mode === 'register') {
        if (!userId) {
          setMessage('Please enter a user ID');
          return;
        }
        formData.append('user_id', userId);
        await axios.post(`${API_URL}/register`, formData);
        setMessage('Face registered successfully!');
      } else {
        const response = await axios.post(`${API_URL}/recognize`, formData);
        setMessage(`Attendance marked for user: ${response.data.user_id}`);
      }
    } catch (error) {
      setMessage('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-primary p-6 text-white">
              <h1 className="text-3xl font-bold text-center">
                Face Recognition Attendance
              </h1>
              <p className="text-center text-primary-100 mt-2">
                {mode === 'register' ? 'Register a new face' : 'Mark your attendance'}
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Mode Toggle */}
              <div className="flex justify-center space-x-4 mb-8">
                <button
                  onClick={() => setMode('register')}
                  className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                    mode === 'register'
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Register Face
                </button>
                <button
                  onClick={() => setMode('recognize')}
                  className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                    mode === 'recognize'
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Mark Attendance
                </button>
              </div>

              {/* User ID Input */}
              {mode === 'register' && (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
              )}

              {/* Webcam */}
              <div className="mb-6 rounded-lg overflow-hidden shadow-lg">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full"
                  videoConstraints={{
                    facingMode: "user"
                  }}
                />
              </div>

              {/* Capture Button */}
              <button
                onClick={capture}
                disabled={loading}
                className={`w-full py-4 px-6 rounded-lg text-white font-bold transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-secondary shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : mode === 'register' ? (
                  'Register Face'
                ) : (
                  'Mark Attendance'
                )}
              </button>

              {/* Message Display */}
              {message && (
                <div className={`mt-6 p-4 rounded-lg ${
                  message.includes('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
