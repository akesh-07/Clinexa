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

  // Dynamic class controls margin shift for content on desktop (lg:ml-64 or lg:ml-0)
  const contentClass = isSidebarOpen
    ? 'lg:ml-64' 
    : 'lg:ml-0'; 

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      <Sidebar
        activeSection={currentSection}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />
      {/* 🟢 Dynamic margin shift applied here */}
      <div className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${contentClass}`}>
        <Header currentSection={currentSection} onMenuClick={toggleSidebar} />
        <main className="p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};