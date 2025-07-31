const API_BASE_URL = 'http://localhost:8000';
// Launch browser
export const launchBrowser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/launch-browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to launch browser');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error launching browser:', error);
    throw error;
  }
};

export const startAnalysis = async (benchmarkFileContent: string, resourceName: string) => {
  try {
    // Create a temporary file with the content
    const tempFile = new File([benchmarkFileContent], 'temp_benchmark.json', { type: 'application/json' });
    const formData = new FormData();
    formData.append('benchmark_file', tempFile);
    formData.append('resource_name', resourceName);

    const response = await fetch(`${API_BASE_URL}/api/start-analysis`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to start analysis');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error starting analysis:', error);
    throw error;
  }
};

export const getAnalysisStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis-status`);
    
    if (!response.ok) {
      throw new Error('Failed to get analysis status');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting analysis status:', error);
    throw error;
  }
}; 