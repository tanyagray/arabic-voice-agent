import { useQuery } from '@tanstack/react-query';
import { fetchPlanStatus, type PlanStatus } from '@/api/billing';
import { useAuth } from '@/context/AuthContext';

export function usePlan() {
  const { user } = useAuth();
  return useQuery<PlanStatus>({
    queryKey: ['billing', 'me', user?.id],
    queryFn: fetchPlanStatus,
    enabled: !!user,
    staleTime: 30_000,
  });
}
