# Game Reskin Wizard - Setup Guide

## Overview
The Reskin Wizard allows you to create custom game assets using AI and export complete games. It integrates with Segmind's AI image generation API to create backgrounds, player sprites, obstacles, and collectibles.

## Features

### ✨ AI Asset Generation
- **Background Generation**: Create custom backgrounds for your games
- **Player Sprites**: Generate unique character sprites
- **Obstacles**: Design custom obstacles and challenges
- **Collectibles**: Create power-ups and collectible items
- **Accept/Regenerate**: Review and refine generated assets

### 🎮 Game Parameter Controls
- **Slider Controls**: Adjust gravity, speed, dimensions, and more
- **Real-time Preview**: See changes instantly in the live preview canvas
- **Game-specific Parameters**: Each template has relevant controls

### 📦 One-Click Export
- **Complete Game Bundle**: Exports HTML, CSS, JavaScript, and assets
- **Asset Integration**: All accepted assets are included with proper paths
- **Configuration File**: Game parameters saved in config.json
- **ZIP Download**: Ready-to-deploy game package

## Setup Instructions

### 1. Get Segmind API Key
1. Visit [Segmind.com](https://segmind.com/)
2. Sign up for an account
3. Navigate to your API settings
4. Copy your API key

### 2. Configure Environment
1. Open the `.env.local` file in your project root
2. Replace `your_segmind_api_key_here` with your actual API key:
   ```
   NEXT_PUBLIC_SEGMIND_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Install Dependencies
The required dependencies should already be installed. If you need to reinstall:
```bash
npm install jszip @types/jszip
```

## Usage Guide

### Getting Started
1. Launch the app: `npm run dev`
2. Click on "🎨 Reskin Wizard" from the main menu
3. Choose a game template (Flappy Bird or Crossy Road)

### Generating Assets
1. **Review Default Prompts**: Each asset slot has a default AI prompt
2. **Customize Prompts**: Edit the text to describe exactly what you want
3. **Generate**: Click "Generate" to create the asset with AI
4. **Review**: The generated image will appear below the prompt
5. **Accept or Regenerate**: Accept assets you like, or regenerate with different prompts

### Adjusting Game Parameters
- Use the sliders in the right panel to adjust game mechanics
- Changes appear instantly in the live preview
- Parameters include gravity, speed, dimensions, and game-specific settings

### Exporting Your Game
1. **Accept Assets**: Make sure to accept at least some generated assets
2. **Click Export**: The "Export Game" button becomes available
3. **Download**: A ZIP file will download with your complete game
4. **Deploy**: Extract and upload the files to any web server

## File Structure (Exported Game)

```
MyGame_Custom.zip/
├── index.html          # Main game page
├── game.js            # Game logic with your parameters
├── style.css          # Game styling
├── config.json        # Your game configuration
└── assets/            # Your AI-generated assets
    ├── background.png
    ├── playerSprite.png
    ├── obstacles.png
    └── collectibles.png
```

## Supported Game Templates

### Flappy Bird
- **Assets**: Background, Bird Sprite, Pipes, Coins
- **Parameters**: Gravity, Pipe Width, Pipe Gap, Game Speed

### Crossy Road
- **Assets**: Background, Player Character, Vehicles, Power-ups
- **Parameters**: Player Speed, Vehicle Speed, Vehicle Density, Lane Width

## API Integration Details

### Segmind API Usage
- **Model**: Uses Flux-Schnell for fast, high-quality image generation
- **Parameters**: Customizable width, height, and generation settings
- **Rate Limits**: Depends on your Segmind plan
- **Cost**: Pay-per-use based on Segmind pricing

### Error Handling
- Network failures are gracefully handled
- Invalid API keys show clear error messages
- Generation failures allow for retry attempts

## Deployment Considerations

### Environment Variables
- The `NEXT_PUBLIC_` prefix makes the API key available to the client
- For production, consider using a backend proxy to keep API keys secure
- Never commit your actual API key to version control

### Browser Compatibility
- Uses modern Canvas API and Fetch
- Requires JavaScript enabled
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)

### Performance Tips
- Generated images are cached during the session
- Large images may take longer to generate
- Consider optimizing prompts for faster generation

## Troubleshooting

### Common Issues
1. **"API Key Required" Error**: Check your .env.local file
2. **Generation Fails**: Verify your Segmind account has credits
3. **Export Button Disabled**: Accept at least one generated asset
4. **Canvas Not Showing**: Check browser JavaScript console for errors

### Support Resources
- [Segmind Documentation](https://docs.segmind.com/)
- [Segmind Discord Community](https://discord.gg/G5t5k2JRN6)
- Check browser console for detailed error messages

## Advanced Usage

### Custom Prompts
- Be specific about style: "pixel art", "cartoon", "realistic"
- Include colors: "bright blue", "golden yellow"
- Specify mood: "friendly", "scary", "energetic"
- Add context: "for a mobile game", "retro style"

### Parameter Tuning
- Start with small adjustments to see impact
- Use preview to test changes before export
- Consider game balance when adjusting difficulty parameters

### Asset Optimization
- Generated images are typically 512x512 or custom dimensions
- Consider file size for web deployment
- Test assets in the live preview before accepting

---

*Built with Next.js, TypeScript, Tailwind CSS, and Segmind AI*
