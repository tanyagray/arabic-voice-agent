import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/api/api-client';
import { PaywallModal, type PaywallReason } from './PaywallModal';

interface PaywallContextValue {
  show: (reason: PaywallReason) => void;
}

const PaywallContext = createContext<PaywallContextValue | undefined>(undefined);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = useState<PaywallReason | null>(null);

  const show = useCallback((r: PaywallReason) => setReason(r), []);
  const close = useCallback(() => setReason(null), []);

  // Intercept 402 responses from the backend and surface the paywall modal.
  useEffect(() => {
    const id = apiClient.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error.response?.status === 402) {
          const detail = error.response.data?.detail;
          if (detail && typeof detail === 'object' && detail.message) {
            show({ kind: detail.kind, message: detail.message });
          }
        }
        return Promise.reject(error);
      },
    );
    return () => {
      apiClient.interceptors.response.eject(id);
    };
  }, [show]);

  return (
    <PaywallContext.Provider value={{ show }}>
      {children}
      <PaywallModal reason={reason} onClose={close} />
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error('usePaywall must be used inside PaywallProvider');
  return ctx;
}
