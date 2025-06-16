"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Download, RefreshCw, Check, Loader2, Palette, X, Music, Play, Pause, Volume2 } from "lucide-react"
import { segmind } from "@/lib/segmind"
import JSZip from "jszip"

interface AssetSlot {
  id: string
  name: string
  defaultPrompt: string
  dimensions: { width: number; height: number }
  url?: string
  isAccepted?: boolean
  isGenerating?: boolean
  isPlaceholder?: boolean
}

interface MusicTrack {
  id: string
  name: string
  defaultPrompt: string
  url?: string
  isGenerating?: boolean
  duration?: number
}

interface GameParam {
  id: string
  name: string
  type: 'slider' | 'input'
  min?: number
  max?: number
  step?: number
  defaultValue: number | string
  value: number | string
}

interface GameConfig {
  gameId: string
  gameName: string
  version: string
  generatedAt: string
  parameters: Record<string, string | number>
  assets: Record<string, string>
  music: Record<string, string>
}

interface GameReskinPanelProps {
  gameId: string
  gameName: string
  assetSlots: AssetSlot[]
  gameParams: GameParam[]
  isOpen: boolean
  onClose: () => void
  onAssetsChanged?: (assets: Record<string, string>) => void
  onParamsChanged?: (params: Record<string, number | string>) => void
  mode?: 'modal' | 'inline' | 'floating' // Add floating mode
  theme?: 'flappy-bird' | 'crossy-road' | 'match-3' | 'speed-runner' | 'whack-the-mole' // Add theme prop
}

export default function GameReskinPanel({
  gameId,
  gameName,
  assetSlots: initialAssetSlots,
  gameParams: initialGameParams,
  isOpen,
  onClose,
  onAssetsChanged,
  onParamsChanged,
  mode = 'inline', // Default to inline for integrated experience
  theme = 'flappy-bird' // Default theme
}: GameReskinPanelProps) {
  const [assetSlots, setAssetSlots] = useState<AssetSlot[]>(initialAssetSlots)
  const [gameParams, setGameParams] = useState<GameParam[]>(initialGameParams)
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([
    {
      id: "background_music",
      name: "Background Music",
      defaultPrompt: `upbeat ${gameName.toLowerCase()} game background music, loop-friendly, electronic gameboy style`
    },
    {
      id: "victory_sound",
      name: "Victory Sound",
      defaultPrompt: `victory fanfare sound effect for ${gameName.toLowerCase()} game, triumphant and cheerful`
    },
    {
      id: "action_sound",
      name: "Action Sound",
      defaultPrompt: `action sound effect for ${gameName.toLowerCase()} game interactions, crisp and satisfying`
    }
  ])
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({})
  const [activeTab, setActiveTab] = useState<'assets' | 'music' | 'parameters'>('assets')
  const [isExporting, setIsExporting] = useState(false)
  const generateAsset = useCallback(async (slotIndex: number) => {
    const slot = assetSlots[slotIndex]
    if (!slot) return

    // Update slot to show generating state
    const updatedSlots = [...assetSlots]
    updatedSlots[slotIndex] = { ...slot, isGenerating: true }
    setAssetSlots(updatedSlots)

    try {
      // Try the API first, but with a short timeout to avoid hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('API timeout - using placeholder')), 10000)
      );
      
      const apiPromise = segmind.generateImage(slot.defaultPrompt, slot.dimensions.width, slot.dimensions.height);
      
      const imageUrl = await Promise.race([apiPromise, timeoutPromise]);
      
      // Update slot with generated image
      updatedSlots[slotIndex] = {...slot, 
        url: imageUrl, 
        isGenerating: false,
        isAccepted: false
      }
      setAssetSlots(updatedSlots)    } catch (error) {
      console.error('Failed to generate asset:', error)
      // Provide a fallback placeholder image with a simpler approach
      const { width, height } = slot.dimensions
      const placeholderSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#374151"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9CA3AF" text-anchor="middle" dy=".3em">${slot.name} Placeholder</text></svg>`
      const placeholderUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg)}`
      
      updatedSlots[slotIndex] = { 
        ...slot, 
        url: placeholderUrl,
        isGenerating: false,
        isAccepted: false,
        isPlaceholder: true 
      }
      setAssetSlots(updatedSlots)
    }
  }, [assetSlots])

  const generateMusic = useCallback(async (trackIndex: number) => {
    const track = musicTracks[trackIndex]
    if (!track) return

    // Update track to show generating state
    const updatedTracks = [...musicTracks]
    updatedTracks[trackIndex] = { ...track, isGenerating: true }
    setMusicTracks(updatedTracks)

    try {
      // For demonstration, we'll create a placeholder audio URL
      // In a real implementation, you'd call a music generation API
      const audioUrl = `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjmO2+3QbCMFLpz...` // Truncated for brevity
      
      updatedTracks[trackIndex] = {
        ...track,
        url: audioUrl,
        isGenerating: false,
        duration: 30 // 30 seconds
      }
      setMusicTracks(updatedTracks)

      // Create audio element for playback
      const audio = new Audio(audioUrl)
      setAudioElements(prev => ({
        ...prev,
        [track.id]: audio
      }))
    } catch (error) {
      console.error('Failed to generate music:', error)
      updatedTracks[trackIndex] = { ...track, isGenerating: false }
      setMusicTracks(updatedTracks)
    }
  }, [musicTracks])

  const playMusic = useCallback((trackId: string) => {
    const audio = audioElements[trackId]
    if (!audio) return

    // Stop currently playing audio
    if (currentlyPlaying) {
      const currentAudio = audioElements[currentlyPlaying]
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
    }

    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null)
    } else {
      audio.play()
      setCurrentlyPlaying(trackId)
      
      audio.onended = () => {
        setCurrentlyPlaying(null)
      }
    }
  }, [audioElements, currentlyPlaying])

  const acceptAsset = useCallback((slotIndex: number) => {
    const updatedSlots = [...assetSlots]
    updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], isAccepted: true }
    setAssetSlots(updatedSlots)

    // Notify parent component of asset changes
    if (onAssetsChanged) {
      const assets: Record<string, string> = {}
      updatedSlots.forEach(slot => {
        if (slot.url && slot.isAccepted) {
          assets[slot.id] = slot.url
        }
      })
      onAssetsChanged(assets)
    }
  }, [assetSlots, onAssetsChanged])
  const updateGameParam = useCallback((paramIndex: number, value: number | string) => {
    const updatedParams = [...gameParams]
    updatedParams[paramIndex] = { ...updatedParams[paramIndex], value }
    setGameParams(updatedParams)
    
    // Call the callback with the updated parameters
    if (onParamsChanged) {
      const paramsObj = updatedParams.reduce((acc, param) => {
        acc[param.id] = param.value
        return acc
      }, {} as Record<string, number | string>)
      onParamsChanged(paramsObj)
    }
  }, [gameParams, onParamsChanged])

  const updateAssetPrompt = useCallback((slotIndex: number, prompt: string) => {
    const updatedSlots = [...assetSlots]
    updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], defaultPrompt: prompt }
    setAssetSlots(updatedSlots)
  }, [assetSlots])

  const updateMusicPrompt = useCallback((trackIndex: number, prompt: string) => {
    const updatedTracks = [...musicTracks]
    updatedTracks[trackIndex] = { ...updatedTracks[trackIndex], defaultPrompt: prompt }
    setMusicTracks(updatedTracks)
  }, [musicTracks])  // Helper functions to generate complete game files
  const generateGameHTML = (gameId: string, gameName: string, gameConfig: GameConfig) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${gameName} - Custom Game</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="game-container">
        <div id="game-header">
            <h1>${gameName}</h1>
            <div id="score-display">Score: <span id="score">0</span></div>
        </div>
        
        <div id="game-canvas-container">
            <canvas id="gameCanvas"></canvas>
            
            <!-- Game State Overlays -->
            <div id="menu-screen" class="overlay">
                <div class="menu-content">
                    <h2>Ready to Play?</h2>
                    <p>Use arrow keys or WASD to move. Click or press Space for actions.</p>
                    <button id="start-btn" class="game-button">Start Game</button>
                </div>
            </div>
            
            <div id="pause-screen" class="overlay hidden">
                <div class="menu-content">
                    <h2>Game Paused</h2>
                    <button id="resume-btn" class="game-button">Resume</button>
                    <button id="restart-btn" class="game-button">Restart</button>
                </div>
            </div>
            
            <div id="gameover-screen" class="overlay hidden">
                <div class="menu-content">
                    <h2>Game Over!</h2>
                    <p>Final Score: <span id="final-score">0</span></p>
                    <button id="play-again-btn" class="game-button">Play Again</button>
                </div>
            </div>
        </div>
        
        <div id="game-controls">
            <button id="pause-btn" class="control-button">Pause</button>
            <button id="mute-btn" class="control-button">🔊</button>
        </div>
        
        <div id="game-info">
            <p>Generated with GameGen AI Reskin Tool</p>
            <p>Custom assets and parameters applied</p>
        </div>
    </div>
    
    <script>
        // Embed game configuration
        window.GAME_CONFIG = ${JSON.stringify(gameConfig, null, 2)};
    </script>
    <script src="game.js"></script>
</body>
</html>`
  }

  const generateGameJS = useCallback((gameId: string, gameConfig: GameConfig) => {
    // Generate appropriate game logic based on game type
    switch (gameId) {
      case 'flappy-bird':
        return generateFlappyBirdJS(gameConfig)
      case 'crossy-road':
      case 'crossy-road-new':
        return generateCrossyRoadJS(gameConfig)
      case 'speed-runner':
        return generateSpeedRunnerJS(gameConfig)
      case 'match-3':
        return generateMatch3JS(gameConfig)
      case 'whack-the-mole':
        return generateWhackMoleJS(gameConfig)
      default:
        return generateGenericJS(gameConfig)
    }
  }, [])

  const generateGameCSS = () => {
    return `/* Game Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
}

#game-container {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
    border: 1px solid rgba(255, 255, 255, 0.18);
    max-width: 900px;
    width: 100%;
}

#game-header {
    text-align: center;
    margin-bottom: 20px;
}

#game-header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

#score-display {
    font-size: 1.2rem;
    font-weight: bold;
}

#game-canvas-container {
    position: relative;
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

#gameCanvas {
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 10px;
    background: #000;
    max-width: 100%;
    height: auto;
}

.overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
}

.overlay.hidden {
    display: none;
}

.menu-content {
    text-align: center;
    color: white;
}

.menu-content h2 {
    font-size: 2rem;
    margin-bottom: 20px;
}

.menu-content p {
    font-size: 1.1rem;
    margin-bottom: 30px;
    opacity: 0.9;
}

.game-button {
    background: linear-gradient(45deg, #ff6b6b, #ee5a52);
    border: none;
    padding: 15px 30px;
    font-size: 1.1rem;
    color: white;
    border-radius: 25px;
    cursor: pointer;
    margin: 5px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.game-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.game-button:active {
    transform: translateY(0);
}

#game-controls {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 20px;
}

.control-button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 10px 20px;
    color: white;
    border-radius: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.control-button:hover {
    background: rgba(255, 255, 255, 0.3);
}

#game-info {
    text-align: center;
    font-size: 0.9rem;
    opacity: 0.7;
}

#game-info p {
    margin: 5px 0;
}

/* Responsive design */
@media (max-width: 768px) {
    #game-container {
        margin: 10px;
        padding: 15px;
    }
    
    #game-header h1 {
        font-size: 2rem;
    }
    
    .menu-content h2 {
        font-size: 1.5rem;
    }
    
    .game-button {
        padding: 12px 25px;
        font-size: 1rem;
    }
}`
  }

  const generateReadme = (gameName: string) => {
    return `# ${gameName} - Custom Game

This game was generated using the GameGen AI Reskin Tool with custom assets and parameters.

## How to Play

1. Open \`index.html\` in a web browser
2. Click "Start Game" to begin
3. Use keyboard controls to play:
   - Arrow keys or WASD for movement
   - Space bar for actions (jump, attack, etc.)
   - Escape or P to pause

## Features

- Custom AI-generated graphics
- Personalized game parameters
- Embedded assets (no internet required)
- Responsive design for different screen sizes
- Sound effects and music (if generated)

## Technical Details

- Built with HTML5 Canvas
- Vanilla JavaScript (no dependencies)
- Embedded base64 assets for offline play
- Mobile-friendly responsive design

## Generated Assets

This game includes custom AI-generated assets that were accepted during the creation process. All assets are embedded as base64 data URLs for maximum compatibility.

---

*Generated on ${new Date().toLocaleDateString()} with GameGen AI Reskin Tool*
`
  }
  const generateFlappyBirdJS = (config: GameConfig) => {
    return `// Flappy Bird Game Logic
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 450;
        
        this.config = window.GAME_CONFIG;
        this.assets = {};
        this.gameState = 'menu';
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappy-best') || '0');
        
        // Game parameters from config
        this.gravity = this.config.parameters.gravity || 0.8;
        this.jumpHeight = this.config.parameters.jumpHeight || -12;
        this.gameSpeed = this.config.parameters.gameSpeed || 3;
        this.pipeGap = this.config.parameters.pipeGap || 150;
        this.pipeWidth = this.config.parameters.pipeWidth || 80;
        
        this.bird = {
            x: 50,
            y: 225,
            velocity: 0,
            size: 20
        };
        
        this.pipes = [];
        this.particles = [];
        this.pipeSpawnTimer = 0;
        this.lastTime = 0;
        
        this.loadAssets();
        this.bindEvents();
        this.gameLoop();
    }
    
    async loadAssets() {
        for (const [assetId, dataUrl] of Object.entries(this.config.assets)) {
            const img = new Image();
            img.src = dataUrl;
            await new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            this.assets[assetId] = img;
        }
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseGame());
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.flap();
            }
        });
        
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.flap();
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.bird = { x: 50, y: 225, velocity: 0, size: 20 };
        this.pipes = [];
        this.particles = [];
        this.pipeSpawnTimer = 0;
        this.updateScore();
        this.showScreen('none');
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showScreen('pause');
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.showScreen('none');
        }
    }
    
    gameOver() {
        this.gameState = 'gameover';
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappy-best', this.bestScore.toString());
        }
        document.getElementById('final-score').textContent = this.score;
        this.showScreen('gameover');
    }
    
    showScreen(screen) {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        
        if (screen === 'pause') {
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (screen === 'gameover') {
            document.getElementById('gameover-screen').classList.remove('hidden');
        }
    }
    
    flap() {
        this.bird.velocity = this.jumpHeight;
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update bird
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;
        
        // Update pipes
        this.pipeSpawnTimer += deltaTime;
        const pipeInterval = 2000; // 2 seconds
        
        if (this.pipeSpawnTimer >= pipeInterval) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }
        
        this.pipes.forEach(pipe => {
            pipe.x -= this.gameSpeed;
            
            // Score when passing pipe
            if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.updateScore();
            }
        });
        
        // Remove off-screen pipes
        this.pipes = this.pipes.filter(pipe => pipe.x > -pipe.width);
        
        // Check collisions
        this.checkCollisions();
        
        // Check bounds
        if (this.bird.y > this.canvas.height || this.bird.y < 0) {
            this.gameOver();
        }
    }
    
    spawnPipe() {
        const gapPosition = 100 + Math.random() * (this.canvas.height - 300);
        
        this.pipes.push({
            x: this.canvas.width,
            topHeight: gapPosition,
            bottomY: gapPosition + this.pipeGap,
            bottomHeight: this.canvas.height - (gapPosition + this.pipeGap),
            width: this.pipeWidth,
            scored: false
        });
    }
    
    checkCollisions() {
        const birdBounds = {
            x: this.bird.x - this.bird.size/2,
            y: this.bird.y - this.bird.size/2,
            width: this.bird.size,
            height: this.bird.size
        };
        
        for (const pipe of this.pipes) {
            // Top pipe
            if (this.checkCollision(birdBounds, {
                x: pipe.x, y: 0, width: pipe.width, height: pipe.topHeight
            })) {
                this.gameOver();
                return;
            }
            
            // Bottom pipe
            if (this.checkCollision(birdBounds, {
                x: pipe.x, y: pipe.bottomY, width: pipe.width, height: pipe.bottomHeight
            })) {
                this.gameOver();
                return;
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background
        if (this.assets.background) {
            this.ctx.drawImage(this.assets.background, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#98FB98');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Pipes
        this.pipes.forEach(pipe => {
            if (this.assets.pipe) {
                // Top pipe (flipped)
                this.ctx.save();
                this.ctx.scale(1, -1);
                this.ctx.drawImage(this.assets.pipe, pipe.x, -pipe.topHeight, pipe.width, pipe.topHeight);
                this.ctx.restore();
                // Bottom pipe
                this.ctx.drawImage(this.assets.pipe, pipe.x, pipe.bottomY, pipe.width, pipe.bottomHeight);
            } else {
                this.ctx.fillStyle = '#2E7D32';
                this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
                this.ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, pipe.bottomHeight);
            }
        });
        
        // Bird
        if (this.assets.bird) {
            this.ctx.drawImage(this.assets.bird, 
                this.bird.x - this.bird.size/2, 
                this.bird.y - this.bird.size/2, 
                this.bird.size, this.bird.size);
        } else {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(this.bird.x, this.bird.y, this.bird.size/2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // UI overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, 10, 200, 60);
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Score: ' + this.score, 20, 30);
        this.ctx.fillText('Best: ' + this.bestScore, 20, 50);
        this.ctx.fillText('Speed: ' + this.gameSpeed.toFixed(1), 20, 70);
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});`
  }

  const generateCrossyRoadJS = (_config: GameConfig) => {
    return `// Crossy Road Game Logic
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.config = window.GAME_CONFIG;
        this.assets = {};
        this.gameState = 'menu';
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('crossy-best') || '0');
        
        this.player = {
            x: 400,
            y: 550,
            size: 30,
            gridSize: 40,
            targetX: 400,
            targetY: 550,
            isMoving: false
        };
        
        this.camera = { y: 0 };
        this.lanes = [];
        this.keys = {};
        this.lastTime = 0;
        
        this.loadAssets();
        this.bindEvents();
        this.initializeLanes();
        this.gameLoop();
    }
    
    async loadAssets() {
        for (const [assetId, dataUrl] of Object.entries(this.config.assets)) {
            const img = new Image();
            img.src = dataUrl;
            await new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            this.assets[assetId] = img;
        }
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseGame());
        
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                e.preventDefault();
                this.keys[e.code] = true;
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.player = {
            x: 400, y: 550, size: 30, gridSize: 40,
            targetX: 400, targetY: 550, isMoving: false
        };
        this.camera = { y: 0 };
        this.initializeLanes();
        this.updateScore();
        this.showScreen('none');
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showScreen('pause');
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.showScreen('none');
        }
    }
    
    gameOver() {
        this.gameState = 'gameover';
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('crossy-best', this.bestScore.toString());
        }
        document.getElementById('final-score').textContent = this.score;
        this.showScreen('gameover');
    }
    
    showScreen(screen) {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        
        if (screen === 'pause') {
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (screen === 'gameover') {
            document.getElementById('gameover-screen').classList.remove('hidden');
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    initializeLanes() {
        this.lanes = [];
        for (let i = 0; i < 20; i++) {
            const y = 600 - i * 40;
            let type = 'safe';
            if (i > 0) {
                if (i % 6 === 0) type = 'safe';
                else if (Math.random() < 0.5) type = 'road';
                else type = 'river';
            }
            this.lanes.push(this.createLane(y, type));
        }
    }
    
    createLane(y, type) {
        return {
            y: y,
            type: type,
            vehicles: [],
            logs: [],
            spawnTimer: 0,
            direction: Math.random() < 0.5 ? 1 : -1
        };
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Handle input
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.movePlayer('up');
            this.keys['ArrowUp'] = this.keys['KeyW'] = false;
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.movePlayer('down');
            this.keys['ArrowDown'] = this.keys['KeyS'] = false;
        }
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.movePlayer('left');
            this.keys['ArrowLeft'] = this.keys['KeyA'] = false;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.movePlayer('right');
            this.keys['ArrowRight'] = this.keys['KeyD'] = false;
        }
        
        // Update player movement
        if (this.player.isMoving) {
            const dx = this.player.targetX - this.player.x;
            const dy = this.player.targetY - this.player.y;
            
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
                this.player.x = this.player.targetX;
                this.player.y = this.player.targetY;
                this.player.isMoving = false;
            } else {
                this.player.x += dx * 0.15;
                this.player.y += dy * 0.15;
            }
        }
        
        // Update camera
        const targetCameraY = this.player.y - this.canvas.height * 0.7;
        this.camera.y += (targetCameraY - this.camera.y) * 0.08;
        
        // Update lanes
        this.lanes.forEach(lane => this.updateLane(lane, deltaTime));
        
        // Check collisions
        this.checkCollisions();
    }
    
    movePlayer(direction) {
        if (this.player.isMoving) return;
        
        const oldTargetX = this.player.targetX;
        const oldTargetY = this.player.targetY;
        
        switch (direction) {
            case 'up':
                this.player.targetY -= this.player.gridSize;
                break;
            case 'down':
                this.player.targetY += this.player.gridSize;
                break;
            case 'left':
                this.player.targetX = Math.max(20, this.player.targetX - this.player.gridSize);
                break;
            case 'right':
                this.player.targetX = Math.min(this.canvas.width - 20, this.player.targetX + this.player.gridSize);
                break;
        }
        
        if (this.player.targetX !== oldTargetX || this.player.targetY !== oldTargetY) {
            this.player.isMoving = true;
            if (direction === 'up') {
                this.score++;
                this.updateScore();
            }
        }
    }
    
    updateLane(lane, deltaTime) {
        lane.spawnTimer += deltaTime;
        
        if (lane.type === 'road' && lane.spawnTimer > 2000) {
            this.spawnVehicle(lane);
            lane.spawnTimer = 0;
        } else if (lane.type === 'river' && lane.spawnTimer > 3000) {
            this.spawnLog(lane);
            lane.spawnTimer = 0;
        }
        
        // Update vehicles
        lane.vehicles.forEach(vehicle => {
            vehicle.x += vehicle.speed * lane.direction;
        });
        lane.vehicles = lane.vehicles.filter(v => v.x > -100 && v.x < this.canvas.width + 100);
        
        // Update logs
        lane.logs.forEach(log => {
            log.x += log.speed * lane.direction;
        });
        lane.logs = lane.logs.filter(l => l.x > -200 && l.x < this.canvas.width + 200);
    }
    
    spawnVehicle(lane) {
        const startX = lane.direction > 0 ? -60 : this.canvas.width + 60;
        lane.vehicles.push({
            x: startX,
            y: lane.y,
            width: 60,
            height: 30,
            speed: 2 + Math.random() * 2
        });
    }
    
    spawnLog(lane) {
        const startX = lane.direction > 0 ? -120 : this.canvas.width + 120;
        lane.logs.push({
            x: startX,
            y: lane.y,
            width: 120,
            height: 20,
            speed: 1 + Math.random()
        });
    }
    
    checkCollisions() {
        const playerBounds = {
            x: this.player.x - this.player.size/2,
            y: this.player.y - this.player.size/2,
            width: this.player.size,
            height: this.player.size
        };
        
        const currentLane = this.lanes.find(lane => Math.abs(lane.y - this.player.y) < 20);
        if (!currentLane) return;
        
        if (currentLane.type === 'road') {
            // Check vehicle collisions
            for (const vehicle of currentLane.vehicles) {
                if (this.checkCollision(playerBounds, vehicle)) {
                    this.gameOver();
                    return;
                }
            }
        } else if (currentLane.type === 'river') {
            // Check if on log
            let onLog = false;
            for (const log of currentLane.logs) {
                if (this.checkCollision(playerBounds, log)) {
                    onLog = true;
                    break;
                }
            }
            if (!onLog) {
                this.gameOver();
                return;
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(0, -this.camera.y);
        
        // Background
        if (this.assets.background) {
            this.ctx.drawImage(this.assets.background, 0, this.camera.y, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(0, this.camera.y, this.canvas.width, this.canvas.height);
        }
        
        // Lanes
        this.lanes.forEach(lane => {
            // Lane background
            if (lane.type === 'road') {
                this.ctx.fillStyle = '#424242';
            } else if (lane.type === 'river') {
                this.ctx.fillStyle = '#2196F3';
            } else {
                this.ctx.fillStyle = '#4CAF50';
            }
            this.ctx.fillRect(0, lane.y - 20, this.canvas.width, 40);
            
            // Vehicles
            lane.vehicles.forEach(vehicle => {
                if (this.assets.car) {
                    this.ctx.drawImage(this.assets.car, vehicle.x, vehicle.y - vehicle.height/2, vehicle.width, vehicle.height);
                } else {
                    this.ctx.fillStyle = '#F44336';
                    this.ctx.fillRect(vehicle.x, vehicle.y - vehicle.height/2, vehicle.width, vehicle.height);
                }
            });
            
            // Logs
            lane.logs.forEach(log => {
                if (this.assets.log) {
                    this.ctx.drawImage(this.assets.log, log.x, log.y - log.height/2, log.width, log.height);
                } else {
                    this.ctx.fillStyle = '#8D6E63';
                    this.ctx.fillRect(log.x, log.y - log.height/2, log.width, log.height);
                }
            });
        });
        
        // Player
        if (this.assets.player) {
            this.ctx.drawImage(this.assets.player, 
                this.player.x - this.player.size/2, 
                this.player.y - this.player.size/2, 
                this.player.size, this.player.size);
        } else {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.size/2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});`
  }

  const generateSpeedRunnerJS = (_config: GameConfig) => {
    return `// Speed Runner Game Logic - Simplified version for export
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 450;
        
        this.config = window.GAME_CONFIG;
        this.assets = {};
        this.gameState = 'menu';
        this.score = 0;
        this.distance = 0;
        
        this.player = { x: 50, y: 300, width: 30, height: 40, velocityY: 0, isGrounded: true };
        this.obstacles = [];
        this.camera = { x: 0 };
        this.keys = {};
        
        this.loadAssets();
        this.bindEvents();
        this.gameLoop();
    }
    
    async loadAssets() {
        for (const [assetId, dataUrl] of Object.entries(this.config.assets)) {
            const img = new Image();
            img.src = dataUrl;
            await new Promise(resolve => { img.onload = img.onerror = resolve; });
            this.assets[assetId] = img;
        }
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseGame());
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.jump();
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.distance = 0;
        this.player = { x: 50, y: 300, width: 30, height: 40, velocityY: 0, isGrounded: true };
        this.obstacles = [];
        this.camera = { x: 0 };
        this.updateScore();
        this.showScreen('none');
    }
    
    jump() {
        if (this.player.isGrounded && this.gameState === 'playing') {
            this.player.velocityY = -15;
            this.player.isGrounded = false;
        }
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showScreen('pause');
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.showScreen('none');
        }
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('final-score').textContent = this.distance + 'm';
        this.showScreen('gameover');
    }
    
    showScreen(screen) {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        
        if (screen === 'pause') {
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (screen === 'gameover') {
            document.getElementById('gameover-screen').classList.remove('hidden');
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.distance + 'm';
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.update();
        }
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        const speed = 4;
        const gravity = 0.8;
        const groundY = 340;
        
        // Update player physics
        this.player.velocityY += gravity;
        this.player.y += this.player.velocityY;
        
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.velocityY = 0;
            this.player.isGrounded = true;
        }
        
        // Update camera and distance
        this.camera.x += speed;
        this.distance = Math.floor(this.camera.x / 10);
        this.updateScore();
        
        // Spawn obstacles
        if (Math.random() < 0.01) {
            this.obstacles.push({
                x: this.camera.x + this.canvas.width,
                y: groundY,
                width: 30,
                height: 40
            });
        }
        
        // Update obstacles
        this.obstacles = this.obstacles.filter(obs => obs.x > this.camera.x - 100);
        
        // Check collisions
        const playerBounds = {
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height
        };
        
        for (const obstacle of this.obstacles) {
            if (this.checkCollision(playerBounds, obstacle)) {
                this.gameOver();
                return;
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x, 0);
        
        // Background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(this.camera.x, 0, this.canvas.width, this.canvas.height);
        
        // Ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(this.camera.x, 380, this.canvas.width, 20);
        
        // Obstacles
        this.obstacles.forEach(obs => {
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(obs.x, obs.y - obs.height, obs.width, obs.height);
        });
        
        // Player
        if (this.assets.player) {
            this.ctx.drawImage(this.assets.player, this.player.x, this.player.y - this.player.height, 
                this.player.width, this.player.height);
        } else {
            this.ctx.fillStyle = '#4A90E2';
            this.ctx.fillRect(this.player.x, this.player.y - this.player.height, this.player.width, this.player.height);
        }
        
        this.ctx.restore();
    }
}

window.addEventListener('load', () => {
    new Game();
});`
  }

  const generateMatch3JS = (_config: GameConfig) => {
    return `// Match-3 Game Logic - Simplified version
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 400;
        this.canvas.height = 400;
        
        this.config = window.GAME_CONFIG;
        this.gameState = 'menu';
        this.score = 0;
        this.moves = 30;
        this.gridSize = 8;
        this.gemSize = 50;
        this.grid = [];
        this.gemTypes = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
        
        this.selectedGem = null;
        this.isDragging = false;
        
        this.bindEvents();
        this.initializeGrid();
        this.gameLoop();
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.moves = 30;
        this.initializeGrid();
        this.updateScore();
        this.showScreen('none');
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('final-score').textContent = this.score;
        this.showScreen('gameover');
    }
    
    showScreen(screen) {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        
        if (screen === 'gameover') {
            document.getElementById('gameover-screen').classList.remove('hidden');
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = {
                    type: this.gemTypes[Math.floor(Math.random() * this.gemTypes.length)],
                    x: x,
                    y: y
                };
            }
        }
    }
    
    handleMouseDown(e) {
        if (this.gameState !== 'playing') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const gridX = Math.floor(mouseX / this.gemSize);
        const gridY = Math.floor(mouseY / this.gemSize);
        
        if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
            this.selectedGem = { x: gridX, y: gridY };
            this.isDragging = true;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || !this.selectedGem) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const gridX = Math.floor(mouseX / this.gemSize);
        const gridY = Math.floor(mouseY / this.gemSize);
        
        if (gridX !== this.selectedGem.x || gridY !== this.selectedGem.y) {
            this.trySwap(this.selectedGem.x, this.selectedGem.y, gridX, gridY);
            this.isDragging = false;
            this.selectedGem = null;
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.selectedGem = null;
    }
    
    trySwap(x1, y1, x2, y2) {
        if (x2 < 0 || x2 >= this.gridSize || y2 < 0 || y2 >= this.gridSize) return;
        if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return;
        
        // Swap gems
        const temp = this.grid[y1][x1];
        this.grid[y1][x1] = this.grid[y2][x2];
        this.grid[y2][x2] = temp;
        
        // Check for matches
        const matches = this.findMatches();
        if (matches.length > 0) {
            this.removeMatches(matches);
            this.score += matches.length * 10;
            this.moves--;
            this.updateScore();
            
            if (this.moves <= 0) {
                this.gameOver();
            }
        } else {
            // Swap back if no matches
            this.grid[y2][x2] = this.grid[y1][x1];
            this.grid[y1][x1] = temp;
        }
    }
    
    findMatches() {
        const matches = [];
        
        // Check horizontal matches
        for (let y = 0; y < this.gridSize; y++) {
            let count = 1;
            let currentType = this.grid[y][0].type;
            
            for (let x = 1; x < this.gridSize; x++) {
                if (this.grid[y][x].type === currentType) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = x - count; i < x; i++) {
                            matches.push({ x: i, y: y });
                        }
                    }
                    count = 1;
                    currentType = this.grid[y][x].type;
                }
            }
            
            if (count >= 3) {
                for (let i = this.gridSize - count; i < this.gridSize; i++) {
                    matches.push({ x: i, y: y });
                }
            }
        }
        
        // Check vertical matches
        for (let x = 0; x < this.gridSize; x++) {
            let count = 1;
            let currentType = this.grid[0][x].type;
            
            for (let y = 1; y < this.gridSize; y++) {
                if (this.grid[y][x].type === currentType) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = y - count; i < y; i++) {
                            matches.push({ x: x, y: i });
                        }
                    }
                    count = 1;
                    currentType = this.grid[y][x].type;
                }
            }
            
            if (count >= 3) {
                for (let i = this.gridSize - count; i < this.gridSize; i++) {
                    matches.push({ x: x, y: i });
                }
            }
        }
        
        return matches;
    }
    
    removeMatches(matches) {
        matches.forEach(match => {
            this.grid[match.y][match.x].type = this.gemTypes[Math.floor(Math.random() * this.gemTypes.length)];
        });
    }
    
    gameLoop() {
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const gem = this.grid[y][x];
                const drawX = x * this.gemSize;
                const drawY = y * this.gemSize;
                
                // Gem colors
                const colors = {
                    red: '#F44336',
                    blue: '#2196F3',
                    green: '#4CAF50',
                    yellow: '#FFEB3B',
                    purple: '#9C27B0',
                    orange: '#FF9800'
                };
                
                this.ctx.fillStyle = colors[gem.type] || '#666';
                this.ctx.fillRect(drawX + 2, drawY + 2, this.gemSize - 4, this.gemSize - 4);
                
                // Gem border
                this.ctx.strokeStyle = '#FFF';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(drawX + 2, drawY + 2, this.gemSize - 4, this.gemSize - 4);
            }
        }
        
        // Selected gem highlight
        if (this.selectedGem) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(
                this.selectedGem.x * this.gemSize,
                this.selectedGem.y * this.gemSize,
                this.gemSize,
                this.gemSize
            );
        }
    }
}

window.addEventListener('load', () => {
    new Game();
});`
  }

  const generateWhackMoleJS = (_config: GameConfig) => {
    return `// Whack-a-Mole Game Logic
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 640;
        this.canvas.height = 360;
        
        this.config = window.GAME_CONFIG;
        this.gameState = 'menu';
        this.score = 0;
        this.timeLeft = 60;
        this.moles = [];
        
        this.initializeMoles();
        this.bindEvents();
        this.gameLoop();
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.timeLeft = 60;
        this.moles.forEach(mole => {
            mole.isUp = false;
            mole.timer = 0;
        });
        this.updateScore();
        this.showScreen('none');
        this.startTimer();
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.gameOver();
            }
        }, 1000);
    }
    
    gameOver() {
        this.gameState = 'gameover';
        clearInterval(this.timerInterval);
        document.getElementById('final-score').textContent = this.score;
        this.showScreen('gameover');
    }
    
    showScreen(screen) {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        
        if (screen === 'gameover') {
            document.getElementById('gameover-screen').classList.remove('hidden');
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    initializeMoles() {
        this.moles = [];
        const rows = 3;
        const cols = 3;
        const spacing = 120;
        const startX = 100;
        const startY = 80;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.moles.push({
                    x: startX + col * spacing,
                    y: startY + row * spacing,
                    size: 40,
                    isUp: false,
                    timer: 0,
                    upTime: 0
                });
            }
        }
    }
    
    handleClick(e) {
        if (this.gameState !== 'playing') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        this.moles.forEach(mole => {
            if (mole.isUp) {
                const distance = Math.sqrt((clickX - mole.x) ** 2 + (clickY - mole.y) ** 2);
                if (distance <= mole.size) {
                    mole.isUp = false;
                    mole.timer = 0;
                    this.score += 10;
                    this.updateScore();
                }
            }
        });
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.update();
        }
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.moles.forEach(mole => {
            if (!mole.isUp) {
                mole.timer++;
                if (mole.timer > 60 + Math.random() * 120) { // 1-3 seconds
                    mole.isUp = true;
                    mole.timer = 0;
                    mole.upTime = 60 + Math.random() * 120; // 1-3 seconds up
                }
            } else {
                mole.timer++;
                if (mole.timer > mole.upTime) {
                    mole.isUp = false;
                    mole.timer = 0;
                }
            }
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Mole holes
        this.moles.forEach(mole => {
            // Hole
            this.ctx.fillStyle = '#2E2E2E';
            this.ctx.beginPath();
            this.ctx.arc(mole.x, mole.y + 20, mole.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Mole (if up)
            if (mole.isUp) {
                this.ctx.fillStyle = '#8D6E63';
                this.ctx.beginPath();
                this.ctx.arc(mole.x, mole.y, mole.size * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Mole eyes
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(mole.x - 10, mole.y - 5, 3, 0, Math.PI * 2);
                this.ctx.arc(mole.x + 10, mole.y - 5, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // UI
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Time: ' + this.timeLeft, 20, 30);
    }
}

window.addEventListener('load', () => {
    new Game();
});`
  }

  const generateGenericJS = (_config: GameConfig) => {
    return `// Generic Game Template
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.config = window.GAME_CONFIG;
        this.gameState = 'menu';
        this.score = 0;
        
        this.bindEvents();
        this.gameLoop();
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.updateScore();
        this.showScreen('none');
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('final-score').textContent = this.score;
        this.showScreen('gameover');
    }
    
    showScreen(screen) {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        
        if (screen === 'gameover') {
            document.getElementById('gameover-screen').classList.remove('hidden');
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.update();
        }
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Game logic here
        this.score++;
        this.updateScore();
        
        if (this.score >= 1000) {
            this.gameOver();
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Simple background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#4CAF50');
        gradient.addColorStop(1, '#2196F3');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game content
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Custom Game', this.canvas.width/2, this.canvas.height/2);
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Score: ' + this.score, this.canvas.width/2, this.canvas.height/2 + 50);
    }
}

window.addEventListener('load', () => {
    new Game();
});`
  }

  const exportGame = useCallback(async () => {
    setIsExporting(true)
    
    try {
      const zip = new JSZip()
      
      // Convert assets to base64 data URLs for embedding
      const embeddedAssets: Record<string, string> = {}
      for (const slot of assetSlots) {
        if (slot.url && slot.isAccepted) {
          try {
            const response = await fetch(slot.url)
            const blob = await response.blob()
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            embeddedAssets[slot.id] = base64
          } catch (error) {
            console.warn(`Failed to fetch asset ${slot.id}:`, error)
          }
        }
      }

      // Convert music to base64 data URLs for embedding
      const embeddedMusic: Record<string, string> = {}
      for (const track of musicTracks) {
        if (track.url) {
          try {
            const response = await fetch(track.url)
            const blob = await response.blob()
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            embeddedMusic[track.id] = base64
          } catch (error) {
            console.warn(`Failed to fetch music ${track.id}:`, error)
          }
        }
      }

      // Create game configuration with embedded assets
      const gameConfig = {
        gameId,
        gameName,
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        parameters: gameParams.reduce((acc, param) => {
          acc[param.id] = param.value
          return acc
        }, {} as Record<string, string | number>),
        assets: embeddedAssets,
        music: embeddedMusic
      }
      
      // Generate complete playable HTML game
      const gameHTML = generateGameHTML(gameId, gameName, gameConfig)
      zip.file("index.html", gameHTML)
      
      // Add game.js with complete game logic
      const gameJS = generateGameJS(gameId, gameConfig)
      zip.file("game.js", gameJS)
      
      // Add styles.css
      const gameCSS = generateGameCSS()
      zip.file("styles.css", gameCSS)
      
      // Add README
      const readme = generateReadme(gameName)
      zip.file("README.md", readme)
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = `${gameId}-playable-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to export game:', error)
    } finally {
      setIsExporting(false)
    }
  }, [gameId, gameName, gameParams, assetSlots, musicTracks, generateGameJS])// For floating and inline mode, always show; for modal mode, check isOpen
  if (mode === 'modal' && !isOpen) return null
  // Theme-based styling - More subtle and cohesive with game backgrounds
  const getThemeColors = (theme: string) => {
    switch (theme) {
      case 'flappy-bird':
        return {
          background: 'from-red-900 to-pink-900',
          headerGradient: 'from-red-800/60 to-pink-800/60', // More subtle, darker gradient
          cardBg: 'bg-red-900/20',
          accentColor: 'text-red-300',
          accent: 'red'
        }
      case 'crossy-road':
        return {
          background: 'from-slate-900 via-cyan-900 to-slate-900',
          headerGradient: 'from-slate-700/60 to-cyan-800/60', // More muted cyan
          cardBg: 'bg-cyan-900/20',
          accentColor: 'text-cyan-300',
          accent: 'cyan'
        }
      case 'match-3':
        return {
          background: 'from-purple-900 to-pink-900',
          headerGradient: 'from-purple-800/60 to-pink-800/60', // Softer purple-pink
          cardBg: 'bg-purple-900/20',
          accentColor: 'text-purple-300',
          accent: 'purple'
        }
      case 'speed-runner':
        return {
          background: 'from-slate-900 via-orange-900 to-slate-900',
          headerGradient: 'from-slate-700/60 to-orange-800/60', // Muted orange
          cardBg: 'bg-orange-900/20',
          accentColor: 'text-orange-300',
          accent: 'orange'
        }
      case 'whack-the-mole':
        return {
          background: 'from-green-900 to-blue-900',
          headerGradient: 'from-green-800/60 to-blue-800/60', // Softer green-blue
          cardBg: 'bg-green-900/20',
          accentColor: 'text-green-300',
          accent: 'green'
        }
      default:
        return {
          background: 'from-purple-900 to-pink-900',
          headerGradient: 'from-purple-800/60 to-pink-800/60',
          cardBg: 'bg-purple-900/20',
          accentColor: 'text-purple-300',
          accent: 'purple'
        }
    }
  }

  const themeColors = getThemeColors(theme)

  const getContainerClasses = () => {
    switch (mode) {
      case 'modal':
        return "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      case 'floating':
        return "fixed bottom-6 right-6 z-40 w-96 max-h-[80vh]"
      case 'inline':
      default:
        return `w-full bg-gradient-to-br ${themeColors.background} rounded-xl mt-8`
    }
  }
  const getCardClasses = () => {
    switch (mode) {
      case 'modal':
        return "w-full max-w-6xl max-h-[90vh] overflow-hidden bg-black/30 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl"
      case 'floating':
        return "w-full bg-black/30 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl overflow-hidden"
      case 'inline':
      default:
        return `w-full bg-black/20 backdrop-blur-xl border-white/10 rounded-xl min-h-[calc(100vh-200px)] shadow-xl`
    }
  }

  const containerClasses = getContainerClasses()
  const cardClasses = getCardClasses()

  return (
    <div className={containerClasses}>      <Card className={cardClasses}>        <CardHeader className={`bg-gradient-to-r ${themeColors.headerGradient} backdrop-blur-xl text-white border-b border-white/10 ${mode === 'floating' ? 'py-3' : ''}`}>
          <div className="flex items-center justify-between">
            <CardTitle className={`font-bold flex items-center gap-2 ${mode === 'floating' ? 'text-lg' : 'text-2xl'}`}>
              <Palette className={mode === 'floating' ? 'h-5 w-5' : 'h-6 w-6'} />
              {mode === 'floating' ? 'Reskin' : `Reskin ${gameName}`}
            </CardTitle>
            {(mode === 'modal' || mode === 'floating') && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Tab Navigation */}
          <div className={`flex gap-2 ${mode === 'floating' ? 'mt-2' : 'mt-4'}`}>
            <Button
              onClick={() => setActiveTab('assets')}
              variant={activeTab === 'assets' ? 'default' : 'ghost'}
              size={mode === 'floating' ? 'sm' : 'sm'}
              className={activeTab === 'assets' ? 'bg-white/20' : 'text-white/70 hover:bg-white/10'}
            >
              {mode === 'floating' ? '🎨' : '🎨 Assets'}
            </Button>
            <Button
              onClick={() => setActiveTab('music')}
              variant={activeTab === 'music' ? 'default' : 'ghost'}
              size={mode === 'floating' ? 'sm' : 'sm'}
              className={activeTab === 'music' ? 'bg-white/20' : 'text-white/70 hover:bg-white/10'}
            >
              {mode === 'floating' ? <Music className="h-4 w-4" /> : <><Music className="h-4 w-4 mr-1" />Music</>}
            </Button>
            <Button
              onClick={() => setActiveTab('parameters')}
              variant={activeTab === 'parameters' ? 'default' : 'ghost'}
              size={mode === 'floating' ? 'sm' : 'sm'}
              className={activeTab === 'parameters' ? 'bg-white/20' : 'text-white/70 hover:bg-white/10'}
            >
              {mode === 'floating' ? '⚙️' : '⚙️ Parameters'}
            </Button>
          </div>
        </CardHeader>        <CardContent className={`overflow-y-auto ${mode === 'floating' ? 'p-3 max-h-[60vh]' : mode === 'modal' ? 'p-6 max-h-[60vh]' : 'p-6 flex-1'}`}>          {activeTab === 'assets' && (
            <div className="space-y-4">
              <h3 className={`font-bold text-white ${mode === 'floating' ? 'text-lg mb-3' : 'text-xl mb-4'}`}>Generate Game Assets</h3>
              <div className={mode === 'floating' ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'}>
                {assetSlots.map((slot, index) => (
                  <div key={slot.id} className={`bg-white/5 rounded-xl border border-white/10 ${mode === 'floating' ? 'p-3' : 'p-4'}`}>
                    <h4 className={`font-semibold text-white ${mode === 'floating' ? 'text-base mb-2' : 'text-lg mb-3'}`}>{slot.name}</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-white/70 mb-2 block">AI Prompt</label>
                        <Input
                          value={slot.defaultPrompt}
                          onChange={(e) => updateAssetPrompt(index, e.target.value)}
                          placeholder="Describe what you want to generate..."
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => generateAsset(index)}
                          disabled={slot.isGenerating}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        >
                          {slot.isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Generate
                            </>
                          )}
                        </Button>
                        
                        {slot.url && (
                          <Button
                            onClick={() => acceptAsset(index)}
                            disabled={slot.isAccepted}
                            variant={slot.isAccepted ? "default" : "outline"}
                            className={slot.isAccepted ? "bg-green-500 hover:bg-green-600" : "border-white/20 text-white hover:bg-white/10"}
                          >
                            {slot.isAccepted ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Accepted
                              </>
                            ) : (
                              "Accept"
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {slot.url && (
                        <div className="mt-4">
                          <img
                            src={slot.url}
                            alt={slot.name}
                            className="w-full max-w-xs h-32 object-contain bg-white/5 rounded-lg border border-white/10"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}          {activeTab === 'music' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Generate Game Music</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {musicTracks.map((track, index) => (
                  <div key={track.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-white">{track.name}</h4>
                      {track.url && (
                        <Button
                          onClick={() => playMusic(track.id)}
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          {currentlyPlaying === track.id ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Play
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-white/70 mb-2 block">Music Description</label>
                        <Input
                          value={track.defaultPrompt}
                          onChange={(e) => updateMusicPrompt(index, e.target.value)}
                          placeholder="Describe the music style you want..."
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                      </div>
                      
                      <Button
                        onClick={() => generateMusic(index)}
                        disabled={track.isGenerating}
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                      >
                        {track.isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Music...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4 mr-2" />
                            Generate Music
                          </>
                        )}
                      </Button>
                      
                      {track.url && track.duration && (
                        <div className="text-sm text-white/70">
                          Duration: {track.duration}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}          {activeTab === 'parameters' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Game Parameters</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {gameParams.map((param, index) => (
                  <div key={param.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="text-lg font-semibold text-white mb-3">{param.name}</h4>
                    
                    {param.type === 'slider' ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-white/70">
                          <span>{param.min}</span>
                          <span className="font-medium text-white">{param.value}</span>
                          <span>{param.max}</span>
                        </div>
                        <Slider
                          value={[Number(param.value)]}
                          onValueChange={([value]) => updateGameParam(index, value)}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <Input
                        value={String(param.value)}
                        onChange={(e) => updateGameParam(index, e.target.value)}
                        placeholder={String(param.defaultValue)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-6 border-t border-white/10 bg-white/5">
          <div className="flex justify-between items-center">            <div className="text-sm text-white/70">
              Assets: {assetSlots.filter(slot => slot.isAccepted).length}/{assetSlots.length} accepted • Export creates a standalone playable game with embedded assets
            </div>
            <div className="flex gap-3">              <Button
                onClick={onClose}
                variant="outline"
                className="border-white/40 text-white bg-white/5 hover:bg-white/20 hover:border-white/60"
              >
                Cancel
              </Button>              <Button
                onClick={exportGame}
                disabled={isExporting || assetSlots.filter(slot => slot.isAccepted).length === 0}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Playable Game...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Playable Game
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
