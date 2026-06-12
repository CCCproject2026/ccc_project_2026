import { useCallback, useState } from "react";
import { StaffMember, Role } from "@/types/staff";
import { inviteStaff, listInvitations, listStaff, revokeInvitation, updateStaffRole } from "@/api/staff";

export default function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshStaff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listStaff();
      setStaff(result);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    staff,
    loading,
    refreshStaff,
    inviteStaff,
    updateRole: updateStaffRole,
    listInvitations,
    revokeInvitation,
  };
}
