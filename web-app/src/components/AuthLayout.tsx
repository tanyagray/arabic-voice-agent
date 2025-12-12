import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Center, Spinner, Box } from "@chakra-ui/react"

const AuthLayout: React.FC = () => {
  const { user, loading, isAnonymous } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Center minH="100vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  // Allow anonymous users to access all auth pages
  // Allow authenticated users to stay on reset-password page
  // Redirect authenticated (non-anonymous) users from other auth pages
  if (user && !isAnonymous && location.pathname !== '/reset-password') {
    return <Navigate to="/" replace />;
  }

  return (
    <Center minH="100vh" p={4}>
      <Box w="full" maxW="md">
        <Outlet />
      </Box>
    </Center>
  );
};

export default AuthLayout;
