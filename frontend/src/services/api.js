import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
    if (this.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    }
  }

  async login(credentials) {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    if (response.data.token) {
      this.token = response.data.token;
      localStorage.setItem('token', this.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    }
    return response.data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }

  isAuthenticated() {
    return !!this.token;
  }

  async getCurrentUser() {
    const response = await axios.get(`${API_URL}/auth/me`);
    return response.data;
  }

  async getRobots(filters, pagination) {
    const params = { ...filters, ...pagination };
    const response = await axios.get(`${API_URL}/robots`, { params });
    return response.data;
  }

  async getRobotById(id) {
    const response = await axios.get(`${API_URL}/robots/${id}`);
    return response.data;
  }

  async updateRobotConfiguration(id, configuration) {
    const response = await axios.put(`${API_URL}/robots/${id}/config`, { configuration });
    return response.data;
  }

  async getRobotTelemetryHistory(id, limit) {
    const response = await axios.get(`${API_URL}/robots/${id}/telemetry`, { params: { limit } });
    return response.data;
  }
}

const apiService = new ApiService();

export default apiService;
