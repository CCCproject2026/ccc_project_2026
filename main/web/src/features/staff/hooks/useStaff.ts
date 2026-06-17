"use client";

import { useCallback, useEffect, useState } from "react";
import { StaffMember, Role } from "../types";
import { inviteStaff, listInvitations, listStaff, revokeInvitation, updateStaffRole } from "../api";

export default function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<Array<{ id: string; email: string }>>([]);

  const refresh = useCallback(() => {
    setStaff(listStaff());
    setInvitations(listInvitations());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const invite = useCallback(
    async (email: string) => {
      await inviteStaff(email);
      refresh();
    },
    [refresh],
  );

  const revoke = useCallback(
    async (id: string) => {
      await revokeInvitation(id);
      refresh();
    },
    [refresh],
  );

  const updateRole = useCallback(
    async (id: string, role: Role) => {
      await updateStaffRole(id, role);
      refresh();
    },
    [refresh],
  );

  return {
    staff,
    invitations,
    invite,
    revoke,
    updateRole,
  };
}
