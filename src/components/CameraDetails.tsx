import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CameraStream } from './CameraStream';
import { format } from 'date-fns';

interface Notification {
  id: string;
  notification_text: string;
  timestamp: string;
}

interface Camera {
  id: string;
  camera_name: string;
  ip_address: string;
}

export function CameraDetails() {
  const { id } = useParams<{ id: string }>();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCameraAndNotifications();

    const channel = supabase
      .channel(`camera-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `camera_id=eq.${id}`
      }, payload => {
        setNotifications(current => [payload.new as Notification, ...current]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchCameraAndNotifications = async () => {
    try {
      const [cameraResult, notificationsResult] = await Promise.all([
        supabase.from('cameras').select('*').eq('id', id).single(),
        supabase.from('notifications').select('*').eq('camera_id', id).order('timestamp', { ascending: false })
      ]);

      if (cameraResult.error) throw cameraResult.error;
      if (notificationsResult.error) throw notificationsResult.error;

      setCamera(cameraResult.data);
      setNotifications(notificationsResult.data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!camera) return <div className="text-center p-4">Camera not found</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{camera.camera_name}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Live Feed</h3>
          <div className="aspect-video">
            <CameraStream 
              ipAddress={camera.ip_address}
              cameraName={camera.camera_name}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Notifications</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className="p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <p className="font-medium">{notification.notification_text}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(notification.timestamp), 'PPp')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No notifications yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}