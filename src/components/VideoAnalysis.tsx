import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, AlertTriangle, CheckCircle, Clock, Loader } from 'lucide-react';
import { format } from 'date-fns';

interface VideoAnalysis {
  id: string;
  user_id: string;
  video_url: string;
  status: 'pending' | 'processing' | 'completed';
  results: any;
  created_at: string;
}

export function VideoAnalysis() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
    
    const subscribeToChanges = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const channel = supabase
        .channel('video_analysis_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'video_analysis',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchAnalyses();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    subscribeToChanges();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('video_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      setError(null);
      setUploading(true);
      setUploadProgress(0);

      const file = event.target.files?.[0];
      if (!file) return;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-analysis')
        .upload(`videos/${user.id}/${Date.now()}-${file.name}`, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percent));
          },
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('video-analysis')
        .getPublicUrl(uploadData.path);

      const { error: dbError } = await supabase
        .from('video_analysis')
        .insert([{ 
          video_url: publicUrl,
          user_id: user.id
        }]);

      if (dbError) throw dbError;

      await fetchAnalyses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Rest of the component remains the same
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  // JSX remains the same...
  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Video Analysis</h2>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block">
            <span className="sr-only">Choose video file</span>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {uploading ? (
                  <div className="space-y-2">
                    <Loader className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-blue-600">
                            Uploading...
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-blue-600">
                            {uploadProgress}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                        <div
                          style={{ width: `${uploadProgress}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a video</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="video/*"
                          onChange={handleUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">MP4, AVI up to 100MB</p>
                  </>
                )}
              </div>
            </div>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(analysis.status)}
                  <span className="font-medium capitalize">{analysis.status}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Uploaded {format(new Date(analysis.created_at), 'PPp')}
                </p>
              </div>
              
              {analysis.status === 'completed' && analysis.results && (
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Violence Detected: 
                    <span className={analysis.results.violence_detected ? 'text-red-500' : 'text-green-500'}>
                      {analysis.results.violence_detected ? ' Yes' : ' No'}
                    </span>
                  </p>
                  {analysis.results.confidence && (
                    <p className="text-xs text-gray-500">
                      Confidence: {(analysis.results.confidence * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {analyses.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No videos analyzed yet
          </div>
        )}
      </div>
    </div>
  );
}