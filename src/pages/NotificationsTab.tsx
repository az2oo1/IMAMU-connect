import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useUser();
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.notifications) {
          setNotifications(data.notifications);
        }
        setLoading(false);
        
        // Mark all as read when viewing the page
        fetch('/api/notifications/read', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).catch(console.error);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notification: any) => {
        setNotifications(prev => [{...notification, read: true}, ...prev]);
        
        // Mark as read immediately since we are on the notifications page
        fetch('/api/notifications/read', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).catch(console.error);
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket]);

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'MENTION': return { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' };
      case 'REPORT_ANSWER': return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
      case 'SYSTEM': return { icon: Bell, color: 'text-primary-400', bg: 'bg-primary-400/10' };
      case 'MESSAGE': return { icon: MessageSquare, color: 'text-primary-400', bg: 'bg-primary-400/10' };
      default: return { icon: Bell, color: 'text-neutral-400', bg: 'bg-neutral-400/10' };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 pb-24"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
            <p className="text-neutral-400">Stay updated on your activity and reports.</p>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-neutral-500 py-8">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">No notifications yet.</div>
          ) : (
            notifications.map((notification) => {
              const config = getIconConfig(notification.type);
              const Icon = config.icon;
              return (
                <div 
                  key={notification.id} 
                  onClick={() => {
                    if (notification.link) {
                      const fixedLink = notification.link.startsWith('/app/') ? notification.link.replace('/app/', '/') : notification.link;
                      navigate(fixedLink);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all flex gap-4 items-start ${notification.link ? 'cursor-pointer hover:bg-neutral-800' : ''} ${
                    notification.read 
                      ? 'bg-neutral-900 border-neutral-800' 
                      : 'bg-neutral-800/50 border-neutral-700 shadow-lg'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-sm ${notification.read ? 'text-neutral-300' : 'text-white font-medium'}`}>
                      {notification.content}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1.5">{new Date(notification.createdAt).toLocaleDateString()}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full mt-2 shrink-0"></div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
