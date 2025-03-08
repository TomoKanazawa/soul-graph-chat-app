'use client';

import { useState } from 'react';
import Chat from '@/components/Chat';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function Home() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined);

  // Handle creating a new chat
  const handleNewChat = () => {
    setCurrentThreadId(undefined);
  };

  // Handle selecting a thread
  const handleSelectThread = (threadId: string) => {
    setCurrentThreadId(threadId);
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <main className="flex h-screen bg-gray-800 text-white overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar 
          onNewChat={handleNewChat} 
          onSelectThread={handleSelectThread}
          currentThreadId={currentThreadId}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} showSidebar={showSidebar} />
        <Chat threadId={currentThreadId} onThreadCreated={setCurrentThreadId} />
      </div>
    </main>
  );
}
