import React, { useState } from "react";
import {
  UserPlus,
  Save,
  X,
  CheckCircle,
  MapPin,
  HeartPulse,
  Upload,
  Mail,
  Smartphone,
  Scan,
  ListPlus,
  Plus,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { StyledInput, SectionHeader } from "../ui/FormComponents";
import { ManagePackageForm, PackageItem } from "./ManagePackageForm";
import { ConsultationPackagesSection } from "./ConsultationPackagesDropdown";
import { CorePatientDetails } from "./CorePatientDetails";

// Mock Initial Packages
const initialMockPackages: PackageItem[] = [
  {
    id: "pkg1",
    name: "General OPD",
    description: "Standard consultation with general physician.",
    price: "500",
    customFields: [{ id: "c1", label: "Validity", value: "7 Days" }],
  },
  {
    id: "pkg2",
    name: "Specialist Consultation",
    description: "Consultation with senior specialist.",
    price: "800",
    customFields: [{ id: "c2", label: "Includes", value: "BP Check" }],
  },
  {
    id: "pkg3",
    name: "Emergency",
    description: "Priority emergency care.",
    price: "1200",
    customFields: [],
  },
  {
    id: "pkg4",
    name: "Follow-up",
    description: "Routine follow-up within validity period.",
    price: "0",
    customFields: [],
  },
];

export const PatientRegistration: React.FC = () => {
  const initialFormState = {
    salutation: "",
    fullName: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    contactNumber: "",
    registrationType: "",
    doctorAssigned: "",
    uhid: "",
    addressLine1: "",
    addressLine2: "",
    area: "",
    district: "",
    pinCode: "",
    state: "",
    alternateMobile: "",
    email: "",
    abhaId: "",
    bloodGroup: "",
    occupation: "",
    maritalStatus: "",
    patientType: "OPD",
    visitType: "Walk-in",
    paymentMethod: "Cash",
    consultationPackage: "",
    preferredLanguage: "English",
    chronicConditions: [] as string[],
    files: null as FileList | null,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [packages, setPackages] = useState(initialMockPackages);
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(
    null
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [doctorError, setDoctorError] = useState("");

  // ✅ NEW: Dynamic Custom Fields for Patient
  const [patientCustomFields, setPatientCustomFields] = useState<
    { label: string; value: string }[]
  >([]);
  const [newCustomField, setNewCustomField] = useState({
    label: "",
    value: "",
  });

  // Mock Data
  const salutationOptions = ["Mr", "Mrs", "Mr & Mrs", "Master", "Dr", "Ms"];
  const genderOptions = ["Male", "Female", "Other"];
  const registrationTypeOptions = ["New", "Review", "Referral", "Follow-up"];
  const mockDoctorOptions = [
    "Dr. Sarah Wilson",
    "Dr. Michael Chen",
    "Dr. John Doe",
  ];
  const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed"];

  // --- Handlers ---

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDoctorSelect = (doctorName: string) => {
    // Validation Logic
    if (doctorName && !mockDoctorOptions.includes(doctorName)) {
      setDoctorError("Doctor not registered");
      setFormData((prev) => ({ ...prev, doctorAssigned: "" }));
    } else {
      setDoctorError("");
      setFormData((prev) => ({ ...prev, doctorAssigned: doctorName }));
    }
  };

  const handleDOBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    // Enforce age limit logic here as well just in case
    const ageStr = age >= 0 && age <= 120 ? String(age) : "";
    setFormData((prev) => ({ ...prev, dateOfBirth: dob, age: ageStr }));
  };

  // Package Handlers
  const handleManagePackage = (newOrUpdatedPkg: PackageItem) => {
    if (packages.some((pkg) => pkg.id === newOrUpdatedPkg.id)) {
      setPackages((prev) =>
        prev.map((pkg) =>
          pkg.id === newOrUpdatedPkg.id ? newOrUpdatedPkg : pkg
        )
      );
    } else {
      setPackages((prev) => [...prev, newOrUpdatedPkg]);
    }
    setFormData((prev) => ({
      ...prev,
      consultationPackage: newOrUpdatedPkg.name,
    }));
    setShowAddPackageModal(false);
    setEditingPackage(null);
  };

  const handleRemovePackage = (id: string) => {
    if (window.confirm("Remove this package?")) {
      setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
    }
  };

  // Custom Patient Field Handlers
  const addPatientCustomField = () => {
    if (newCustomField.label && newCustomField.value) {
      setPatientCustomFields([...patientCustomFields, newCustomField]);
      setNewCustomField({ label: "", value: "" });
    }
  };

  const removePatientCustomField = (index: number) => {
    setPatientCustomFields(patientCustomFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (
      !formData.fullName ||
      !formData.age ||
      !formData.gender ||
      !formData.contactNumber ||
      !formData.doctorAssigned ||
      !formData.consultationPackage
    ) {
      alert("Please fill all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Build final data object including custom fields
      const finalData = {
        ...formData,
        customFields: patientCustomFields,
        createdAt: Timestamp.now(),
        status: "Waiting",
      };

      const newPatientRef = await addDoc(collection(db, "patients"), finalData);

      // File Upload Logic (Simplified for brevity)
      const fileUrls: string[] = [];
      if (formData.files) {
        const storage = getStorage();
        for (const file of Array.from(formData.files)) {
          const storageRef = ref(
            storage,
            `patients/${newPatientRef.id}/${file.name}`
          );
          const snapshot = await uploadBytes(storageRef, file);
          fileUrls.push(await getDownloadURL(snapshot.ref));
        }
      }

      // Update with UHID
      const generatedUhid = `UHID${newPatientRef.id.slice(0, 8).toUpperCase()}`;
      await updateDoc(newPatientRef, {
        id: newPatientRef.id,
        uhid: generatedUhid,
        fileUrls,
      });

      setFormData((prev) => ({ ...prev, uhid: generatedUhid }));
      setShowSuccess(true);
      setTimeout(() => {
        setFormData(initialFormState);
        setPatientCustomFields([]);
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error(error);
      alert("Error registering patient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    if (window.confirm("Clear form?")) {
      setFormData(initialFormState);
      setPatientCustomFields([]);
    }
  };

  return (
    <div className="bg-[#F8F9FA] flex flex-col min-h-screen p-6">
      <div className="max-w-7xl mx-auto w-full bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <UserPlus className="w-6 h-6 text-[#012e58]" />
            <h1 className="text-2xl font-bold text-[#0B2D4D]">
              Patient Registration
            </h1>
          </div>
          <button
            type="button"
            className="flex items-center space-x-2 px-4 py-2 bg-[#012e58] text-white rounded-lg text-md font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add New</span>
          </button>
        </div>

        {showSuccess && (
          <div className="mb-4 bg-green-100 text-green-900 p-3 rounded-md flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" /> Registration Successful!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <CorePatientDetails
                formData={formData}
                handleChange={handleChange}
                handleDOBChange={handleDOBChange}
                handleDoctorSelect={handleDoctorSelect}
                doctorOptions={mockDoctorOptions}
                salutationOptions={salutationOptions}
                genderOptions={genderOptions}
                registrationTypeOptions={registrationTypeOptions}
                isSubmitting={isSubmitting}
                doctorError={doctorError}
              />

              <ConsultationPackagesSection
                packages={packages}
                value={formData.consultationPackage}
                onChange={(name) =>
                  setFormData({ ...formData, consultationPackage: name })
                }
                disabled={isSubmitting}
                onAddClick={() => {
                  setEditingPackage(null);
                  setShowAddPackageModal(true);
                }}
                onEditClick={(pkg) => {
                  setEditingPackage(pkg);
                  setShowAddPackageModal(true);
                }}
                onRemoveClick={handleRemovePackage}
              />

              {(showAddPackageModal || editingPackage) && (
                <ManagePackageForm
                  packageToEdit={editingPackage}
                  onSave={handleManagePackage}
                  onClose={() => {
                    setShowAddPackageModal(false);
                    setEditingPackage(null);
                  }}
                  disabled={isSubmitting}
                />
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Address Section (Simplified for brevity, copy logic from previous if needed) */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <SectionHeader icon={MapPin} title="Address Details" />
                <div className="space-y-3">
                  <StyledInput
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    placeholder="Address Line 1 *"
                    required
                  />
                  <StyledInput
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="Area *"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <StyledInput
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="District *"
                      required
                    />
                    <StyledInput
                      name="pinCode"
                      value={formData.pinCode}
                      onChange={handleChange}
                      placeholder="PIN *"
                      required
                    />
                  </div>
                  <StyledInput
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State *"
                    required
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <SectionHeader icon={HeartPulse} title="Additional Info" />
                <div className="grid grid-cols-2 gap-3">
                  <StyledInput
                    name="alternateMobile"
                    value={formData.alternateMobile}
                    onChange={handleChange}
                    placeholder="Alt Mobile"
                  />
                  <StyledInput
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                  />
                </div>

                {/* Add More Fields Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowMoreFields(!showMoreFields)}
                    className="flex items-center text-md font-medium text-[#1a4b7a]"
                  >
                    <ListPlus className="w-3 h-3 mr-1" />{" "}
                    {showMoreFields ? "Hide Extra Fields" : "Add Custom Fields"}{" "}
                    <ChevronDown
                      className={`w-3 h-3 ml-1 transition ${
                        showMoreFields ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showMoreFields && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Label (e.g. Height)"
                          className="w-1/2 px-2 py-1 border rounded text-md"
                          value={newCustomField.label}
                          onChange={(e) =>
                            setNewCustomField({
                              ...newCustomField,
                              label: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 170cm)"
                          className="w-1/2 px-2 py-1 border rounded text-md"
                          value={newCustomField.value}
                          onChange={(e) =>
                            setNewCustomField({
                              ...newCustomField,
                              value: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={addPatientCustomField}
                          className="p-1 bg-[#012e58] text-white rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {patientCustomFields.map((field, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-gray-50 p-2 rounded text-md"
                          >
                            <span>
                              <span className="font-bold">{field.label}:</span>{" "}
                              {field.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePatientCustomField(idx)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-4 mt-8 pt-4 border-t bg-white sticky bottom-0 p-4 z-10">
            <button
              type="button"
              onClick={clearForm}
              className="px-5 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#012e58] text-white rounded-lg hover:bg-[#1a4b7a] flex items-center"
            >
              <Save className="w-4 h-4 mr-2" /> Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientRegistration;
