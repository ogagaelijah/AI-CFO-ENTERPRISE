// src/hooks/useDashboardData.js
import { useState, useEffect } from 'react';

const INDUSTRY_STATS = {
  'RETAIL': { sales: { today: 3, month: 42, growth: 8.3 } },
  'MANUFACTURING': { production: 12, raw_materials: 450000, inventory: { total: 800000, lowStock: 3 } },
  'CONSTRUCTION': { projects: 4, materials: 600000, revenue: { today: 25000, month: 980000, growth: 15.2 } },
  'HEALTHCARE': { patients: 45, visits: 78, inventory: { total: 320000, lowStock: 1 } },
  'CONSULTANCY': { clients: 12, hours: 160, projects: 8 },
  'REAL_ESTATE': { properties: 6, tenants: 12, rent: 450000 },
  'EDUCATION': { students: 120, classes: 8, fees: 360000 },
  'LOGISTICS': { trips: 34, vehicles: 5, drivers: 4 },
};

const BASE_STATS = {
  revenue: { today: 16800, month: 672000, growth: 12.5 },
  sales: { today: 3, month: 42, growth: 8.3 },
  expenses: { today: 3200, month: 128000, growth: 3.2 },
  debtors: { total: 35120, overdue: 7 },
  creditors: { total: 25530, overdue: 6 },
  inventory: { total: 1200000, lowStock: 2 },
  purchases: { today: 0, month: 16 },
};

export const useDashboardData = (industry) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setStats({
        ...BASE_STATS,
        ...(INDUSTRY_STATS[industry] || {}),
      });
      setIsLoading(false);
    };
    loadData();
  }, [industry]);

  return { stats, isLoading };
};