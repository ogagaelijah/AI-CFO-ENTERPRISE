// frontend/src/hooks/useRole.js
// v1.1.1-prod — Corrects Sales: no one can edit/delete (append-only).
//               Income, Payments, Purchases also append-only.
// v1.1.0-prod — Complete role helpers matching the full permission matrix.

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
    // ── Team & account management
    canManageTeam:          has('OWNER', 'ADMIN'),
    canManageSettings:      has('OWNER', 'ADMIN'),
    canManageSubscription:  has('OWNER'),
    canTransferOwnership:   has('OWNER'),
    canDeleteBusiness:      has('OWNER'),

    // ── Dashboard
    canViewFinancialWidgets: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),

    // ── Sales — immutable once recorded
    canRecordSale:    has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canEditSale:      false,          // append-only
    canDeleteSale:    false,          // append-only
    canPrintReceipt:  has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canViewSales:     has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),

    // ── Income — append-only
    canViewIncome:    has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditIncome:    false,          // append-only
    canDeleteIncome:  false,          // append-only

    // ── Expenses — editable by OWNER/ADMIN/MANAGER (adjust if you want append-only)
    canViewExpenses:  has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditExpenses:  has('OWNER', 'ADMIN', 'MANAGER'),
    canDeleteExpenses: has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Purchases — append-only
    canViewPurchases: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditPurchases: false,          // append-only
    canDeletePurchases: false,        // append-only

    // ── Payments — append-only
    canRecordDebtorPayment:   has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canRecordCreditorPayment: has('OWNER', 'ADMIN', 'MANAGER'),
    canRecordInvoicePayment:  has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canRecordFeePayment:      has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),
    canEditPayment:   false,          // append-only
    canDeletePayment: false,          // append-only

    // ── Inventory
    canViewInventory: has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditInventory: has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Debtors
    canViewDebtors:   has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditDebtors:   has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Creditors
    canViewCreditors: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditCreditors: has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Suppliers
    canViewSuppliers: has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditSuppliers: has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Customers / Clients / Donors
    canViewCustomers: has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'),
    canEditCustomers: has('OWNER', 'ADMIN', 'MANAGER', 'CASHIER'),

    // ── Consultancy
    canViewProjects:    has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditProjects:    has('OWNER', 'ADMIN', 'MANAGER'),
    canViewTimeEntries: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditTimeEntries: has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Invoices — editable (DRAFT is editable; SENT/PAID changes are tracked)
    canViewInvoices:  has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditInvoices:  has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Education
    canViewEducation: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditEducation: has('OWNER', 'ADMIN', 'MANAGER'),

    // ── NGO
    canViewNGO:       has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canEditNGO:       has('OWNER', 'ADMIN', 'MANAGER'),

    // ── Intelligence
    canViewReports:   has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canExportReports: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewAnalytics: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewForecast:  has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewRisk:      has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewDecisions: has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
    canViewAdvisor:   has('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
  };

  return {
    role,
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