// Enum pour les types de Notification
export enum NotificationType {
    EMAIL = "email",
    SMS = "sms",
    ALERTE_INTERNE = "alerte interne",
}

// Enum pour les statuts de AdministrativeTask
export enum TaskStatus {
    EN_ATTENTE = "en attente",
    TERMINEE = "terminée",
    ECHOUÉE = "échouée",
}

// Interface pour Doctor
export interface Doctor {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    contact: string;
    status: boolean;
}

export interface Stat {
    rdv_today: number;
    rdv_future: number;
    future_rdv: {
        id: number;
        first_name: string;
        last_name: string;
        date: string;
        status: string;
    }[]
}

// Interface pour User
export interface User {
    id: number;
    email: string;
    first_name: string,
    last_name: string,
}

// Interface pour AdministrativeTask
export interface AdministrativeTask {
    id: number;
    type: string;
    dateExecution: string; // ISO string (ex. "2025-04-01T10:00:00Z")
    status: TaskStatus;
    // Méthodes: plantifie(): void, générer(): void
}

// Interface pour Appointment
export interface Appointment {
    id: number;
    date: string; // ISO string
    dateOfBirth: string; // ISO string
}

export interface Consultation {
    id: string;
    patient_id: string;
    doctor_id: string;
    date: string;
    doctor_remarks: string,
    prescriptions: string,
    testResults: string,
    type? : string,
    status: "confirmed" | "scheduled" | "cancelled";
    patient: {
        first_name: string;
        last_name: string;
    };
    doctor: {
        first_name: string;
        last_name: string;
    };
    test_result?: {
        proteinuria: number | null;
        albumin: number | null;
        gfr: number | null;
        diastolic_bp: number | null;
        systolic_bp: number | null;
        hemoglobin: number | null;
        urea: number | null;
        creatinine: number | null;
    }
}

// Interface pour Patient
export interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    dateOfBirth: string;
    email?: string;
    gender: "Homme"|"Femme"|"Autre";
    phone: string;
    is_archived?: boolean
    address: string;
    blood_group: "A+"| "A-"| "B+"| "B-"| "AB+"| "AB-"| "O+"| "O-"|"";
    medical_history: string;
    current_treatments: string;
    stage_mrc: number;
    uniqueId: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    medical_data?: MedicalData;
    administrative_data?: AdministrativeData

}

// Interface pour MedicalData
export interface MedicalData {
    id: number;
    blood_group: "A+"| "A-"| "B+"| "B-"| "AB+"| "AB-"| "O+"| "O-"|"";
    medical_history: string;
    current_treatments: string;
    stage_mrc: number;
}

// Interface pour WorkFlow
export interface WorkFlow {
    id: number;
    name: string;
    description: string;
    steps: string;
    stage_mrc: number;
    // Méthode: fait(): void
}

// Interface pour Notification
export interface Notification {
    id: number;
    address: string; // Email ou numéro de téléphone
    message: string;
    type: NotificationType;
    sendDate: string; // ISO string
}

// Interface pour AdministrativeData
export interface AdministrativeData {
    id: number;
    record_number: string;
    referring_doctor: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
}

// Interface pour Report
export interface Report {
    id: number;
    date: string; // ISO string
}

// Types pour les relations (optionnel, pour référence)
export interface DoctorWithRelations extends Doctor {
    patients?: Patient[];
    consultations?: Consultation[];
    workflows?: WorkFlow[];
}

export interface UserWithRelations extends User {
    administrativeTasks?: AdministrativeTask[];
}

export interface PatientWithRelations extends Patient {
    appointments?: Appointment[];
    medicalData?: MedicalData;
    consultations?: Consultation[];
    administrativeTasks?: AdministrativeTask[];
    workflows?: WorkFlow[];
    administrativeData?: AdministrativeData;
}

export interface AdministrativeTaskWithRelations extends AdministrativeTask {
    notifications?: Notification[];
}

export interface ConsultationWithRelations extends Consultation {
    reports?: Report[];
}