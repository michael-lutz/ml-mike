const API_BASE_URL = '/api/v1';

export class ApiService {
  static async executeCommand(command) {
    try {
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing command:', error);
      return {
        success: false,
        output: '',
        error: `Network error: ${error.message}`,
        prompt: 'michael:/$ '
      };
    }
  }

  static async getPrompt() {
    try {
      const response = await fetch(`${API_BASE_URL}/prompt`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting prompt:', error);
      return { prompt: 'michael:/$ ' };
    }
  }

  static async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
} 