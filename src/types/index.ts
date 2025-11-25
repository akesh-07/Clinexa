// src/types/index.ts

export interface Patient {
  id: string;
  uhid: string;
  fullName: string;
  age: number;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  contactNumber: string;
  email: string;
  address: string;
  abhaId?: string;
  patientType: "OPD" | "IPD" | "Emergency";
  visitType: "Appointment" | "Walk-in";
  paymentMethod: "Cash" | "Card" | "Insurance" | "Online";
  consultationPackage: string;
  preferredLanguage: string;
  doctorAssigned: string;
  chronicConditions: string[];
  waitTime?: number;
  status: "Waiting" | "In Progress" | "Completed";
  createdAt: any;
  token: string;
}

export interface Vitals {
  patientId: string;
  patientUhid: string;
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
  // ✅ NEW: Added custom vitals array
  customVitals?: {
    id: string;
    name: string;
    value: string;
    unit: string;
  }[];
  recordedAt: any;
  recordedBy: string;
}

export interface VitalsState {
  weight: string;
  height: string;
  bmi: string;
  pulse: string;
  bloodPressure: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  riskFlags: {
    diabetes: boolean;
    heartDisease: boolean;
    kidney: boolean;
  };
}

export interface MedicationDetails {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  route: string;
  duration: { years: number; months: number } | "Unknown";
  compliance: string;
  notes: string;
}

export interface ChronicCondition {
  id: string;
  name: string;
  duration: { years: number; months: number } | "Unknown";
  onMedication: "Yes" | "No" | "Unknown";
  medications: MedicationDetails[];
}

export interface Complaint {
  id: string;
  complaint: string;
  severity: "Mild" | "Moderate" | "Severe" | string;
  duration: { value: string; unit: "h" | "d" | "w" | "mo" | "yr" | "Unknown" };
  specialty: string;
  redFlagTriggered: boolean;
}

export interface Allergy {
  hasAllergies: boolean;
  type: ("Drug" | "Food" | "Other")[];
  substance: string;
  reaction: string;
  severity: "Mild" | "Moderate" | "Severe" | string;
}

export interface PastHistory {
  illnesses: string[];
  surgeries: { name: string; year: string }[];
  hospitalizations: { reason: string; year: string }[];
  currentMedications: MedicationDetails[];
  overallCompliance: "Compliant" | "Missed" | "Ran out" | "Unknown" | string;
}

export interface PreOPDIntakeData {
  complaints: Complaint[];
  chronicConditions: ChronicCondition[];
  allergies: Allergy;
  pastHistory: PastHistory;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  symptoms: string[];
  duration: string;
  aggravatingFactors: string[];
  examination: {
    general: string[];
    systemic: string[];
  };
  investigations: string[];
  diagnosis: string;
  prescriptions: Prescription[];
  advice: string[];
  followUp?: {
    duration: number;
    unit: "Days" | "Months" | "Years";
  };
  createdAt: string;
}

export interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Payment {
  id: string;
  patientId: string;
  uhid: string;
  services: string[];
  amount: number;
  paymentMode: "Cash" | "Card" | "Insurance" | "Online";
  status: "Paid" | "Pending" | "Partial";
  date: string;
}

export interface Analytics {
  dailyAppointments: number;
  totalPatients: number;
  completedConsultations: number;
  pendingPayments: number;
  topSymptoms: { name: string; count: number }[];
  topDiagnoses: { name: string; count: number }[];
  topMedications: { name: string; count: number }[];
  labTests: { name: string; count: number }[];
  revenue: {
    today: number;
    thisMonth: number;
    trend: number;
  };
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  source: "ai" | "doctor"; // <--- UPDATED: Essential for distinguishing colors
}

export type NavigationItem =
  | "dashboard"
  | "registration"
  | "queue"
  | "vitals"
  | "doctor"
  | "prescription"
  | "pharmacy"
  | "billing"
  | "analytics";
