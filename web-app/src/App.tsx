import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AuthLayout from './components/AuthLayout';
import { useAuth } from './context/AuthContext';
import { useTranslationWarning } from './hooks/useTranslationWarning';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const Landing = lazy(() => import('./pages/Landing'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WimmelbildPage = lazy(() => import('./pages/WimmelbildPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));

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
        <Route path="/landing" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Main app routes */}
        <Route path="/" element={<HomePage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
