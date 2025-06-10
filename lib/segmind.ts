// Segmind API integration
export interface SegmindResponse {
  url: string;
}

export class SegmindAPI {
  private apiKey: string;
  private baseUrl = 'https://api.segmind.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(prompt: string, width: number = 512, height: number = 512): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/flux-schnell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          num_inference_steps: 4,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 1000000),
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: SegmindResponse = await response.json();
      return data.url;
    } catch (error) {
      console.error('Segmind API error:', error);
      throw error;
    }
  }
}

// Factory function for easy use
export const segmind = {
  generateImage: async (prompt: string, w: number = 512, h: number = 512): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_SEGMIND_API_KEY;
    if (!apiKey) {
      throw new Error('SEGMIND_API_KEY environment variable is required');
    }
    const api = new SegmindAPI(apiKey);
    return api.generateImage(prompt, w, h);
  }
};
