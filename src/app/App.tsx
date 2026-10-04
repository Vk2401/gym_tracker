import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonSpinner,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { IonReactHashRouter } from '@ionic/react-router';
import { barbell, calendar, compass, list, settings } from 'ionicons/icons';
import { Navigate, Route, Routes } from 'react-router-dom';
import ExercisesPage from '@/features/exercises/ExercisesPage';
import ExplorePage from '@/features/explore/ExplorePage';
import LogsPage from '@/features/logs/LogsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import WorkoutsPage from '@/features/workouts/WorkoutsPage';
import { useAppStore } from '@/store/appStore';
import './App.css';

const TABS = [
  { tab: 'workouts', label: 'Workouts', icon: barbell },
  { tab: 'exercises', label: 'Exercises', icon: list },
  { tab: 'logs', label: 'Logs', icon: calendar },
  { tab: 'explore', label: 'Explore', icon: compass },
  { tab: 'settings', label: 'Settings', icon: settings },
] as const;

/**
 * Five-tab shell (NAV-1, NAV-2). Hash routing keeps deep links working on any static host
 * (GitHub Pages) and inside the WebView.
 */
export default function App() {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);

  return (
    <IonApp>
      {status === 'loading' && (
        <div className="gt-boot" role="status" aria-label="Loading">
          <IonSpinner />
        </div>
      )}
      {status === 'error' && (
        <div className="gt-boot" role="alert">
          <p>Couldn't open your data.</p>
          <p className="gt-boot__detail">{error}</p>
        </div>
      )}
      {status === 'ready' && (
        <IonReactHashRouter>
          <IonTabs>
            <IonRouterOutlet>
              <Routes>
                <Route path="/workouts" element={<WorkoutsPage />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/workouts" replace />} />
              </Routes>
            </IonRouterOutlet>
            <IonTabBar slot="bottom">
              {TABS.map((t) => (
                <IonTabButton key={t.tab} tab={t.tab} href={`/${t.tab}`}>
                  <IonIcon icon={t.icon} aria-hidden="true" />
                  <IonLabel>{t.label}</IonLabel>
                </IonTabButton>
              ))}
            </IonTabBar>
          </IonTabs>
        </IonReactHashRouter>
      )}
    </IonApp>
  );
}
