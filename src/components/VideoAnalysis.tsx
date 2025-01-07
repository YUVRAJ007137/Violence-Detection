import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';  // Ensure this imports your supabase client correctly

interface VideoAnalysis {
  id: string;
  video_url: string;
  analysis_result: string | null;
  status: 'processing' | 'completed' | 'failed';
}

const VideoAnalysisComponent: React.FC = () => {
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyses = async () => {
      const { data, error } = await supabase.from<VideoAnalysis>('video_analyses').select('*');
      if (error) {
        console.error('Error fetching analyses:', error.message);
      } else {
        setAnalyses(data || []);
      }
    };

    // Realtime subscription
    const channel = supabase
      .from('video_analyses')
      .on('INSERT', (payload) => {
        setAnalyses((prevAnalyses) => [...prevAnalyses, payload.new]);
      })
      .on('UPDATE', (payload) => {
        setAnalyses((prevAnalyses) =>
          prevAnalyses.map((analysis) =>
            analysis.id === payload.new.id ? payload.new : analysis
          )
        );
      })
      .subscribe();

    fetchAnalyses();

    // Cleanup the realtime subscription
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const uploadVideo = async () => {
    if (!videoFile) return;

    const fileName = `${Date.now()}_${videoFile.name}`;

    // Upload video file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, videoFile, {
        cacheControl: '3600',
        upsert: false,
        // onProgress is not supported by supabase directly
      });

    if (error) {
      console.error('Error uploading video:', error.message);
      setError('Error uploading video');
      return;
    }

    const { publicUrl, error: urlError } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    if (urlError) {
      console.error('Error generating public URL:', urlError.message);
      setError('Error generating public URL');
      return;
    }

    console.log('Public URL:', publicUrl);
    // Now, you can use this URL in your video analysis process
  };

  return (
    <div>
      <h1>Video Analysis</h1>
      {error && <p>Error: {error}</p>}
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideoFile(e.target.files ? e.target.files[0] : null)}
      />
      <button onClick={uploadVideo}>Upload Video</button>

      <div>
        <h2>Video Analyses</h2>
        {analyses.length === 0 ? (
          <p>No video analyses available</p>
        ) : (
          <ul>
            {analyses.map((analysis) => (
              <li key={analysis.id}>
                <p>Video URL: {analysis.video_url}</p>
                <p>Analysis Result: {analysis.analysis_result}</p>
                <p>Status: {analysis.status}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default VideoAnalysisComponent;
