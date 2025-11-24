// src/components/layout/Layout.tsx
import React, { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  currentSection: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentSection }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open for desktop view

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Dynamic class controls margin shift for content on desktop
  const contentClass = isSidebarOpen
    ? 'lg:ml-64' // Full width margin when open
    : 'lg:ml-20'; // 🟢 Mini-sidebar width margin when closed

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      <Sidebar
        activeSection={currentSection}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />
      {/* 🟢 Applying dynamic margin to the content container */}
      <div className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${contentClass}`}>
        <Header 
            currentSection={currentSection} 
            onMenuClick={toggleSidebar} 
            isSidebarOpen={isSidebarOpen} 
        />
        <main className="p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};