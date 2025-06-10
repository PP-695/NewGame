"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Download, RefreshCw, Check, Loader2 } from "lucide-react"
import { segmind } from "@/lib/segmind"
import JSZip from "jszip"

interface GameTemplate {
  id: string
  name: string
  assetSlots: AssetSlot[]
  gameParams: GameParam[]
  templateFiles: string[]
}

interface AssetSlot {
  id: string
  name: string
  defaultPrompt: string
  dimensions: { width: number; height: number }
  url?: string
  isAccepted?: boolean
  isGenerating?: boolean
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

const gameTemplates: GameTemplate[] = [
  {
    id: "flappy-bird",
    name: "Flappy Bird",
    assetSlots: [
      {
        id: "background",
        name: "Background",
        defaultPrompt: "pixel art style background with blue sky and green hills for a side-scrolling game",
        dimensions: { width: 800, height: 600 }
      },
      {
        id: "playerSprite",
        name: "Player Sprite",
        defaultPrompt: "cute pixel art bird character sprite, yellow bird with simple design for game",
        dimensions: { width: 64, height: 64 }
      },
      {
        id: "obstacles",
        name: "Pipe Obstacles",
        defaultPrompt: "green pipe obstacles for flappy bird game, pixel art style",
        dimensions: { width: 80, height: 400 }
      },
      {
        id: "collectibles",
        name: "Collectible Items",
        defaultPrompt: "golden coin collectible item, pixel art style, shiny and small",
        dimensions: { width: 32, height: 32 }
      }
    ],
    gameParams: [
      { id: "gravity", name: "Gravity", type: "slider", min: 0.1, max: 2.0, step: 0.1, defaultValue: 0.6, value: 0.6 },
      { id: "pipeWidth", name: "Pipe Width", type: "slider", min: 50, max: 150, step: 10, defaultValue: 80, value: 80 },
      { id: "pipeGap", name: "Pipe Gap", type: "slider", min: 100, max: 300, step: 20, defaultValue: 180, value: 180 },
      { id: "gameSpeed", name: "Game Speed", type: "slider", min: 1, max: 5, step: 0.5, defaultValue: 2, value: 2 }
    ],
    templateFiles: ["index.html", "game.js", "style.css"]
  },
  {
    id: "crossy-road",
    name: "Crossy Road",
    assetSlots: [
      {
        id: "background",
        name: "Background",
        defaultPrompt: "top-down view road and grass background for crossy road game, pixel art",
        dimensions: { width: 800, height: 600 }
      },
      {
        id: "playerSprite",
        name: "Player Character",
        defaultPrompt: "cute frog character sprite for crossy road game, top-down view, pixel art",
        dimensions: { width: 40, height: 40 }
      },
      {
        id: "obstacles",
        name: "Vehicles",
        defaultPrompt: "various cars and vehicles for crossy road game, top-down view, colorful pixel art",
        dimensions: { width: 80, height: 40 }
      },
      {
        id: "collectibles",
        name: "Power-ups",
        defaultPrompt: "shield power-up icon, glowing blue effect, pixel art style",
        dimensions: { width: 32, height: 32 }
      }
    ],
    gameParams: [
      { id: "playerSpeed", name: "Player Speed", type: "slider", min: 0.5, max: 3.0, step: 0.1, defaultValue: 1.5, value: 1.5 },
      { id: "vehicleSpeed", name: "Vehicle Speed", type: "slider", min: 1, max: 5, step: 0.5, defaultValue: 2.5, value: 2.5 },
      { id: "vehicleDensity", name: "Vehicle Density", type: "slider", min: 0.1, max: 1.0, step: 0.1, defaultValue: 0.4, value: 0.4 },
      { id: "laneWidth", name: "Lane Width", type: "slider", min: 40, max: 80, step: 5, defaultValue: 60, value: 60 }
    ],
    templateFiles: ["index.html", "game.js", "style.css"]
  }
]

interface ReskinWizardProps {
  onBack: () => void
}

export default function ReskinWizard({ onBack }: ReskinWizardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null)
  const [assets, setAssets] = useState<AssetSlot[]>([])
  const [gameParams, setGameParams] = useState<GameParam[]>([])
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({})
  const [isExporting, setIsExporting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawOtherAssets = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw player sprite
    const playerAsset = assets.find(a => a.id === 'playerSprite')
    if (playerAsset?.url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, 50, 150, 40, 40)
      }
      img.src = playerAsset.url
    }

    // Draw obstacles
    const obstacleAsset = assets.find(a => a.id === 'obstacles')
    if (obstacleAsset?.url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, 200, 100, 60, 100)
        ctx.drawImage(img, 320, 120, 60, 100)
      }
      img.src = obstacleAsset.url
    }

    // Game parameters overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(10, 10, 200, 80)
    ctx.fillStyle = 'white'
    ctx.font = '12px Arial'
    ctx.fillText('Live Preview', 15, 25)
    gameParams.slice(0, 3).forEach((param, i) => {
      ctx.fillText(`${param.name}: ${param.value}`, 15, 40 + i * 15)
    })
  }, [assets, gameParams])

  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 400
    canvas.height = 300

    // Clear canvas
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw background if available
    const bgAsset = assets.find(a => a.id === 'background')
    if (bgAsset?.url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        drawOtherAssets(ctx)
      }
      img.src = bgAsset.url
    } else {
      drawOtherAssets(ctx)
    }
  }, [assets, drawOtherAssets])

  useEffect(() => {
    if (selectedTemplate) {
      setAssets(selectedTemplate.assetSlots.map(slot => ({ ...slot })))
      setGameParams(selectedTemplate.gameParams.map(param => ({ ...param })))
      const prompts: Record<string, string> = {}
      selectedTemplate.assetSlots.forEach(slot => {
        prompts[slot.id] = slot.defaultPrompt
      })
      setCustomPrompts(prompts)
    }
  }, [selectedTemplate])

  useEffect(() => {
    renderPreview()
  }, [renderPreview])

  const generateAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId)
    if (!asset) return

    setAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, isGenerating: true } : a
    ))

    try {
      const prompt = customPrompts[assetId] || asset.defaultPrompt
      const url = await segmind.generateImage(
        prompt, 
        asset.dimensions.width, 
        asset.dimensions.height
      )
      
      setAssets(prev => prev.map(a => 
        a.id === assetId ? { 
          ...a, 
          url, 
          isGenerating: false, 
          isAccepted: false 
        } : a
      ))
    } catch (error) {
      console.error('Failed to generate asset:', error)
      setAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, isGenerating: false } : a
      ))
    }
  }

  const acceptAsset = (assetId: string) => {
    setAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, isAccepted: true } : a
    ))
  }

  const updateGameParam = (paramId: string, value: number | string) => {
    setGameParams(prev => prev.map(p => 
      p.id === paramId ? { ...p, value } : p    ))
  }

  const exportGame = async () => {
    if (!selectedTemplate) return

    setIsExporting(true)
    const zip = new JSZip()

    try {
      // Create config.json with game parameters and asset paths
      const config = {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        gameParams: gameParams.reduce((acc, param) => {
          acc[param.id] = param.value
          return acc
        }, {} as Record<string, number | string>),
        assets: assets.reduce((acc, asset) => {
          if (asset.isAccepted && asset.url) {
            acc[asset.id] = `assets/${asset.id}.png`
          }
          return acc
        }, {} as Record<string, string>)
      }

      zip.file('config.json', JSON.stringify(config, null, 2))

      // Add template files (HTML, JS, CSS)
      const templateFiles = {
        'index.html': getTemplateHTML(selectedTemplate.id),
        'game.js': getTemplateJS(selectedTemplate.id, config),
        'style.css': getTemplateCSS()
      }

      Object.entries(templateFiles).forEach(([filename, content]) => {
        zip.file(filename, content)
      })

      // Download and add assets
      const assetsFolder = zip.folder('assets')
      for (const asset of assets) {
        if (asset.isAccepted && asset.url) {
          try {
            const response = await fetch(asset.url)
            const blob = await response.blob()
            assetsFolder?.file(`${asset.id}.png`, blob)
          } catch (error) {
            console.error(`Failed to download asset ${asset.id}:`, error)
          }
        }
      }

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedTemplate.name.replace(/\s+/g, '_')}_Custom.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <Button onClick={onBack} variant="ghost" className="text-white mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-4xl font-bold text-white">Reskin Wizard</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gameTemplates.map((template) => (
              <Card 
                key={template.id}
                className="group hover:scale-105 transition-all duration-300 cursor-pointer border-0 shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader>
                  <CardTitle className="text-2xl text-white group-hover:text-yellow-300 transition-colors">
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Customize {template.assetSlots.length} assets and {template.gameParams.length} game parameters
                  </p>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    Start Customizing
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button onClick={() => setSelectedTemplate(null)} variant="ghost" className="text-white mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-4xl font-bold text-white">Customize {selectedTemplate.name}</h1>
          </div>
          <Button 
            onClick={exportGame}
            disabled={isExporting || !assets.some(a => a.isAccepted)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Game
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assets Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">AI Asset Generation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {assets.map((asset) => (
                  <div key={asset.id} className="border border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{asset.name}</h3>
                      <div className="flex gap-2">
                        {asset.url && !asset.isAccepted && (
                          <Button
                            onClick={() => acceptAsset(asset.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                        )}
                        <Button
                          onClick={() => generateAsset(asset.id)}
                          disabled={asset.isGenerating}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {asset.isGenerating ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-1" />
                          )}
                          {asset.url ? 'Regenerate' : 'Generate'}
                        </Button>
                      </div>
                    </div>

                    <Input
                      value={customPrompts[asset.id] || asset.defaultPrompt}
                      onChange={(e) => setCustomPrompts(prev => ({
                        ...prev,
                        [asset.id]: e.target.value
                      }))}
                      placeholder="Describe the asset you want..."
                      className="mb-3 bg-slate-700 border-slate-600 text-white"
                    />                    {asset.url && (
                      <div className={`relative ${asset.isAccepted ? 'ring-2 ring-green-500' : ''}`}>
                        <Image 
                          src={asset.url} 
                          alt={asset.name}
                          width={400}
                          height={128}
                          className="w-full h-32 object-cover rounded border"
                        />
                        {asset.isAccepted && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-sm">
                            ✓ Accepted
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Preview and Controls Panel */}
          <div>
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas 
                  ref={canvasRef}
                  className="w-full border border-slate-600 rounded"
                />
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Game Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gameParams.map((param) => (
                  <div key={param.id}>
                    <label className="text-sm text-gray-300 mb-2 block">
                      {param.name}: {param.value}
                    </label>
                    {param.type === 'slider' ? (
                      <Slider
                        value={[Number(param.value)]}
                        onValueChange={([value]) => updateGameParam(param.id, value)}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        className="w-full"
                      />
                    ) : (
                      <Input
                        value={String(param.value)}
                        onChange={(e) => updateGameParam(param.id, e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Template file generators
function getTemplateHTML(templateId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom ${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Game</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="gameContainer">
        <canvas id="gameCanvas" width="800" height="600"></canvas>
        <div id="ui">
            <div id="score">Score: 0</div>
            <button id="startBtn">Start Game</button>
        </div>
    </div>
    <script src="game.js"></script>
</body>
</html>`
}

interface GameConfig {
  templateId: string
  templateName: string
  gameParams: Record<string, number | string>
  assets: Record<string, string>
}

function getTemplateJS(templateId: string, config: GameConfig): string {
  return `// Generated ${templateId} game with custom assets and parameters
const config = ${JSON.stringify(config, null, 2)};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.gameState = 'menu';
        this.assets = {};
        this.loadAssets();
        this.bindEvents();
    }

    async loadAssets() {
        for (const [assetId, assetPath] of Object.entries(config.assets)) {
            const img = new Image();
            img.src = assetPath;
            await new Promise(resolve => {
                img.onload = resolve;
            });
            this.assets[assetId] = img;
        }
        this.render();
    }

    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameState === 'playing') {
                this.jump();
            }
        });
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.gameLoop();
    }

    jump() {
        // Implement game-specific jump logic using config.gameParams
    }

    update() {
        if (this.gameState !== 'playing') return;
        // Implement game-specific update logic using config.gameParams
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        if (this.assets.background) {
            this.ctx.drawImage(this.assets.background, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw other assets based on game state
        if (this.gameState === 'playing') {
            // Draw player, obstacles, collectibles
        }

        // Update score display
        document.getElementById('score').textContent = \`Score: \${this.score}\`;
    }

    gameLoop() {
        this.update();
        this.render();
        if (this.gameState === 'playing') {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});`
}

function getTemplateCSS(): string {
  return `body {
    margin: 0;
    padding: 0;
    background: #222;
    color: white;
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

#gameContainer {
    text-align: center;
    position: relative;
}

#gameCanvas {
    border: 2px solid #fff;
    background: #87CEEB;
}

#ui {
    margin-top: 20px;
}

#score {
    font-size: 24px;
    margin-bottom: 10px;
}

#startBtn {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    border-radius: 5px;
}

#startBtn:hover {
    background: #45a049;
}`
}
