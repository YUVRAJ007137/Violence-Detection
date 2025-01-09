import axios from 'axios';

const API_URL = 'http://your-flask-api-url'; // Replace with your actual Flask API URL

export const api = {
  async registerCamera(userId: string, cameraId: string, cameraUrl: string) {
    try {
      const response = await axios.post(`${API_URL}`, {
        user_id: userId,
        camera_id: cameraId,
        camera_url: cameraUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error registering camera:', error);
      throw error;
    }
  },

  async registerVideo(videoUrl: string) {
    try {
      const response = await axios.post(`${API_URL}`, {
        video_url: videoUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error registering video:', error);
      throw error;
    }
  }
};