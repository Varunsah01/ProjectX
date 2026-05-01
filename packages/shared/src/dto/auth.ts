export interface User {
  id: string;
  organizationId: string;
  role: "technician";
  name: string;
  email: string;
  phone: string;
  territory: string;
  status: string;
  specialization: string;
  activeJobs: number;
  completedToday: number;
  totalJobs: number;
  avgRating: number;
  completedThisWeek: number;
  completedThisMonth: number;
  joinDate: string;
  skills: string[];
}

export type LoginIdentifierType = "phone" | "employee_id";
export type LoginAuthMethod = "password" | "otp";

export interface LoginRequest {
  identifierType: LoginIdentifierType;
  identifier: string;
  authMethod: LoginAuthMethod;
  secret: string;
}

export interface LoginResponse {
  token: string;
  csrfToken: string;
  user: User;
}

export interface MeResponse {
  user: User;
  csrfToken?: string;
}
