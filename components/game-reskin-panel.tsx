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

interface GameReskinPanelProps {
  gameId: string
  gameName: string
  assetSlots: AssetSlot[]
  gameParams: GameParam[]
  isOpen: boolean
  onClose: () => void
  onAssetsChanged?: (assets: Record<string, string>) => void
  mode?: 'modal' | 'inline' // Add mode prop
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
  mode = 'modal', // Default to modal for backward compatibility
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
      const imageUrl = await segmind.generateImage(slot.defaultPrompt, slot.dimensions)
      
      // Update slot with generated image
      updatedSlots[slotIndex] = { 
        ...slot, 
        url: imageUrl, 
        isGenerating: false,
        isAccepted: false
      }
      setAssetSlots(updatedSlots)
    } catch (error) {
      console.error('Failed to generate asset:', error)
      // Reset generating state on error
      updatedSlots[slotIndex] = { ...slot, isGenerating: false }
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
  }, [gameParams])

  const updateAssetPrompt = useCallback((slotIndex: number, prompt: string) => {
    const updatedSlots = [...assetSlots]
    updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], defaultPrompt: prompt }
    setAssetSlots(updatedSlots)
  }, [assetSlots])

  const updateMusicPrompt = useCallback((trackIndex: number, prompt: string) => {
    const updatedTracks = [...musicTracks]
    updatedTracks[trackIndex] = { ...updatedTracks[trackIndex], defaultPrompt: prompt }
    setMusicTracks(updatedTracks)
  }, [musicTracks])

  const exportGame = useCallback(async () => {
    setIsExporting(true)
    
    try {
      const zip = new JSZip()
      
      // Add game configuration
      const config = {
        gameId,
        gameName,
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        parameters: gameParams.reduce((acc, param) => {
          acc[param.id] = param.value
          return acc
        }, {} as Record<string, string | number>)
      }
      
      zip.file("config.json", JSON.stringify(config, null, 2))
      
      // Add assets
      const assetsFolder = zip.folder("assets")
      for (const slot of assetSlots) {
        if (slot.url && slot.isAccepted) {
          try {
            const response = await fetch(slot.url)
            const blob = await response.blob()
            assetsFolder?.file(`${slot.id}.png`, blob)
          } catch (error) {
            console.warn(`Failed to fetch asset ${slot.id}:`, error)
          }
        }
      }
      
      // Add music
      const musicFolder = zip.folder("music")
      for (const track of musicTracks) {
        if (track.url) {
          try {
            const response = await fetch(track.url)
            const blob = await response.blob()
            musicFolder?.file(`${track.id}.wav`, blob)
          } catch (error) {
            console.warn(`Failed to fetch music ${track.id}:`, error)
          }
        }
      }
      
      // Add a simple HTML file with the game
      const gameHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${gameName} - Custom Reskin</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .game-container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        h1 {
            color: white;
            margin-bottom: 20px;
        }
        .config {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }
        .config h3 {
            color: white;
            margin-top: 0;
        }
        .config p {
            color: rgba(255, 255, 255, 0.8);
            margin: 5px 0;
        }
        .assets {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .asset {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        }
        .asset img {
            max-width: 100%;
            height: 100px;
            object-fit: contain;
            border-radius: 5px;
        }
        .asset h4 {
            color: white;
            margin: 10px 0 5px 0;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <h1>${gameName} - Custom Reskin</h1>
        <p style="color: rgba(255, 255, 255, 0.8);">
            Your custom reskinned game is ready! This package contains all the generated assets and configuration.
        </p>
        
        <div class="config">
            <h3>Game Configuration</h3>
            ${gameParams.map(param => `<p><strong>${param.name}:</strong> ${param.value}</p>`).join('')}
        </div>
        
        <div class="assets">
            ${assetSlots.filter(slot => slot.url && slot.isAccepted).map(slot => `
                <div class="asset">
                    <img src="assets/${slot.id}.png" alt="${slot.name}" />
                    <h4>${slot.name}</h4>
                </div>
            `).join('')}
        </div>
        
        <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin-top: 30px;">
            Generated on ${new Date().toLocaleDateString()} by GameGen AI Reskin Wizard
        </p>
    </div>
</body>
</html>`
      
      zip.file("index.html", gameHTML)
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = `${gameId}-reskin-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to export game:', error)
    } finally {
      setIsExporting(false)
    }
  }, [gameId, gameName, gameParams, assetSlots, musicTracks])  // For inline mode, always show; for modal mode, check isOpen
  if (mode === 'modal' && !isOpen) return null

  // Theme-based styling
  const getThemeColors = (theme: string) => {
    switch (theme) {
      case 'flappy-bird':
        return {
          background: 'from-red-900 to-pink-900',
          headerGradient: 'from-red-600 to-pink-600',
          cardBg: 'bg-red-900/20',
          accentColor: 'text-red-300'
        }
      case 'crossy-road':
        return {
          background: 'from-slate-900 via-cyan-900 to-slate-900',
          headerGradient: 'from-cyan-600 to-blue-600',
          cardBg: 'bg-cyan-900/20',
          accentColor: 'text-cyan-300'
        }
      case 'match-3':
        return {
          background: 'from-purple-900 to-pink-900',
          headerGradient: 'from-purple-600 to-pink-600',
          cardBg: 'bg-purple-900/20',
          accentColor: 'text-purple-300'
        }
      case 'speed-runner':
        return {
          background: 'from-slate-900 via-orange-900 to-slate-900',
          headerGradient: 'from-orange-600 to-yellow-600',
          cardBg: 'bg-orange-900/20',
          accentColor: 'text-orange-300'
        }
      case 'whack-the-mole':
        return {
          background: 'from-green-900 to-blue-900',
          headerGradient: 'from-green-600 to-blue-600',
          cardBg: 'bg-green-900/20',
          accentColor: 'text-green-300'
        }
      default:
        return {
          background: 'from-purple-900 to-pink-900',
          headerGradient: 'from-purple-600 to-pink-600',
          cardBg: 'bg-purple-900/20',
          accentColor: 'text-purple-300'
        }
    }
  }

  const themeColors = getThemeColors(theme)

  const containerClasses = mode === 'modal'
    ? "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    : `w-full bg-gradient-to-br ${themeColors.background} rounded-xl`
  const cardClasses = mode === 'modal'
    ? "w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white/10 backdrop-blur-xl border-white/20"
    : `w-full bg-white/10 backdrop-blur-xl border-white/20 rounded-xl min-h-[calc(100vh-200px)]`

  return (
    <div className={containerClasses}>      <Card className={cardClasses}>
        <CardHeader className={`bg-gradient-to-r ${themeColors.headerGradient} text-white`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Palette className="h-6 w-6" />
              Reskin {gameName}
            </CardTitle>
            {mode === 'modal' && (
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
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setActiveTab('assets')}
              variant={activeTab === 'assets' ? 'default' : 'ghost'}
              size="sm"
              className={activeTab === 'assets' ? 'bg-white/20' : 'text-white/70 hover:bg-white/10'}
            >
              🎨 Assets
            </Button>
            <Button
              onClick={() => setActiveTab('music')}
              variant={activeTab === 'music' ? 'default' : 'ghost'}
              size="sm"
              className={activeTab === 'music' ? 'bg-white/20' : 'text-white/70 hover:bg-white/10'}
            >
              <Music className="h-4 w-4 mr-1" />
              Music
            </Button>
            <Button
              onClick={() => setActiveTab('parameters')}
              variant={activeTab === 'parameters' ? 'default' : 'ghost'}
              size="sm"
              className={activeTab === 'parameters' ? 'bg-white/20' : 'text-white/70 hover:bg-white/10'}
            >
              ⚙️ Parameters
            </Button>
          </div>
        </CardHeader>        <CardContent className={`p-6 overflow-y-auto ${mode === 'modal' ? 'max-h-[60vh]' : 'flex-1'}`}>
          {activeTab === 'assets' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Generate Game Assets</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {assetSlots.map((slot, index) => (
                  <div key={slot.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="text-lg font-semibold text-white mb-3">{slot.name}</h4>
                    
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
          <div className="flex justify-between items-center">
            <div className="text-sm text-white/70">
              Assets: {assetSlots.filter(slot => slot.isAccepted).length}/{assetSlots.length} accepted
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={exportGame}
                disabled={isExporting || assetSlots.filter(slot => slot.isAccepted).length === 0}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Game
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
