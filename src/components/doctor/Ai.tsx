// src/components/doctor/Ai.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Copy,
  Plus,
  Bot,
  User,
  Brain,
  Loader,
  FlaskConical,
  Trash2,
  X,
} from "lucide-react";
import { Patient, Medication } from "../../types";
import { usePrescription } from "../../contexts/PrescriptionContext";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";

// --- RESIZE HANDLE COMPONENT ---
const HorizontalResizeHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ onMouseDown }) => (
  <div
    onMouseDown={onMouseDown}
    className="hidden lg:flex w-4 items-center justify-center cursor-col-resize hover:bg-gray-100 transition-colors group z-10 self-stretch"
    title="Drag to resize column width"
  >
    <div className="w-1 h-8 bg-gray-300 rounded-full group-hover:bg-[#012e58] transition-colors" />
  </div>
);

interface ConsultationData {
  symptoms: Array<{
    id: number;
    symptom: string;
    duration: string;
    factors: string;
  }>;
  duration: string;
  aggravatingFactors: string[];
  generalExamination: string[];
  systemicExamination: string[];
  investigations: string[];
  diagnosis: string;
  notes: string;
}

interface DiagnosisData {
  aiSuggested: string;
  doctorEntry: string;
}

interface LabInvestigationData {
  aiSuggestion: string;
  doctorEntry: string;
  aiTests: {
    cbc: boolean;
    lft: boolean;
    rft: boolean;
  };
  doctorTests: {
    cbc: boolean;
    lft: boolean;
    rft: boolean;
  };
}

interface MedicalDashboardProps {
  consultation: ConsultationData;
  selectedPatient: Patient;
  vitals: any;
  onDiagnosisUpdate: (diagnosis: string) => void;
}

const MedicalDashboard: React.FC<MedicalDashboardProps> = ({
  consultation,
  selectedPatient,
  vitals,
  onDiagnosisUpdate,
}) => {
  const { addMedications } = usePrescription();
  const currentUser = { staffId: "DOC_987" };

  const [diagnosis, setDiagnosis] = useState<DiagnosisData>({
    aiSuggested: "",
    doctorEntry: "",
  });

  const [labInvestigation, setLabInvestigation] =
    useState<LabInvestigationData>({
      aiSuggestion: "",
      doctorEntry: "",
      aiTests: { cbc: false, lft: false, rft: false },
      doctorTests: { cbc: false, lft: false, rft: false },
    });

  const [isLoading, setIsLoading] = useState(false);
  const [isSendingLab, setIsSendingLab] = useState(false);

  // --- HORIZONTAL RESIZE STATE ---
  const [split, setSplit] = useState(50);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const widthPercent = (x / rect.width) * 100;
    setSplit(Math.max(20, Math.min(80, widthPercent)));
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  // Ref for aborting requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const labResults = ["ECG", "X-RAY", "TCA-troraric", "In-xity coavortiatric"];

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      // No alert here, silent stop
      abortControllerRef.current = null;
    }
  };

  const handleGenerateSuggestions = async () => {
    const OPENAI_API_KEY = ""; // Ensure your key is here or in .env

    if (!OPENAI_API_KEY) {
      alert("Please set your OpenAI API Key.");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setIsLoading(true);

    const systemPrompt = `You are an expert medical AI assistant. Based on the provided patient consultation details, generate a concise and structured JSON object with suggestions for the attending doctor. The JSON object must strictly follow this structure with the following keys:
1. "diagnosis": A string with a likely diagnosis and its corresponding ICD-10 code.
2. "labInvestigationSuggestion": A short descriptive string recommending relevant lab tests.
3. "labTests": A JSON object with boolean flags for: "cbc", "lft", "rft".
4. "medications": An array of JSON objects for prescriptions. Each object must include: "name", "dosage", "frequency", "duration", and "instructions".

Do not include any explanatory text or markdown formatting outside of the JSON object.`;

    const formattedSymptoms = consultation.symptoms
      .filter((s) => s.symptom.trim() !== "")
      .map(
        (s) =>
          `Symptom: ${s.symptom}, Duration: ${s.duration || "N/A"}, Factors: ${
            s.factors || "N/A"
          }`
      )
      .join("; ");

    const userPrompt = `
      Patient Information:
      - Name: ${selectedPatient.fullName}
      - Age: ${selectedPatient.age}
      - Gender: ${selectedPatient.gender}
      - Chronic Conditions: ${
        selectedPatient.chronicConditions?.join(", ") || "None"
      }

      Consultation Details:
      - Symptoms: ${formattedSymptoms || "Not specified"}
      - General Examination: ${
        consultation.generalExamination?.join(", ") || "Not specified"
      }
      - Systemic Examination: ${
        consultation.systemicExamination?.join(", ") || "Not specified"
      }
    `;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-5-nano",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
          signal,
        }
      );

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();

      if (content) {
        try {
          const aiResponse = JSON.parse(content);

          if (aiResponse.diagnosis) {
            setDiagnosis((prev) => ({
              ...prev,
              aiSuggested: aiResponse.diagnosis,
            }));
          }

          if (aiResponse.labInvestigationSuggestion || aiResponse.labTests) {
            setLabInvestigation((prev) => ({
              ...prev,
              aiSuggestion:
                aiResponse.labInvestigationSuggestion || prev.aiSuggestion,
              aiTests: {
                cbc: aiResponse.labTests?.cbc ?? false,
                lft: aiResponse.labTests?.lft ?? false,
                rft: aiResponse.labTests?.rft ?? false,
              },
            }));
          }

          if (
            Array.isArray(aiResponse.medications) &&
            aiResponse.medications.length > 0
          ) {
            const medicationsToCopy: Omit<Medication, "id">[] =
              aiResponse.medications.map((med: any) => ({
                name: med.name || "",
                dosage: med.dosage || "",
                frequency: med.frequency || "",
                duration: med.duration || "",
                instructions: med.instructions || "",
                source: "ai", // <--- CRITICAL: Marks these as AI generated
              }));
            addMedications(medicationsToCopy);
            console.log("AI prescription suggestions automatically added.");
          }
        } catch (e) {
          console.error("Failed to parse AI response JSON", e);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error calling OpenAI API:", err);
        alert("Failed to connect to the AI service.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const copyToField = (
    aiValue: string,
    field: "diagnosis" | "labInvestigation"
  ) => {
    if (field === "diagnosis") {
      setDiagnosis((prev) => ({ ...prev, doctorEntry: aiValue }));
      onDiagnosisUpdate(aiValue);
    } else if (field === "labInvestigation") {
      setLabInvestigation((prev) => ({ ...prev, doctorEntry: aiValue }));
    }
  };

  const copyAiTests = () => {
    setLabInvestigation((prev) => ({
      ...prev,
      doctorTests: { ...prev.aiTests },
    }));
  };

  const handleTestChange = (test: "cbc" | "lft" | "rft") => {
    setLabInvestigation((prev) => ({
      ...prev,
      doctorTests: { ...prev.doctorTests, [test]: !prev.doctorTests[test] },
    }));
  };

  const handleDiagnosisChange = (value: string) => {
    setDiagnosis((prev) => ({ ...prev, doctorEntry: value }));
    onDiagnosisUpdate(value);
  };

  const handleLabInvestigationChange = (value: string) => {
    setLabInvestigation((prev) => ({ ...prev, doctorEntry: value }));
  };

  return (
    <div
      ref={containerRef}
      className="space-y-3 p-2 bg-gray-100 font-sans text-md"
    >
      <div className="bg-white p-2 rounded shadow border border-gray-200">
        {!isLoading ? (
          <button
            onClick={handleGenerateSuggestions}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#012e58] to-[#1a4b7a] text-white rounded-lg hover:from-[#1a4b7a] hover:to-[#012e58] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="w-5 h-5" />
            <span className="text-lg font-semibold">
              Generate AI Suggestions from Assessment
            </span>
          </button>
        ) : (
          <button
            onClick={handleStopGeneration}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="text-lg font-semibold">Stop Generation</span>
            <Loader className="w-4 h-4 ml-2 animate-spin" />
          </button>
        )}
      </div>

      {/* --- RESIZABLE CONTAINER START --- */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* LEFT COLUMN: Doctor Entries */}
        <div
          className="flex flex-col gap-2"
          style={{ width: isDesktop ? `${split}%` : "100%" }}
        >
          {/* Diagnosis Input */}
          <div className="w-full bg-white p-2 rounded shadow border border-gray-200 h-full">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-lg font-bold text-[#0B2D4D] tracking-tight">
                Diagnosis (ICD-10)
              </h3>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex items-center gap-1">
                <div className="bg-[#012e58]/10 p-1 rounded">
                  <User size={12} className="text-[#012e58]" />
                </div>
                <input
                  type="text"
                  placeholder="Enter diagnosis"
                  value={diagnosis.doctorEntry}
                  onChange={(e) => handleDiagnosisChange(e.target.value)}
                  className="flex-1 p-1.5 border border-gray-300 rounded bg-gray-50 focus:ring-1 focus:ring-[#012e58] focus:border-[#012e58] transition duration-200 ease-in-out text-[#0B2D4D] placeholder:text-gray-500 text-md"
                />
              </div>
            </div>
          </div>

          {/* Lab Input */}
          <div className="w-full bg-white p-2 rounded shadow border border-gray-200 h-full">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-lg font-bold text-[#0B2D4D] tracking-tight">
                Lab Investigation
              </h3>
            </div>
            <div className="p-2 space-y-2">
              <input
                type="text"
                placeholder="Enter lab investigation"
                value={labInvestigation.doctorEntry}
                onChange={(e) => handleLabInvestigationChange(e.target.value)}
                className="w-full p-1.5 border border-gray-300 rounded bg-gray-50 focus:ring-1 focus:ring-[#012e58] focus:border-[#012e58] transition duration-200 ease-in-out text-[#0B2D4D] placeholder:text-gray-500 text-md"
              />
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  {(["cbc", "lft", "rft"] as const).map((test) => (
                    <span
                      key={test}
                      onClick={() => handleTestChange(test)}
                      className={`cursor-pointer px-3 py-1 text-md font-semibold rounded-full border transition-all duration-200 ${
                        labInvestigation.doctorTests[test]
                          ? "bg-[#012e58] text-white border-[#012e58]"
                          : "bg-white text-[#0B2D4D] border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {test.toUpperCase()}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={copyAiTests}
                    className="flex items-center gap-1 px-2 py-1 text-md border border-[#012e58] rounded text-[#012e58] bg-white hover:bg-[#012e58] hover:text-white focus:outline-none focus:ring-1 focus:ring-[#012e58] transition-all duration-300"
                  >
                    <Copy size={10} /> Copy AI Tests
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESIZE HANDLE */}
        <HorizontalResizeHandle onMouseDown={handleMouseDown} />

        {/* RIGHT COLUMN: AI Suggestions */}
        <div
          className="flex flex-col gap-2"
          style={{ width: isDesktop ? `calc(${100 - split}% - 1rem)` : "100%" }}
        >
          {/* AI Diagnosis */}
          <div className="w-full bg-white p-2 rounded shadow border border-gray-200 h-full">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-lg font-bold text-[#0B2D4D] tracking-tight">
                AI-Suggested Diagnosis
              </h3>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex items-center gap-1">
                <div className="bg-[#012e58]/10 p-1 rounded">
                  <Bot size={12} className="text-[#012e58]" />
                </div>
                <input
                  type="text"
                  value={diagnosis.aiSuggested}
                  readOnly
                  className="flex-1 p-1.5 border border-gray-300 rounded bg-gray-50 text-[#0B2D4D] text-md"
                />
                <button
                  onClick={() =>
                    copyToField(diagnosis.aiSuggested, "diagnosis")
                  }
                  className="px-2 py-1 border border-[#012e58] rounded text-[#012e58] bg-white hover:bg-[#012e58] hover:text-white focus:outline-none focus:ring-1 focus:ring-[#012e58] transition-all duration-300"
                >
                  <Copy size={10} />
                </button>
              </div>
            </div>
          </div>

          {/* AI Lab */}
          <div className="w-full bg-white p-2 rounded shadow border border-gray-200 h-full">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-lg font-bold text-[#0B2D4D] tracking-tight">
                AI Auto Suggestion Lab
              </h3>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 text-md bg-green-100 text-green-700 rounded-full font-medium">
                  {labInvestigation.aiSuggestion || "No suggestions yet."}
                </span>
              </div>
              <button
                onClick={() =>
                  copyToField(labInvestigation.aiSuggestion, "labInvestigation")
                }
                disabled={!labInvestigation.aiSuggestion}
                className="px-1 py-0.5 border border-[#012e58] rounded text-[#012e58] bg-white hover:bg-[#012e58] hover:text-white focus:outline-none focus:ring-1 focus:ring-[#012e58] transition-all duration-300 disabled:opacity-50"
              >
                <Copy size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* --- RESIZABLE CONTAINER END --- */}
    </div>
  );
};

export default MedicalDashboard;
