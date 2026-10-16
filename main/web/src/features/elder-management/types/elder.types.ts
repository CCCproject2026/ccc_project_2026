import type {
	CreateElderInput,
	ElderStatus,
	Gender,
	UpdateElderInput,
} from "@/shared/validation/schemas";

export type { CreateElderInput, ElderStatus, Gender, UpdateElderInput };

export interface Elder {
  id: string;
  firstName: string;
  lastName: string;
  roomNumber: string;
  status: ElderStatus;
  dateOfBirth: string;
  gender: Gender;
  createdAt: string;
  updatedAt: string;
}

export interface ElderRow extends Elder {
  currentDeviceId: string | null;
}

export interface ElderListParams {
  status?: ElderStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ElderSummary {
  total: number;
  active: number;
  inactive: number;
}

export interface ElderListResponse {
  data: ElderRow[];
  total: number;
  page: number;
  limit: number;
  summary: ElderSummary;
}
