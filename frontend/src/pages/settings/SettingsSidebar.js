// src/pages/settings/SettingsSidebar.js
import { Home, Settings as SettingsIcon, BarChart3, TrendingUp, DollarSign, TrendingDown, ShoppingCart, Package, Users, CreditCard, Building2, Truck, Briefcase, Calendar, Lightbulb, Brain, Layers } from 'lucide-react';

export const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: SettingsIcon, label: 'Settings', href: '/settings', active: true },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: TrendingUp, label: 'Sales', href: '/sales' },
  { icon: DollarSign, label: 'Income', href: '/income' },
  { icon: TrendingDown, label: 'Expenses', href: '/expenses' },
  { icon: ShoppingCart, label: 'Purchases', href: '/purchases' },
  { icon: Package, label: 'Inventory', href: '/inventory' },
  { icon: Users, label: 'Debtors', href: '/debtors' },
  { icon: CreditCard, label: 'Creditors', href: '/creditors' },
  { icon: Building2, label: 'Customers', href: '/customers' },
  { icon: Truck, label: 'Suppliers', href: '/suppliers' },
  { icon: Briefcase, label: 'Projects', href: '/projects' },
  { icon: Calendar, label: 'Forecast', href: '/forecast' },
  { icon: Lightbulb, label: 'Recommendations', href: '/recommendations' },
  { icon: Brain, label: 'AI Assistant', href: '/ai' },
  { icon: Layers, label: 'Subscription', href: '/subscription' },
];