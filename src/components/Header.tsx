import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FiMessageCircle, FiWifi, FiWifiOff, FiMenu, FiX } from 'react-icons/fi';

interface HeaderProps {
  onToggleSidebar: () => void;
  showSidebar: boolean;
}

export default function Header({ onToggleSidebar, showSidebar }: HeaderProps) {
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
          <button 
            onClick={onToggleSidebar}
            className="mr-4 p-1 rounded-md hover:bg-gray-700 transition-colors"
            aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            {showSidebar ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
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
          <a 
            href="https://github.com/yourusername/soulgraph" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition-colors"
          >
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
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
} 