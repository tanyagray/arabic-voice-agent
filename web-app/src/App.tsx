import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AuthLayout from './components/AuthLayout';
import { useAuth } from './contexts/AuthContext';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

import { Spinner, Center, Text, VStack } from "@chakra-ui/react"

function LoadingSpinner() {
  return (
    <Center minH="100vh">
      <VStack gap={4}>
        <Spinner size="xl" color="gray.900" borderWidth="2px" />
        <Text color="gray.600">Loading...</Text>
      </VStack>
    </Center>
  );
}

function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Main app route */}
        <Route path="/" element={<HomePage />} />

        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
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
