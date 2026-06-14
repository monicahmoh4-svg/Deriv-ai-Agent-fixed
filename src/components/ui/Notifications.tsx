'use client';
import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';

export default function Notifications() {
  const { notifications, dismissNotification } = useTradingStore();

  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    const timer = setTimeout(() => dismissNotification(latest.id), 6000);
    return () => clearTimeout(timer);
  }, [notifications, dismissNotification]);

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 340, width: '90vw',
    }}>
      {notifications.slice(0, 4).map(n => {
        const config = {
          success: { icon: <CheckCircle2 size={15} />, color: '#00e676', bg: '#00e67611', border: '#00e67633' },
          error:   { icon: <XCircle size={15} />,      color: '#ff3d6b', bg: '#ff3d6b11', border: '#ff3d6b33' },
          warning: { icon: <AlertTriangle size={15} />, color: '#ffd600', bg: '#ffd60011', border: '#ffd60033' },
          info:    { icon: <Info size={15} />,          color: '#00c2ff', bg: '#00c2ff11', border: '#00c2ff33' },
        }[n.type];

        return (
          <div key={n.id} className="slide-in" style={{
            background: '#131a27', border: `1px solid ${config.border}`,
            borderRadius: 10, padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: config.color, flexShrink: 0, marginTop: 1 }}>{config.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{n.title}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#8098b8', lineHeight: 1.4 }}>{n.message}</p>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d5270', padding: 2, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
