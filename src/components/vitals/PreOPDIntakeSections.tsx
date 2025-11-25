// src/components/vitals/PreOPDIntakeSections.tsx
import React, { useState, useMemo, useRef } from "react";
import {
  HeartPulse,
  Syringe,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus,
  Trash2,
  List,
  Upload,
  User,
  Pill,
  Copy,
  Bot,
  Loader,
  Eye,
  EyeOff,
  ClipboardCopy,
  Clock,
  FileText,
} from "lucide-react";
import {
  Complaint,
  ChronicCondition,
  Allergy,
  MedicationDetails,
  PastHistory,
} from "../../types";

// --- CONSTANTS & MOCK DATA (Extracted from PreOPDIntake.tsx) ---
export const MOCK_MASTERS = {
  complaints: [
    { label: "Chest Pain", redFlag: true, specialty: "Cardiology" },
    { label: "Shortness of Breath", redFlag: true, specialty: "Cardiology" },
    { label: "Severe Headache", redFlag: true, specialty: "Neurology" },
    { label: "High Fever", redFlag: true, specialty: "General Medicine" },
    { label: "Abdominal Pain", redFlag: false, specialty: "Gastroenterology" },
    { label: "Fever", redFlag: false, specialty: "General Medicine" },
    { label: "Cough", redFlag: false, specialty: "Pulmonology" },
    { label: "Headache", redFlag: false, specialty: "Neurology" },
    { label: "Diarrhea", redFlag: false, specialty: "Gastroenterology" },
    { label: "Back Pain", redFlag: false, specialty: "Orthopedics" },
  ],
  chronicConditions: [
    "Diabetes Mellitus",
    "Hypertension",
    "Asthma",
    "COPD",
    "Chronic Kidney Disease",
    "Coronary Artery Disease",
    "Hyperthyroidism",
    "Hypothyroidism",
    "Rheumatoid Arthritis",
    "Osteoarthritis",
  ],
  medications: [
    "Metformin",
    "Insulin",
    "Amlodipine",
    "Lisinopril",
    "Atorvastatin",
    "Aspirin",
    "Levothyroxine",
    "Salbutamol",
    "Prednisolone",
    "Paracetamol",
  ],
  frequencies: ["OD", "BD", "TDS", "QHS", "QID", "PRN", "Weekly", "Monthly"],
  routes: ["Oral", "SC", "IV", "IM", "Inhaled", "Topical", "Sublingual"],
  severity: ["Mild", "Moderate", "Severe"],
  compliance: ["Taking", "Missed", "Ran out", "Unknown"],
};

export const InputStyle =
  "p-2 border border-gray-300 rounded-md w-full bg-white focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58] transition duration-200 ease-in-out text-[#0B2D4D] placeholder:text-gray-500 text-lg";

// Helper component for section headers to maintain consistency
export const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
}> = ({ icon: Icon, title }) => (
  <div className="flex items-center space-x-2 mb-4">
    <div className="p-1.5 rounded-lg bg-[#e0f7fa]">
      <Icon className="w-5 h-5 text-[#012e58]" />
    </div>
    <h2 className="text-lg font-bold text-[#0B2D4D] tracking-tight">{title}</h2>
  </div>
);

// Formatted AI Summary renderer (headings, bullets, key: value)
const FormattedAiSummary: React.FC<{ summary: string }> = ({ summary }) => {
  const lines = summary.split("\n").filter((line) => line.trim() !== "");
  return (
    <div className="space-y-3 text-[#1a4b7a]">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return (
            <h3 key={index} className="text-base font-bold text-[#0B2D4D] pt-1">
              {trimmed.slice(2, -2)}
            </h3>
          );
        }
        if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
          return (
            <h3 key={index} className="text-base font-bold text-[#0B2D4D] pt-1">
              {trimmed.replace(/^#+\s*/, "")}
            </h3>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <ul key={index} className="list-disc list-inside pl-4">
              <li>{trimmed.slice(2)}</li>
            </ul>
          );
        }
        if (trimmed.includes(":")) {
          const parts = trimmed.split(":");
          const key = parts[0];
          const value = parts.slice(1).join(":");
          return (
            <div key={index} className="flex">
              <span className="font-semibold w-1/3">{key}:</span>
              <span className="w-2/3">{value}</span>
            </div>
          );
        }
        return (
          <p key={index} className="text-lg text-gray-800">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};

// Presenting Complaints Section
interface PresentingComplaintsSectionProps {
  data: Complaint[];
  onChange: (data: Complaint[]) => void;
}

export const PresentingComplaintsSection: React.FC<
  PresentingComplaintsSectionProps
> = ({ data, onChange }) => {
  const addComplaint = () => {
    if (data.length >= 5) return; // Max 5 complaints
    onChange([
      ...data,
      {
        id: Date.now().toString(),
        complaint: "",
        severity: "",
        duration: { value: "", unit: "d" },
        specialty: "",
        redFlagTriggered: false,
      },
    ]);
  };

  const updateComplaint = (id: string, field: keyof Complaint, value: any) => {
    onChange(
      data.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          // Auto-derive specialty and red flag
          const masterComplaint = MOCK_MASTERS.complaints.find(
            (m) => m.label.toLowerCase() === updated.complaint.toLowerCase()
          );
          if (masterComplaint) {
            updated.specialty = masterComplaint.specialty;
            updated.redFlagTriggered =
              masterComplaint.redFlag && updated.severity === "Severe";
          }
          return updated;
        }
        return c;
      })
    );
  };

  const removeComplaint = (id: string) => {
    onChange(data.filter((c) => c.id !== id));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <List className="w-5 h-5 text-[#012e58]" />
            <h2 className="text-lg font-semibold text-[#0B2D4D]">
              2. Present Complaint(s) {data.length > 0 && `(${data.length}/5)`}
            </h2>
          </div>
          <button
            onClick={addComplaint}
            disabled={data.length >= 5}
            className="flex items-center space-x-1 px-3 py-1 bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors text-lg disabled:bg-gray-400"
          >
            <Plus className="w-4 h-4" />
            <span>Add Complaint</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <List className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No complaints recorded yet</p>
            <p className="text-lg">Click "Add Complaint" to start</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* --- COMMON HEADER ROW --- */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-100 border-b border-gray-200 font-semibold text-[#0B2D4D] text-sm uppercase tracking-wide">
              <div className="col-span-4">Chief Complaint</div>
              <div className="col-span-2">Severity</div>
              <div className="col-span-3">Duration</div>
              <div className="col-span-2">Specialty</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {/* --- DATA ROWS --- */}
            <div className="bg-gray-50 divide-y divide-gray-200">
              {data.map((complaint) => (
                <div key={complaint.id} className="p-4">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Complaint Input */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        list={`complaint-list-${complaint.id}`}
                        value={complaint.complaint}
                        onChange={(e) =>
                          updateComplaint(
                            complaint.id,
                            "complaint",
                            e.target.value
                          )
                        }
                        className={InputStyle}
                        placeholder="e.g., Chest Pain"
                      />
                      <datalist id={`complaint-list-${complaint.id}`}>
                        {MOCK_MASTERS.complaints.map((m) => (
                          <option key={m.label} value={m.label} />
                        ))}
                      </datalist>
                    </div>

                    {/* Severity Dropdown */}
                    <div className="col-span-2">
                      <select
                        value={complaint.severity}
                        onChange={(e) =>
                          updateComplaint(
                            complaint.id,
                            "severity",
                            e.target.value
                          )
                        }
                        className={InputStyle}
                      >
                        <option value="">Select</option>
                        {MOCK_MASTERS.severity.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Duration Inputs */}
                    <div className="col-span-3">
                      <div className="flex space-x-1">
                        <input
                          type="number"
                          min="1"
                          value={complaint.duration.value}
                          onChange={(e) =>
                            updateComplaint(complaint.id, "duration", {
                              ...complaint.duration,
                              value: e.target.value,
                            })
                          }
                          className={`${InputStyle} w-2/3`}
                          placeholder="3"
                        />
                        <select
                          value={complaint.duration.unit}
                          onChange={(e) =>
                            updateComplaint(complaint.id, "duration", {
                              ...complaint.duration,
                              unit: e.target.value as any,
                            })
                          }
                          className={`${InputStyle} w-1/3`}
                        >
                          <option value="h">hrs</option>
                          <option value="d">days</option>
                          <option value="w">wks</option>
                          <option value="mo">mos</option>
                          <option value="yr">yrs</option>
                        </select>
                      </div>
                    </div>

                    {/* Specialty (Auto-derived) */}
                    <div className="col-span-2">
                      <div className="p-2 bg-gray-100 border border-gray-200 rounded-md text-lg text-gray-700 truncate">
                        {complaint.specialty || "Auto"}
                      </div>
                    </div>

                    {/* Delete Action */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeComplaint(complaint.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Red Flag Alert Row */}
                  {complaint.redFlagTriggered && (
                    <div className="mt-2 flex items-center bg-red-100 text-red-800 p-2 rounded-md text-lg font-semibold">
                      <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                      🚨 RED FLAG: Severe {complaint.complaint.toLowerCase()}{" "}
                      requires immediate attention!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Chronic Conditions Section with Enhanced Features
interface ChronicConditionsSectionProps {
  data: ChronicCondition[];
  onChange: (data: ChronicCondition[]) => void;
}

export const ChronicConditionsSection: React.FC<
  ChronicConditionsSectionProps
> = ({ data, onChange }) => {
  const [selectedCondition, setSelectedCondition] = useState<string | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);

  const addCondition = (conditionName: string) => {
    const newCondition: ChronicCondition = {
      id: Date.now().toString(),
      name: conditionName,
      duration: "Unknown",
      onMedication: "Unknown",
      medications: [],
    };
    onChange([...data, newCondition]);
    setSelectedCondition(newCondition.id);
    setShowAddForm(false);
  };

  const updateCondition = (id: string, updates: Partial<ChronicCondition>) => {
    onChange(data.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCondition = (id: string) => {
    onChange(data.filter((c) => c.id !== id));
    if (selectedCondition === id) {
      setSelectedCondition(null);
    }
  };

  const addMedicationToCondition = (conditionId: string) => {
    const newMedication: MedicationDetails = {
      id: Date.now().toString(),
      name: "",
      dose: "",
      frequency: "OD",
      route: "Oral",
      duration: "Unknown",
      compliance: "Unknown",
      notes: "",
    };

    updateCondition(conditionId, {
      medications: [
        ...(data.find((c) => c.id === conditionId)?.medications || []),
        newMedication,
      ],
    });
  };

  const updateMedication = (
    conditionId: string,
    medicationId: string,
    updates: Partial<MedicationDetails>
  ) => {
    const condition = data.find((c) => c.id === conditionId);
    if (condition) {
      const updatedMedications = condition.medications.map((m) =>
        m.id === medicationId ? { ...m, ...updates } : m
      );
      updateCondition(conditionId, { medications: updatedMedications });
    }
  };

  const removeMedication = (conditionId: string, medicationId: string) => {
    const condition = data.find((c) => c.id === conditionId);
    if (condition) {
      const updatedMedications = condition.medications.filter(
        (m) => m.id !== medicationId
      );
      updateCondition(conditionId, { medications: updatedMedications });
    }
  };

  // Check for uncontrolled conditions based on medications
  const getUncontrolledWarning = (condition: ChronicCondition) => {
    if (
      (condition.name.toLowerCase().includes("diabetes") ||
        condition.name.toLowerCase().includes("hypertension")) &&
      condition.medications.length === 0
    ) {
      return "⚠️ No medications recorded - suggests possible poor control or unmanaged condition.";
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-5 h-5 text-[#012e58]" />
            <h2 className="text-lg font-semibold text-[#0B2D4D]">
              3. Chronic Conditions {data.length > 0 && `(${data.length})`}
            </h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1 px-3 py-1 bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors text-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Condition</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Quick Add from Master List */}
        {showAddForm && (
          <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="font-medium text-[#0B2D4D] mb-2">
              Select from common conditions:
            </h4>
            <div className="flex flex-wrap gap-2">
              {MOCK_MASTERS.chronicConditions
                .filter((condition) => !data.some((d) => d.name === condition))
                .map((condition) => (
                  <button
                    key={condition}
                    onClick={() => addCondition(condition)}
                    className="px-3 py-1 text-lg bg-white text-blue-800 rounded-full border border-blue-300 hover:bg-blue-100 transition-colors"
                  >
                    {condition}
                  </button>
                ))}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Or type custom condition..."
                className="flex-1 p-2 border border-gray-300 rounded-md text-lg"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    addCondition(e.currentTarget.value.trim());
                    e.currentTarget.value = "";
                  }
                }}
              />
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-lg text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Condition Cards */}
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <HeartPulse className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No chronic conditions recorded</p>
            <p className="text-lg">Click "Add Condition" to start</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((condition) => {
              const uncontrolledWarning = getUncontrolledWarning(condition);
              const isExpanded = selectedCondition === condition.id;
              const isCustomDuration = typeof condition.duration === "object";

              return (
                <div
                  key={condition.id}
                  className={`border rounded-lg transition-all ${
                    isExpanded ? "border-blue-300 shadow-md" : "border-gray-200"
                  }`}
                >
                  {/* Condition Header */}
                  <div
                    className={`p-4 cursor-pointer ${
                      isExpanded ? "bg-blue-50" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() =>
                      setSelectedCondition(isExpanded ? null : condition.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-[#0B2D4D]">
                            {condition.name}
                          </h4>
                          <span className="px-2 py-0.5 text-md bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                            {condition.medications.length} med
                            {condition.medications.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {uncontrolledWarning && (
                          <span className="text-md text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                            May be uncontrolled
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCondition(condition.id);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="p-1 rounded">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      {/* Condition Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* DURATION LOGIC */}
                        <div>
                          <label className="block text-lg font-medium text-gray-700 mb-1">
                            Duration
                          </label>
                          <select
                            value={isCustomDuration ? "Custom" : "Unknown"}
                            onChange={(e) => {
                              if (e.target.value === "Unknown") {
                                updateCondition(condition.id, {
                                  duration: "Unknown",
                                });
                              } else {
                                updateCondition(condition.id, {
                                  duration: { years: 0, months: 0 },
                                });
                              }
                            }}
                            className={InputStyle}
                          >
                            <option value="Unknown">Unknown</option>
                            <option value="Custom">Custom Duration</option>
                          </select>

                          {/* Custom Duration Inputs */}
                          {isCustomDuration && (
                            <div className="flex space-x-2 mt-2 animate-fade-in">
                              <div className="flex-1">
                                <input
                                  type="number"
                                  placeholder="Yrs"
                                  min="0"
                                  className={InputStyle}
                                  value={
                                    (condition.duration as any).years || ""
                                  }
                                  onChange={(e) =>
                                    updateCondition(condition.id, {
                                      duration: {
                                        ...(condition.duration as any),
                                        years: parseInt(e.target.value) || 0,
                                      },
                                    })
                                  }
                                />
                                <span className="text-xs text-gray-500 ml-1">
                                  Years
                                </span>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="number"
                                  placeholder="Mos"
                                  min="0"
                                  className={InputStyle}
                                  value={
                                    (condition.duration as any).months || ""
                                  }
                                  onChange={(e) =>
                                    updateCondition(condition.id, {
                                      duration: {
                                        ...(condition.duration as any),
                                        months: parseInt(e.target.value) || 0,
                                      },
                                    })
                                  }
                                />
                                <span className="text-xs text-gray-500 ml-1">
                                  Months
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-lg font-medium text-gray-700 mb-1">
                            On Medication
                          </label>
                          <select
                            value={condition.onMedication}
                            onChange={(e) =>
                              updateCondition(condition.id, {
                                onMedication: e.target.value as any,
                              })
                            }
                            className={InputStyle}
                          >
                            <option value="Unknown">Unknown</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>

                        <div className="flex flex-col justify-end">
                          <button
                            onClick={() =>
                              addMedicationToCondition(condition.id)
                            }
                            className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-lg w-full mb-1"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Medication</span>
                          </button>
                        </div>
                      </div>

                      {/* Notes / Custom Field */}
                      <div className="mb-4">
                        <label className="block text-lg font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          Notes / Comments
                        </label>
                        <textarea
                          placeholder="Add notes, severity, or other details..."
                          className="w-full p-2 border border-gray-300 rounded-md text-lg focus:ring-2 focus:ring-[#012e58] focus:border-[#012e58]"
                          rows={2}
                          // NOTE: Assuming 'notes' might be added to the type later. Casting to any to avoid TS error if property missing.
                          value={(condition as any).notes || ""}
                          onChange={(e) =>
                            updateCondition(condition.id, {
                              notes: e.target.value,
                            } as any)
                          }
                        />
                      </div>

                      {/* Uncontrolled Warning */}
                      {uncontrolledWarning && (
                        <div className="mb-4 p-3 bg-orange-100 border border-orange-200 rounded-md">
                          <p className="text-lg text-orange-800">
                            {uncontrolledWarning}
                          </p>
                        </div>
                      )}

                      {/* Medications Table */}
                      {condition.medications.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <h5 className="font-medium text-[#0B2D4D] flex items-center space-x-2">
                              <Pill className="w-4 h-4" />
                              <span>
                                Medications ({condition.medications.length})
                              </span>
                            </h5>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-100">
                                <tr className="text-md text-gray-600">
                                  <th className="text-left p-2 w-1/4">
                                    Medication
                                  </th>
                                  <th className="text-left p-2 w-1/5">Dose</th>
                                  <th className="text-left p-2 w-1/6">
                                    Frequency
                                  </th>
                                  <th className="text-left p-2 w-1/6">Route</th>
                                  <th className="text-left p-2 w-1/6">
                                    Compliance
                                  </th>
                                  <th className="text-left p-2 w-1/12">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {condition.medications.map((medication) => (
                                  <tr
                                    key={medication.id}
                                    className="border-t border-gray-100"
                                  >
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        list="medication-list"
                                        value={medication.name}
                                        onChange={(e) =>
                                          updateMedication(
                                            condition.id,
                                            medication.id,
                                            {
                                              name: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full p-1 border border-gray-300 rounded text-lg"
                                        placeholder="Medication name"
                                      />
                                      <datalist id="medication-list">
                                        {MOCK_MASTERS.medications.map((med) => (
                                          <option key={med} value={med} />
                                        ))}
                                      </datalist>
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={medication.dose}
                                        onChange={(e) =>
                                          updateMedication(
                                            condition.id,
                                            medication.id,
                                            {
                                              dose: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full p-1 border border-gray-300 rounded text-lg"
                                        placeholder="e.g., 500mg"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <select
                                        value={medication.frequency}
                                        onChange={(e) =>
                                          updateMedication(
                                            condition.id,
                                            medication.id,
                                            {
                                              frequency: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full p-1 border border-gray-300 rounded text-lg"
                                      >
                                        {MOCK_MASTERS.frequencies.map(
                                          (freq) => (
                                            <option key={freq} value={freq}>
                                              {freq}
                                            </option>
                                          )
                                        )}
                                      </select>
                                    </td>
                                    <td className="p-2">
                                      <select
                                        value={medication.route}
                                        onChange={(e) =>
                                          updateMedication(
                                            condition.id,
                                            medication.id,
                                            {
                                              route: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full p-1 border border-gray-300 rounded text-lg"
                                      >
                                        {MOCK_MASTERS.routes.map((route) => (
                                          <option key={route} value={route}>
                                            {route}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="p-2">
                                      <select
                                        value={medication.compliance}
                                        onChange={(e) =>
                                          updateMedication(
                                            condition.id,
                                            medication.id,
                                            {
                                              compliance: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full p-1 border border-gray-300 rounded text-lg"
                                      >
                                        {MOCK_MASTERS.compliance.map((comp) => (
                                          <option key={comp} value={comp}>
                                            {comp}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="p-2">
                                      <button
                                        onClick={() =>
                                          removeMedication(
                                            condition.id,
                                            medication.id
                                          )
                                        }
                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Allergies Section
interface AllergiesSectionProps {
  data: Allergy;
  onChange: (data: Allergy) => void;
  allMeds: MedicationDetails[];
}

export const AllergiesSection: React.FC<AllergiesSectionProps> = ({
  data,
  onChange,
  allMeds,
}) => {
  const [isExpanded, setIsExpanded] = useState(data.hasAllergies);

  const toggleAllergies = (hasAllergies: boolean) => {
    onChange({ ...data, hasAllergies });
    setIsExpanded(hasAllergies);
  };

  const updateAllergyType = (type: "Drug" | "Food" | "Other") => {
    const newTypes = data.type.includes(type)
      ? data.type.filter((t) => t !== type)
      : [...data.type, type];
    onChange({ ...data, type: newTypes });
  };

  // Check for drug conflicts
  const drugConflicts = useMemo(() => {
    if (!data.hasAllergies || !data.type.includes("Drug") || !data.substance) {
      return [];
    }
    const allergySubstance = data.substance.toLowerCase();
    // Simple mock conflict check: checks if the substance is part of any medication name
    return allMeds.filter((med) =>
      med.name.toLowerCase().includes(allergySubstance)
    );
  }, [data, allMeds]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <Syringe className="w-5 h-5 text-[#012e58]" />
            <h2 className="text-lg font-semibold text-[#0B2D4D]">
              4. Allergies (Drug, Food, Other)
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 text-md font-semibold rounded-full ${
                data.hasAllergies
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "bg-green-100 text-green-700 border border-green-200"
              }`}
            >
              {data.hasAllergies ? "Yes" : "No"}
            </span>
            <div className="p-1 rounded-full bg-gray-200">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <label className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={data.hasAllergies}
            onChange={(e) => toggleAllergies(e.target.checked)}
            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
          />
          <span className="text-lg font-medium text-[#0B2D4D]">
            Patient has known allergies
          </span>
        </label>

        {isExpanded && data.hasAllergies && (
          <div className="space-y-4 pt-3 border-t border-gray-200">
            {/* Drug Conflict Banner */}
            {drugConflicts.length > 0 && (
              <div className="flex items-start bg-red-100 text-red-800 p-3 rounded-md border border-red-200">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-lg">
                    Drug Conflict Detected!
                  </p>
                  <p className="text-lg">
                    Patient is allergic to **"{data.substance}"** but is
                    currently prescribed: **
                    {drugConflicts.map((med) => med.name).join(", ")}**
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Allergy Types */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Allergy Type(s)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["Drug", "Food", "Other"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateAllergyType(type)}
                      className={`px-3 py-1 text-lg rounded-full border transition-colors ${
                        data.type.includes(type)
                          ? "bg-red-500 text-white border-red-600"
                          : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Substance */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Substance/Allergen
                </label>
                <input
                  type="text"
                  value={data.substance}
                  onChange={(e) =>
                    onChange({ ...data, substance: e.target.value })
                  }
                  className={InputStyle}
                  placeholder="e.g., Penicillin, Peanuts, Latex"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reaction */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Reaction Description
                </label>
                <input
                  type="text"
                  value={data.reaction}
                  onChange={(e) =>
                    onChange({ ...data, reaction: e.target.value })
                  }
                  className={InputStyle}
                  placeholder="e.g., Hives, Swelling, Difficulty breathing"
                  maxLength={160}
                />
                <p className="text-md text-gray-500 mt-1">
                  {data.reaction.length}/160 characters
                </p>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Severity Level
                </label>
                <div className="flex space-x-2">
                  {MOCK_MASTERS.severity.map((severity) => (
                    <button
                      key={severity}
                      type="button"
                      onClick={() => onChange({ ...data, severity })}
                      className={`px-3 py-1 text-lg rounded-full border transition-colors ${
                        data.severity === severity
                          ? severity === "Severe"
                            ? "bg-red-500 text-white border-red-600"
                            : severity === "Moderate"
                            ? "bg-yellow-500 text-white border-yellow-600"
                            : "bg-green-500 text-white border-green-600"
                          : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Past History Section (Simplified)
interface PastHistorySectionProps {
  data: PastHistory;
  onChange: (data: PastHistory) => void;
  chronicMeds: MedicationDetails[];
}

export const PastHistorySection: React.FC<PastHistorySectionProps> = ({
  data,
  onChange,
  chronicMeds,
}) => {
  const copyFromChronic = () => {
    // Merge, avoiding duplicates
    const newMeds = [...data.currentMedications];
    chronicMeds.forEach((chronicMed) => {
      if (!newMeds.some((med) => med.name === chronicMed.name)) {
        newMeds.push({ ...chronicMed, id: Date.now().toString() });
      }
    });
    onChange({ ...data, currentMedications: newMeds });
  };

  const handleAddIllness = (value: string) => {
    const newIllness = value.trim();
    if (
      data.illnesses.length < 5 &&
      newIllness &&
      !data.illnesses.includes(newIllness)
    ) {
      onChange({
        ...data,
        illnesses: [...data.illnesses, newIllness],
      });
      return true; // Indicates success
    }
    return false;
  };

  const handleRemoveIllness = (illness: string) => {
    onChange({
      ...data,
      illnesses: data.illnesses.filter((i) => i !== illness),
    });
  };

  // --- NEW MEDICATION HANDLERS ---

  const handleAddMedicationRow = () => {
    const newMedication: MedicationDetails = {
      id: Date.now().toString(),
      name: "",
      dose: "",
      frequency: "OD",
      route: "Oral",
      duration: "Unknown",
      compliance: "Taking",
      notes: "",
    };
    onChange({
      ...data,
      currentMedications: [...data.currentMedications, newMedication],
    });
  };

  const handleUpdateMedication = (
    medId: string,
    field: keyof MedicationDetails,
    value: string
  ) => {
    const updatedMeds = data.currentMedications.map((med) => {
      if (med.id === medId) {
        return { ...med, [field]: value };
      }
      return med;
    });
    onChange({ ...data, currentMedications: updatedMeds });
  };

  const handleRemoveMedication = (medId: string) => {
    const updatedMeds = data.currentMedications.filter(
      (med) => med.id !== medId
    );
    onChange({ ...data, currentMedications: updatedMeds });
  };
  // --- END NEW MEDICATION HANDLERS ---

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-[#012e58]" />
          <h2 className="text-lg font-semibold text-[#0B2D4D]">
            5. Past & Medication History
          </h2>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Past History Items as Chips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Past Illnesses (Max 5)
            </label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
              {data.illnesses.map((illness, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-md rounded-full border border-blue-200"
                >
                  {illness}
                  <button
                    onClick={() => handleRemoveIllness(illness)}
                    className="ml-1 text-blue-600 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              className={InputStyle}
              placeholder="Add illness (press Enter)"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  if (handleAddIllness(e.currentTarget.value)) {
                    e.currentTarget.value = "";
                  }
                }
              }}
              disabled={data.illnesses.length >= 5}
            />
          </div>

          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Past Surgeries
            </label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
              {data.surgeries.map((surgery, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-100 text-purple-800 text-md rounded-full border border-purple-200"
                >
                  {surgery.name} ({surgery.year})
                </span>
              ))}
            </div>
            <input
              type="text"
              className={InputStyle}
              placeholder="Surgery name + year (e.g., Appy 2020)"
            />
          </div>

          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Past Hospitalizations
            </label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
              {data.hospitalizations.map((hosp, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-orange-100 text-orange-800 text-md rounded-full border border-orange-200"
                >
                  {hosp.reason} ({hosp.year})
                </span>
              ))}
            </div>
            <input
              type="text"
              className={InputStyle}
              placeholder="Reason + year (e.g., Pneumonia 2019)"
            />
          </div>
        </div>

        {/* Current Medications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Pill className="w-5 h-5 text-[#012e58]" />
              <h3 className="text-md font-semibold text-[#0B2D4D]">
                Current Medications
              </h3>
            </div>
            {chronicMeds.length > 0 && (
              <button
                onClick={copyFromChronic}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-lg"
              >
                <Copy className="w-4 h-4" />
                <span>Copy from Chronic ({chronicMeds.length})</span>
              </button>
            )}
          </div>

          {/* === START: NEW MEDICATION TABLE === */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <datalist id="medication-list">
              {MOCK_MASTERS.medications.map((med) => (
                <option key={med} value={med} />
              ))}
            </datalist>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-md text-gray-600">
                    <th className="text-left p-2 w-[25%]">Medication</th>
                    <th className="text-left p-2 w-[15%]">Dose</th>
                    <th className="text-left p-2 w-[15%]">Frequency</th>
                    <th className="text-left p-2 w-[15%]">Route</th>
                    <th className="text-left p-2 w-[20%]">Compliance</th>
                    <th className="text-center p-2 w-[10%]">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.currentMedications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-6 text-gray-500">
                        No current medications listed.
                      </td>
                    </tr>
                  ) : (
                    data.currentMedications.map((medication) => (
                      <tr key={medication.id}>
                        <td className="p-2">
                          <input
                            type="text"
                            list="medication-list"
                            value={medication.name}
                            onChange={(e) =>
                              handleUpdateMedication(
                                medication.id,
                                "name",
                                e.target.value
                              )
                            }
                            className={`${InputStyle} text-md`}
                            placeholder="Medication name"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={medication.dose}
                            onChange={(e) =>
                              handleUpdateMedication(
                                medication.id,
                                "dose",
                                e.target.value
                              )
                            }
                            className={`${InputStyle} text-md`}
                            placeholder="e.g., 500mg"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={medication.frequency}
                            onChange={(e) =>
                              handleUpdateMedication(
                                medication.id,
                                "frequency",
                                e.target.value
                              )
                            }
                            className={`${InputStyle} text-md`}
                          >
                            {MOCK_MASTERS.frequencies.map((freq) => (
                              <option key={freq} value={freq}>
                                {freq}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={medication.route}
                            onChange={(e) =>
                              handleUpdateMedication(
                                medication.id,
                                "route",
                                e.target.value
                              )
                            }
                            className={`${InputStyle} text-md`}
                          >
                            {MOCK_MASTERS.routes.map((route) => (
                              <option key={route} value={route}>
                                {route}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={medication.compliance}
                            onChange={(e) =>
                              handleUpdateMedication(
                                medication.id,
                                "compliance",
                                e.target.value
                              )
                            }
                            className={`${InputStyle} text-md`}
                          >
                            {MOCK_MASTERS.compliance.map((comp) => (
                              <option key={comp} value={comp}>
                                {comp}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() =>
                              handleRemoveMedication(medication.id)
                            }
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleAddMedicationRow}
              className="w-full mt-2 flex items-center justify-center space-x-1.5 p-2 text-md font-medium text-[#012e58] bg-gray-50 hover:bg-gray-100 border-t border-gray-200"
            >
              <Plus className="w-3 h-3" />
              <span>Add Medication Row</span>
            </button>
          </div>
          {/* === END: NEW MEDICATION TABLE === */}
        </div>

        {/* Overall Compliance */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Overall Medication Compliance
          </label>
          <select
            value={data.overallCompliance}
            onChange={(e) =>
              onChange({ ...data, overallCompliance: e.target.value })
            }
            className={`${InputStyle} w-full md:w-1/3`}
          >
            {MOCK_MASTERS.compliance.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// Records Upload Section with MOCK Upload/OCR Logic
interface RecordsUploadSectionProps {
  extractTextFromFile: (file: File) => Promise<string>;
  onRecordsChange: (records: Record<string, string>) => void;
}

export const RecordsUploadSection: React.FC<RecordsUploadSectionProps> = ({
  extractTextFromFile,
  onRecordsChange,
}) => {
  const [activeTab, setActiveTab] = useState("lab-reports");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
    }>;
  }>({
    "lab-reports": [],
    radiology: [],
    prescriptions: [],
    "discharge-summaries": [],
    other: [],
  });

  // Local state to store the extracted text content per file, categorized by tab.
  const [extractedContents, setExtractedContents] = useState<
    Record<string, string>
  >({});

  const categories = [
    { id: "lab-reports", label: "Lab Reports", icon: "🧪" },
    { id: "radiology", label: "Radiology", icon: "🩻" },
    { id: "prescriptions", label: "Prescriptions", icon: "💊" },
    { id: "discharge-summaries", label: "Discharge", icon: "📋" },
    { id: "other", label: "Other", icon: "📄" },
  ];

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // 1. Extract text using the passed-in logic (handles PDF/DOCX/Image OCR)
      const textContent = await extractTextFromFile(file);

      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // 2. Update the file list state
      setUploadedFiles((prev) => {
        const newUploadedFiles = {
          ...prev,
          [activeTab]: [...(prev[activeTab] || []), newFile],
        };
        return newUploadedFiles;
      });

      // 3. Update the extracted contents state
      const newExtractedContents = {
        ...extractedContents,
        [activeTab]:
          (extractedContents[activeTab] || "") +
          `\n\n--- FILE: ${newFile.name} ---\n${textContent}`,
      };
      setExtractedContents(newExtractedContents);
      onRecordsChange(newExtractedContents);
    } catch (error) {
      console.error("Error processing file for OCR/Extraction:", error);
      alert(`File processing failed: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
      // Clear the input value so the onChange event fires again if the user selects the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (categoryId: string, fileId: string) => {
    // NOTE: For simplicity, removing a file clears ALL extracted content in that category.
    // A robust solution would track content per file ID.
    setUploadedFiles((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].filter((file) => file.id !== fileId),
    }));

    setExtractedContents((prev) => ({
      ...prev,
      [categoryId]: "", // Clear all extracted text for this category
    }));
    onRecordsChange({
      ...extractedContents,
      [categoryId]: "",
    });
  };

  const currentFileCount = uploadedFiles[activeTab]?.length || 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Upload className="w-5 h-5 text-[#012e58]" />
          <h2 className="text-lg font-semibold text-[#0B2D4D]">
            6. Previous Records Upload (OCR + NLP)
          </h2>
        </div>
      </div>

      <div className="p-4">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          // 💡 UPDATED ACCEPT FOR OCR/EXTRACTION
          accept=".pdf,.docx,.txt,image/*"
          // To allow multiple files, uncomment the 'multiple' attribute:
          // multiple
        />

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
          {categories.map((category) => {
            const fileCount = uploadedFiles[category.id]?.length || 0;
            return (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-lg rounded-t-md border-b-2 transition-colors ${
                  activeTab === category.id
                    ? "border-[#012e58] text-[#012e58] bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                {fileCount > 0 && (
                  <span className="px-1.5 py-0.5 text-md bg-blue-100 text-blue-700 rounded-full">
                    {fileCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Upload Area */}
        <div className="mb-4">
          <div
            className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 transition-colors cursor-pointer ${
              isProcessing ? "bg-blue-100" : "hover:bg-gray-100"
            }`}
            onClick={!isProcessing ? triggerFileUpload : undefined}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader className="w-8 h-8 text-[#012e58] mx-auto mb-2 animate-spin" />
                <p className="text-lg text-[#012e58] mb-1 font-medium">
                  Processing File...
                </p>
                <p className="text-md text-gray-500">
                  Extracting text content (OCR/Embedded)
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-lg text-gray-600 mb-2 font-medium">
                  Upload {categories.find((c) => c.id === activeTab)?.label}{" "}
                  files
                </p>
                <p className="text-md text-gray-500 mb-3">
                  Drag and drop or **click to browse** • PDF, DOCX, JPG, PNG
                </p>
                <div className="px-4 py-2 bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors text-lg inline-block">
                  Browse Files
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Files */}
        {currentFileCount > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-[#0B2D4D]">
              Uploaded Files ({currentFileCount})
            </h4>
            {uploadedFiles[activeTab]?.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📄</div>
                  <div>
                    <p className="text-lg font-medium text-[#0B2D4D]">
                      {file.name}
                    </p>
                    <p className="text-md text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => removeFile(activeTab, file.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Text Preview Box (New addition for feedback) */}
            <div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
              <h5 className="text-md font-semibold text-[#0B2D4D] mb-2">
                Extracted Content Preview (Last Upload)
              </h5>
              <p className="text-md text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {extractedContents[activeTab]
                  ?.split("\n\n")
                  .pop()
                  ?.substring(0, 500) ||
                  "No text extracted yet for the last file."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// AI Clinical Summary Section
interface AiClinicalSummarySectionProps {
  summary: string;
  isLoading: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onGenerate: () => void;
}

export const AiClinicalSummarySection: React.FC<
  AiClinicalSummarySectionProps
> = ({ summary, isLoading, isExpanded, onToggleExpand, onGenerate }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    // Could add a toast notification here
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-[#012e58]" />
            <h2 className="text-lg font-semibold text-[#0B2D4D]">
              7. AI Clinical Summary (Vitals + Complaints)
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {summary && (
              <>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg"
                >
                  <ClipboardCopy className="w-4 h-4" />
                  <span>Copy to EMR</span>
                </button>
                <button
                  onClick={onToggleExpand}
                  className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  {isExpanded ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
            <button
              onClick={onGenerate}
              disabled={isLoading}
              className="flex items-center space-x-1 px-3 py-1 bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors text-lg disabled:bg-gray-400"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
              <span>
                {isLoading ? "Generating..." : "Generate Clinical Summary"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {!summary && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No AI clinical summary generated yet</p>
            <p className="text-lg">
              Click "Generate Clinical Summary" to analyze current vitals and
              complaints.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-8 h-8 animate-spin text-[#012e58] mr-3" />
            <span className="text-gray-600">
              Analyzing patient data and generating summary...
            </span>
          </div>
        )}

        {summary && isExpanded && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <FormattedAiSummary summary={summary} />
          </div>
        )}

        {summary && !isExpanded && (
          <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
            <p className="text-lg text-gray-600 truncate">
              {summary.substring(0, 150)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 💡 NEW: Previous Medical History Summary Section (Section 8)
// ---------------------------------------------------------------------------------------------------------------------

export interface PreviousMedicalHistorySummarySectionProps {
  summary: string;
  isLoading: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onGenerate: () => void;
}

export const PreviousMedicalHistorySummarySection: React.FC<
  PreviousMedicalHistorySummarySectionProps
> = ({ summary, isLoading, isExpanded, onToggleExpand, onGenerate }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-[#0B2D4D]">
              8. Previous Medical History Summary (Records + History)
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {summary && (
              <>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-lg"
                >
                  <ClipboardCopy className="w-4 h-4" />
                  <span>Copy to EMR</span>
                </button>
                <button
                  onClick={onToggleExpand}
                  className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  {isExpanded ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
            <button
              onClick={onGenerate}
              disabled={isLoading}
              className="flex items-center space-x-1 px-3 py-1 bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors text-lg disabled:bg-gray-400"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
              <span>
                {isLoading ? "Generating..." : "Generate History Summary"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {!summary && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No AI history summary generated yet</p>
            <p className="text-lg">
              Click "Generate History Summary" to summarize uploaded documents
              and structured history.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-8 h-8 animate-spin text-purple-600 mr-3" />
            <span className="text-gray-600">
              Analyzing uploaded records and generating summary...
            </span>
          </div>
        )}

        {summary && isExpanded && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <FormattedAiSummary summary={summary} />
          </div>
        )}

        {summary && !isExpanded && (
          <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
            <p className="text-lg text-gray-600 truncate">
              {summary.substring(0, 150)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Re-export all necessary components
export {
  // PresentingComplaintsSection,
  // ChronicConditionsSection,
  // AllergiesSection,
  // PastHistorySection,
  // RecordsUploadSection,
  FormattedAiSummary,
};
