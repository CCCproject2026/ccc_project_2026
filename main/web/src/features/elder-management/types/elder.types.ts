export type ElderStatus = "ACTIVE" | "INACTIVE";
export type Gender = "男性" | "女性" | "その他" | "回答しない";

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

export interface CreateElderInput {
  firstName: string;
  lastName: string;
  roomNumber: string;
  dateOfBirth: string;
  gender: Gender;
}

export interface UpdateElderInput {
  firstName?: string;
  lastName?: string;
  roomNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  status?: ElderStatus;
}

export interface ElderListParams {
  status?: ElderStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ElderListResponse {
  data: ElderRow[];
  total: number;
  page: number;
  limit: number;
}