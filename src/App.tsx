/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { UserProvider } from './contexts/UserContext';
import Layout from './components/Layout';
import NewsTab from './pages/NewsTab';
import ClubsTab from './pages/ClubsTab';
import ClubDetails from './pages/ClubDetails';
import MapTab from './pages/MapTab';
import AcademicsTab from './pages/AcademicsTab';
import ExploreTab from './pages/ExploreTab';
import PersonalTab from './pages/PersonalTab';
import PublicProfile from './pages/PublicProfile';
import GroupsTab from './pages/GroupsTab';
import CalendarTab from './pages/CalendarTab';
import SettingsTab from './pages/SettingsTab';
import SavedTab from './pages/SavedTab';
import NotificationsTab from './pages/NotificationsTab';
import VerificationGuard from './components/VerificationGuard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminUsersTab from './pages/admin/UsersTab';
import AdminClubsTab from './pages/admin/ClubsTab';
import AdminNewsTab from './pages/admin/NewsTab';
import AdminReportsTab from './pages/admin/ReportsTab';

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/users" replace />} />
              <Route path="users" element={<AdminUsersTab />} />
              <Route path="clubs" element={<AdminClubsTab />} />
              <Route path="news" element={<AdminNewsTab />} />
              <Route path="reports" element={<AdminReportsTab />} />
            </Route>

            {/* Main App Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/news" replace />} />
              <Route path="news" element={<NewsTab />} />
              <Route path="clubs" element={<ClubsTab />} />
              <Route path="clubs/:id" element={<ClubDetails />} />
              <Route path="map" element={<MapTab />} />
              <Route path="academics" element={
                <VerificationGuard>
                  <AcademicsTab />
                </VerificationGuard>
              } />
              <Route path="explore" element={<ExploreTab />} />
              <Route path="personal" element={<PersonalTab />} />
              <Route path="profile/:username" element={<PublicProfile />} />
              <Route path="calendar" element={<CalendarTab />} />
              <Route path="settings" element={<SettingsTab />} />
              <Route path="saved" element={<SavedTab />} />
              <Route path="notifications" element={<NotificationsTab />} />
              <Route path="groups" element={
                <VerificationGuard>
                  <GroupsTab />
                </VerificationGuard>
              } />
            </Route>
          </Routes>
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}
