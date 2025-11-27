// src/components/vitals/VitalsAssessment.tsx
import React, {
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  Activity,
  Heart,
  Thermometer,
  Upload,
  Bot,
  Save,
  ArrowLeft,
  AlertCircle,
  Loader,
  X,
  Gauge,
  Waves,
  Droplet,
  Plus,
  Trash2,
} from "lucide-react";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

// --- TYPE DEFINITIONS ---

export interface Patient {
  id: string;
  uhid: string;
  fullName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  chronicConditions?: string[];
}

export interface CustomVital {
  id: string;
  name: string;
  value: string;
  unit: string;
}

export interface VitalsState {
  weight: string;
  height: string;
  bmi: string;
  pulse: string;
  bpSystolic: string;
  bpDiastolic: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  painScore: string;
  gcsE: string;
  gcsV: string;
  gcsM: string;
  map: string;
  riskFlags: {
    diabetes: boolean;
    heartDisease: boolean;
    kidney: boolean;
  };
  customVitals: CustomVital[]; // New field for custom vitals
}

// --- CONSTANTS ---
const INITIAL_VITALS_STATE: VitalsState = {
  weight: "",
  height: "",
  bmi: "",
  pulse: "",
  bpSystolic: "",
  bpDiastolic: "",
  temperature: "",
  spo2: "",
  respiratoryRate: "",
  painScore: "",
  gcsE: "",
  gcsV: "",
  gcsM: "",
  map: "",
  riskFlags: {
    diabetes: false,
    heartDisease: false,
    kidney: false,
  },
  customVitals: [],
};

const ACTIONS = {
  UPDATE_VITAL: "UPDATE_VITAL",
  TOGGLE_RISK_FLAG: "TOGGLE_RISK_FLAG",
  RESET_VITALS: "RESET_VITALS",
  ADD_CUSTOM_VITAL: "ADD_CUSTOM_VITAL",
  REMOVE_CUSTOM_VITAL: "REMOVE_CUSTOM_VITAL",
  UPDATE_CUSTOM_VITAL: "UPDATE_CUSTOM_VITAL",
};

// --- REDUCER FUNCTION ---
function vitalsReducer(
  state: VitalsState,
  action: { type: string; payload: any }
): VitalsState {
  switch (action.type) {
    case ACTIONS.UPDATE_VITAL: {
      const { field, value } = action.payload;
      return { ...state, [field]: value };
    }
    case ACTIONS.TOGGLE_RISK_FLAG: {
      const { flag } = action.payload;
      return {
        ...state,
        riskFlags: {
          ...state.riskFlags,
          [flag]: !state.riskFlags[flag as keyof VitalsState["riskFlags"]],
        },
      };
    }
    case ACTIONS.ADD_CUSTOM_VITAL: {
      const newVital: CustomVital = {
        id: Date.now().toString(),
        name: "",
        value: "",
        unit: "",
      };
      return {
        ...state,
        customVitals: [...state.customVitals, newVital],
      };
    }
    case ACTIONS.REMOVE_CUSTOM_VITAL: {
      const { id } = action.payload;
      return {
        ...state,
        customVitals: state.customVitals.filter((v) => v.id !== id),
      };
    }
    case ACTIONS.UPDATE_CUSTOM_VITAL: {
      const { id, field, value } = action.payload;
      return {
        ...state,
        customVitals: state.customVitals.map((v) =>
          v.id === id ? { ...v, [field]: value } : v
        ),
      };
    }
    case ACTIONS.RESET_VITALS:
      return INITIAL_VITALS_STATE;
    default:
      return state;
  }
}

const isValidNumber = (value: string) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
};

const getVitalCategory = (
  value: number | string,
  critRedLow: number | null,
  warnAmberLow: number | null,
  warnAmberHigh: number | null,
  critRedHigh: number | null
) => {
  const num = parseFloat(String(value));
  if (isNaN(num)) return { color: "text-gray-500", label: "" };

  if (
    (critRedLow !== null && num < critRedLow) ||
    (critRedHigh !== null && num >= critRedHigh)
  ) {
    return { color: "text-red-600", label: "Critical" };
  }

  if (
    warnAmberLow !== null &&
    num >= warnAmberLow &&
    warnAmberHigh !== null &&
    num < warnAmberHigh
  ) {
    return { color: "text-yellow-600", label: "Warning" };
  }

  return { color: "text-green-600", label: "Normal" };
};

interface VitalsAssessmentProps {
  selectedPatient?: Patient | null;
  onBack?: () => void;
  isSubcomponent?: boolean;
}

const O2Alert: React.FC<{ spo2: string }> = ({ spo2 }) => {
  const num = parseFloat(spo2);
  if (isNaN(num) || num >= 92) return null;

  return (
    <div
      className="absolute right-0 top-0 mt-1 mr-1 p-1 bg-red-500 rounded-full"
      title="O₂ required: SpO₂ < 92%"
    >
      <AlertCircle className="w-4 h-4 text-white" />
    </div>
  );
};

const PainScaleSlider: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
}> = ({ value, onChange, error }) => {
  const painEmojis = [
    "😊",
    "🙂",
    "😐",
    "😟",
    "😣",
    "😰",
    "😭",
    "😵",
    "😱",
    "💀",
    "☠️",
  ];
  const painValue = parseInt(value) || 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-md text-gray-500">
        <span>No Pain</span>
        <span>Worst Pain</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="10"
          value={painValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-2 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-md mt-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <span
              key={num}
              className={
                num === painValue ? "font-bold text-[#012e58]" : "text-gray-400"
              }
            >
              {num}
            </span>
          ))}
        </div>
      </div>
      <div className="text-center">
        <span className="text-2xl" title={`Pain Level: ${painValue}/10`}>
          {painEmojis[painValue]}
        </span>
      </div>
      {error && (
        <span className="text-md text-red-600 flex items-center gap-1 font-medium">
          <AlertCircle size={12} />
          {error}
        </span>
      )}
    </div>
  );
};

const GCSDropdown: React.FC<{
  title: string;
  value: string;
  field: keyof Pick<VitalsState, "gcsE" | "gcsV" | "gcsM">;
  options: { value: string; label: string }[];
  onChange: (field: keyof VitalsState, value: string) => void;
  error?: string;
}> = ({ title, value, field, options, onChange, error }) => (
  <div
    className={`bg-white rounded-lg border p-3 transition-all ${
      error ? "border-red-400 shadow-sm shadow-red-100" : "border-gray-200"
    }`}
  >
    <h4 className="font-medium text-[#0B2D4D] mb-2 text-lg">{title}</h4>
    <select
      value={value}
      onChange={(e) => onChange(field, e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58] text-lg"
    >
      <option value="">Select</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.value} - {opt.label}
        </option>
      ))}
    </select>
    {error && (
      <span className="text-md text-red-600 flex items-center gap-1 font-medium mt-1">
        <AlertCircle size={12} />
        {error}
      </span>
    )}
  </div>
);

const GCS_OPTIONS = {
  E: [
    { value: "4", label: "Spontaneous" },
    { value: "3", label: "To Speech" },
    { value: "2", label: "To Pain" },
    { value: "1", label: "None" },
  ],
  V: [
    { value: "5", label: "Oriented" },
    { value: "4", label: "Confused" },
    { value: "3", label: "Inappropriate" },
    { value: "2", label: "Incomprehensible" },
    { value: "1", label: "None" },
  ],
  M: [
    { value: "6", label: "Obeys Commands" },
    { value: "5", label: "Localizes Pain" },
    { value: "4", label: "Withdraws" },
    { value: "3", label: "Flexion" },
    { value: "2", label: "Extension" },
    { value: "1", label: "None" },
  ],
};

export const VitalsAssessment: React.FC<VitalsAssessmentProps> = ({
  selectedPatient,
  onBack,
  isSubcomponent = false,
}) => {
  const [vitals, dispatch] = useReducer(vitalsReducer, INITIAL_VITALS_STATE);
  const [status, setStatus] = useReducer((s: any, a: any) => ({ ...s, ...a }), {
    isSaving: false,
    showSuccess: false,
    errorMessage: "",
    validationErrors: {} as Record<string, string>,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Ref for focusing the diastolic input automatically
  const diastolicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const heightM = parseFloat(vitals.height) / 100;
    const weightKg = parseFloat(vitals.weight);
    const systolic = parseFloat(vitals.bpSystolic);
    const diastolic = parseFloat(vitals.bpDiastolic);
    let newBmi = vitals.bmi;
    let newMap = vitals.map;

    if (heightM > 0 && weightKg > 0) {
      const calculatedBmi = (weightKg / (heightM * heightM)).toFixed(1);
      if (calculatedBmi !== vitals.bmi) {
        newBmi = calculatedBmi;
      }
    } else if (vitals.bmi !== "") {
      newBmi = "";
    }

    if (isValidNumber(vitals.bpSystolic) && isValidNumber(vitals.bpDiastolic)) {
      if (systolic > diastolic) {
        const calculatedMap = (
          diastolic +
          (1 / 3) * (systolic - diastolic)
        ).toFixed(0);
        if (calculatedMap !== vitals.map) {
          newMap = calculatedMap;
        }
      } else if (vitals.map !== "") {
        newMap = "";
      }
    } else if (vitals.map !== "") {
      newMap = "";
    }

    if (newBmi !== vitals.bmi) {
      dispatch({
        type: ACTIONS.UPDATE_VITAL,
        payload: { field: "bmi", value: newBmi },
      });
    }
    if (newMap !== vitals.map) {
      dispatch({
        type: ACTIONS.UPDATE_VITAL,
        payload: { field: "map", value: newMap },
      });
    }
  }, [
    vitals.height,
    vitals.weight,
    vitals.bpSystolic,
    vitals.bpDiastolic,
    vitals.bmi,
    vitals.map,
  ]);

  const getBMICategory = useCallback((bmi: number) => {
    if (bmi < 18.5) return { category: "Underweight", color: "text-blue-600" };
    if (bmi < 25) return { category: "Normal", color: "text-green-600" };
    if (bmi < 30) return { category: "Overweight", color: "text-yellow-600" };
    return { category: "Obese", color: "text-red-600" };
  }, []);

  const bmiCategory = useMemo(() => {
    const bmiValue = parseFloat(vitals.bmi);
    if (!isNaN(bmiValue) && bmiValue > 0) {
      return getBMICategory(bmiValue);
    }
    return null;
  }, [vitals.bmi, getBMICategory]);

  const handleVitalChange = useCallback(
    (field: keyof VitalsState, value: string) => {
      // SPECIAL HANDLING: BP Systolic (Allow "/" for splitting)
      if (field === "bpSystolic" && value.includes("/")) {
        const parts = value.split("/");
        dispatch({
          type: ACTIONS.UPDATE_VITAL,
          payload: {
            field: "bpSystolic",
            value: parts[0].replace(/[^0-9]/g, ""),
          },
        });
        if (parts.length > 1) {
          dispatch({
            type: ACTIONS.UPDATE_VITAL,
            payload: {
              field: "bpDiastolic",
              value: parts[1].replace(/[^0-9]/g, ""),
            },
          });
        }
        // Focus diastolic input
        if (diastolicInputRef.current) {
          diastolicInputRef.current.focus();
        }
        return;
      }

      let sanitizedValue = value;
      if (
        [
          "weight",
          "height",
          "temperature",
          "spo2",
          "pulse",
          "bpSystolic",
          "bpDiastolic",
          "respiratoryRate",
        ].includes(field)
      ) {
        sanitizedValue = value.replace(/[^0-9.]/g, "");
        const parts = sanitizedValue.split(".");
        if (parts.length > 2) {
          sanitizedValue = `${parts[0]}.${parts.slice(1).join("")}`;
        }
      }

      if (["painScore", "gcsE", "gcsV", "gcsM"].includes(field)) {
        sanitizedValue = value.replace(/[^0-9]/g, "");
      }

      dispatch({
        type: ACTIONS.UPDATE_VITAL,
        payload: { field, value: sanitizedValue },
      });
    },
    []
  );

  // --- HANDLERS FOR CUSTOM VITALS ---
  const handleAddCustomVital = () => {
    dispatch({ type: ACTIONS.ADD_CUSTOM_VITAL, payload: {} });
  };

  const handleRemoveCustomVital = (id: string) => {
    dispatch({ type: ACTIONS.REMOVE_CUSTOM_VITAL, payload: { id } });
  };

  const handleUpdateCustomVital = (
    id: string,
    field: keyof CustomVital,
    value: string
  ) => {
    dispatch({
      type: ACTIONS.UPDATE_CUSTOM_VITAL,
      payload: { id, field, value },
    });
  };

  const validateVitals = useCallback(() => {
    const errors: Record<string, string> = {};

    if (
      !isValidNumber(vitals.temperature) ||
      parseFloat(vitals.temperature) < 1
    )
      errors.temperature = "Required";
    if (!isValidNumber(vitals.pulse) || parseFloat(vitals.pulse) < 1)
      errors.pulse = "Required";
    if (
      !isValidNumber(vitals.respiratoryRate) ||
      parseFloat(vitals.respiratoryRate) < 1
    )
      errors.respiratoryRate = "Required";
    if (!isValidNumber(vitals.spo2) || parseFloat(vitals.spo2) < 1)
      errors.spo2 = "Required";
    if (!isValidNumber(vitals.bpSystolic) || parseFloat(vitals.bpSystolic) <= 0)
      errors.bpSystolic = "Required";
    if (
      !isValidNumber(vitals.bpDiastolic) ||
      parseFloat(vitals.bpDiastolic) <= 0
    )
      errors.bpDiastolic = "Required";

    const pulse = parseFloat(vitals.pulse);
    if (vitals.pulse && (pulse < 30 || pulse > 220))
      errors.pulse = "30-220 bpm only";
    const temp = parseFloat(vitals.temperature);
    if (vitals.temperature && (temp < 90 || temp > 108))
      errors.temperature = "90-108 °F only";
    const rr = parseFloat(vitals.respiratoryRate);
    if (vitals.respiratoryRate && (rr < 6 || rr > 60))
      errors.respiratoryRate = "6-60 /min only";
    const spo2 = parseFloat(vitals.spo2);
    if (vitals.spo2 && (spo2 < 50 || spo2 > 100)) errors.spo2 = "50-100 % only";
    const bpsys = parseFloat(vitals.bpSystolic);
    if (vitals.bpSystolic && (bpsys < 70 || bpsys > 260))
      errors.bpSystolic = "70-260 mmHg only";
    const bpdia = parseFloat(vitals.bpDiastolic);
    if (vitals.bpDiastolic && (bpdia < 40 || bpdia > 150))
      errors.bpDiastolic = "40-150 mmHg only";

    const weight = parseFloat(vitals.weight);
    if (vitals.weight && (weight < 1 || weight > 350))
      errors.weight = "1-350 kg only";
    const height = parseFloat(vitals.height);
    if (vitals.height && (height < 30 || height > 250))
      errors.height = "30-250 cm only";

    const painScore = parseFloat(vitals.painScore);
    if (
      vitals.painScore &&
      (painScore < 0 || painScore > 10 || !Number.isInteger(painScore))
    ) {
      errors.painScore = "0-10 integer only";
    }

    const gcsE = parseInt(vitals.gcsE);
    const gcsV = parseInt(vitals.gcsV);
    const gcsM = parseInt(vitals.gcsM);
    if (vitals.gcsE && (gcsE < 1 || gcsE > 4 || !Number.isInteger(gcsE)))
      errors.gcsE = "1-4";
    if (vitals.gcsV && (gcsV < 1 || gcsV > 5 || !Number.isInteger(gcsV)))
      errors.gcsV = "1-5";
    if (vitals.gcsM && (gcsM < 1 || gcsM > 6 || !Number.isInteger(gcsM)))
      errors.gcsM = "1-6";

    if (vitals.gcsE && vitals.gcsV && vitals.gcsM) {
      const total = gcsE + gcsV + gcsM;
      if (total < 3 || total > 15) {
        errors.gcsE = errors.gcsV = errors.gcsM = "Invalid total GCS score";
      }
    }

    setStatus({ validationErrors: errors });
    return Object.keys(errors).length === 0;
  }, [vitals]);

  const handleSaveVitals = async () => {
    if (!selectedPatient) {
      setStatus({ errorMessage: "No patient selected!" });
      return;
    }

    if (!validateVitals()) {
      setStatus({ errorMessage: "Please fix the errors before saving." });
      return;
    }

    setStatus({ errorMessage: "", isSaving: true, showSuccess: false });

    try {
      if (!db) {
        throw new Error("Firebase database is not initialized");
      }

      const vitalsData = {
        patientId: selectedPatient.id,
        patientUhid: selectedPatient.uhid || "",
        patientName: selectedPatient.fullName || "",
        weight: vitals.weight || "",
        height: vitals.height || "",
        bmi: vitals.bmi || "",
        pulse: vitals.pulse || "",
        bpSystolic: vitals.bpSystolic || "",
        bpDiastolic: vitals.bpDiastolic || "",
        temperature: vitals.temperature || "",
        spo2: vitals.spo2 || "",
        respiratoryRate: vitals.respiratoryRate || "",
        painScore: vitals.painScore || "",
        gcsE: vitals.gcsE || "",
        gcsV: vitals.gcsV || "",
        gcsM: vitals.gcsM || "",
        map: vitals.map || "",
        riskFlags: {
          diabetes: vitals.riskFlags.diabetes,
          heartDisease: vitals.riskFlags.heartDisease,
          kidney: vitals.riskFlags.kidney,
        },
        // Include custom vitals in submission
        customVitals: vitals.customVitals,
        recordedAt: Timestamp.now(),
        recordedBy: "Medical Staff",
        status: "completed",
      };

      await addDoc(collection(db, "vitals"), vitalsData);

      setStatus({ showSuccess: true });
      setTimeout(() => setStatus({ showSuccess: false }), 4000);
    } catch (error: any) {
      console.error("Detailed error saving vitals:", error);
      let friendlyMessage = "Failed to save vitals. ";

      if (error.code === "permission-denied") {
        friendlyMessage += "Permission denied. Check Firebase security rules.";
      } else if (error.code === "unavailable") {
        friendlyMessage += "Service temporarily unavailable. Please try again.";
      } else {
        friendlyMessage += `An unexpected error occurred.`;
      }

      setStatus({ errorMessage: friendlyMessage });
    } finally {
      setStatus({ isSaving: false });
    }
  };

  const handleAiAssist = async () => {
    if (!selectedPatient) {
      setAiSummary("Please select a patient first.");
      setIsModalOpen(true);
      return;
    }

    setIsModalOpen(true);
    setIsAiLoading(true);
    setAiSummary("");

    // Updated Prompt to include Custom Vitals
    const customVitalsText =
      vitals.customVitals.length > 0
        ? vitals.customVitals
            .map((v) => `- ${v.name}: ${v.value} ${v.unit}`)
            .join("\n")
        : "None";

    const prompt = `
        Analyze the following patient vitals and provide a brief summary.
        Patient Information:
        - Name: ${selectedPatient.fullName}
        - Age: ${selectedPatient.age}
        - Gender: ${selectedPatient.gender}
        - Chronic Conditions: ${
          selectedPatient.chronicConditions?.join(", ") || "None"
        }

        Standard Vitals:
        - Weight: ${vitals.weight || "N/A"} kg
        - Height: ${vitals.height || "N/A"} cm
        - BMI: ${vitals.bmi || "N/A"}
        - Pulse: ${vitals.pulse || "N/A"} bpm
        - Blood Pressure (SYS/DIA): ${vitals.bpSystolic || "N/A"}/${
      vitals.bpDiastolic || "N/A"
    } mmHg
        - MAP: ${vitals.map || "N/A"} mmHg
        - Temperature: ${vitals.temperature || "N/A"} °F
        - SpO2: ${vitals.spo2 || "N/A"} %
        - Respiratory Rate: ${vitals.respiratoryRate || "N/A"} breaths/min
        - Pain Score: ${vitals.painScore || "N/A"} / 10
        - GCS (E/V/M): ${vitals.gcsE || "N/A"}/${vitals.gcsV || "N/A"}/${
      vitals.gcsM || "N/A"
    }

        Additional Custom Vitals:
        ${customVitalsText}
      `;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ``,
          },
          body: JSON.stringify({
            model: "gpt-5-nano",
            messages: [
              {
                role: "system",
                content:
                  "You are a medical assistant. Analyze the provided patient vitals and generate a concise summary. Highlight any abnormal vitals or red flags.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const content =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Unable to generate summary. Please try again.";
      setAiSummary(content);
    } catch (err) {
      console.error("Error calling OpenAI:", err);
      setAiSummary(
        "Error connecting to AI service. Please check your connection and try again."
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div
      className={
        isSubcomponent ? "p-4" : "p-6 bg-[#F8F9FA] min-h-screen font-sans"
      }
    >
      <div className={isSubcomponent ? "" : "max-w-7xl mx-auto"}>
        {!isSubcomponent && (
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#1a4b7a]" />
                </button>
              )}
              <Activity className="w-8 h-8 text-[#012e58]" />
              <div>
                <h1 className="text-3xl font-bold text-[#0B2D4D]">
                  Vitals & Assessment
                </h1>
                <p className="text-[#1a4b7a]">
                  Record patient vital signs and health metrics
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 text-right">
              <p className="text-lg text-[#1a4b7a]">Current Patient</p>
              <p className="font-semibold text-[#0B2D4D]">
                {selectedPatient?.fullName || "No Patient Selected"}
              </p>
              <p className="text-lg text-[#1a4b7a]">
                {selectedPatient ? (
                  <>
                    {selectedPatient.uhid} • {selectedPatient.age}Y •{" "}
                    {selectedPatient.gender}
                  </>
                ) : (
                  "Please select a patient"
                )}
              </p>
            </div>
          </header>
        )}

        {!isSubcomponent && status.showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800">Vitals saved successfully!</span>
          </div>
        )}
        {!isSubcomponent && status.errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{status.errorMessage}</span>
          </div>
        )}

        {/* Vitals Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
          {/* Row 1 */}
          <VitalCard
            title="Weight"
            value={vitals.weight}
            unit="kg"
            icon={Activity}
            field="weight"
            onChange={handleVitalChange}
            error={status.validationErrors.weight}
            category={getVitalCategory(
              parseFloat(vitals.weight),
              1,
              1,
              351,
              351
            )}
          />
          <VitalCard
            title="Height"
            value={vitals.height}
            unit="cm"
            icon={Activity}
            field="height"
            onChange={handleVitalChange}
            error={status.validationErrors.height}
            category={getVitalCategory(
              parseFloat(vitals.height),
              30,
              30,
              251,
              251
            )}
          />
          <BMIResultCard bmi={vitals.bmi} category={bmiCategory} />

          <VitalCard
            title="Pulse"
            value={vitals.pulse}
            unit="bpm"
            icon={Heart}
            field="pulse"
            onChange={handleVitalChange}
            error={status.validationErrors.pulse}
            category={getVitalCategory(
              parseFloat(vitals.pulse),
              40,
              100,
              120,
              120
            )}
          />
          <VitalCard
            title="Temperature"
            value={vitals.temperature}
            unit="°F"
            icon={Thermometer}
            field="temperature"
            onChange={handleVitalChange}
            error={status.validationErrors.temperature}
            category={getVitalCategory(
              parseFloat(vitals.temperature),
              95,
              100.5,
              102,
              102
            )}
          />

          {/* Row 2 */}
          <BPVitalCard
            systolic={vitals.bpSystolic}
            diastolic={vitals.bpDiastolic}
            onChange={handleVitalChange}
            errors={{
              systolic: status.validationErrors.bpSystolic,
              diastolic: status.validationErrors.bpDiastolic,
            }}
            sysCategory={getVitalCategory(
              parseFloat(vitals.bpSystolic),
              90,
              140,
              160,
              160
            )}
            diaCategory={getVitalCategory(
              parseFloat(vitals.bpDiastolic),
              null,
              90,
              100,
              100
            )}
            diastolicRef={diastolicInputRef}
          />
          <MAPResultCard map={vitals.map} />

          <VitalCard
            title="SPO₂"
            value={vitals.spo2}
            unit="%"
            icon={Activity}
            field="spo2"
            onChange={handleVitalChange}
            error={status.validationErrors.spo2}
            category={getVitalCategory(
              parseFloat(vitals.spo2),
              90,
              90,
              94,
              101
            )}
            customContent={<O2Alert spo2={vitals.spo2} />}
          />
          <VitalCard
            title="Resp. Rate"
            value={vitals.respiratoryRate}
            unit="breaths/min"
            icon={Waves}
            field="respiratoryRate"
            onChange={handleVitalChange}
            error={status.validationErrors.respiratoryRate}
            category={getVitalCategory(
              parseFloat(vitals.respiratoryRate),
              8,
              22,
              30,
              30
            )}
          />
          <PainScoreCard
            value={vitals.painScore}
            onChange={(value) => handleVitalChange("painScore", value)}
            error={status.validationErrors.painScore}
          />
        </div>

        {/* GCS Fields */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#0B2D4D] mb-4 flex items-center space-x-2">
            <Droplet className="w-5 h-5 text-[#012e58]" />
            <span>Glasgow Coma Scale (GCS)</span>
            {vitals.gcsE && vitals.gcsV && vitals.gcsM && (
              <div className="ml-4 flex items-center space-x-2">
                <span className="text-2xl font-bold text-[#1a4b7a]">
                  Total:{" "}
                  {parseInt(vitals.gcsE) +
                    parseInt(vitals.gcsV) +
                    parseInt(vitals.gcsM)}
                </span>
                <span
                  className={`px-2 py-1 text-md font-semibold rounded-full ${
                    parseInt(vitals.gcsE) +
                      parseInt(vitals.gcsV) +
                      parseInt(vitals.gcsM) <=
                    8
                      ? "bg-red-100 text-red-700"
                      : parseInt(vitals.gcsE) +
                          parseInt(vitals.gcsV) +
                          parseInt(vitals.gcsM) <=
                        12
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {parseInt(vitals.gcsE) +
                    parseInt(vitals.gcsV) +
                    parseInt(vitals.gcsM) <=
                  8
                    ? "Severe"
                    : parseInt(vitals.gcsE) +
                        parseInt(vitals.gcsV) +
                        parseInt(vitals.gcsM) <=
                      12
                    ? "Moderate"
                    : "Mild"}
                </span>
              </div>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GCSDropdown
              title="Eye Opening (E)"
              value={vitals.gcsE}
              field="gcsE"
              options={GCS_OPTIONS.E}
              onChange={handleVitalChange}
              error={status.validationErrors.gcsE}
            />
            <GCSDropdown
              title="Verbal Response (V)"
              value={vitals.gcsV}
              field="gcsV"
              options={GCS_OPTIONS.V}
              onChange={handleVitalChange}
              error={status.validationErrors.gcsV}
            />
            <GCSDropdown
              title="Motor Response (M)"
              value={vitals.gcsM}
              field="gcsM"
              options={GCS_OPTIONS.M}
              onChange={handleVitalChange}
              error={status.validationErrors.gcsM}
            />
          </div>
        </div>

        {/* CUSTOM VITALS SECTION */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0B2D4D] flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[#012e58]" />
              <span>Additional / Custom Vitals</span>
            </h3>
            <button
              onClick={handleAddCustomVital}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Vital</span>
            </button>
          </div>

          {vitals.customVitals.length === 0 ? (
            <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <p>No custom vitals added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vitals.customVitals.map((vital) => (
                <div
                  key={vital.id}
                  className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Vital Name (e.g. Random Blood Sugar)"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58]"
                      value={vital.name}
                      onChange={(e) =>
                        handleUpdateCustomVital(
                          vital.id,
                          "name",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="text"
                      placeholder="Value"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58]"
                      value={vital.value}
                      onChange={(e) =>
                        handleUpdateCustomVital(
                          vital.id,
                          "value",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      placeholder="Unit"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58]"
                      value={vital.unit}
                      onChange={(e) =>
                        handleUpdateCustomVital(
                          vital.id,
                          "unit",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveCustomVital(vital.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove Vital"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isSubcomponent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-[#0B2D4D] mb-4">
                Risk Assessment Flags
              </h3>
              <div className="space-y-4">
                {Object.entries({
                  diabetes: "Diabetes",
                  heartDisease: "Heart Disease",
                  kidney: "Kidney Disease",
                }).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={
                        vitals.riskFlags[key as keyof typeof vitals.riskFlags]
                      }
                      onChange={() =>
                        dispatch({
                          type: ACTIONS.TOGGLE_RISK_FLAG,
                          payload: { flag: key },
                        })
                      }
                      className="h-4 w-4 text-[#012e58] rounded border-gray-300 focus:ring-[#1a4b7a]"
                    />
                    <span className="text-[#1a4b7a]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col space-y-4">
              <button
                onClick={handleSaveVitals}
                disabled={status.isSaving || !selectedPatient}
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed bg-[#012e58] text-white hover:bg-[#1a4b7a]"
              >
                <Save className="w-5 h-5" />
                <span>{status.isSaving ? "Saving..." : "Save Vitals"}</span>
              </button>
              <div className="flex space-x-4">
                <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload Report</span>
                </button>
                <button
                  onClick={handleAiAssist}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  <span>AI Assist</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isSubcomponent && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
            <button
              onClick={handleSaveVitals}
              disabled={status.isSaving || !selectedPatient}
              className="flex items-center justify-center space-x-2 w-full px-4 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700 shadow-md"
            >
              <Save className="w-5 h-5" />
              <span>
                {status.isSaving
                  ? "Saving Vitals Snapshot..."
                  : "Save Vitals Snapshot"}
              </span>
            </button>
          </div>
        )}
      </div>
      {!isSubcomponent && (
        <AiSummaryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          summary={aiSummary}
          isLoading={isAiLoading}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const VitalCard: React.FC<{
  title: string;
  value: string;
  unit: string;
  icon: React.ComponentType<any>;
  field: keyof Omit<VitalsState, "riskFlags" | "bmi" | "map" | "customVitals">;
  onChange: (
    field: keyof Omit<
      VitalsState,
      "riskFlags" | "bmi" | "map" | "customVitals"
    >,
    value: string
  ) => void;
  error?: string;
  category: { color: string; label: string };
  customContent?: React.ReactNode;
}> = ({
  title,
  value,
  unit,
  icon: Icon,
  field,
  onChange,
  error,
  category,
  customContent,
}) => {
  const getChipStyle = (label: string) => {
    switch (label) {
      case "Critical":
        return "bg-red-100 text-red-700 border border-red-200";
      case "Warning":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "Normal":
        return "bg-green-100 text-green-700 border border-green-200";
      default:
        return "bg-gray-100 text-gray-600 border border-gray-200";
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all relative ${
        error ? "border-red-400 shadow-sm shadow-red-100" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-[#012e58]" />
          <h3 className="font-medium text-[#0B2D4D]">{title}</h3>
        </div>
        {category.label && (
          <span
            className={`px-2 py-0.5 text-md font-semibold rounded-full ${getChipStyle(
              category.label
            )}`}
          >
            {category.label}
          </span>
        )}
      </div>
      {customContent}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-full text-3xl font-bold text-[#0B2D4D] bg-transparent border-0 p-0 focus:ring-0 focus:outline-none"
          placeholder="—"
          autoComplete="off"
        />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg text-gray-500">
          {unit}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2 h-4">
        {error && (
          <span className="text-md text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle size={12} />
            {error}
          </span>
        )}
      </div>
    </div>
  );
};

// New Combined BP Card
const BPVitalCard: React.FC<{
  systolic: string;
  diastolic: string;
  onChange: (field: keyof VitalsState, value: string) => void;
  errors: { systolic?: string; diastolic?: string };
  sysCategory: { color: string; label: string };
  diaCategory: { color: string; label: string };
  diastolicRef?: React.RefObject<HTMLInputElement>; // NEW Prop
}> = ({
  systolic,
  diastolic,
  onChange,
  errors,
  sysCategory,
  diaCategory,
  diastolicRef,
}) => {
  let label = "";
  let colorClass = "bg-gray-100 text-gray-600 border-gray-200";

  if (sysCategory.label === "Critical" || diaCategory.label === "Critical") {
    label = "Critical";
    colorClass = "bg-red-100 text-red-700 border-red-200";
  } else if (
    sysCategory.label === "Warning" ||
    diaCategory.label === "Warning"
  ) {
    label = "Warning";
    colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
  } else if (sysCategory.label === "Normal" && diaCategory.label === "Normal") {
    label = "Normal";
    colorClass = "bg-green-100 text-green-700 border-green-200";
  }

  const hasError = !!errors.systolic || !!errors.diastolic;

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all relative ${
        hasError ? "border-red-400 shadow-sm shadow-red-100" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Heart className="w-5 h-5 text-[#012e58]" />
          <h3 className="font-medium text-[#0B2D4D]">Blood Pressure</h3>
        </div>
        {label && (
          <span
            className={`px-2 py-0.5 text-md font-semibold rounded-full border ${colorClass}`}
          >
            {label}
          </span>
        )}
      </div>

      <div className="flex items-baseline relative">
        <input
          type="text"
          value={systolic}
          onChange={(e) => onChange("bpSystolic", e.target.value)}
          className="w-16 text-3xl font-bold text-[#0B2D4D] bg-transparent border-0 p-0 focus:ring-0 focus:outline-none text-right"
          placeholder="---"
        />
        <span className="text-3xl text-gray-400 font-light mx-1">/</span>
        <input
          ref={diastolicRef} // Attach ref here
          type="text"
          value={diastolic}
          onChange={(e) => onChange("bpDiastolic", e.target.value)}
          className="w-16 text-3xl font-bold text-[#0B2D4D] bg-transparent border-0 p-0 focus:ring-0 focus:outline-none"
          placeholder="---"
        />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg text-gray-500">
          mmHg
        </span>
      </div>

      <div className="flex items-center justify-between mt-2 h-4">
        {hasError && (
          <span className="text-md text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle size={12} />
            {errors.systolic || errors.diastolic}
          </span>
        )}
      </div>
    </div>
  );
};

const PainScoreCard: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
}> = ({ value, onChange, error }) => (
  <div
    className={`bg-white rounded-lg border p-4 transition-all ${
      error ? "border-red-400 shadow-sm shadow-red-100" : "border-gray-200"
    }`}
  >
    <div className="flex items-center space-x-2 mb-3">
      <Waves className="w-5 h-5 text-[#012e58]" />
      <h3 className="font-medium text-[#0B2D4D]">Pain Score</h3>
    </div>
    <PainScaleSlider value={value} onChange={onChange} error={error} />
  </div>
);

const BMIResultCard: React.FC<{
  bmi: string;
  category: { category: string; color: string } | null;
}> = ({ bmi, category }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center space-x-2 mb-3">
      <Activity className="w-5 h-5 text-[#012e58]" />
      <h3 className="font-medium text-[#0B2D4D]">BMI</h3>
    </div>
    <div className="relative">
      <div className="text-3xl font-bold text-[#0B2D4D]">{bmi || "—"}</div>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg text-gray-500">
        kg/m²
      </span>
    </div>
    <div className="flex items-center justify-end mt-2 h-4">
      {category && (
        <span
          className={`text-md font-semibold px-2 py-0.5 rounded-full ${category.color
            .replace("text-", "bg-")
            .replace("-600", "-100")} ${category.color}`}
        >
          {category.category}
        </span>
      )}
    </div>
  </div>
);

const MAPResultCard: React.FC<{ map: string }> = ({ map }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center space-x-2 mb-3">
      <Gauge className="w-5 h-5 text-[#012e58]" />
      <h3 className="font-medium text-[#0B2D4D]">MAP</h3>
    </div>
    <div className="relative">
      <div className="text-3xl font-bold text-[#0B2D4D]">{map || "—"}</div>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg text-gray-500">
        mmHg
      </span>
    </div>
    <div className="flex items-center justify-end mt-2 h-4"></div>
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
        if (line.startsWith("* ")) {
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

const AiSummaryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  isLoading: boolean;
}> = ({ isOpen, onClose, summary, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out scale-95 animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-[#F8F9FA] rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#e0f7fa] rounded-full">
              <Bot className="w-6 h-6 text-[#012e58]" />
            </div>
            <h2 className="text-xl font-bold text-[#0B2D4D]">
              AI-Generated Vitals Analysis
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center">
              <Loader className="w-12 h-12 text-[#012e58] animate-spin mb-4" />
              <p className="text-lg font-semibold text-[#0B2D4D]">
                Analyzing Vitals...
              </p>
              <p className="text-lg text-[#1a4b7a]">
                Please wait while our AI processes the information.
              </p>
            </div>
          ) : (
            <FormattedAiSummary summary={summary} />
          )}
        </div>

        <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-[#F8F9FA] rounded-b-xl">
          <button
            onClick={onClose}
            className="px-5 py-2 text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b7a] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default VitalsAssessment;
