import React from "react";
import { UserCog, Smartphone, Plus } from "lucide-react";
import { StyledInput, SectionHeader } from "../ui/FormComponents";

interface CorePatientDetailsProps {
  formData: any;
  handleChange: (e: any) => void;
  handleDOBChange: (e: any) => void;
  handleDoctorSelect: (doctorName: string) => void; // Changed to string for simplicity here
  doctorOptions: string[];
  salutationOptions: string[];
  genderOptions: string[];
  registrationTypeOptions: string[];
  isSubmitting: boolean;
  doctorError: string; // New prop for doctor validation error
}

export const CorePatientDetails: React.FC<CorePatientDetailsProps> = ({
  formData,
  handleChange,
  handleDOBChange,
  handleDoctorSelect,
  doctorOptions,
  salutationOptions,
  genderOptions,
  registrationTypeOptions,
  isSubmitting,
  doctorError,
}) => {
  // Local state for doctor input to handle validation on type
  const [docInput, setDocInput] = React.useState(formData.doctorAssigned);

  const handleDocInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDocInput(val);
    // Only update parent if it matches or we want to clear it
    if (val === "") handleDoctorSelect("");
  };

  const attemptAddDoctor = () => {
    if (doctorOptions.includes(docInput)) {
      handleDoctorSelect(docInput);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <SectionHeader icon={UserCog} title="Core Patient Details" />

      {/* Read-Only Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
            Reg Date & Time
          </label>
          <StyledInput
            type="text"
            className="bg-gray-100 cursor-not-allowed text-gray-700 font-medium"
            value={new Date().toLocaleString()}
            readOnly
          />
        </div>
        <div>
          <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
            UHID
          </label>
          <StyledInput
            type="text"
            className="bg-gray-100 cursor-not-allowed text-gray-700 font-medium"
            value={formData.uhid || "Generate UHID (Auto)"}
            readOnly
          />
        </div>
      </div>

      {/* Salutation & Full Name (1/4 and 3/4 ratio) */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-1">
          <StyledInput
            isSelect
            name="salutation"
            value={formData.salutation}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="Title"
          >
            {salutationOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </StyledInput>
        </div>
        <div className="col-span-3">
          <StyledInput
            type="text"
            placeholder="Full Name"
            isRequired={true}
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* DOB | Age | Sex */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
            DOB (Optional)
          </label>
          <StyledInput
            type="date"
            name="dateOfBirth"
            className="pr-2"
            value={formData.dateOfBirth}
            onChange={handleDOBChange}
            disabled={isSubmitting}
            max={new Date().toISOString().split("T")[0]} // Prevent future dates
          />
        </div>
        <div>
          <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
            Age *
          </label>
          <StyledInput
            type="number" // Enforce number type
            placeholder="0-120"
            name="age"
            value={formData.age}
            onChange={(e: any) => {
              // Enforce 0-120 range
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 120) {
                handleChange(e);
              } else if (e.target.value === "") {
                handleChange(e);
              }
            }}
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
            Gender *
          </label>
          <StyledInput
            isSelect
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="Sex"
          >
            {genderOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </StyledInput>
        </div>
      </div>

      {/* Mobile Number */}
      <div className="mt-3">
        <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
          Primary Mobile Number *
        </label>
        <StyledInput
          type="tel"
          placeholder="Enter 10-digit number"
          name="contactNumber"
          icon={Smartphone}
          value={formData.contactNumber}
          onChange={handleChange}
          pattern="[0-9]{10,15}"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Registration Type & Doctor */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
            Type (Optional)
          </label>
          <StyledInput
            isSelect
            name="registrationType"
            value={formData.registrationType}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="Select"
          >
            {registrationTypeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </StyledInput>
        </div>
        <div>
          <label className="text-md font-medium text-[#1a4b7a] mb-1 block">
            Consulting Doctor *
          </label>
          <div className="flex space-x-1">
            <div className="flex-grow relative">
              <input
                type="text"
                list="doctor-list"
                value={docInput}
                onChange={handleDocInputChange}
                placeholder="Search Doctor"
                className={`w-full px-3 py-2.5 border rounded-lg text-md ${
                  doctorError
                    ? "border-red-500"
                    : "border-gray-300 focus:ring-1 focus:ring-[#1a4b7a]"
                }`}
              />
              <datalist id="doctor-list">
                {doctorOptions.map((doc) => (
                  <option key={doc} value={doc} />
                ))}
              </datalist>
            </div>
            <button
              type="button"
              onClick={attemptAddDoctor}
              className="px-3 bg-[#012e58] text-white rounded-lg hover:bg-[#1a4b7a]"
              title="Confirm Doctor"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {doctorError && (
            <p className="text-md text-red-500 mt-1">{doctorError}</p>
          )}
          {/* Show selected doctor confirmation */}
          {formData.doctorAssigned && !doctorError && (
            <p className="text-md text-green-600 mt-1">
              Selected: {formData.doctorAssigned}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
