import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, AlertCircle } from 'lucide-react';

interface CameraStreamProps {
  ipAddress: string;
  cameraName: string;
}

export function CameraStream({ ipAddress, cameraName }: CameraStreamProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const [streamUrl, setStreamUrl] = useState(`http://${ipAddress}/video`);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleImageError = () => {
    setError(true);
  };

  const handleImageLoad = () => {
    setError(false);
  };

  useEffect(() => {
    // Update the stream URL if the IP address changes
    setStreamUrl(`http://${ipAddress}/video`);
  }, [ipAddress]);

  return (
    <div
      className={`relative ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'w-full h-full'
      }`}
    >
      {error ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Unable to connect to camera</p>
            <p className="text-sm mt-1">{ipAddress}</p>
          </div>
        </div>
      ) : (
        <>
          <img
            src={streamUrl}
            alt={`Stream from ${cameraName}`}
            className={`${
              isFullscreen ? 'w-full h-full' : 'w-full h-full rounded'
            }`}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </>
      )}
    </div>
  );
}
