import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface AlertInfo {
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
}

export function useRequireAuth() {

  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const [isChecking, setIsChecking] = useState(true);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {

    const token = localStorage.getItem('locsystem_token');
    if (!token) {
      navigateRef.current('/login', { replace: true });
      return;
    }

    const stored = localStorage.getItem('locsystem_user');
    const v_email: string = stored ? (JSON.parse(stored) as { email?: string }).email ?? '' : '';

    api
      .post('/auth/checkAuthenticationPerformed', { v_email })
      .then(() => {
        setIsChecking(false);
      })
      .catch((error) => {

        const status: number | undefined = error?.response?.status;
        const data = error?.response?.data;

        if (status === 401) {
          
          setAlertInfo({ message: `⚠️ ${data.info}`, type: 'info' });

        } else if (status === 500) {

          setAlertInfo({ message: `🚫 ${data.error}`, type: 'error' });

        }

        navigateRef.current('/login', { replace: true });

      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isChecking, alertInfo, clearAlert: () => setAlertInfo(null) };

}
