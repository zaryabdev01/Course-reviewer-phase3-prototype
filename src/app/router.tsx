import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";

import { DashboardPage } from "@/pages/DashboardPage";
import { ContentLibraryPage } from "@/pages/ContentLibraryPage";
import { DevelopmentPage } from "@/pages/DevelopmentPage";
import { LearningExchangePage } from "@/pages/LearningExchangePage";
import { AllocationsPage } from "@/pages/AllocationsPage";
import { OrgStructurePage } from "@/pages/OrgStructurePage";
import { TeamPage } from "@/pages/TeamPage";
import { MatrixPage } from "@/pages/MatrixPage";
import { WorkforcePlannerPage } from "@/pages/WorkforcePlannerPage";
import { DistributionHubPage } from "@/pages/DistributionHubPage";
import { CreateLeaseWizardPage } from "@/pages/CreateLeaseWizardPage";
import { CustomerDashboardPage } from "@/pages/CustomerDashboardPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { DownloadsPage } from "@/pages/DownloadsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { BillingPage } from "@/pages/BillingPage";
import { AuditLogPage } from "@/pages/AuditLogPage";
import { PlatformOrganisationsPage } from "@/pages/platform/PlatformOrganisationsPage";
import { PlatformUsersPage } from "@/pages/platform/PlatformUsersPage";
import { AdminMonitorsPage } from "@/pages/platform/AdminMonitorsPage";

import { ReadinessCheckPage } from "@/pages/course/ReadinessCheckPage";
import { LearningSetupPage } from "@/pages/course/LearningSetupPage";
import { ChooseFormatPage } from "@/pages/course/ChooseFormatPage";
import { ConversionStatusPage } from "@/pages/course/ConversionStatusPage";
import { CoursePlayerPage } from "@/pages/course/CoursePlayerPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/content-library", element: <ContentLibraryPage /> },
      { path: "/development", element: <DevelopmentPage /> },
      { path: "/learning-exchange", element: <LearningExchangePage /> },
      { path: "/allocations", element: <AllocationsPage /> },
      { path: "/org/structure", element: <OrgStructurePage /> },
      { path: "/org/team", element: <TeamPage /> },
      { path: "/matrix", element: <MatrixPage /> },
      { path: "/workforce", element: <WorkforcePlannerPage /> },
      { path: "/distribution-hub", element: <DistributionHubPage /> },
      { path: "/distribution-hub/create", element: <CreateLeaseWizardPage /> },
      { path: "/distribution-hub/customers/:name", element: <CustomerDashboardPage /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/downloads", element: <DownloadsPage /> },
      { path: "/messages", element: <MessagesPage /> },
      { path: "/notifications", element: <NotificationsPage /> },
      { path: "/billing", element: <BillingPage /> },
      { path: "/audit-log", element: <AuditLogPage /> },
      { path: "/platform/organisations", element: <PlatformOrganisationsPage /> },
      { path: "/platform/users", element: <PlatformUsersPage /> },
      { path: "/platform/monitors", element: <AdminMonitorsPage /> },

      { path: "/course/:id/readiness", element: <ReadinessCheckPage /> },
      { path: "/course/:id/learning-setup", element: <LearningSetupPage /> },
      { path: "/course/:id/format", element: <ChooseFormatPage /> },
      { path: "/course/:id/convert", element: <ConversionStatusPage /> },
      { path: "/course/:id/player", element: <CoursePlayerPage /> },

      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
