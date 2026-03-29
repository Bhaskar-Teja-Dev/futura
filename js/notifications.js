/**
 * RebelNotifications - A simple localStorage-based notification system
 * Handles persistent alerts for trades, assets, and market trends.
 */
const RebelNotifications = {
  get: () => {
    try {
      const data = localStorage.getItem('rebel_notifications');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  save: (notifications) => {
    // Keep a reasonable history (20) but we only show 5 in dropdown
    const history = notifications.slice(0, 20);
    localStorage.setItem('rebel_notifications', JSON.stringify(history));
    // Dispatch a custom event so UI can update instantly
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  },

  add: (title, message, type = 'system') => {
    const notifications = RebelNotifications.get();
    const newNotif = {
      id: Date.now(),
      title,
      message,
      type, // 'success', 'error', 'trend', 'system'
      timestamp: new Date().toISOString(),
      read: false
    };
    notifications.unshift(newNotif);
    RebelNotifications.save(notifications);
  },

  markRead: (id) => {
    const notifications = RebelNotifications.get();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    RebelNotifications.save(updated);
  },

  markAsAllRead: () => {
    const notifications = RebelNotifications.get();
    const updated = notifications.map(n => ({ ...n, read: true }));
    RebelNotifications.save(updated);
  },

  clearAll: () => {
    RebelNotifications.save([]);
  },

  getUnreadCount: () => {
    return RebelNotifications.get().filter(n => !n.read).length;
  },

  getLatest: (limit = 5) => {
    return RebelNotifications.get().slice(0, limit);
  }
};

// Initialize welcome notification for new users
window.addEventListener('load', () => {
  const isFirstLoad = !localStorage.getItem('rebel_notif_initialized');
  if (isFirstLoad) {
    RebelNotifications.add(
      'WELCOME REBEL',
      'Your digital vault is now active. Start accumulating ZENS and own the cluster.',
      'system'
    );
    localStorage.setItem('rebel_notif_initialized', 'true');
  }
});

window.RebelNotifications = RebelNotifications;
