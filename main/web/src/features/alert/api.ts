import { AlertData } from './types';

export async function sendAlert(alert: AlertData) {
  const response = await fetch('/api/alert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alert),
  });

  return response.json();
}
