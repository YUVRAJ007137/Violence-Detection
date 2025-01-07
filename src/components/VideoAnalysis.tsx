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
  
      // Changed the upload path to not use folders
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-analysis')
        .upload(`${user.id}-${Date.now()}-${file.name}`, file, {
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
      {/* ... existing JSX ... */}
    </div>
  );
}