import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell, ShieldAlert, WifiOff, X } from 'lucide-react';
import {
  AppIssueEvent,
  dismissAppIssue,
  getMonitorLogoUrl,
  requestNotificationPermission,
  subscribeAppIssues,
} from '../services/appMonitor';

interface ErrorNotificationBarProps {
  logoUrl: string;
  studioName: string;
  onRetryConnection?: () => void;
}

const CATEGORY_LABEL: Record<AppIssueEvent['category'], string> = {
  connection: 'CONEXÃO',
  security: 'SEGURANÇA',
  bug: 'ERRO DO APP',
  update: 'ATUALIZAÇÃO',
};

export const ErrorNotificationBar: React.FC<ErrorNotificationBarProps> = ({
  logoUrl,
  studioName,
  onRetryConnection,
}) => {
  const [events, setEvents] = useState<AppIssueEvent[]>([]);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    return subscribeAppIssues(setEvents);
  }, []);

  if (events.length === 0) return null;

  const latest = events[0];
  const displayLogo = logoUrl || getMonitorLogoUrl();

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border-b px-4 py-2.5 shadow-md"
      style={{
        background: 'var(--card-alt)',
        borderColor: latest.category === 'security' ? 'var(--r)' : 'var(--accent-gold)',
        color: 'var(--text)',
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={displayLogo}
            alt={studioName}
            className="w-10 h-10 rounded-full object-cover border-2 shrink-0"
            style={{ borderColor: 'var(--r)' }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{
                  background: latest.category === 'security' ? 'var(--r)' : 'var(--accent-gold)',
                  color: 'var(--btn-text)',
                }}
              >
                {latest.category === 'security' && <ShieldAlert size={13} />}
                {latest.category === 'connection' && <WifiOff size={13} />}
                {latest.category === 'bug' && <AlertTriangle size={13} />}
                {CATEGORY_LABEL[latest.category]}
                {latest.count > 1 ? ` ×${latest.count}` : ''}
              </span>
              <strong className="text-sm truncate">{latest.title}</strong>
            </div>
            <p className="text-sm m-0 break-words" style={{ color: 'var(--text-muted)' }}>
              {latest.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {notifPerm === 'default' && (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="si-btn si-btn-outline si-btn-sm"
            >
              <Bell size={15} />
              Alertar na barra do celular
            </button>
          )}
          {latest.category === 'connection' && onRetryConnection && (
            <button
              type="button"
              onClick={onRetryConnection}
              className="si-btn si-btn-sm"
            >
              Reconectar
            </button>
          )}
          <button
            type="button"
            aria-label="Dispensar notificação"
            onClick={() => dismissAppIssue(latest.id)}
            className="p-2 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text)' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
