import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserPlus,
  Users,
  Pill,
  LineChart,
  FlaskConical,
  X,
  Bed,
} from "lucide-react";
import { UserRole } from "../../contexts/AuthContext";
import { useAuth } from "../../contexts/AuthContext";
import HMS_LOGO from "./HMS-bgr.png";

interface SidebarProps {
  activeSection: string;
  isOpen: boolean;
  onClose: () => void;
}

const allNavigationItems = [
  {
    id: "registration",
    label: "Registration",
    icon: UserPlus,
    path: "/registration",
  },
  { id: "queue", label: "OPD", icon: Users, path: "/pre-opd" },
  {
    id: "ipd-queue",
    label: "IPD Queue",
    icon: Bed,
    path: "/ipd-queue",
  },
  {
    id: "lab-requests",
    label: "Lab Requests",
    icon: FlaskConical,
    path: "/lab-requests",
  },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, path: "/pharmacy" },
  { id: "dashboard", label: "Analytics", icon: LineChart, path: "/dashboard" },
];

// ✅ UPDATED: Added "admin" with access to ALL items
const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    "registration",
    "queue",
    "ipd-queue",
    "lab-requests",
    "pharmacy",
    "dashboard",
  ],
  doctor: ["dashboard", "queue", "ipd-queue"],
  pharmacist: ["dashboard", "pharmacy"],
  "staff-nurse": ["dashboard", "queue", "ipd-queue"],
  receptionist: ["dashboard", "registration", "queue"],
  technician: ["dashboard", "lab-requests"],
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  isOpen,
  onClose,
}) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getVisibleItems = () => {
    if (isLoading || !user?.role) {
      return [];
    }
    const allowedItemIds = rolePermissions[user.role];
    return allNavigationItems.filter((item) =>
      allowedItemIds.includes(item.id)
    );
  };

  const visibleItems = getVisibleItems();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 transform flex flex-col 
                    bg-gradient-to-r from-[#012e58] to-[#1a4b7a] text-white shadow-2xl 
                    ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:translate-x-0 lg:w-20"}`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <img src={HMS_LOGO} alt="logo" className={`w-full transition-opacity duration-300 ${!isOpen && 'opacity-0 lg:hidden'}`} />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-white/80 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path || activeSection === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-300 group 
                    ${isOpen ? 'space-x-4' : 'justify-center lg:justify-start'}
                    ${
                      isActive && isOpen
                        ? "bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/20"
                        : isActive && !isOpen
                        ? "bg-white/15 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        isActive
                          ? "bg-white/20 shadow-inner"
                          : "bg-white/5 group-hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`font-medium text-sm transition-opacity duration-300 ${!isOpen && 'lg:opacity-0 lg:w-0 overflow-hidden'}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};