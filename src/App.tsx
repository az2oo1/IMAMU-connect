/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { UserProvider } from './contexts/UserContext';
import Layout from './components/Layout';
import NewsTab from './pages/NewsTab';
import MapTab from './pages/MapTab';
import AcademicsTab from './pages/AcademicsTab';
import ExploreTab from './pages/ExploreTab';
import PersonalTab from './pages/PersonalTab';
import GroupsTab from './pages/GroupsTab';
import VerificationGuard from './components/VerificationGuard';

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/news" replace />} />
              <Route path="news" element={<NewsTab />} />
              <Route path="map" element={<MapTab />} />
              <Route path="academics" element={
                <VerificationGuard>
                  <AcademicsTab />
                </VerificationGuard>
              } />
              <Route path="explore" element={<ExploreTab />} />
              <Route path="personal" element={<PersonalTab />} />
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
