import { apiClient } from './api-client';

export interface PlanStatus {
  plan: 'free' | 'pro';
  subscription_status: string | null;
  current_period_end: string | null;
  is_anonymous: boolean;
  usage: {
    voice_seconds_this_month: number;
    chat_messages_today: number;
  };
  limits: {
    free_voice_monthly_seconds: number;
    free_chat_daily: number;
    free_dialects: string[];
  };
}

export async function fetchPlanStatus(): Promise<PlanStatus> {
  const { data } = await apiClient.get<PlanStatus>('/billing/me');
  return data;
}

export async function startCheckout(interval: 'month' | 'year'): Promise<string> {
  const origin = window.location.origin;
  const { data } = await apiClient.post<{ url: string }>('/billing/checkout', {
    interval,
    success_url: `${origin}/?upgraded=1`,
    cancel_url: `${origin}/pricing?canceled=1`,
  });
  return data.url;
}

export async function openBillingPortal(): Promise<string> {
  const { data } = await apiClient.post<{ url: string }>('/billing/portal', {
    return_url: `${window.location.origin}/settings`,
  });
  return data.url;
}
