import AddStaffModal from "@/components/staff/AddStaffModal";
import PendingInviteRow from "@/components/staff/PendingInviteRow";
import StaffTable from "@/components/staff/StaffTable";

export default function StaffPage() {
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
