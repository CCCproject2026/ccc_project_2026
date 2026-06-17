// Shared domain interfaces used across features.
export interface Resident {
  id: string
  name: string
  roomNumber: string
  fallRiskLevel?: 'low' | 'medium' | 'high'
}

export interface Device {
  id: string
  name: string
  residentId: string
  batteryLevel: number
  status: 'online' | 'offline' | 'alarm'
}

export interface Role {
  id: string
  name: string
  permissions?: string[]
}

export interface StaffMember {
  id: string
  name: string
  email: string
  role: Role
}
