import AddStaffModal from "./components/AddStaffModal";
import PendingInviteRow from "./components/PendingInviteRow";
import StaffTable from "./components/StaffTable";

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
