import api from './api';

export interface Activity {
  id: string;
  action: string;
  text: string;
  time: string;
  user: string;
}

export const activityService = {
  // Get recent activities
  getActivities: async (limit: number = 10): Promise<Activity[]> => {
    const response = await api.get(`/activity?limit=${limit}`);
    return response.data.data;
  }
};
