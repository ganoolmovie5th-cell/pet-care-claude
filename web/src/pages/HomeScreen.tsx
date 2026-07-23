import { useEffect } from 'react';
import { useAnalytics } from '../hooks/use-analytics';
import { initializeMessaging } from '../services/push-notifications';

export default function HomeScreen() {
  const { logEvent } = useAnalytics();

  useEffect(() => {
    logEvent('app_opened');
    void initializeMessaging();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Pet Care Home</h1>
    </div>
  );
}
