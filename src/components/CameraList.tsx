import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';
import { CameraCard } from './CameraCard';

interface Camera {
  id: string;
  user_id: string;
  camera_name: string;
  ip_address: string;
  created_at: string;
}

export function CameraList() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [newCamera, setNewCamera] = useState({ camera_name: '', ip_address: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
  
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('user_id', user.id)  // Add this line to filter by user_id
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      setCameras(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('cameras')
        .insert([{
          ...newCamera,
          user_id: user.id,
        }]);

      if (error) throw error;
      setNewCamera({ camera_name: '', ip_address: '' });
      fetchCameras();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const deleteCamera = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCameras();
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) return <div className="text-center p-4">Loading cameras...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cameras</h2>

            <form onSubmit={addCamera} className="mb-6 bg-gray-50 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Camera Name</label>
            <input
              type="text"
              value={newCamera.camera_name}
              onChange={(e) => setNewCamera({ ...newCamera, camera_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-black bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">IP Address</label>
            <input
              type="text"
              value={newCamera.ip_address}
              onChange={(e) => setNewCamera({ ...newCamera, ip_address: e.target.value })}
              className="mt-1 block w-full rounded-md border-black bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Camera
        </button>
      </form>

      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            onDelete={deleteCamera}
          />
        ))}
      </div>
    </div>
  );
}