import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Spinner } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
        <Spinner size="xl" />
      </Box>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
