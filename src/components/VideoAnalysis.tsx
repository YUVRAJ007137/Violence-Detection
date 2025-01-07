import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, AlertTriangle, CheckCircle, Clock, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface VideoAnalysis {
  id: string;
  video_url: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  results: {
    violence_detected?: boolean;
    confidence?: number;
  } | null;
  created_at: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const ALLOWED_FILE_TYPES = ['video/mp4', 'video/avi'];

export function VideoAnalysis() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
    const subscription = setupRealtimeSubscription();
    return () => {
      subscription.then(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const setupRealtimeSubscription = async () => {
    const channel = supabase
      .channel('video_analysis_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_analysis'
      }, fetchAnalyses)
      .subscribe();
    
    return channel;
  };

  const fetchAnalyses = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('video_analysis')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAnalyses(data || []);
    } catch (err: any) {
      setError(`Failed to fetch analyses: ${err.message}`);
    }
  };

  const validateFile = (file: File): string | null => {
    if (!file) return 'No file selected';
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP4 or AVI files only';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 100MB limit';
    }
    return null;
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const file = event.target.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      // Get user session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error('Authentication required');
      if (!session?.user?.id) throw new Error('User not authenticated');

      // Upload file
      const filePath = `videos/${session.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('video-analysis')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percent));
          },
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl }, error: urlError } = supabase.storage
        .from('video-analysis')
        .getPublicUrl(filePath);

      if (urlError) throw urlError;

      // Create database entry
      const { error: dbError } = await supabase
        .from('video_analysis')
        .insert([{
          user_id: session.user.id,
          video_url: publicUrl,
          status: 'pending',
        }]);

      if (dbError) throw dbError;

      await fetchAnalyses();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (event.target) event.target.value = ''; // Reset file input
    }
  };

  const getStatusIcon = (status: VideoAnalysis['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h2 className="text-xl font-bold">Video Analysis</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <label className="block">
              <span className="sr-only">Choose video file</span>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {uploading ? (
                    <div className="space-y-2">
                      <Loader className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <span className="text-xs font-semibold text-blue-600">
                            Uploading... {uploadProgress}%
                          </span>
                        </div>
                        <div className="h-2 rounded bg-blue-200">
                          <div
                            style={{ width: `${uploadProgress}%` }}
                            className="h-full rounded bg-blue-500 transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload a video</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="video/mp4,video/avi"
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
            <div className="p-4 bg-red-50 rounded-md flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {analyses.map((analysis) => (
              <div key={analysis.id} className="bg-white p-4 rounded-lg border border-gray-200">
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
                        <span className={analysis.results.violence_detected ? 'text-red-500 ml-1' : 'text-green-500 ml-1'}>
                          {analysis.results.violence_detected ? 'Yes' : 'No'}
                        </span>
                      </p>
                      {analysis.results.confidence !== undefined && (
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
      </CardContent>
    </Card>
  );
}

export default VideoAnalysis;