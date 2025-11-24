// src/components/layout/Header.tsx
import React, { useState, useEffect } from "react";
import Cookies from "js-cookie"; // Import the Cookies library
import { User, Bell, Settings, LogOut, Menu, X } from "lucide-react"; // 🟢 Import X icon
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  currentSection: string;
  onMenuClick: () => void;
  isSidebarOpen: boolean; // 🟢 Added isSidebarOpen prop
}

export const Header: React.FC<HeaderProps> = ({ currentSection, onMenuClick, isSidebarOpen }) => { 
  const [userName, setUserName] = useState<string | null>(null); 
  const [userRole, setUserRole] = useState<string | null>(null); 
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Use useEffect to read the cookie when the component mounts
  useEffect(() => {
    const nameFromCookie = Cookies.get("userName");
    const roleFromCookie = Cookies.get("userRole"); // Read the userRole cookie

    // 🟢 Set a professional default name if cookie is missing
    if (nameFromCookie) {
      setUserName(nameFromCookie);
    } else {
      setUserName("Staff Member"); 
    }
    
    if (roleFromCookie) {
      setUserRole(roleFromCookie);
    }
  }, []); 

  // Function to format role for display (e.g., "technician" -> "Technician")
  const formatRole = (role: string | null): string => {
    if (!role) return "Role";
    return role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <header className="bg-gradient-to-r from-[#012e58] to-[#1a4b7a] border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        
        {/* 🟢 Toggle Button: Switches between Menu and X icon */}
        <button
          onClick={onMenuClick}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors mr-3" 
        >
          {isSidebarOpen ? (
              <X className="w-6 h-6" /> // Show X when open
          ) : (
              <Menu className="w-6 h-6" /> // Show Menu when closed
          )}
        </button>

        <div className="flex items-center space-x-4 flex-grow">
          <div className="hidden md:block">
            <span className="ml-4 text-lg font-medium text-white capitalize">
              {currentSection.replace(/-/g, ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <button className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* User Display Block */}
          <div className="flex items-center space-x-3 border-l border-white/20 pl-4">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col items-end">
              <p className="text-sm font-medium text-white">
                {userName || "Staff Member"}
              </p>
              <p className="text-xs text-white/70">
                {formatRole(userRole)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};