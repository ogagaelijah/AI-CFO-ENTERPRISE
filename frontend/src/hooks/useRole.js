// frontend/src/hooks/useRole.js
// v1.2.0-prod — Adds Platform Staff bypass.

import { useAuth } from '../context/AuthContext';

const HIERARCHY = {
  OWNER: 5,
  ADMIN: 4,
  MANAGER: 3,
  ACCOUNTANT: 2,
  CASHIER: 1,
};

export default function useRole() {
  const { user } = useAuth();
  const role = user?.role || null;
  const platformRole = user?.platformRole || null;
  
  const isPlatformStaff = Boolean(platformRole);
  const isSuperadmin = platformRole === 'SUPERADMIN';

  const has = (...allowed) => allowed.includes(role);
  const can = has;
  const isOwner      = role === 'OWNER';
  const isAdmin      = role === 'ADMIN';
  const isManager    = role === 'MANAGER';
  const isCashier    = role === 'CASHIER';
  const isAccountant = role === 'ACCOUNTANT';

  const canAtLeast = (minRole) => {
    const min = HIERARCHY[minRole] ?? 999;
    const current = HIERARCHY[role] ?? 0;
    return current >= min;
  };

  const helpers = {
    // ── Platform Admin
    isPlatformStaff,
    isSuperadmin,

    // ── Team & account management
    // Platform staff can always manage
    canManageTeam:          isPlatformStaff || has('OWNER', 'ADMIN'),
    canManageSettings:      isPlatformStaff || has('OWNER', 'ADMIN'),
    canManageSubscription:  isPlatformStaff || has('OWNER'),
    canTransferOwnership:   isPlatformStaff || has('OWNER'),
    canDeleteBusiness:      isPlatformStaff || has('OWNER'),

    // ── Dashboard
    canViewFinancialWidgets: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),

    // ── Sales — immutable once recorded
    canRecordSale:    isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canEditSale:      false,          // append-only
    canDeleteSale:    false,          // append-only
    canPrintReceipt:  isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canViewSales:     isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),

    // ── Income — append-only
    canViewIncome:    isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditIncome:    false,          // append-only
    canDeleteIncome:  false,          // append-only

    // ── Expenses
    canViewExpenses:  isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditExpenses:  isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),
    canDeleteExpenses: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Purchases — append-only
    canViewPurchases: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditPurchases: false,          // append-only
    canDeletePurchases: false,        // append-only

    // ── Payments — append-only
    canRecordDebtorPayment:   isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canRecordCreditorPayment: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),
    canRecordInvoicePayment:  isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canRecordFeePayment:      isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canEditPayment:   false,          // append-only
    canDeletePayment: false,          // append-only

    // ── Inventory
    canViewInventory: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditInventory: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Debtors
    canViewDebtors:   isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditDebtors:   isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Creditors
    canViewCreditors: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditCreditors: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Suppliers
    canViewSuppliers: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditSuppliers: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Customers / Clients / Donors
    canViewCustomers: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditCustomers: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),

    // ── Consultancy
    canViewProjects:    isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditProjects:    isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),
    canViewTimeEntries: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditTimeEntries: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Invoices
    canViewInvoices:  isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditInvoices:  isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Education
    canViewEducation: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditEducation: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── NGO
    canViewNGO:       isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditNGO:       isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Intelligence
    canViewReports:   isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canExportReports: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewAnalytics: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewForecast:  isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewRisk:      isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewDecisions: isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewAdvisor:   isPlatformStaff || has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
  };

  return {
    role,
    platformRole,
    has,
    can,
    canAtLeast,
    isOwner,
    isAdmin,
    isManager,
    isCashier,
    isAccountant,
    ...helpers,
  };
}