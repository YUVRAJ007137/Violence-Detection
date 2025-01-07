import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Bell } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  camera_id: string;
  notification_text: string;
  timestamp: string;
  cameras: {
    camera_name: string;
  };
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications for the current user
    const subscribeToNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`  // Only subscribe to current user's notifications
        }, payload => {
          setNotifications(current => [payload.new as Notification, ...current]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    subscribeToNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          cameras (
            camera_name
          )
        `)
        .eq('user_id', user.id)  // Filter notifications by user_id
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-4">Loading notifications...</div>;

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <Bell className="w-6 h-6 mr-2" />
        <h2 className="text-xl font-bold">Notifications</h2>
      </div>

      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{notification.notification_text}</p>
                <p className="text-sm text-gray-600">
                  Camera: {notification.cameras?.camera_name}
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {format(new Date(notification.timestamp), 'PPp')}
              </span>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No notifications yet
          </div>
        )}
      </div>
    </div>
  );
}