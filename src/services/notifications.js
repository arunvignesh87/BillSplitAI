// Notification service for subscription renewal alerts

const NOTIF_STORE_KEY = 'billsplit_notif_scheduled';

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function showNotification(title, body, icon = '/icon-192.png') {
  if (Notification.permission !== 'granted') return;
  const reg = navigator.serviceWorker?.controller;
  if (reg) {
    navigator.serviceWorker.ready.then(r =>
      r.showNotification(title, { body, icon, badge: '/icon-192.png', vibrate: [200, 100, 200] })
    );
  } else {
    new Notification(title, { body, icon });
  }
}

export function scheduleRenewalNotifications(subscriptions) {
  if (Notification.permission !== 'granted') return;
  if (!subscriptions || subscriptions.length === 0) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const renewingTomorrow = subscriptions.filter(sub => {
    if (!sub.renewalDate) return false;
    const d = new Date(sub.renewalDate);
    d.setHours(0, 0, 0, 0);
    return d >= tomorrow && d < dayAfter;
  });

  if (renewingTomorrow.length === 0) return;

  // Fire notifications for tomorrow's renewals
  renewingTomorrow.forEach(sub => {
    showNotification(
      `⏰ Subscription renewing tomorrow!`,
      `${sub.name} will renew for ${sub.cost} tomorrow. Check if you still need it!`,
      '/icon-192.png'
    );
  });

  // Also schedule a check for today if any renew today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewingToday = subscriptions.filter(sub => {
    if (!sub.renewalDate) return false;
    const d = new Date(sub.renewalDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  renewingToday.forEach(sub => {
    showNotification(
      `💸 Subscription renewing today!`,
      `${sub.name} is renewing today for ${sub.cost}. Cancel if you don't need it!`,
      '/icon-192.png'
    );
  });
}

// Store last notification check date to avoid repeated notifications
export function shouldCheckNotifications() {
  const last = localStorage.getItem(NOTIF_STORE_KEY);
  if (!last) return true;
  const lastDate = new Date(last);
  const now = new Date();
  // Check once per day
  return lastDate.toDateString() !== now.toDateString();
}

export function markNotificationsChecked() {
  localStorage.setItem(NOTIF_STORE_KEY, new Date().toISOString());
}
