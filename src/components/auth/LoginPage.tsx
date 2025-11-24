// src/components/auth/LoginPage.tsx

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import HMS_LOGO from "../layout/hms-logo.png";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { UserRole } from "../../contexts/AuthContext"; // Import UserRole for type safety

// Interface for the form data (Role field removed)
interface LoginForm {
  email: string;
  password: string;
}

// Keep role routes defined for navigation, independent of dropdown UI
const roleInfo: { value: UserRole, icon: string, route: string }[] = [
  { value: "doctor", icon: "👨‍⚕️", route: "/pre-opd" },
  { value: "pharmacist", icon: "💊", route: "/pharmacy" },
  { value: "technician", icon: "🔬", route: "/lab-requests" },
  { value: "receptionist", icon: "📋", route: "/registration" },
  { value: "staff-nurse", icon: "👩‍⚕️", route: "/pre-opd" }
];

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof LoginForm]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (loginError) setLoginError("");
  };

  // Removed handleRoleSelect and isDropdownOpen state

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginForm> = {};

    // Role check removed

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setLoginError("");

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      // 1. Firebase Auth Sign In
      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        formData.password
      );

      let userName =
        userCredential.user.displayName ||
        normalizedEmail.split("@")[0] ||
        "User";
      let userRole: UserRole | string = "";

      // 2. Fetch role and name from 'staff' collection (as primary source for all staff)
      const staffQuery = query(collection(db, "staff"), where("email", "==", normalizedEmail));
      let snap = await getDocs(staffQuery);

      if (!snap.empty) {
        // User found in staff collection
        const docData = snap.docs[0].data() as any;
        userName = docData.sName;
        userRole = docData.role;

      } else {
        // 3. Fallback check: Check 'doctors' collection (for existing doctor data not mirrored in staff)
        const doctorQuery = query(collection(db, "doctors"), where("email", "==", normalizedEmail));
        snap = await getDocs(doctorQuery);

        if (!snap.empty) {
          const doctorData = snap.docs[0].data() as any;
          userName = doctorData.doc_name || userName;
          userRole = "doctor"; // Explicitly set role for records in doctors collection
        } else {
          // Final fallback if no user data/role is found
          throw new Error("User role not configured. Please contact administration.");
        }
      }

      // Check if a valid role was found
      if (!userRole || !roleInfo.some(r => r.value === userRole)) {
         throw new Error("User role not recognized or configured correctly.");
      }

      // Store secure cookies
      Cookies.set("userRole", userRole, {
        expires: 7,
        secure: true,
        sameSite: "Strict",
      });

      Cookies.set("userName", userName, {
        expires: 7,
        secure: true,
        sameSite: "Strict",
      });

      // Update global auth context
      setUser({
        id: userCredential.user.uid,
        email: normalizedEmail,
        role: userRole as UserRole,
        name: userName,
      });

      const selectedRole = roleInfo.find((r) => r.value === userRole);

      if (selectedRole) {
        navigate(selectedRole.route, { replace: true });
      } else {
        // Fallback in case of an unmapped role, though checked above
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      let errorMessage = "Login failed. Please try again.";

      if (
        error.code === "auth/invalid-email" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        errorMessage = "Invalid email or password.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message.includes("User role not configured")) {
         errorMessage = "Staff record not found. Please contact administration.";
      }

      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] via-white to-[#e0f2f1] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src={HMS_LOGO}
            alt="Clinexa Hospital"
            className="mx-auto w-40 sm:w-48 md:w-56 lg:w-64 object-contain"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-[#0B2D4D] text-center mb-6">Sign In</h2>
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-lg text-red-600">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* EMAIL FIELD */}
            <div className="space-y-2">
              <label className="block text-lg font-medium text-[#0B2D4D]">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1a4b7a] ${
                    errors.email ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="Enter your email"
                />
              </div>

              {errors.email && (
                <p className="text-lg text-red-600">{errors.email}</p>
              )}
            </div>

            {/* PASSWORD FIELD */}
            <div className="space-y-2">
              <label className="block text-lg font-medium text-[#0B2D4D]">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="current-password"
                  className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-[#1a4b7a] ${
                    errors.password
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="text-lg text-red-600">{errors.password}</p>
              )}
            </div>

            {/* REMEMBER + FORGOT */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-[#012e58]"
                />
                <span className="ml-2 text-lg text-[#1a4b7a]">Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-lg text-[#012e58] hover:text-[#1a4b7a]"
              >
                Forgot password?
              </Link>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#012e58] to-[#1a4b7a] text-white py-3 px-4 rounded-lg shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-lg text-[#1a4b7a]">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#012e58] hover:text-[#1a4b7a] font-medium"
              >
                Sign Up
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-lg text-[#1a4b7a]">
              Need help? Contact{" "}
              <a href="#" className="text-[#012e58] hover:text-[#1a4b7a]">
                IT Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;