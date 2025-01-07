import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { CameraStream } from './CameraStream';

interface CameraCardProps {
  camera: {
    id: string;
    camera_name: string;
    ip_address: string;
    created_at: string;
  };
  onDelete: (id: string) => void;
}

export function CameraCard({ camera, onDelete }: CameraCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/camera/${camera.id}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{camera.camera_name}</h3>
          <p className="text-sm text-gray-600">{camera.ip_address}</p>
          <p className="text-xs text-gray-400 mt-1">
            Added: {new Date(camera.created_at).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => onDelete(camera.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      <div 
        className="mt-4 aspect-video cursor-pointer"
        onClick={handleClick}
      >
        <CameraStream 
          ipAddress={camera.ip_address}
          cameraName={camera.camera_name}
        />
      </div>
    </div>
  );
}