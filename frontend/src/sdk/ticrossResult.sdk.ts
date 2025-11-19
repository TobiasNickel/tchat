

export const ticrossResultSdk = {
  startGame: async (params: { seed: string; grid_width: number; grid_height: number; difficulty: string }): Promise<{
    hash: string;
    timestamp: number;
  }> => {
    const response = await fetch('/api/ticross_result.php/start-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    return response.json();
  },
  submitResult: async (params: {
    seed: string;
    grid_width: number;
    grid_height: number;
    difficulty: string;
    hash: string;
    timestamp: number;
    total_time_seconds: number;
    moves?: any[];
  }): Promise<{
    success: boolean;
  }> => {
    const response = await fetch('/api/ticross_result.php/submit-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    return response.json();
  },
  getResults: async (): Promise<{
    results: any[];
  }> => {
    const response = await fetch('/api/ticross_result.php/results', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },
};