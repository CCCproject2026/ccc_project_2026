'use client';

import { useState } from 'react';
import { AlertData, AlertSeverity } from '../types';
import { sendAlert } from '../api';

const initialSeverity: AlertSeverity = 'warning';

export function AlertForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity>(initialSeverity);
  const [status, setStatus] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const alert: AlertData = {
      id: crypto.randomUUID(),
      title,
      message,
      severity,
      createdAt: new Date().toISOString(),
    };

    setStatus('Sending...');
    await sendAlert(alert);
    setStatus('Alert submitted successfully.');
    setTitle('');
    setMessage('');
    setSeverity(initialSeverity);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 p-4 shadow-sm">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          Alert title
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 block w-full rounded-md border px-3 py-2"
          required
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-1 block w-full rounded-md border px-3 py-2"
          required
        />
      </div>
      <div>
        <label htmlFor="severity" className="block text-sm font-medium text-slate-700">
          Severity
        </label>
        <select
          id="severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value as AlertSeverity)}
          className="mt-1 block w-full rounded-md border px-3 py-2"
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-white">
        Send alert
      </button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </form>
  );
}
