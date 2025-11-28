// src/components/doctor/DoctorModule.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Stethoscope,
  Pill,
  ArrowLeft,
  Brain,
  CheckCircle,
  Save,
  Eye,
  BookOpen,
  X,
  Plus,
  Trash2,
  Hospital,
  Loader,
  ClipboardList,
  Activity,
  GripHorizontal,
  GripVertical, // Added for Horizontal Resize Handle
} from "lucide-react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  Timestamp,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { Vitals } from "../../types";
import PatientQueue from "../queue/PatientQueue";
import { Patient } from "../../types";
import PrescriptionModule from "../prescription/PrescriptionModule";
import {
  PrescriptionProvider,
  usePrescription,
} from "../../contexts/PrescriptionContext";
import Ai from "./Ai";
import { useAuth } from "../../contexts/AuthContext";
import ConsultationSummaryModal from "./ConsultationSummaryModal";

// --- INTERFACES ---
interface DoctorModuleProps {
  selectedPatient?: Patient | null;
  onBack?: () => void;
  onCompleteConsultation: (patientId: string) => void;
}

interface AdmissionData {
  roomNumber: string;
  wardNumber: string;
  admissionDate: string;
  attendingDoctor: string;
  assignedNurse: string;
  expectedDischargeDate: string;
  reasonForAdmission: string;
  additionalNotes: string;
}

// --- RESIZE HANDLE COMPONENTS ---
const ResizeHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ onMouseDown }) => (
  <div
    onMouseDown={onMouseDown}
    className="w-full flex items-center justify-center cursor-row-resize py-1 hover:bg-gray-100 transition-colors group"
    title="Drag to resize section height"
  >
    <div className="h-1 w-16 bg-gray-300 rounded-full group-hover:bg-[#012e58] transition-colors" />
  </div>
);

const HorizontalResizeHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ onMouseDown }) => (
  <div
    onMouseDown={onMouseDown}
    className="hidden lg:flex w-4 items-center justify-center cursor-col-resize hover:bg-gray-100 transition-colors group z-10"
    title="Drag to resize column width"
  >
    <div className="w-1 h-8 bg-gray-300 rounded-full group-hover:bg-[#012e58] transition-colors" />
  </div>
);

// --- AUTOCOMPLETE INPUT WITH SMALL ADD BUTTON ---
const AutocompleteInput: React.FC<{
  symptomId: number;
  value: string;
  onChange: (symptomId: number, value: string) => void;
  symptomOptions: string[];
  addSymptomOption: (symptom: string) => void;
  placeholder?: string;
}> = ({
  symptomId,
  value,
  onChange,
  symptomOptions,
  addSymptomOption,
  placeholder = "Enter symptom",
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const filteredSymptoms = symptomOptions.filter((s) =>
    s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    onChange(symptomId, newVal);
    setShowDropdown(true);
  };

  const handleSelectSymptom = (symptom: string) => {
    setInputValue(symptom);
    onChange(symptomId, symptom);
    setShowDropdown(false);
  };

  const handleAddSymptom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputValue.trim()) {
      addSymptomOption(inputValue.trim());
      handleSelectSymptom(inputValue.trim());
    }
  };

  const showAddButton =
    inputValue &&
    !symptomOptions.some((s) => s.toLowerCase() === inputValue.toLowerCase());

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          className="p-2 pr-10 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58] transition duration-200 ease-in-out text-[#0B2D4D] placeholder:text-gray-500 text-lg"
          placeholder={placeholder}
        />
        {showAddButton && (
          <button
            type="button"
            onClick={handleAddSymptom}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors flex items-center justify-center shadow-sm border border-green-200"
            title="Add new symptom to database"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      {showDropdown && filteredSymptoms.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredSymptoms.map((symptom, index) => (
            <div
              key={index}
              onClick={() => handleSelectSymptom(symptom)}
              className="px-4 py-2 text-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              {symptom}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper component for section headers
const SectionHeader: React.FC<{ icon: React.ElementType; title: string }> = ({
  icon: Icon,
  title,
}) => (
  <div className="flex items-center space-x-2 mb-3">
    <div className="bg-[#012e58]/10 p-1.5 rounded-md">
      <Icon className="w-4 h-4 text-[#012e58]" />
    </div>
    <h2 className="text-lg font-bold text-[#0B2D4D] tracking-tight">{title}</h2>
  </div>
);

const FormattedAiSummary: React.FC<{ summary: string }> = ({ summary }) => {
  const lines = summary.split("\n").filter((line) => line.trim() !== "");

  return (
    <div className="space-y-4 text-[#1a4b7a]">
      {lines.map((line, index) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <h3 key={index} className="text-lg font-bold text-[#0B2D4D] pt-2">
              {line.slice(2, -2)}
            </h3>
          );
        }
        if (line.startsWith("* ") || line.startsWith("- ")) {
          return (
            <ul key={index} className="list-disc list-inside pl-4">
              <li>{line.slice(2)}</li>
            </ul>
          );
        }
        if (line.includes(":")) {
          const parts = line.split(":");
          const key = parts[0];
          const value = parts.slice(1).join(":");
          return (
            <div key={index} className="flex">
              <span className="font-semibold w-1/3">{key}:</span>
              <span className="w-2/3">{value}</span>
            </div>
          );
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
};

const SummaryCard: React.FC<{
  title: string;
  summary: string;
  isLoading: boolean;
}> = ({ title, summary, isLoading }) => {
  const isAvailable =
    summary &&
    summary.toLowerCase().indexOf("n/a - not generated") === -1 &&
    summary.toLowerCase().indexOf("no pre-opd intake") === -1 &&
    summary.toLowerCase().indexOf("error fetching") === -1;
  const color = title.toLowerCase().includes("clinical") ? "blue" : "purple";

  return (
    <div
      className={`p-4 rounded-lg border shadow-sm h-full ${
        isAvailable
          ? `border-${color}-300 bg-${color}-50`
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <h4 className="text-md font-semibold text-[#0B2D4D] border-b pb-2 mb-2">
        {title}
      </h4>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader className="w-5 h-5 animate-spin text-[#012e58] mr-3" />
          <span className="text-sm text-gray-600">
            Fetching latest summary...
          </span>
        </div>
      ) : isAvailable ? (
        <div className="overflow-y-auto max-h-60 text-sm">
          <FormattedAiSummary summary={summary} />
        </div>
      ) : (
        <p className="text-sm text-gray-500 py-4 text-center">{summary}</p>
      )}
    </div>
  );
};

const InPatientAdmissionModal: React.FC<{
  patient: Patient;
  onClose: () => void;
  onConfirm: (data: AdmissionData) => void;
}> = ({ patient, onClose, onConfirm }) => {
  const [formData, setFormData] = useState<AdmissionData>({
    roomNumber: "",
    wardNumber: "General Ward",
    admissionDate: new Date().toISOString().slice(0, 10),
    attendingDoctor: patient.doctorAssigned || "",
    assignedNurse: "",
    expectedDischargeDate: "",
    reasonForAdmission: "",
    additionalNotes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.roomNumber.trim())
      errors.roomNumber = "Room Number is required.";
    if (!formData.wardNumber) errors.wardNumber = "Ward is required.";
    if (!formData.admissionDate)
      errors.admissionDate = "Admission Date is required.";
    if (!formData.attendingDoctor.trim())
      errors.attendingDoctor = "Attending Doctor is required.";
    if (!formData.assignedNurse.trim())
      errors.assignedNurse = "Assigned Nurse is required.";
    if (!formData.expectedDischargeDate)
      errors.expectedDischargeDate = "Expected Discharge Date is required.";
    if (!formData.reasonForAdmission.trim())
      errors.reasonForAdmission = "Reason for Admission is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage(
        `Patient ${patient.fullName} successfully admitted to Ward ${formData.wardNumber}, Room ${formData.roomNumber}.`
      );
      onConfirm(formData);
    } catch (error) {
      console.error("Error during in-patient admission:", error);
      setSuccessMessage(
        `Admission failed: ${
          error instanceof Error ? error.message : "Network error."
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-md text-lg transition-colors ${
      hasError
        ? "border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:ring-[#012e58] focus:border-[#012e58]"
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b bg-[#012e58]/5">
          <h2 className="text-xl font-bold text-[#0B2D4D]">
            Admit Patient: {patient.fullName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200"
          >
            <X />
          </button>
        </div>

        {successMessage ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-[#0B2D4D]">
              {successMessage}
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-[#012e58] text-white rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Room Number */}
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Room Number *
                </label>
                <input
                  type="text"
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  className={inputStyle(!!formErrors.roomNumber)}
                  placeholder="e.g., 301"
                />
                {formErrors.roomNumber && (
                  <p className="text-red-500 text-md mt-1">
                    {formErrors.roomNumber}
                  </p>
                )}
              </div>

              {/* Ward Number */}
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Ward Number *
                </label>
                <select
                  name="wardNumber"
                  value={formData.wardNumber}
                  onChange={handleChange}
                  className={inputStyle(!!formErrors.wardNumber)}
                >
                  <option value="">Select Ward</option>
                  <option value="General Ward">General Ward</option>
                  <option value="ICU">ICU</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
                {formErrors.wardNumber && (
                  <p className="text-red-500 text-md mt-1">
                    {formErrors.wardNumber}
                  </p>
                )}
              </div>

              {/* Admission Date */}
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Admission Date *
                </label>
                <input
                  type="date"
                  name="admissionDate"
                  value={formData.admissionDate}
                  onChange={handleChange}
                  className={inputStyle(!!formErrors.admissionDate)}
                />
                {formErrors.admissionDate && (
                  <p className="text-red-500 text-md mt-1">
                    {formErrors.admissionDate}
                  </p>
                )}
              </div>

              {/* Attending Doctor */}
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Attending Doctor *
                </label>
                <input
                  type="text"
                  name="attendingDoctor"
                  value={formData.attendingDoctor}
                  onChange={handleChange}
                  className={inputStyle(!!formErrors.attendingDoctor)}
                  placeholder="Doctor Name"
                />
                {formErrors.attendingDoctor && (
                  <p className="text-red-500 text-md mt-1">
                    {formErrors.attendingDoctor}
                  </p>
                )}
              </div>

              {/* Assigned Nurse */}
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Assigned Nurse *
                </label>
                <input
                  type="text"
                  name="assignedNurse"
                  value={formData.assignedNurse}
                  onChange={handleChange}
                  className={inputStyle(!!formErrors.assignedNurse)}
                  placeholder="Nurse Name"
                />
                {formErrors.assignedNurse && (
                  <p className="text-red-500 text-md mt-1">
                    {formErrors.assignedNurse}
                  </p>
                )}
              </div>

              {/* Expected Discharge Date */}
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Expected Discharge Date *
                </label>
                <input
                  type="date"
                  name="expectedDischargeDate"
                  value={formData.expectedDischargeDate}
                  onChange={handleChange}
                  className={inputStyle(!!formErrors.expectedDischargeDate)}
                />
                {formErrors.expectedDischargeDate && (
                  <p className="text-red-500 text-md mt-1">
                    {formErrors.expectedDischargeDate}
                  </p>
                )}
              </div>
            </div>

            {/* Reason for Admission */}
            <div>
              <label className="block text-md font-medium text-gray-700 mb-1">
                Reason for Admission *
              </label>
              <textarea
                name="reasonForAdmission"
                rows={2}
                value={formData.reasonForAdmission}
                onChange={handleChange}
                className={inputStyle(!!formErrors.reasonForAdmission)}
                placeholder="Detailed reason for patient admission"
              ></textarea>
              {formErrors.reasonForAdmission && (
                <p className="text-red-500 text-md mt-1">
                  {formErrors.reasonForAdmission}
                </p>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-md font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                name="additionalNotes"
                rows={3}
                value={formData.additionalNotes}
                onChange={handleChange}
                className={inputStyle(false)}
                placeholder="Any special instructions or observations"
              ></textarea>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {isSubmitting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting ? "Admitting..." : "Confirm Admission"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- Main DoctorModule Component ---
const DoctorModuleContent: React.FC<DoctorModuleProps> = ({
  selectedPatient,
  onBack,
  onCompleteConsultation,
}) => {
  const { medications } = usePrescription();
  const { user } = useAuth();
  const doctorId = user?.id || "UnknownDoctorId";
  const doctorName =
    user?.name || selectedPatient?.doctorAssigned || "Unknown Doctor";
  const patientType = selectedPatient?.patientType || "OPD";

  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [preOpdClinicalSummary, setPreOpdClinicalSummary] = useState("");
  const [preOpdHistorySummary, setPreOpdHistorySummary] = useState("");
  const [isPreOpdLoading, setIsPreOpdLoading] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // --- VERTICAL RESIZE STATE ---
  const [sectionHeights, setSectionHeights] = useState({
    assessment: 500,
    hpi: 400,
    exam: 450,
    ai: 500,
    prescription: 500,
  });

  const draggingRef = useRef<keyof typeof sectionHeights | null>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  // --- HORIZONTAL RESIZE STATE (Exam) ---
  const [examColSplit, setExamColSplit] = useState(50);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const examContainerRef = useRef<HTMLDivElement>(null);
  const draggingHorizontalRef = useRef(false);

  // --- HORIZONTAL RESIZE STATE (Pre-OPD) ---
  const [preOpdColSplit, setPreOpdColSplit] = useState(50);
  const preOpdContainerRef = useRef<HTMLDivElement>(null);
  const draggingPreOpdHorizontalRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- VERTICAL DRAG HANDLERS ---
  const handleMouseDown = (
    section: keyof typeof sectionHeights,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    draggingRef.current = section;
    startYRef.current = e.clientY;
    startHeightRef.current = sectionHeights[section];
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    const newHeight = Math.max(150, startHeightRef.current + deltaY);
    setSectionHeights((prev) => ({
      ...prev,
      [draggingRef.current!]: newHeight,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  // --- HORIZONTAL DRAG HANDLERS (Exam) ---
  const handleHorizontalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingHorizontalRef.current = true;
    document.addEventListener("mousemove", handleHorizontalMouseMove);
    document.addEventListener("mouseup", handleHorizontalMouseUp);
  };

  const handleHorizontalMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingHorizontalRef.current || !examContainerRef.current) return;
    const rect = examContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const widthPercent = (x / rect.width) * 100;
    setExamColSplit(Math.max(20, Math.min(80, widthPercent)));
  }, []);

  const handleHorizontalMouseUp = useCallback(() => {
    draggingHorizontalRef.current = false;
    document.removeEventListener("mousemove", handleHorizontalMouseMove);
    document.removeEventListener("mouseup", handleHorizontalMouseUp);
  }, [handleHorizontalMouseMove]);

  // --- HORIZONTAL DRAG HANDLERS (Pre-OPD) ---
  const handlePreOpdHorizontalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingPreOpdHorizontalRef.current = true;
    document.addEventListener("mousemove", handlePreOpdHorizontalMouseMove);
    document.addEventListener("mouseup", handlePreOpdHorizontalMouseUp);
  };

  const handlePreOpdHorizontalMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingPreOpdHorizontalRef.current || !preOpdContainerRef.current)
      return;
    const rect = preOpdContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const widthPercent = (x / rect.width) * 100;
    setPreOpdColSplit(Math.max(20, Math.min(80, widthPercent)));
  }, []);

  const handlePreOpdHorizontalMouseUp = useCallback(() => {
    draggingPreOpdHorizontalRef.current = false;
    document.removeEventListener("mousemove", handlePreOpdHorizontalMouseMove);
    document.removeEventListener("mouseup", handlePreOpdHorizontalMouseUp);
  }, [handlePreOpdHorizontalMouseMove]);

  const [consultation, setConsultation] = useState({
    symptoms: [{ id: 1, symptom: "", duration: "", factors: "" }],
    duration: "",
    aggravatingFactors: [] as string[],
    generalExamination: [] as string[],
    systemicExamination: [] as string[],
    investigations: [] as string[],
    diagnosis: "",
    notes: "",
  });

  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        const symptomsRef = collection(db, "symptoms");
        const q = query(symptomsRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        const options = querySnapshot.docs.map((doc) => doc.data().name);
        if (options.length > 0) {
          setSymptomOptions(options);
        } else {
          setSymptomOptions([
            "Fever",
            "Cold",
            "Cough",
            "Diarrhea",
            "Vomiting",
            "Headache",
            "Back Pain",
          ]);
        }
      } catch (error) {
        console.error("Error fetching symptoms:", error);
        setSymptomOptions([
          "Fever",
          "Cold",
          "Cough",
          "Diarrhea",
          "Vomiting",
          "Headache",
          "Back Pain",
        ]);
      }
    };
    fetchSymptoms();
  }, []);

  const addSymptomOption = async (symptom: string) => {
    const trimmedSymptom = symptom.trim();
    if (!trimmedSymptom) return;
    if (
      !symptomOptions.some(
        (s) => s.toLowerCase() === trimmedSymptom.toLowerCase()
      )
    ) {
      setSymptomOptions((prev) => [...prev, trimmedSymptom]);
    }
    try {
      const docId = trimmedSymptom.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const symptomRef = doc(db, "symptoms", docId);
      await setDoc(
        symptomRef,
        {
          name: trimmedSymptom,
          searchKey: trimmedSymptom.toLowerCase(),
          category: "Custom",
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error adding symptom to database:", error);
    }
  };

  const handleDiagnosisUpdate = useCallback((diagnosis: string) => {
    setFinalDiagnosis(diagnosis);
  }, []);

  const handleSymptomChange = (
    id: number,
    field: "symptom" | "duration" | "factors",
    value: string
  ) => {
    setConsultation((prev) => ({
      ...prev,
      symptoms: prev.symptoms.map((symptom) =>
        symptom.id === id ? { ...symptom, [field]: value } : symptom
      ),
    }));
  };

  const addSymptomRow = () => {
    setConsultation((prev) => ({
      ...prev,
      symptoms: [
        ...prev.symptoms,
        { id: Date.now(), symptom: "", duration: "", factors: "" },
      ],
    }));
  };

  const removeSymptomRow = (id: number) => {
    setConsultation((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((symptom) => symptom.id !== id),
    }));
  };

  const handleToggleGeneralExam = (finding: string, isChecked: boolean) => {
    setConsultation((prev) => ({
      ...prev,
      generalExamination: isChecked
        ? [...prev.generalExamination, finding]
        : prev.generalExamination.filter((f) => f !== finding),
    }));
  };

  const handleSystemicExamChange = (system: string, value: string) => {
    setConsultation((prev) => {
      const existingIndex = prev.systemicExamination.findIndex((item) =>
        item.startsWith(`${system}:`)
      );
      const newEntry = `${system}: ${value}`;
      const newSystemicExam = [...prev.systemicExamination];
      if (existingIndex > -1) {
        newSystemicExam[existingIndex] = newEntry;
      } else {
        newSystemicExam.push(newEntry);
      }
      return { ...prev, systemicExamination: newSystemicExam };
    });
  };

  const formatBloodPressure = (vitalsData: Vitals | null): string => {
    if (!vitalsData) return "N/A";
    const systolic = vitalsData.bpSystolic || "N/A";
    const diastolic = vitalsData.bpDiastolic || "N/A";
    if (systolic === "N/A" && diastolic === "N/A") return "N/A";
    return `${systolic}/${diastolic}`;
  };

  const getVitalsDisplay = (): {
    label: string;
    value: string;
    unit: string;
  }[] => {
    const standardVitals = [
      {
        label: "BP",
        value: vitals ? formatBloodPressure(vitals) : "N/A",
        unit: "mmHg",
      },
      { label: "PR", value: vitals?.pulse?.toString() || "N/A", unit: "bpm" },
      { label: "SpO₂", value: vitals?.spo2?.toString() || "N/A", unit: "%" },
      { label: "BMI", value: vitals?.bmi?.toString() || "N/A", unit: "" },
      {
        label: "RR",
        value: vitals?.respiratoryRate?.toString() || "N/A",
        unit: "/min",
      },
      { label: "Wt", value: vitals?.weight?.toString() || "N/A", unit: "kg" },
      { label: "Ht", value: vitals?.height?.toString() || "N/A", unit: "cm" },
    ];
    if (vitals?.customVitals && vitals.customVitals.length > 0) {
      const custom = vitals.customVitals.map((v) => ({
        label: v.name,
        value: v.value,
        unit: v.unit,
      }));
      return [...standardVitals, ...custom];
    }
    return standardVitals;
  };

  const inputStyle =
    "p-2 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58] transition duration-200 ease-in-out text-[#0B2D4D] placeholder:text-gray-500 text-lg";

  useEffect(() => {
    if (!selectedPatient?.uhid) {
      setVitals(null);
      return;
    }
    const vitalsQuery = query(
      collection(db, "vitals"),
      where("patientUhid", "==", selectedPatient.uhid)
    );
    const unsubscribe = onSnapshot(vitalsQuery, (snapshot) => {
      if (snapshot.docs.length > 0) {
        const allVitals = snapshot.docs.map((doc) => {
          const data = doc.data() as Vitals;
          const recordedAtDate =
            data.recordedAt && (data.recordedAt as any).toDate
              ? (data.recordedAt as any).toDate()
              : new Date(0);
          return { ...data, recordedAt: recordedAtDate };
        });
        allVitals.sort(
          (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()
        );
        setVitals(allVitals[0]);
      } else {
        setVitals(null);
      }
    });
    return () => unsubscribe();
  }, [selectedPatient]);

  useEffect(() => {
    if (!selectedPatient?.uhid) {
      setPreOpdClinicalSummary("No patient selected.");
      setPreOpdHistorySummary("No patient selected.");
      setIsPreOpdLoading(false);
      return;
    }
    setIsPreOpdLoading(true);
    const intakeQuery = query(
      collection(db, "preOPDIntake"),
      where("patientUhid", "==", selectedPatient.uhid)
    );
    const unsubscribe = onSnapshot(
      intakeQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const docs = snapshot.docs
            .map((d) => d.data() as any)
            .map((d) => ({
              ...d,
              recordedAt:
                d.recordedAt?.toDate?.() ??
                (typeof d.recordedAt === "string"
                  ? new Date(d.recordedAt)
                  : new Date(0)),
            }))
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
          const latest = docs[0];
          setPreOpdClinicalSummary(
            latest?.aiClinicalSummary || "N/A - Not generated in Pre-OPD."
          );
          setPreOpdHistorySummary(
            latest?.aiHistorySummary || "N/A - Not generated in Pre-OPD."
          );
        } else {
          setPreOpdClinicalSummary(
            "No Pre-OPD intake record found for this patient."
          );
          setPreOpdHistorySummary(
            "No Pre-OPD intake record found for this patient."
          );
        }
        setIsPreOpdLoading(false);
      },
      (error) => {
        console.error("Error fetching Pre-OPD Intake:", error);
        setPreOpdClinicalSummary("Error fetching summary data.");
        setPreOpdHistorySummary("Error fetching summary data.");
        setIsPreOpdLoading(false);
      }
    );
    return () => unsubscribe();
  }, [selectedPatient]);

  const handleAddToInPatient = () => {
    if (selectedPatient) {
      setShowAdmissionModal(true);
    }
  };

  const handleConfirmAdmission = (admissionData: AdmissionData) => {
    console.log(
      `IPD Admission Confirmed for ${selectedPatient?.fullName}:`,
      admissionData
    );
    setShowAdmissionModal(false);
  };

  const handleFinalComplete = async () => {
    if (!selectedPatient || !selectedPatient.uhid) return;
    const prescriptionData = {
      patientId: selectedPatient.id,
      uhid: selectedPatient.uhid,
      patientName: selectedPatient.fullName,
      doctorName: doctorName,
      doctorId: doctorId,
      prescriptionDate: Timestamp.now(),
      medications: medications.map((med) => ({
        id: med.id,
        drugName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
        quantity: 0,
        unitPrice: 0.0,
        totalPrice: 0.0,
        dispensed: false,
      })),
      status: "Pending",
      patientType: patientType,
      consultationNotes: consultation.notes,
      finalDiagnosis: finalDiagnosis,
      totalAmount: 0,
    };
    try {
      const prescriptionsRef = collection(db, "prescriptions");
      await addDoc(prescriptionsRef, prescriptionData);
      const patientRef = doc(db, "patients", selectedPatient.id);
      await setDoc(patientRef, { status: "Completed" }, { merge: true });
      setShowSummaryModal(false);
      onCompleteConsultation(selectedPatient.id);
    } catch (error) {
      console.error(
        "Error completing consultation & saving prescription:",
        error
      );
      alert(
        "Failed to save prescription or mark consultation complete. Check console for details."
      );
      setShowSummaryModal(false);
    }
  };

  const handleReviewAndComplete = () => {
    if (!selectedPatient) {
      alert("No patient selected to complete consultation.");
      return;
    }
    if (!finalDiagnosis) {
      alert(
        "Please enter a Final Diagnosis in the AI Assist section before completing the consultation."
      );
      return;
    }
    setShowSummaryModal(true);
  };

  if (!selectedPatient) {
    return <PatientQueue />;
  }

  return (
    <div className="p-2 bg-gray-100 min-h-screen font-sans">
      <div className="w-full bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-[#1a4b7a] hover:text-[#0B2D4D] hover:bg-gray-100 rounded-md transition-colors border border-gray-200 text-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back to Queue</span>
            </button>
          </div>
          <div className="bg-gradient-to-r from-[#012e58]/5 to-[#1a4b7a]/5 rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#012e58] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {selectedPatient.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div>
                <p className="font-bold text-lg text-[#0B2D4D]">
                  {selectedPatient.fullName}
                </p>
                <p className="text-[#1a4b7a] font-medium text-md">
                  {selectedPatient.uhid} • {selectedPatient.age}Y •{" "}
                  {selectedPatient.gender}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- ASSESSMENT & HISTORY SECTION (VERTICAL RESIZABLE) --- */}
        <div
          className="space-y-6 pb-6 border-b border-gray-200 overflow-y-auto"
          style={{ height: sectionHeights.assessment }}
        >
          <h2 className="text-xl font-bold text-[#0B2D4D] tracking-tight flex items-center space-x-2">
            <Stethoscope className="w-6 h-6" />
            <span>Clinical Assessment</span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {/* Vitals Snapshot */}
            <div className="lg:col-span-3 bg-white p-4 rounded-lg border border-gray-200 shadow-md">
              <SectionHeader icon={Activity} title="Current Vitals Snapshot" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {getVitalsDisplay().map((vital) => (
                  <div
                    key={vital.label}
                    className="text-center p-3 bg-gradient-to-b from-gray-50 to-white rounded-md border border-gray-100"
                  >
                    <p className="text-md font-medium text-gray-500 mb-1">
                      {vital.label}
                    </p>
                    <p className="font-bold text-lg text-[#0B2D4D]">
                      {vital.value}
                    </p>
                    {vital.unit && (
                      <p className="text-md text-gray-400 mt-0.5">
                        {vital.unit}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {vitals && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-md text-gray-600">
                    Last recorded:{" "}
                    {vitals.recordedAt && (vitals.recordedAt as any).toDate
                      ? (vitals.recordedAt as any).toDate().toLocaleString()
                      : new Date(vitals.recordedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#0B2D4D] tracking-tight flex items-center space-x-2 mt-2">
                <Brain className="w-6 h-6 text-purple-600" />
                <span>Pre-OPD AI Summary & History</span>
              </h2>
              {/* --- HORIZONTAL RESIZABLE PRE-OPD SECTION --- */}
              <div
                ref={preOpdContainerRef}
                className="flex flex-col lg:flex-row gap-4"
              >
                <div
                  style={{
                    width: isDesktop ? `${preOpdColSplit}%` : "100%",
                  }}
                >
                  <SummaryCard
                    title="Clinical Status (Vitals + Complaints)"
                    summary={preOpdClinicalSummary}
                    isLoading={isPreOpdLoading}
                  />
                </div>

                <HorizontalResizeHandle
                  onMouseDown={handlePreOpdHorizontalMouseDown}
                />

                <div
                  style={{
                    width: isDesktop
                      ? `calc(${100 - preOpdColSplit}% - 1rem)`
                      : "100%",
                  }}
                >
                  <SummaryCard
                    title="Medical History (Records + Checklist)"
                    summary={preOpdHistorySummary}
                    isLoading={isPreOpdLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <ResizeHandle onMouseDown={(e) => handleMouseDown("assessment", e)} />

        {/* --- HPI SECTION (VERTICAL RESIZABLE) --- */}
        <div
          className="bg-white p-4 rounded-lg border border-gray-200 shadow-md overflow-y-auto"
          style={{ height: sectionHeights.hpi }}
        >
          <SectionHeader
            icon={ClipboardList}
            title="History of Present Illness (HPI) & Complaints"
          />
          <div className="overflow-x-auto bg-gray-50 rounded-md border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#012e58] to-[#1a4b7a] text-white">
                  <th className="p-2 text-left font-semibold text-md">
                    Symptom
                  </th>
                  <th className="p-2 text-left font-semibold text-md">
                    Duration
                  </th>
                  <th className="p-2 text-left font-semibold text-md">
                    Aggravating/Relieving Factors
                  </th>
                  <th className="p-2 text-center font-semibold text-md">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {consultation.symptoms.map((symptom) => (
                  <tr key={symptom.id} className="border-t border-gray-200">
                    <td className="p-2">
                      <AutocompleteInput
                        symptomId={symptom.id}
                        value={symptom.symptom}
                        onChange={(id, value) =>
                          handleSymptomChange(id, "symptom", value)
                        }
                        symptomOptions={symptomOptions}
                        addSymptomOption={addSymptomOption}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={symptom.duration}
                        onChange={(e) =>
                          handleSymptomChange(
                            symptom.id,
                            "duration",
                            e.target.value
                          )
                        }
                        className={inputStyle}
                        placeholder="Duration (e.g., 2 days)"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={symptom.factors}
                        onChange={(e) =>
                          handleSymptomChange(
                            symptom.id,
                            "factors",
                            e.target.value
                          )
                        }
                        className={inputStyle}
                        placeholder="Factors that worsen/improve"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeSymptomRow(symptom.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={addSymptomRow}
              className="w-full mt-2 flex items-center justify-center space-x-1.5 p-2 text-md font-medium text-[#012e58] bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <Plus className="w-3 h-3" />
              <span>Add Symptom</span>
            </button>
          </div>
        </div>
        <ResizeHandle onMouseDown={(e) => handleMouseDown("hpi", e)} />

        {/* --- EXAM & NOTES SECTION (VERTICAL & HORIZONTAL RESIZABLE) --- */}
        <div
          ref={examContainerRef}
          className="flex flex-col lg:flex-row gap-4 overflow-y-auto"
          style={{ height: sectionHeights.exam }}
        >
          <div
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-md flex-shrink-0"
            style={{ width: isDesktop ? `${examColSplit}%` : "100%" }}
          >
            <SectionHeader icon={Eye} title="General & Systemic Examination" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="col-span-1">
                <label className="text-md font-medium text-[#1a4b7a] mb-2 block">
                  General Findings
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Pallor", "Icterus", "Cyanosis", "Clubbing", "LAP"].map(
                    (item) => (
                      <label
                        key={item}
                        className="flex items-center space-x-1.5 p-2 bg-gray-50 rounded-md border border-gray-200 hover:bg-[#012e58]/5 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={consultation.generalExamination.includes(
                            item
                          )}
                          onChange={(e) =>
                            handleToggleGeneralExam(item, e.target.checked)
                          }
                          className="rounded border-gray-300 text-[#012e58] focus:ring-[#012e58] focus:ring-2"
                        />
                        <span className="text-md font-medium text-[#0B2D4D]">
                          {item}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>
              <div className="col-span-1 space-y-2">
                {[
                  { label: "CNS", placeholder: "CNS findings" },
                  { label: "RS", placeholder: "Respiratory findings" },
                  { label: "CVS", placeholder: "Cardiovascular findings" },
                  { label: "P/A", placeholder: "Abdomen findings" },
                ].map((system) => {
                  const currentEntry =
                    consultation.systemicExamination.find((item) =>
                      item.startsWith(`${system.label}:`)
                    ) || `${system.label}: `;
                  const currentValue = currentEntry.substring(
                    system.label.length + 2
                  );
                  return (
                    <div key={system.label} className="space-y-1">
                      <label className="text-md font-semibold text-[#1a4b7a] block">
                        {system.label}
                      </label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58] transition duration-200 resize-none text-lg"
                        rows={1}
                        placeholder={system.placeholder}
                        value={currentValue}
                        onChange={(e) =>
                          handleSystemicExamChange(system.label, e.target.value)
                        }
                      ></textarea>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <HorizontalResizeHandle onMouseDown={handleHorizontalMouseDown} />
          <div
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-md flex-grow"
            style={{
              width: isDesktop ? `calc(${100 - examColSplit}% - 1rem)` : "100%",
            }}
          >
            <SectionHeader icon={BookOpen} title="Notes and Diagnosis" />
            <textarea
              rows={4}
              placeholder="Enter final notes, diagnosis, or impression here before running AI analysis..."
              value={consultation.notes}
              onChange={(e) =>
                setConsultation((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b7a] focus:border-transparent text-lg resize-none"
            />
          </div>
        </div>
        <ResizeHandle onMouseDown={(e) => handleMouseDown("exam", e)} />

        {/* --- AI ASSIST SECTION (VERTICAL RESIZABLE) --- */}
        <div
          className="space-y-4 pt-6 pb-6 border-b border-gray-200 overflow-y-auto"
          style={{ height: sectionHeights.ai }}
        >
          <h2 className="text-xl font-bold text-[#0B2D4D] tracking-tight flex items-center space-x-2">
            <Brain className="w-6 h-6" />
            <span>AI Diagnostic & Treatment Assist</span>
          </h2>
          <Ai
            consultation={consultation}
            selectedPatient={selectedPatient}
            vitals={vitals}
            onDiagnosisUpdate={handleDiagnosisUpdate}
          />
        </div>
        <ResizeHandle onMouseDown={(e) => handleMouseDown("ai", e)} />

        {/* --- PRESCRIPTION SECTION (VERTICAL RESIZABLE) --- */}
        <div
          className="space-y-4 pt-6 overflow-y-auto"
          style={{ height: sectionHeights.prescription }}
        >
          <h2 className="text-xl font-bold text-[#0B2D4D] tracking-tight flex items-center space-x-2">
            <Pill className="w-6 h-6" />
            <span>Medication & Advice</span>
          </h2>
          <PrescriptionModule
            selectedPatient={selectedPatient}
            consultation={consultation}
          />
        </div>
        <ResizeHandle onMouseDown={(e) => handleMouseDown("prescription", e)} />

        {/* --- ACTION FOOTER --- */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <button className="group flex items-center px-4 py-2 border border-[#012e58] rounded-md text-[#012e58] bg-white hover:bg-[#012e58] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#012e58] transition-all duration-300 text-lg font-medium">
              <Save className="w-4 h-4 mr-1.5 transition-transform duration-300 group-hover:scale-110" />
              Save Draft
            </button>
            <button
              onClick={handleAddToInPatient}
              className="group flex items-center px-4 py-2 bg-red-500 text-white font-semibold rounded-md shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 text-lg"
            >
              <Hospital className="w-4 h-4 mr-1.5" />
              <span>Add to In-Patient</span>
            </button>
          </div>
          <button
            onClick={handleReviewAndComplete}
            className="group flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all duration-300 text-lg"
          >
            <span>Complete Consultation & Review</span>
            <CheckCircle className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      </div>

      {showAdmissionModal && selectedPatient && (
        <InPatientAdmissionModal
          patient={selectedPatient}
          onClose={() => setShowAdmissionModal(false)}
          onConfirm={handleConfirmAdmission}
        />
      )}

      {selectedPatient && (
        <ConsultationSummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          onFinalComplete={handleFinalComplete}
          patient={selectedPatient}
          medications={medications}
          consultation={{ ...consultation, diagnosis: finalDiagnosis }}
        />
      )}
    </div>
  );
};

export const DoctorModule: React.FC<DoctorModuleProps> = (props) => {
  return (
    <PrescriptionProvider>
      <DoctorModuleContent {...props} />
    </PrescriptionProvider>
  );
};

export default DoctorModule;
