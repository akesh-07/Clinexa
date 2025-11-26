import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  ChevronDown,
  Users,
  Signature,
  FileText,
  Briefcase,
  Phone,
  Scan,
  Camera,
  Upload,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

interface StaffData {
  id: string;
  sid: string;
  sName: string;
  age: string;
  gender: string;
  qualification: string;
  experience: string;
  mobileNumber: string;
  adharNumber: string;
  role: string;
  email: string;
  password: string;
  photo?: File | null;
  degreeCertificate?: File | null;
}

const userRoles = [
  { value: "doctor", label: "Doctor" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "technician", label: "Technician" },
  { value: "receptionist", label: "Receptionist" },
  { value: "staff-nurse", label: "Staff Nurse" },
  { value: "admin", label: "admin" }, // ⬅️ ADDED ADMIN ROLE
];

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const auth = getAuth();

  const [staffData, setStaffData] = useState<StaffData>({
    id: uuidv4(),
    sid: "",
    sName: "",
    age: "",
    gender: "",
    qualification: "",
    experience: "",
    mobileNumber: "",
    adharNumber: "",
    role: "",
    email: "",
    password: "",
    photo: null,
    degreeCertificate: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleStaffInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, files } = e.target;
    if (files) {
      setStaffData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setStaffData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleSelect = (roleValue: string) => {
    setStaffData((prev) => ({ ...prev, role: roleValue }));
    setIsDropdownOpen(false);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      // 1. Create user with email and password using Firebase Auth
      await createUserWithEmailAndPassword(
        auth,
        staffData.email,
        staffData.password
      );

      // 2. If Auth is successful, save staff data to Firestore
      await addDoc(collection(db, "staff"), {
        id: staffData.id,
        sid: staffData.sid,
        sName: staffData.sName,
        age: staffData.age,
        gender: staffData.gender,
        qualification: staffData.qualification,
        experience: staffData.experience,
        mobileNumber: staffData.mobileNumber,
        adharNumber: staffData.adharNumber,
        role: staffData.role,
        email: staffData.email,
        createdAt: Timestamp.now(),
      });
      setSaveSuccess(true);
      // Reset form
      setStaffData({
        id: uuidv4(),
        sid: "",
        sName: "",
        age: "",
        gender: "",
        qualification: "",
        experience: "",
        mobileNumber: "",
        adharNumber: "",
        role: "",
        email: "",
        password: "",
        photo: null,
        degreeCertificate: null,
      });
    } catch (error: any) {
      console.error("Error adding staff:", error);
      let errorMessage = "Failed to add staff. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "The email address is already in use.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRoleLabel =
    userRoles.find((role) => role.value === staffData.role)?.label ||
    "Select Role";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] via-white to-[#e0f2f1] flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#012e58] rounded-full mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#0B2D4D] mb-2">
            Staff Data Collection
          </h1>
          <p className="text-[#1a4b7a]">
            Please enter the details to add a new staff member
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm border border-gray-100">
          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-lg text-green-600">
                Staff member added successfully!
              </p>
            </div>
          )}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-lg text-red-600">{saveError}</p>
            </div>
          )}
          <form onSubmit={handleStaffSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="sName"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Staff Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="sName"
                    name="sName"
                    value={staffData.sName}
                    onChange={handleStaffInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                    placeholder="Enter Staff Name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="age"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Age
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={staffData.age}
                  onChange={handleStaffInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                  placeholder="Age"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="gender"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={staffData.gender}
                  onChange={handleStaffInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200 text-gray-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2 col-span-2">
                <label className="block text-lg font-medium text-[#0B2D4D]">
                  Role
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200 text-gray-500"
                  >
                    <span className="flex items-center gap-2">
                      {selectedRoleLabel}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 animate-fade-in">
                      {userRoles.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => handleRoleSelect(role.value)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#e0f7fa] transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <span className="text-[#0B2D4D]">{role.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="email"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={staffData.email}
                    onChange={handleStaffInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                    placeholder="Enter Staff Email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="password"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={staffData.password}
                    onChange={handleStaffInputChange}
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="qualification"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Qualification
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="qualification"
                    name="qualification"
                    value={staffData.qualification}
                    onChange={handleStaffInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                    placeholder="Enter Qualification"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="experience"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Experience
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="experience"
                    name="experience"
                    value={staffData.experience}
                    onChange={handleStaffInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                    placeholder="Years of Experience"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="mobileNumber"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    id="mobileNumber"
                    name="mobileNumber"
                    value={staffData.mobileNumber}
                    onChange={handleStaffInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                    placeholder="Enter Mobile Number"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="adharNumber"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Aadhar Number
                </label>
                <div className="relative">
                  <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="adharNumber"
                    name="adharNumber"
                    value={staffData.adharNumber}
                    onChange={handleStaffInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent transition-all duration-200"
                    placeholder="Enter Aadhar Number"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="photo"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Photo Upload
                </label>
                <div className="relative border border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    id="photo"
                    name="photo"
                    onChange={handleStaffInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                  />
                  <div className="flex flex-col items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-lg font-medium text-gray-600">
                      Drag & drop your photo or{" "}
                      <span className="text-[#012e58]">browse</span>
                    </p>
                    {staffData.photo && (
                      <p className="mt-1 text-md text-gray-500">
                        {staffData.photo.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label
                  htmlFor="degreeCertificate"
                  className="block text-lg font-medium text-[#0B2D4D]"
                >
                  Degree Certificate Upload
                </label>
                <div className="relative border border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    id="degreeCertificate"
                    name="degreeCertificate"
                    onChange={handleStaffInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-lg font-medium text-gray-600">
                      Drag & drop your certificate or{" "}
                      <span className="text-[#012e58]">browse</span>
                    </p>
                    {staffData.degreeCertificate && (
                      <p className="mt-1 text-md text-gray-500">
                        {staffData.degreeCertificate.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-[#012e58] to-[#1a4b7a] hover:from-[#1a4b7a] hover:to-[#012e58] text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#1a4b7a] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isSaving ? "Adding Staff..." : "Add Staff"}
            </button>

            {/* Added Login link (no logic changes) */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#012e58] hover:text-[#1a4b7a] font-medium transition-colors"
              >
                Go to Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;