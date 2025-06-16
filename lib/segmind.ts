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
      // Use Flux-Schnell with correct parameters
      // Ensure dimensions are multiples of 8 and within valid ranges
      const validWidth = Math.min(Math.max(Math.round(width / 8) * 8, 512), 1024);
      const validHeight = Math.min(Math.max(Math.round(height / 8) * 8, 512), 1024);

      console.log('Generating image with params:', { prompt, validWidth, validHeight });      const requestBody = {
        prompt: prompt,
        steps: 1, // Reduced from 4 to 1 for faster testing
        seed: Math.floor(Math.random() * 1000000000),
        sampler_name: "euler",
        scheduler: "normal",
        samples: 1,
        width: validWidth,
        height: validHeight,
        denoise: 1
      };      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Add timeout for long requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      // Use the correct flux-schnell endpoint
      const response = await fetch(`${this.baseUrl}/flux-schnell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        console.error('Response status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers));
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      // Check if response is JSON or binary image data
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);

      if (contentType && contentType.includes('application/json')) {
        // Response contains JSON with URL
        const data: SegmindResponse = await response.json();
        console.log('API Response:', data);
        return data.url;      } else {
        // Response contains binary image data - convert to data URL
        const blob = await response.blob();
        console.log('Blob size:', blob.size, 'type:', blob.type);
        
        // Ensure we have a valid image blob
        if (blob.size === 0) {
          throw new Error('Received empty image data from API');
        }
        
        // Convert blob to base64 data URL for proper display
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            console.log('Generated data URL prefix:', dataUrl.substring(0, 50));
            console.log('Data URL length:', dataUrl.length);
            resolve(dataUrl);
          };
          reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(new Error('Failed to convert image to data URL'));
          };
          reader.readAsDataURL(blob);
        });
      }
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
    console.log('API Key available:', !!apiKey);
    console.log('API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_SEGMIND_API_KEY environment variable is required');
    }
    
    try {
      const api = new SegmindAPI(apiKey);
      const result = await api.generateImage(prompt, w, h);
      console.log('Final image result type:', typeof result);
      console.log('Final image result length:', result.length);
      console.log('Final image result starts with:', result.substring(0, 20));
      return result;
    } catch (error) {
      console.error('Failed to generate image, falling back to placeholder:', error);
      
      // Fallback to placeholder if API fails
      const placeholderSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="40%" font-family="Arial" font-size="12" fill="white" text-anchor="middle">AI Generated</text>
        <text x="50%" y="60%" font-family="Arial" font-size="10" fill="white" text-anchor="middle">${prompt.substring(0, 30)}...</text>
      </svg>`
      
      const placeholderUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg)}`
      return placeholderUrl;
    }
  }
};
