import { AlertForm } from '@/features/alert/components/AlertForm';
import { FeatureLayout } from '@/features/shared/components/FeatureLayout';

export default function AlertPage() {
  return (
    <FeatureLayout title="Alert Management">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AlertForm />
      </div>
    </FeatureLayout>
  );
}
