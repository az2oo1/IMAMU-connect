/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout';
import NewsTab from './pages/NewsTab';
import ClubsTab from './pages/ClubsTab';
import ClubDetails from './pages/ClubDetails';
import DedicatedFormPage from './pages/DedicatedFormPage';
import MapTab from './pages/MapTab';
import AcademicsTab from './pages/AcademicsTab';
import ExploreTab from './pages/ExploreTab';
import PersonalTab from './pages/PersonalTab';
import PublicProfile from './pages/PublicProfile';
import GroupsTab from './pages/GroupsTab';
import MessagesTab from './pages/MessagesTab';
import CalendarTab from './pages/CalendarTab';
import SettingsTab from './pages/SettingsTab';
import SavedTab from './pages/SavedTab';
import NotificationsTab from './pages/NotificationsTab';
import VerificationGuard from './components/VerificationGuard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminUsersTab from './pages/admin/UsersTab';
import AdminRolesTab from './pages/admin/RolesTab';
import AdminClubsTab from './pages/admin/ClubsTab';
import AdminCoursesTab from './pages/admin/CoursesTab';
import AdminNewsTab from './pages/admin/NewsTab';
import AdminReportsTab from './pages/admin/ReportsTab';
import ReportDetailsPage from './pages/ReportDetailsPage';
import ArticlePage from './pages/ArticlePage';
import ComposeArticle from './pages/ComposeArticle';

import ManageClub from './pages/ManageClub';

import { Toaster } from 'sonner';

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isAuthReady } = useUser();
  if (!isAuthReady) {
    return (
      <div className="flex-1 h-screen w-full flex items-center justify-center bg-neutral-950">
        <div className="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SocketProvider>
      <Toaster theme="dark" position="top-center" richColors />
      <Router>
        <Routes>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<AdminUsersTab />} />
                <Route path="roles" element={<AdminRolesTab />} />
                <Route path="clubs" element={<AdminClubsTab />} />
                <Route path="courses" element={<AdminCoursesTab />} />
                <Route path="news" element={<AdminNewsTab />} />
                <Route path="reports" element={<AdminReportsTab />} />
              </Route>

              {/* Main App Routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/news" replace />} />
                <Route path="news" element={<NewsTab />} />
                <Route path="compose" element={
                  <VerificationGuard>
                    <ComposeArticle />
                  </VerificationGuard>
                } />
                <Route path="news/:id" element={<ArticlePage />} />
                <Route path="forms/:id" element={<DedicatedFormPage />} />
                <Route path="clubs" element={<ClubsTab />} />
                <Route path="clubs/:id" element={<ClubDetails />} />
                <Route path="clubs/:id/manage" element={
                  <VerificationGuard>
                    <ManageClub />
                  </VerificationGuard>
                } />
                <Route path="map" element={<MapTab />} />
                <Route path="academics" element={
                  <VerificationGuard>
                    <AcademicsTab />
                  </VerificationGuard>
                } />
                <Route path="explore" element={<ExploreTab />} />
                <Route path="personal" element={<PersonalTab />} />
                <Route path="profile/:username" element={<PublicProfile />} />
                <Route path="reports/:id" element={<ReportDetailsPage />} />
                <Route path="calendar" element={<CalendarTab />} />
                <Route path="settings" element={<SettingsTab />} />
                <Route path="saved" element={<SavedTab />} />
                <Route path="notifications" element={<NotificationsTab />} />
                <Route path="groups" element={
                  <VerificationGuard>
                    <GroupsTab />
                  </VerificationGuard>
                } />
                <Route path="messages" element={
                  <VerificationGuard>
                    <MessagesTab />
                  </VerificationGuard>
                } />
                <Route path="*" element={<Navigate to="/news" replace />} />
              </Route>
            </Routes>
          </Router>
        </SocketProvider>
  );
}
