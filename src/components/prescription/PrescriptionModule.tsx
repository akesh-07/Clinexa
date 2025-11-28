// src/components/prescription/PrescriptionModule.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Medication, Patient } from "../../types";
import { FileText, X, Plus, Trash2, Bot } from "lucide-react";
import { usePrescription } from "../../contexts/PrescriptionContext";

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

const PrescriptionModule: React.FC<{
  selectedPatient: Patient;
  consultation: any;
}> = ({ selectedPatient, consultation }) => {
  const { medications, setMedications } = usePrescription();

  const [advice, setAdvice] = useState({
    general: "",
    diet: [] as string[],
    followUp: {
      enabled: false,
      duration: "",
      unit: "Days" as "Days" | "Months" | "Years",
    },
  });

  // Custom diet input state
  const [customDiet, setCustomDiet] = useState("");

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

  const commonMedications = [
    "Paracetamol",
    "Ibuprofen",
    "Metformin",
    "Lisinopril",
    "Omeprazole",
    "Aspirin",
    "Atorvastatin",
    "Amoxicillin",
    "Losartan",
    "Pantoprazole",
  ];

  const dosageOptions = [
    "250mg",
    "500mg",
    "1g",
    "5mg",
    "10mg",
    "25mg",
    "50mg",
    "100mg",
  ];
  const frequencyOptions = [
    "Once daily",
    "Twice daily",
    "Thrice daily",
    "Four times daily",
    "As needed",
  ];
  const durationOptions = [
    "3 days",
    "5 days",
    "7 days",
    "10 days",
    "2 weeks",
    "1 month",
  ];

  const dietPlans = [
    "Diabetic Diet - Low sugar, controlled carbs",
    "CKD Diet - Low protein, restricted potassium",
    "Hypertension Diet - Low sodium, DASH diet",
    "Heart Healthy Diet - Low saturated fat",
    "Weight Loss Diet - Calorie controlled",
  ];

  const addMedication = () => {
    const newId = (medications.length + 1).toString();
    setMedications([
      ...medications,
      {
        id: newId,
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
        source: "doctor", // <--- DEFAULT SOURCE
      },
    ]);
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter((med) => med.id !== id));
  };

  const updateMedication = (
    id: string,
    field: keyof Medication,
    value: string
  ) => {
    setMedications(
      medications.map((med) =>
        med.id === id ? { ...med, [field]: value } : med
      )
    );
  };

  const addQuickDietPlan = (plan: string) => {
    if (!advice.diet.includes(plan)) {
      setAdvice((prev) => ({ ...prev, diet: [...prev.diet, plan] }));
    }
  };

  const handleAddCustomDiet = () => {
    const newAdvice = customDiet.trim();
    if (newAdvice && !advice.diet.includes(newAdvice)) {
      setAdvice((prev) => ({
        ...prev,
        diet: [...prev.diet, newAdvice],
      }));
      setCustomDiet("");
    }
  };

  const handleRemoveDiet = (plan: string) => {
    setAdvice((prev) => ({
      ...prev,
      diet: prev.diet.filter((d) => d !== plan),
    }));
  };

  const getRowClass = (source: "ai" | "doctor") => {
    if (source === "ai") {
      return "bg-purple-100 hover:bg-purple-200 border-l-4 border-purple-600 transition-colors";
    }
    return "bg-green-100 hover:bg-green-200 border-l-4 border-green-600 transition-colors";
  };

  return (
    <div className="space-y-3">
      {/* Medications Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[#0B2D4D]">Medications</h3>
          <button
            onClick={addMedication}
            className="flex items-center space-x-1 px-2 py-1 bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors text-md"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr className="text-xs uppercase text-gray-600">
                <th className="text-left p-2 w-[20%] font-semibold">Name</th>
                <th className="text-left p-2 w-[15%] font-semibold">Dosage</th>
                <th className="text-left p-2 w-[15%] font-semibold">
                  Frequency
                </th>
                <th className="text-left p-2 w-[15%] font-semibold">
                  Duration
                </th>
                <th className="text-left p-2 w-[30%] font-semibold">
                  Instructions
                </th>
                <th className="text-center p-2 w-[5%] font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medications.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center p-4 text-gray-500 text-sm"
                  >
                    No medications added. Click 'Add' to start prescription.
                  </td>
                </tr>
              ) : (
                medications.map((medication) => {
                  const focusRingClass =
                    medication.source === "ai"
                      ? "focus:ring-purple-500 focus:border-purple-500"
                      : "focus:ring-green-500 focus:border-green-500";

                  return (
                    <tr
                      key={medication.id}
                      className={getRowClass(medication.source)}
                    >
                      <td className="p-2">
                        <input
                          type="text"
                          list={`medications-${medication.id}`}
                          value={medication.name}
                          onChange={(e) =>
                            updateMedication(
                              medication.id,
                              "name",
                              e.target.value
                            )
                          }
                          className={`w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 text-gray-900 bg-white ${focusRingClass}`}
                          placeholder="Medication"
                        />
                        <datalist id={`medications-${medication.id}`}>
                          {commonMedications.map((med) => (
                            <option key={med} value={med} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          list={`dosage-${medication.id}`}
                          value={medication.dosage}
                          onChange={(e) =>
                            updateMedication(
                              medication.id,
                              "dosage",
                              e.target.value
                            )
                          }
                          className={`w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 text-gray-900 bg-white ${focusRingClass}`}
                          placeholder="500mg"
                        />
                        <datalist id={`dosage-${medication.id}`}>
                          {dosageOptions.map((dose) => (
                            <option key={dose} value={dose} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-2">
                        <select
                          value={medication.frequency}
                          onChange={(e) =>
                            updateMedication(
                              medication.id,
                              "frequency",
                              e.target.value
                            )
                          }
                          className={`w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 text-gray-900 bg-white ${focusRingClass}`}
                        >
                          <option value="">Select</option>
                          {frequencyOptions.map((freq) => (
                            <option key={freq} value={freq}>
                              {freq}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          value={medication.duration}
                          onChange={(e) =>
                            updateMedication(
                              medication.id,
                              "duration",
                              e.target.value
                            )
                          }
                          className={`w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 text-gray-900 bg-white ${focusRingClass}`}
                        >
                          <option value="">Select</option>
                          {durationOptions.map((dur) => (
                            <option key={dur} value={dur}>
                              {dur}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={medication.instructions}
                          onChange={(e) =>
                            updateMedication(
                              medication.id,
                              "instructions",
                              e.target.value
                            )
                          }
                          className={`w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 text-gray-900 bg-white ${focusRingClass}`}
                          placeholder="After meals"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeMedication(medication.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advice and Diet Row (RESIZABLE) */}
      <div ref={containerRef} className="flex flex-col lg:flex-row gap-3">
        {/* General Advice */}
        <div
          className="bg-white rounded-lg border border-gray-200 p-3 h-full"
          style={{ width: isDesktop ? `${split}%` : "100%" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-[#0B2D4D]">
              General Advice
            </h3>
            <button className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors text-md">
              <Bot className="w-3 h-3" />
              <span>AI Suggest</span>
            </button>
          </div>
          <textarea
            value={advice.general}
            onChange={(e) =>
              setAdvice((prev) => ({ ...prev, general: e.target.value }))
            }
            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1a4b7a] focus:border-transparent text-md resize-none"
            rows={4}
            placeholder="Enter general advice for the patient..."
          />
        </div>

        <HorizontalResizeHandle onMouseDown={handleMouseDown} />

        {/* Diet Plan */}
        <div
          className="bg-white rounded-lg border border-gray-200 p-3 h-full"
          style={{ width: isDesktop ? `calc(${100 - split}% - 1rem)` : "100%" }}
        >
          <h3 className="text-lg font-semibold text-[#0B2D4D] mb-2">
            Diet Plan
          </h3>
          <div className="flex flex-wrap gap-2 mb-4 p-2 border border-gray-100 rounded-md bg-[#F8F9FA]">
            {dietPlans.map((plan) => {
              const isSelected = advice.diet.includes(plan);
              return (
                <button
                  key={plan}
                  type="button"
                  onClick={() => addQuickDietPlan(plan)}
                  disabled={isSelected}
                  className={`px-3 py-1 text-xs rounded-full border transition-all duration-150 text-left bg-white text-gray-700 border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:bg-green-100 disabled:text-green-800`}
                >
                  {isSelected ? "✓ " : "+ "}
                  {plan}
                </button>
              );
            })}
          </div>
          <div className="flex items-stretch gap-2 mb-4">
            <input
              type="text"
              value={customDiet}
              onChange={(e) => setCustomDiet(e.target.value)}
              placeholder="Enter custom diet advice..."
              className="flex-grow px-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1a4b7a] focus:border-transparent text-sm"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomDiet();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomDiet}
              className="flex-shrink-0 px-3 py-1.5 text-sm bg-[#012e58] text-white rounded-md hover:bg-[#1a4b7a] transition-colors"
            >
              Add Custom
            </button>
          </div>
          <div className="space-y-2">
            <h4 className="text-md font-medium text-[#1a4b7a] mb-1">
              Selected Diet Advice:
            </h4>
            {advice.diet.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No diet advice added yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {advice.diet.map((plan) => (
                  <span
                    key={plan}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200"
                  >
                    {plan}
                    <button
                      type="button"
                      onClick={() => handleRemoveDiet(plan)}
                      className="ml-1.5 text-blue-600 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Follow-up Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <h3 className="text-lg font-semibold text-[#0B2D4D] mb-2">
          Follow-up Schedule
        </h3>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={advice.followUp.enabled}
              onChange={(e) =>
                setAdvice((prev) => ({
                  ...prev,
                  followUp: { ...prev.followUp, enabled: e.target.checked },
                }))
              }
              className="w-3 h-3 text-[#012e58] border-gray-300 rounded focus:ring-[#1a4b7a]"
            />
            <span className="text-md text-[#1a4b7a]">Schedule follow-up</span>
          </label>
          {advice.followUp.enabled && (
            <>
              <input
                type="number"
                min="1"
                value={advice.followUp.duration}
                onChange={(e) =>
                  setAdvice((prev) => ({
                    ...prev,
                    followUp: { ...prev.followUp, duration: e.target.value },
                  }))
                }
                className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1a4b7a] focus:border-transparent text-md"
                placeholder="1"
              />
              <select
                value={advice.followUp.unit}
                onChange={(e) =>
                  setAdvice((prev) => ({
                    ...prev,
                    followUp: {
                      ...prev.followUp,
                      unit: e.target.value as "Days" | "Months" | "Years",
                    },
                  }))
                }
                className="px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1a4b7a] focus:border-transparent text-md"
              >
                <option value="Days">Days</option>
                <option value="Months">Months</option>
                <option value="Years">Years</option>
              </select>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModule;
