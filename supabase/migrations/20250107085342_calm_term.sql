/*
  # Add video analysis features
  
  1. New Tables
    - `video_analysis`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `video_url` (text)
      - `status` (text) - pending, processing, completed
      - `results` (jsonb)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on video_analysis table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS video_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  video_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  results jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE video_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video analysis"
  ON video_analysis
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video analysis"
  ON video_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);