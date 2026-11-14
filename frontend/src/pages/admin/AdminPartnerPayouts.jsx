// frontend/src/pages/admin/AdminPartnerPayouts.jsx
// v1.1.0 — Uses extracted AdminPartnerPayoutsTab component.

import AdminPartnerPayoutsTab from '../../components/admin/AdminPartnerPayoutsTab';

export default function AdminPartnerPayouts() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <AdminPartnerPayoutsTab />
    </div>
  );
}