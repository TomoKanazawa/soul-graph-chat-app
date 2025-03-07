import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FiMessageCircle, FiWifi, FiWifiOff } from 'react-icons/fi';

export default function Header() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isHealthy = await api.healthCheck();
        setIsConnected(isHealthy);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    
    // Check connection status every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FiMessageCircle className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight">SoulGraph Chat</h1>
        </div>
        <div className="flex items-center">
          <div className="flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            {isConnected === null ? (
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse mr-2" />
                <span className="text-sm text-white/80">Checking...</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center">
                <FiWifi className="w-4 h-4 text-green-300 mr-2" />
                <span className="text-sm text-white/90">Connected</span>
              </div>
            ) : (
              <div className="flex items-center">
                <FiWifiOff className="w-4 h-4 text-red-300 mr-2" />
                <span className="text-sm text-white/90">Disconnected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 