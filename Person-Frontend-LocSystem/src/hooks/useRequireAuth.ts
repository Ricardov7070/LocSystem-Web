import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface AlertInfo {
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
}

export function useRequireAuth() {

  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);

  useEffect(() => {

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

        navigate('/login', { replace: true });

      });

  }, [navigate]);

  return { isChecking, alertInfo, clearAlert: () => setAlertInfo(null) };

}
