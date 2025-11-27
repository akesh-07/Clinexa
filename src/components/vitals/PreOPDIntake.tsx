// src/components/vitals/PreOPDIntake.tsx
import React, { useState, useReducer, useCallback, useMemo } from "react";
import {
  FileText,
  Save,
  RotateCcw,
  ArrowLeft,
  Activity,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

import {
  VitalsAssessment,
  VitalsState as VitalsSnapshot,
} from "./VitalsAssessment"; // Import VitalsState as VitalsSnapshot for type
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  Patient,
  PreOPDIntakeData,
  Complaint,
  ChronicCondition,
  Allergy,
  PastHistory,
} from "../../types";

import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
// 🚨 IMPORT MODULAR SECTIONS AND THE NEW COMPONENT
import {
  PresentingComplaintsSection,
  ChronicConditionsSection,
  AllergiesSection,
  PastHistorySection,
  RecordsUploadSection,
  AiClinicalSummarySection,
  PreviousMedicalHistorySummarySection, // <-- NEW IMPORT
} from "./PreOPDIntakeSections";

// --- PDF.JS WORKER CONFIG (same logic as DoctorModule.tsx) ---
(
  pdfjsLib as any
).GlobalWorkerOptions.standardFontDataUrl = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`;
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

// --- FILE EXTRACTION LOGIC ---
const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let text = "";

        if (file.type === "application/pdf") {
          const loadingTask = pdfjsLib.getDocument(
            event.target?.result as ArrayBuffer
          );
          const pdf = await loadingTask.promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // Append a new line or separator for clarity between pages
            text +=
              content.items.map((item: any) => item.str).join(" ") +
              "\n--- Page Break ---\n";
          }
          // Prefix PDF content with a tag
          resolve(`[PDF Embedded Text Extracted]\n${text}`);
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          // Prefix DOCX content with a tag
          resolve(`[DOCX Text Content Extracted]\n${result.value}`);
        } else if (file.type === "text/plain") {
          // Prefix Plain Text content with a tag
          resolve(`[Plain Text Content]\n${event.target?.result as string}`);
        } else if (file.type.startsWith("image/")) {
          // Returning an instructional placeholder/mock resolution:
          const mockResolution = `
            [Image OCR Required]
            File: ${file.name}
            Size: ${(file.size / 1024).toFixed(1)} KB
            Type: ${file.type}
            ***
            To enable OCR for this file, you must:
            1. Install Tesseract.js: 'npm install tesseract.js'
            2. Implement the call here: const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');
            ***`;
          resolve(mockResolution);
        } else {
          reject(
            new Error(
              `Unsupported file type: ${file.type}. Text extraction failed.`
            )
          );
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    // Read file based on type, reading images as DataURL for OCR
    if (
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file); // Reading images as DataURL
    } else if (file.type === "text/plain") {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  });
};
// --- END FILE EXTRACTION LOGIC ---

// --- INITIAL STATE (REMAINS) ---
const INITIAL_INTAKE_STATE: PreOPDIntakeData = {
  complaints: [],
  chronicConditions: [],
  allergies: {
    hasAllergies: false,
    type: [],
    substance: "",
    reaction: "",
    severity: "",
  },
  pastHistory: {
    illnesses: [],
    surgeries: [],
    hospitalizations: [],
    currentMedications: [],
    overallCompliance: "Unknown",
  },
};

// --- REDUCER (REMAINS) ---
function intakeReducer(
  state: PreOPDIntakeData,
  action: { type: string; payload: any }
): PreOPDIntakeData {
  switch (action.type) {
    case "UPDATE_COMPLAINTS":
      return { ...state, complaints: action.payload };
    case "UPDATE_CHRONIC_CONDITIONS":
      return { ...state, chronicConditions: action.payload };
    case "UPDATE_ALLERGIES":
      return { ...state, allergies: action.payload };
    case "UPDATE_PAST_HISTORY":
      return { ...state, pastHistory: action.payload };
    case "RESET_ALL":
      return INITIAL_INTAKE_STATE;
    default:
      return state;
  }
}

// ------------------------------------------------------------------
// --- MAIN COMPONENT ---
// ------------------------------------------------------------------
interface PreOPDIntakeProps {
  selectedPatient?: Patient | null;
  onBack?: () => void;
}

export const PreOPDIntake: React.FC<PreOPDIntakeProps> = ({
  selectedPatient,
  onBack,
}) => {
  const [intakeData, dispatch] = useReducer(
    intakeReducer,
    INITIAL_INTAKE_STATE
  );
  const [status, setStatus] = useState({
    isSaving: false,
    showSuccess: false,
    errorMessage: "",
  });

  const [extractedRecords, setExtractedRecords] = useState<
    Record<string, string>
  >({});

  // 1. AI Clinical Summary (Vitals + Complaints)
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [isClinicalLoading, setIsClinicalLoading] = useState(false);
  const [clinicalExpanded, setClinicalExpanded] = useState(false);

  // 2. Previous Medical History Summary (Records + Past History)
  const [historySummary, setHistorySummary] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // --- HANDLERS ---
  const handleComplaintsChange = useCallback((complaints: Complaint[]) => {
    dispatch({ type: "UPDATE_COMPLAINTS", payload: complaints });
  }, []);

  const handleChronicConditionsChange = useCallback(
    (conditions: ChronicCondition[]) => {
      dispatch({ type: "UPDATE_CHRONIC_CONDITIONS", payload: conditions });
    },
    []
  );

  const handleAllergiesChange = useCallback((allergies: Allergy) => {
    dispatch({ type: "UPDATE_ALLERGIES", payload: allergies });
  }, []);

  const handlePastHistoryChange = useCallback((pastHistory: PastHistory) => {
    dispatch({ type: "UPDATE_PAST_HISTORY", payload: pastHistory });
  }, []);

  const handleClearForm = useCallback(() => {
    dispatch({ type: "RESET_ALL", payload: null });
    setExtractedRecords({});
    setClinicalSummary("");
    setHistorySummary("");
    setClinicalExpanded(false);
    setHistoryExpanded(false);
  }, []);

  const handleExtractedRecordsChange = useCallback(
    (newRecords: Record<string, string>) => {
      setExtractedRecords(newRecords);
    },
    []
  );

  // Helper to fetch latest saved vitals for the AI Clinical Summary
  const fetchLatestVitals =
    useCallback(async (): Promise<VitalsSnapshot | null> => {
      // 🚨 CHANGED: Use patientUhid for the query filter
      if (!selectedPatient?.uhid) return null;

      try {
        const q = query(
          collection(db, "vitals"),
          where("patientUhid", "==", selectedPatient.uhid), // 🚨 CHANGED: Filter by patientUhid
          orderBy("recordedAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          return querySnapshot.docs[0].data() as VitalsSnapshot;
        }
        return null;
      } catch (error) {
        console.error("Error fetching latest vitals:", error);
        return null;
      }
    }, [selectedPatient]);

  // 1. AI Clinical Summary (Vitals + Complaints)
  const generateClinicalSummary = useCallback(async () => {
    if (!selectedPatient) {
      setClinicalSummary("Please select a patient first.");
      return;
    }

    setIsClinicalLoading(true);
    setClinicalSummary("");
    setClinicalExpanded(false);

    const latestVitals = await fetchLatestVitals();

    // The logic to include Vitals is here.
    const vitalsText = latestVitals
      ? `
        --- LATEST VITALS ---
        Pulse: ${latestVitals.pulse || "N/A"} bpm
        BP: ${latestVitals.bpSystolic || "N/A"}/${
          latestVitals.bpDiastolic || "N/A"
        } mmHg
        Temp: ${latestVitals.temperature || "N/A"} °F
        SpO2: ${latestVitals.spo2 || "N/A"} %
        Resp. Rate: ${latestVitals.respiratoryRate || "N/A"} /min
        Pain Score: ${latestVitals.painScore || "N/A"} / 10
        BMI: ${latestVitals.bmi || "N/A"} kg/m²
      `
      : "Vitals: No recent vitals recorded. Please prompt staff to record vitals first.";

    const complaintsText =
      intakeData.complaints
        .map(
          (c) =>
            `- Symptom: ${c.complaint}, Duration: ${c.duration.value}${
              c.duration.unit
            }, Severity: ${c.severity} ${
              c.redFlagTriggered ? "(RED FLAG)" : ""
            }`
        )
        .join("\n") || "No chief complaints recorded.";

    const combinedData = `
      **Patient Presentation Summary**
      
      Patient: ${selectedPatient.fullName}
      Age/Gender: ${selectedPatient.age}Y, ${selectedPatient.gender}
      
      ${vitalsText}

      --- CHIEF COMPLAINTS ---
      ${complaintsText}
    `;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer  `,
          },
          body: JSON.stringify({
            model: "gpt-5-nano",
            messages: [
           {
  role: "system",
  content: `
You are a clinical decision support assistant for a Pre-OPD triage screen.

Your task is to generate a VERY FOCUSED summary using ONLY vitals and chief complaints, with the following EXACT format and behavior:

1. Sections (in this order):
   - A heading: "Impression(s)"
   - A numbered list of impressions: "1. ...", "2. ...", etc.
   - Under each impression, one line starting with "Reason:" explaining briefly why
   - A heading: "Abnormal Vitals"
   - A bullet list of ONLY vitals that are abnormal (outside normal range)
   - A final line: "All other vitals and systems: WNL (Within Normal Limits)."

2. DO NOT:
   - Show any section called "Current Clinical Status", "Key Vital Signs", or similar.
   - List or repeat normal vitals (pulse, temperature, SpO₂, respiratory rate, pain, BMI) individually if they are normal.
   - Echo back the full structured input or full chief complaint text.
   - Add any other sections or commentary beyond what is described above.

3. If there are NO abnormal vitals and no significant concerning complaints:
   - Use a single impression such as:
     "No acute abnormality detected based on current vitals and chief complaints."
   - In "Abnormal Vitals", write: "- None."
   - Still end with: "All other vitals and systems: WNL (Within Normal Limits)."

4. Style:
   - Output MUST be valid markdown.
   - Keep the wording concise, clinically appropriate, and ready to paste into an EMR.
   - Do not add anything before or after the required sections.
`.trim(),
},
              {
                role: "user",
                content: combinedData,
              },
            ],
            //temperature: 0.2,
          }),
        }
      );
      const data = await response.json();
      const summary =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Could not generate clinical summary.";
      setClinicalSummary(summary);
      setClinicalExpanded(true);
    } catch (error) {
      console.error("Error generating AI clinical summary:", error);
      setClinicalSummary(
        "An error occurred while generating the clinical summary."
      );
    } finally {
      setIsClinicalLoading(false);
    }
  }, [selectedPatient, fetchLatestVitals, intakeData.complaints]);

  // 2. Previous Medical History Summary (Records + Past History)
  const generateHistorySummary = useCallback(async () => {
    if (!selectedPatient) {
      setHistorySummary("Please select a patient first.");
      return;
    }

    setIsHistoryLoading(true);
    setHistorySummary("");
    setHistoryExpanded(false);

    const extractedRecordText = Object.entries(extractedRecords)
      .map(([type, content]) => `--- ${type} ---\n${content}`)
      .join("\n\n");

    const pastHistoryText = `
      Chronic Conditions:
      ${intakeData.chronicConditions.map((c) => c.name).join(", ") || "None"}

      Allergies:
      ${
        intakeData.allergies.hasAllergies
          ? `${intakeData.allergies.type.join(", ")} to ${
              intakeData.allergies.substance || "Unknown"
            } (${intakeData.allergies.severity || "Unknown"})`
          : "None"
      }

      Past History/Illnesses: ${
        intakeData.pastHistory.illnesses.join(", ") || "None"
      }
      Past Surgeries: ${
        intakeData.pastHistory.surgeries
          .map((s) => `${s.name} (${s.year})`)
          .join("; ") || "None"
      }
      Current Medications (Chronic/Other):
      ${
        [
          ...intakeData.chronicConditions.flatMap((c) => c.medications),
          ...intakeData.pastHistory.currentMedications,
        ]
          .map((m) => `${m.name} ${m.dose} ${m.frequency} ${m.route}`)
          .join("; ") || "None"
      }
    `;

    const combinedData = `
      **Patient Medical History for Review**
      
      --- STRUCTURED HISTORY INPUT ---
      ${pastHistoryText}

      --- EXTRACTED MEDICAL RECORDS (PDF/OCR) ---
      ${extractedRecordText || "No digital records uploaded or text extracted."}
    `;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer `,
          },
          body: JSON.stringify({
            model: "gpt-5-nano",
            messages: [
              {
                role: "system",
                content:
                  "You are a medical records archivist. Summarize the patient's **comprehensive medical history, allergies, and past surgical events** based on the provided structured and extracted data. Identify key historical problems. Output concise, structured markdown with clear section headings, bullet points, and key: value lines. If no uploaded records exist, focus solely on the structured history (Chronic Conditions, Allergies, etc.).",
              },
              {
                role: "user",
                content: combinedData,
              },
            ],
            // temperature: 0.2,
          }),
        }
      );
      const data = await response.json();
      const summary =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Could not generate medical history summary.";
      setHistorySummary(summary);
      setHistoryExpanded(true);
    } catch (error) {
      console.error("Error generating AI history summary:", error);
      setHistorySummary(
        "An error occurred while generating the medical history summary."
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, [
    selectedPatient,
    extractedRecords,
    intakeData.chronicConditions,
    intakeData.allergies,
    intakeData.pastHistory,
  ]);

  const handleSubmit = async () => {
    if (!selectedPatient) {
      setStatus({ ...status, errorMessage: "No patient selected!" });
      return;
    }

    setStatus({ isSaving: true, showSuccess: false, errorMessage: "" });

    try {
      const intakeRecord = {
        patientId: selectedPatient.id,
        patientUhid: selectedPatient.uhid,
        patientName: selectedPatient.fullName,
        complaints: intakeData.complaints,
        chronicConditions: intakeData.chronicConditions,
        allergies: intakeData.allergies,
        pastHistory: intakeData.pastHistory,
        extractedRecords,
        aiClinicalSummary: clinicalSummary,
        aiHistorySummary: historySummary,
        recordedAt: Timestamp.now(),
        recordedBy: "Medical Staff",
        status: "completed",
      };

      // NOTE: This line requires a valid Firebase setup ('db' import)
      await addDoc(collection(db, "preOPDIntake"), intakeRecord);

      setStatus({ isSaving: false, showSuccess: true, errorMessage: "" });
      setTimeout(
        () => setStatus((prev) => ({ ...prev, showSuccess: false })),
        4000
      );
    } catch (error: any) {
      console.error("Error saving Pre-OPD intake:", error);
      setStatus({
        isSaving: false,
        showSuccess: false,
        errorMessage:
          "Failed to save intake data. Please check console for details.",
      });
    }
  };

  // Combine all medications for the allergy check across all relevant components
  const allMedsForCheck = useMemo(
    () => [
      ...intakeData.chronicConditions.flatMap((c) => c.medications),
      ...intakeData.pastHistory.currentMedications,
    ],
    [intakeData.chronicConditions, intakeData.pastHistory.currentMedications]
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header - UNCHANGED */}
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
            <FileText className="w-8 h-8 text-[#012e58]" />
            <div>
              <h1 className="text-3xl font-bold text-[#0B2D4D]">
                Pre-OPD Intake Assessment
              </h1>
              <p className="text-[#1a4b7a]">
                Comprehensive patient intake and medical history
              </p>
            </div>
          </div>

          {/* Patient Info */}
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

        {/* Status Messages */}
        {status.showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">
              Pre-OPD intake saved successfully!
            </span>
          </div>
        )}
        {status.errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{status.errorMessage}</span>
          </div>
        )}

        {/* Main Content Sections */}
        <div className="space-y-6">
          {/* 1. Vitals Assessment (External Component) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-[#012e58]" />
                <h2 className="text-lg font-semibold text-[#0B2D4D]">
                  1. Vital Signs Assessment
                </h2>
              </div>
            </div>
            <div className="p-0">
              <VitalsAssessment
                selectedPatient={selectedPatient}
                isSubcomponent={true}
              />
            </div>
          </div>

          {/* 2. Presenting Complaints */}
          <PresentingComplaintsSection
            data={intakeData.complaints}
            onChange={handleComplaintsChange}
          />

          {/* 3. Chronic Conditions */}
          <ChronicConditionsSection
            data={intakeData.chronicConditions}
            onChange={handleChronicConditionsChange}
          />

          {/* 4. Allergies */}
          <AllergiesSection
            data={intakeData.allergies}
            onChange={handleAllergiesChange}
            allMeds={allMedsForCheck} // Pass combined meds for conflict check
          />

          {/* 5. Past & Medication History */}
          <PastHistorySection
            data={intakeData.pastHistory}
            onChange={handlePastHistoryChange}
            chronicMeds={intakeData.chronicConditions.flatMap(
              (c) => c.medications
            )}
          />

          {/* 6. Previous Records Uploads */}
          <RecordsUploadSection
            extractTextFromFile={extractTextFromFile}
            onRecordsChange={handleExtractedRecordsChange}
          />

          {/* 7. AI Clinical Summary (Vitals + Complaints) */}
          <AiClinicalSummarySection
            summary={clinicalSummary}
            isLoading={isClinicalLoading}
            isExpanded={clinicalExpanded}
            onToggleExpand={() => setClinicalExpanded(!clinicalExpanded)}
            onGenerate={generateClinicalSummary}
          />

          {/* 8. Previous Medical History Summary (Records + Past History) - NEW SECTION */}
          <PreviousMedicalHistorySummarySection
            summary={historySummary}
            isLoading={isHistoryLoading}
            isExpanded={historyExpanded}
            onToggleExpand={() => setHistoryExpanded(!historyExpanded)}
            onGenerate={generateHistorySummary}
          />
        </div>
      </div>

      {/* Fixed Bottom Submit Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {(intakeData.complaints.length > 0 ||
                intakeData.chronicConditions.length > 0) && (
                <span className="text-lg text-gray-600">
                  **{intakeData.complaints.length}** complaints, **
                  {intakeData.chronicConditions.length}** conditions recorded
                </span>
              )}

              {intakeData.complaints.some((c) => c.redFlagTriggered) && (
                <span className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full text-md font-semibold">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Red Flag Alert
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClearForm}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Form</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={status.isSaving || !selectedPatient}
                className="flex items-center space-x-2 px-6 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed bg-[#012e58] text-white hover:bg-[#1a4b7a]"
              >
                <Save className="w-4 h-4" />
                <span>{status.isSaving ? "Saving..." : "Submit"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreOPDIntake;
