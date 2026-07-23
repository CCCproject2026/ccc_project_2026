// src/app/page.tsx

import { AlarmBanner } from "@/features/dashboard/components/AlarmBanner";
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";
// app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
    // This instantly pushes the user to /dashboard automatically
    redirect('/dashboard'); 
}