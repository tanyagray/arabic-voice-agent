import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import AuthLayout from './components/AuthLayout';
import { useAuth } from './context/AuthContext';
import { useUserProfile } from './hooks/useUserProfile';
import { useTranslationWarning } from './hooks/useTranslationWarning';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const Landing = lazy(() => import('./pages/Landing'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const WelcomeBack = lazy(() => import('./pages/WelcomeBack'));
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WimmelbildPage = lazy(() => import('./pages/WimmelbildPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));

const WB_LAST_SEEN_KEY = 'wb-last-seen';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function EntryGate() {
  const { profile, loading } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (profile?.onboardingCompleted) {
      // Fully onboarded — show welcome-back once per day, then go straight to home
      if (localStorage.getItem(WB_LAST_SEEN_KEY) === todayStr()) {
        navigate('/home', { replace: true });
      } else {
        navigate('/welcome-back', { replace: true });
      }
    } else if (profile?.name) {
      // Has a name but never finished — resume onboarding
      navigate('/onboarding?resume=1', { replace: true });
    } else {
      // No profile row yet, or name is null — fresh onboarding
      navigate('/onboarding', { replace: true });
    }
  }, [loading, profile, navigate]);

  return <LoadingSpinner />;
}

function App() {
  const { loading, user } = useAuth();
  useTranslationWarning();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Entry gate — smart-routes based on profile state */}
        <Route path="/" element={<EntryGate />} />

        {/* Entry experiences */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome-back" element={<WelcomeBack />} />
        <Route path="/landing" element={<Landing />} />

        {/* Main app */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/wimmelbilder/:id" element={<WimmelbildPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
