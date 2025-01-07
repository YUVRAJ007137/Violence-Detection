import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FILE_TYPES = ['video/mp4', 'video/avi'];

interface VideoAnalysis {
  id: string;
  video_url: string;
  analysis_result: string | null;
  status: 'processing' | 'completed' | 'failed';
}

export const VideoAnalysis = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    // Fetch existing analyses when the component mounts
    fetchAnalyses();
    const subscription = setupRealtimeSubscription();

    return () => {
      // Cleanup the subscription when the component unmounts
      subscription.then(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const fetchAnalyses = async () => {
    const { data, error } = await supabase.from('video_analyses').select('*');
    if (error) {
      console.error('Error fetching analyses:', error.message);
      return;
    }
    setAnalyses(data || []);
  };

  const setupRealtimeSubscription = () => {
    return supabase
      .from('video_analyses')
      .on('INSERT', payload => {
        setAnalyses((prevAnalyses) => [...prevAnalyses, payload.new]);
      })
      .on('UPDATE', payload => {
        setAnalyses((prevAnalyses) => prevAnalyses.map((analysis) =>
          analysis.id === payload.new.id ? payload.new : analysis
        ));
      })
      .subscribe();
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      const errorMessage = validateFile(file);
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setError(null);
        setVideoFile(file);
      }
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) return;

    const fileName = `${Date.now()}_${videoFile.name}`;
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, videoFile, {
        cacheControl: '3600',
        upsert: false,
        onProgress: (progress) => {
          setUploadProgress((progress.loaded / progress.total) * 100);
        }
      });

    if (error) {
      console.error('Error uploading video:', error.message);
      setError('Error uploading video');
      return;
    }

    const { publicURL, error: urlError } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);
      
    if (urlError) {
      console.error('Error generating public URL:', urlError.message);
      setError('Error generating public URL');
      return;
    }

    // Insert record into video_analyses table
    const { error: insertError } = await supabase.from('video_analyses').insert([
      {
        video_url: publicURL,
        status: 'processing',
        analysis_result: null,
      }
    ]);

    if (insertError) {
      console.error('Error inserting into database:', insertError.message);
      setError('Error saving video analysis');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Video Analysis</h1>
      
      <div className="text-center mb-6">
        <input type="file" accept="video/*" onChange={handleFileChange} />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="text-center mb-6">
        <button
          className="px-6 py-3 bg-blue-500 text-white rounded"
          onClick={uploadVideo}
          disabled={!videoFile || uploadProgress > 0}
        >
          Upload Video
        </button>
        {uploadProgress > 0 && (
          <div className="mt-2">
            <progress value={uploadProgress} max={100} />
            <p>{Math.round(uploadProgress)}%</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        {analyses.length === 0 ? (
          <p>No videos uploaded yet.</p>
        ) : (
          <ul>
            {analyses.map((analysis) => (
              <li key={analysis.id} className="mb-4 p-4 border rounded-md">
                <h3 className="text-xl font-semibold">Video URL: {analysis.video_url}</h3>
                {analysis.status === 'processing' && (
                  <div className="text-center text-gray-500 py-8">Analysis in progress...</div>
                )}
                {analysis.status === 'completed' && analysis.analysis_result && (
                  <div className="text-center text-green-500 py-2">
                    Violence Detection Result: {analysis.analysis_result}
                  </div>
                )}
                {analysis.status === 'failed' && (
                  <div className="text-center text-red-500 py-2">Analysis failed</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
