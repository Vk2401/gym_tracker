import {
  IonApp,
  IonLabel,
  IonRouterOutlet,
  IonSpinner,
  IonTabBar,
  IonTabs,
  useIonAlert,
} from '@ionic/react';
import { IonReactHashRouter } from '@ionic/react-router';
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ChartLineIcon,
  DumbbellIcon,
  SettingsIcon,
} from 'lucide-react';
import { Icon } from '@/components/Icon';
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ExerciseDetailPage from '@/features/exercises/ExerciseDetailPage';
import ExercisesPage from '@/features/exercises/ExercisesPage';
import LogDetailPage from '@/features/logs/LogDetailPage';
import LogsPage from '@/features/logs/LogsPage';
import CategoriesPage from '@/features/settings/CategoriesPage';
import EquipmentPage from '@/features/settings/EquipmentPage';
import LegalPage from '@/features/settings/LegalPage';
import SettingsPage from '@/features/settings/SettingsPage';
import TemplateDetailPage from '@/features/workouts/TemplateDetailPage';
import WorkoutsPage from '@/features/workouts/WorkoutsPage';
import { setPref } from '@/hooks/usePrefs';
import { useAppStore } from '@/store/appStore';
import { BottomBars } from './BottomBars';
import { PermissionsPrompt } from './PermissionsPrompt';
import { RootTabButton } from './RootTabButton';
import { WriteErrorToast } from './WriteErrorToast';
import { ActionMenuHost } from '@/components/ActionMenu';
import './App.css';

// Charts load lazily, on the Explore tab only (mobile-frontend §6).
const ExplorePage = lazy(() => import('@/features/explore/ExplorePage'));

const TABS = [
  { tab: 'workouts', label: 'Workouts', icon: DumbbellIcon },
  { tab: 'exercises', label: 'Exercises', icon: BookOpenIcon },
  { tab: 'logs', label: 'Logs', icon: CalendarDaysIcon },
  { tab: 'explore', label: 'Explore', icon: ChartLineIcon },
  { tab: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;

/** BRD §15: anonymous analytics are opt-in at first launch. */
function AnalyticsPrompt() {
  const optIn = useAppStore((s) => s.prefs?.analyticsOptIn);
  const [alert] = useIonAlert();
  useEffect(() => {
    if (optIn !== null || navigator.webdriver) return;
    void alert({
      header: 'Help improve Gym Tracker',
      message:
        'Share anonymous usage data? It never includes your body weight, measurements, notes or names.',
      backdropDismiss: false,
      buttons: [
        {
          text: "Don't Share",
          role: 'cancel',
          handler: () => void setPref('analyticsOptIn', false),
        },
        { text: 'Share', handler: () => void setPref('analyticsOptIn', true) },
      ],
    });
  }, [optIn, alert]);
  return null;
}

/**
 * Five-tab shell (NAV-1, NAV-2) with stacked detail pages. Hash routing keeps deep links
 * working on any static host and inside the WebView.
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
                <Route path="/workouts/:templateId" element={<TemplateDetailPage />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route path="/exercises/:exerciseId" element={<ExerciseDetailPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/logs/:logId" element={<LogDetailPage />} />
                <Route
                  path="/explore"
                  element={
                    <Suspense
                      fallback={
                        <div className="gt-boot">
                          <IonSpinner />
                        </div>
                      }
                    >
                      <ExplorePage />
                    </Suspense>
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/categories" element={<CategoriesPage />} />
                <Route path="/settings/equipment" element={<EquipmentPage />} />
                <Route path="/settings/legal/:doc" element={<LegalPage />} />
                <Route path="*" element={<Navigate to="/workouts" replace />} />
              </Routes>
            </IonRouterOutlet>
            <IonTabBar slot="bottom">
              {TABS.map((t) => (
                <RootTabButton key={t.tab} tab={t.tab} href={`/${t.tab}`}>
                  <Icon icon={t.icon} aria-hidden="true" />
                  <IonLabel>{t.label}</IonLabel>
                </RootTabButton>
              ))}
            </IonTabBar>
          </IonTabs>
          <BottomBars />
          <AnalyticsPrompt />
          <PermissionsPrompt />
          <WriteErrorToast />
          <ActionMenuHost />
        </IonReactHashRouter>
      )}
    </IonApp>
  );
}
