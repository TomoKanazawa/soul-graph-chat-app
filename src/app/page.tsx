'use client';

import Header from '@/components/Header';
import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-background to-background/95">
      <Header />
      <div className="flex-1 overflow-hidden">
        <Chat />
      </div>
    </main>
  );
}
