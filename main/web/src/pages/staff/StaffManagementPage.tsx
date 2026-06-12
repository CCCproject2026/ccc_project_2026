import AddStaffModal from "@/components/staff/AddStaffModal";
import StaffTable from "@/components/staff/StaffTable";
import PendingInviteRow from "@/components/staff/PendingInviteRow";

export default function StaffManagementPage() {
  return (
    <main>
      <h1>Staff Management</h1>
      <AddStaffModal />
      <section>
        <h2>Staff Members</h2>
        <StaffTable />
      </section>
      <section>
        <h2>Pending Invitations</h2>
        <PendingInviteRow />
      </section>
    </main>
  );
}
