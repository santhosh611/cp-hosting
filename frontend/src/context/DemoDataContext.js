// frontend/src/context/DemoDataContext.js
// Provides rich mock data for demo mode. No real API calls are made.
import React, { createContext, useContext, useMemo } from 'react';

export const DemoDataContext = createContext();

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const DEMO_PROJECTS = [];

const DEMO_WORKERS = [];

const DEMO_ROLES = [];

const DEMO_ATTENDANCE = [];

const DEMO_SALARY_LOGS = [];

const DEMO_ADVANCE_LOGS = [];

const DEMO_MATERIAL_LOGS = [];

const DEMO_ACTIVITY_LOGS = [];

const DEMO_RENT_ENTRIES = [];

const DEMO_DASHBOARD_SUMMARY = {
  totalProjects: 0,
  totalWorkers: 0,
  totalSupervisors: 0,
  totalWages: 0,
  totalSalaryCost: 0,
  totalMaterialCost: 0,
  totalAdvance: 0,
  totalRent: 0,
  overallTotalCost: 0,
  activeProjects: 0,
  presentToday: 0,
  recentActivities: [],
};

const DEMO_PROJECT_SUMMARIES = [];

const DEMO_WALLET = {
  totalBalance: 0,
  transactions: [],
  totalCredit: 0,
  totalDebit: 0,
};

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

export const DemoDataProvider = ({ children }) => {
  const demoData = useMemo(() => ({
    projects: DEMO_PROJECTS,
    workers: DEMO_WORKERS,
    roles: DEMO_ROLES,
    attendance: DEMO_ATTENDANCE,
    salaryLogs: DEMO_SALARY_LOGS,
    advanceLogs: DEMO_ADVANCE_LOGS,
    materialLogs: DEMO_MATERIAL_LOGS,
    activityLogs: DEMO_ACTIVITY_LOGS,
    rentEntries: DEMO_RENT_ENTRIES,
    dashboardSummary: DEMO_DASHBOARD_SUMMARY,
    projectSummaries: DEMO_PROJECT_SUMMARIES,
    wallet: DEMO_WALLET,
  }), []);

  return (
    <DemoDataContext.Provider value={demoData}>
      {children}
    </DemoDataContext.Provider>
  );
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export const useDemoData = () => useContext(DemoDataContext);
