"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play, Pause } from "lucide-react"
import GameReskinPanel from "@/components/game-reskin-panel"

interface WhackTheMoleProps {
  onBack: () => void
  onScore: (score: number) => void
}

class Mole {
  x: number
  y: number
  size: number
  isVisible: boolean
  visibilityTimer: number
  maxVisibilityTime: number
  holeIndex: number
  aiDifficulty: number
  type: "normal" | "golden" | "bomb"
  points: number

  constructor(x: number, y: number, holeIndex: number) {
    this.x = x
    this.y = y
    this.size = 60
    this.isVisible = false
    this.visibilityTimer = 0
    this.maxVisibilityTime = 2000 // 2 seconds
    this.holeIndex = holeIndex
    this.aiDifficulty = 1
    this.type = "normal"
    this.points = 10
  }

  update(deltaTime: number) {
    if (this.isVisible) {
      this.visibilityTimer += deltaTime
      if (this.visibilityTimer >= this.maxVisibilityTime) {
        this.hide()
        return true // Indicates mole was missed
      }
    }
    return false
  }

  show(difficulty: number) {
    this.isVisible = true
    this.visibilityTimer = 0
    this.aiDifficulty = difficulty

    // Determine mole type based on probability
    const rand = Math.random()
    if (rand < 0.1) {
      this.type = "golden"
      this.points = 50
      this.maxVisibilityTime = Math.max(1000, 1500 - difficulty * 100)
    } else if (rand < 0.2) {
      this.type = "bomb"
      this.points = -20
      this.maxVisibilityTime = Math.max(1200, 2000 - difficulty * 150)
    } else {
      this.type = "normal"
      this.points = 10
      this.maxVisibilityTime = Math.max(800, 2000 - difficulty * 200)
    }
  }

  hide() {
    this.isVisible = false
    this.visibilityTimer = 0
  }

  render(ctx: CanvasRenderingContext2D, imageCache?: Record<string, HTMLImageElement>) {
    // Draw hole - use custom hole image if available
    if (imageCache?.hole) {
      const holeImg = imageCache.hole
      const holeSize = 80
      ctx.drawImage(holeImg, this.x - holeSize/2, this.y + 10, holeSize, 40)
    } else {
      // Default hole
      ctx.fillStyle = "#4A4A4A"
      ctx.beginPath()
      ctx.ellipse(this.x, this.y + 20, this.size / 2, 20, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    if (this.isVisible) {
      // Use custom mole image if available
      if (imageCache?.mole) {
        const moleImg = imageCache.mole
        const moleSize = this.size
        
        // Apply tint based on mole type
        if (this.type === "golden") {
          ctx.filter = 'sepia(1) saturate(2) hue-rotate(38deg) brightness(1.2)'
        } else if (this.type === "bomb") {
          ctx.filter = 'grayscale(1) brightness(0.3)'
        } else {
          ctx.filter = 'none'
        }
        
        ctx.drawImage(moleImg, this.x - moleSize/2, this.y - moleSize/2, moleSize, moleSize)
        ctx.filter = 'none' // Reset filter
        
        // Add type indicators on top of custom image
        if (this.type === "golden") {
          ctx.fillStyle = "gold"
          ctx.font = "16px Arial"
          ctx.textAlign = "center"
          ctx.strokeStyle = "black"
          ctx.lineWidth = 2
          ctx.strokeText("★", this.x, this.y + 20)
          ctx.fillText("★", this.x, this.y + 20)
        } else if (this.type === "bomb") {
          ctx.fillStyle = "red"
          ctx.font = "20px Arial"
          ctx.textAlign = "center"
          ctx.strokeStyle = "black"
          ctx.lineWidth = 2
          ctx.strokeText("💣", this.x, this.y + 25)
          ctx.fillText("💣", this.x, this.y + 25)
        }
      } else {
        // Default mole rendering
        // Mole body color based on type
        let bodyColor = "#8B4513"
        let faceColor = "#A0522D"

        if (this.type === "golden") {
          bodyColor = "#FFD700"
          faceColor = "#FFA500"
        } else if (this.type === "bomb") {
          bodyColor = "#2F2F2F"
          faceColor = "#1F1F1F"
        }

        // Mole body
        ctx.fillStyle = bodyColor
        ctx.beginPath()
        ctx.ellipse(this.x, this.y, this.size / 2 - 5, this.size / 2 - 5, 0, 0, Math.PI * 2)
        ctx.fill()

        // Mole face
        ctx.fillStyle = faceColor
        ctx.beginPath()
        ctx.ellipse(this.x, this.y - 5, this.size / 2 - 10, this.size / 2 - 10, 0, 0, Math.PI * 2)
        ctx.fill()

        if (this.type === "bomb") {
          // Bomb features
          ctx.fillStyle = "red"
          ctx.beginPath()
          ctx.arc(this.x - 8, this.y - 10, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(this.x + 8, this.y - 10, 3, 0, Math.PI * 2)
          ctx.fill()

          // Fuse
          ctx.strokeStyle = "orange"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(this.x, this.y - 20)
          ctx.lineTo(this.x + 5, this.y - 30)
          ctx.stroke()
        } else {
          // Normal/Golden mole eyes
          ctx.fillStyle = "black"
          ctx.beginPath()
          ctx.arc(this.x - 8, this.y - 10, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(this.x + 8, this.y - 10, 3, 0, Math.PI * 2)
          ctx.fill()

          // Nose
          ctx.fillStyle = "#FF69B4"
          ctx.beginPath()
          ctx.arc(this.x, this.y - 2, 2, 0, Math.PI * 2)
          ctx.fill()
        }

        // Type indicator
        if (this.type === "golden") {
          ctx.fillStyle = "white"
          ctx.font = "12px Arial"
          ctx.textAlign = "center"
          ctx.fillText("★", this.x, this.y + 15)
        }
      }
    }
  }

  isClicked(mouseX: number, mouseY: number): boolean {
    if (!this.isVisible) return false

    const distance = Math.sqrt(Math.pow(mouseX - this.x, 2) + Math.pow(mouseY - this.y, 2))
    return distance <= this.size / 2
  }
}

class MoleAI {
  moles: Mole[]
  spawnTimer: number
  spawnInterval: number
  difficulty: number
  gameTime: number
  comboCount: number
  lastHitTime: number
  comboTimeout: number

  constructor(moles: Mole[]) {
    this.moles = moles
    this.spawnTimer = 0
    this.spawnInterval = 1500 // 1.5 seconds
    this.difficulty = 1
    this.gameTime = 0
    this.comboCount = 0
    this.lastHitTime = 0
    this.comboTimeout = 2000 // 2 seconds to maintain combo
  }

  update(deltaTime: number) {
    this.gameTime += deltaTime
    this.spawnTimer += deltaTime

    // Increase difficulty over time
    this.difficulty = 1 + Math.floor(this.gameTime / 10000) * 0.5

    // Check combo timeout
    if (Date.now() - this.lastHitTime > this.comboTimeout) {
      this.comboCount = 0
    }

    // Adjust spawn rate based on difficulty
    const currentSpawnInterval = Math.max(500, this.spawnInterval - this.difficulty * 200)

    if (this.spawnTimer >= currentSpawnInterval) {
      this.spawnMole()
      this.spawnTimer = 0
    }

    // Update all moles and check for missed moles
    let missedMoles = 0
    this.moles.forEach((mole) => {
      if (mole.update(deltaTime)) {
        if (mole.type === "normal" || mole.type === "golden") {
          missedMoles++
        }
      }
    })

    return missedMoles
  }

  spawnMole() {
    // AI logic: prefer spawning moles that haven't been visible recently
    const availableMoles = this.moles.filter((mole) => !mole.isVisible)

    if (availableMoles.length === 0) return

    // Smart AI: sometimes spawn multiple moles at higher difficulty
    const molesToSpawn = this.difficulty > 2 && Math.random() < 0.3 ? 2 : 1

    for (let i = 0; i < molesToSpawn && availableMoles.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableMoles.length)
      const selectedMole = availableMoles[randomIndex]
      selectedMole.show(this.difficulty)
      availableMoles.splice(randomIndex, 1)
    }
  }

  hitMole(): number {
    this.comboCount++
    this.lastHitTime = Date.now()
    return this.comboCount
  }

  resetCombo() {
    this.comboCount = 0
  }
}

export default function WhackTheMole({ onBack, onScore }: WhackTheMoleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef({
    moles: [] as Mole[],
    moleAI: null as MoleAI | null,
    score: 0,
    timeLeft: 60000, // 60 seconds
    gameState: "menu" as "menu" | "playing" | "gameOver",
    lastTime: 0,
    comboCount: 0,
    missedMoles: 0,
    maxCombo: 0,
  })

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [isPaused, setIsPaused] = useState(false)
  const [customAssets, setCustomAssets] = useState<Record<string, string>>({})

  // Image cache for custom assets
  const [imageCache, setImageCache] = useState<Record<string, HTMLImageElement>>({})

  // Load custom images when assets change
  useEffect(() => {
    const loadImages = async () => {
      const newImageCache: Record<string, HTMLImageElement> = {}
      
      for (const [assetId, assetUrl] of Object.entries(customAssets)) {
        if (assetUrl) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous' // Handle CORS for data URLs
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = assetUrl
            })
            newImageCache[assetId] = img
            console.log(`Loaded image for ${assetId}:`, img.width, 'x', img.height)
          } catch (error) {
            console.error(`Failed to load image for ${assetId}:`, error)
          }
        }
      }
      
      setImageCache(newImageCache)
    }

    if (Object.keys(customAssets).length > 0) {
      loadImages()
    }
  }, [customAssets])

  // Game parameters state
  const [gameParams, setGameParams] = useState({
    gameTime: 60,
    moleSpeed: 1.5,
    spawnRate: 1500,
    difficulty: 3
  })

  // Update game parameters when they change
  useEffect(() => {
    const game = gameStateRef.current
    game.timeLeft = gameParams.gameTime * 1000 // Convert to milliseconds
    
    // Update mole AI if it exists
    if (game.moleAI) {
      game.moleAI.difficulty = gameParams.difficulty
    }
    
    // Update time display if game is in menu
    if (game.gameState === "menu") {
      setTimeLeft(gameParams.gameTime)
    }
  }, [gameParams])

  // Handle parameter changes from the reskin panel
  const handleParamsChanged = useCallback((params: Record<string, number | string>) => {
    setGameParams({
      gameTime: Number(params.gameTime) || 60,
      moleSpeed: Number(params.moleSpeed) || 1.5,
      spawnRate: Number(params.spawnRate) || 1500,
      difficulty: Number(params.difficulty) || 3
    })
  }, [])

  const initializeGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const moles: Mole[] = []
    const rows = 3
    const cols = 3
    const spacing = 120

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = 100 + col * spacing
        const y = 100 + row * spacing
        moles.push(new Mole(x, y, row * cols + col))
      }
    }

    gameStateRef.current.moles = moles
    gameStateRef.current.moleAI = new MoleAI(moles)
  }

  const handleCanvasClick = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas || gameStateRef.current.gameState !== "playing") return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const mouseX = (event.clientX - rect.left) * scaleX
    const mouseY = (event.clientY - rect.top) * scaleY

    // Check if any mole was clicked
    let moleHit = false
    for (const mole of gameStateRef.current.moles) {
      if (mole.isClicked(mouseX, mouseY)) {
        mole.hide()

        if (mole.type === "bomb") {
          // Bomb hit - negative points and reset combo
          gameStateRef.current.score += mole.points
          gameStateRef.current.moleAI?.resetCombo()
          gameStateRef.current.comboCount = 0
        } else {
          // Normal or golden mole hit
          const combo = gameStateRef.current.moleAI?.hitMole() || 1
          gameStateRef.current.comboCount = combo
          gameStateRef.current.maxCombo = Math.max(gameStateRef.current.maxCombo, combo)

          // Calculate score with combo bonus
          let points = mole.points
          if (combo > 1) {
            points += Math.floor(mole.points * (combo - 1) * 0.5) // 50% bonus per combo level
          }

          gameStateRef.current.score += points
        }

        setScore(gameStateRef.current.score)
        moleHit = true
        break
      }
    }

    // If no mole was hit, reset combo
    if (!moleHit) {
      gameStateRef.current.moleAI?.resetCombo()
      gameStateRef.current.comboCount = 0
    }
  }, [])

  const gameLoop = useCallback(
    (currentTime: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")!
      const game = gameStateRef.current

      if (game.gameState !== "playing" || isPaused) return

      const deltaTime = currentTime - game.lastTime
      game.lastTime = currentTime

      // Update game timer
      game.timeLeft -= deltaTime
      setTimeLeft(Math.max(0, Math.ceil(game.timeLeft / 1000)))

      if (game.timeLeft <= 0) {
        game.gameState = "gameOver"
        setGameState("gameOver")
        onScore(game.score)
        return
      }

      // Update AI and moles, get missed mole count
      if (game.moleAI) {
        const missedThisFrame = game.moleAI.update(deltaTime)
        if (missedThisFrame > 0) {
          game.missedMoles += missedThisFrame
          // Penalty for missed moles
          game.score = Math.max(0, game.score - missedThisFrame * 5)
          setScore(game.score)
          // Reset combo on missed mole
          game.moleAI.resetCombo()
          game.comboCount = 0
        }
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background - use custom background if available
      if (imageCache?.background) {
        ctx.drawImage(imageCache.background, 0, 0, canvas.width, canvas.height)
      } else {
        // Default background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, "#87CEEB")
        gradient.addColorStop(1, "#90EE90")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw grass texture
        ctx.fillStyle = "#228B22"
        for (let i = 0; i < canvas.width; i += 20) {
          for (let j = 0; j < canvas.height; j += 20) {
            if (Math.random() < 0.1) {
              ctx.fillRect(i, j, 2, 8)
            }
          }
        }
      }

      // Draw moles with imageCache
      game.moles.forEach((mole) => mole.render(ctx, imageCache))

      // Draw UI
      ctx.fillStyle = "white"
      ctx.font = "bold 24px Arial"
      ctx.strokeStyle = "black"
      ctx.lineWidth = 2

      ctx.strokeText(`Score: ${game.score}`, 20, 40)
      ctx.fillText(`Score: ${game.score}`, 20, 40)

      ctx.strokeText(`Time: ${Math.ceil(game.timeLeft / 1000)}s`, canvas.width - 150, 40)
      ctx.fillText(`Time: ${Math.ceil(game.timeLeft / 1000)}s`, canvas.width - 150, 40)

      // Combo indicator
      if (game.comboCount > 1) {
        ctx.fillStyle = "#FFD700"
        ctx.font = "bold 20px Arial"
        ctx.strokeText(`Combo: ${game.comboCount}x`, canvas.width / 2 - 50, 40)
        ctx.fillText(`Combo: ${game.comboCount}x`, canvas.width / 2 - 50, 40)
      }

      // Difficulty and stats
      const difficulty = game.moleAI?.difficulty || 1
      ctx.font = "16px Arial"
      ctx.fillStyle = "white"
      ctx.strokeText(`Difficulty: ${difficulty.toFixed(1)}x`, 20, canvas.height - 60)
      ctx.fillText(`Difficulty: ${difficulty.toFixed(1)}x`, 20, canvas.height - 60)

      ctx.strokeText(`Missed: ${game.missedMoles}`, 20, canvas.height - 40)
      ctx.fillText(`Missed: ${game.missedMoles}`, 20, canvas.height - 40)

      ctx.strokeText(`Max Combo: ${game.maxCombo}`, 20, canvas.height - 20)
      ctx.fillText(`Max Combo: ${game.maxCombo}`, 20, canvas.height - 20)
    },
    [isPaused, onScore, imageCache],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 640
    canvas.height = 360

    initializeGame()

    let animationId: number

    const animate = (currentTime: number) => {
      gameLoop(currentTime)
      animationId = requestAnimationFrame(animate)
    }

    if (gameState === "playing") {
      gameStateRef.current.lastTime = performance.now()
      animationId = requestAnimationFrame(animate)
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [gameLoop, gameState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener("click", handleCanvasClick)

    return () => {
      canvas.removeEventListener("click", handleCanvasClick)
    }
  }, [handleCanvasClick])

  const startGame = () => {
    initializeGame()
    gameStateRef.current.score = 0
    gameStateRef.current.timeLeft = 60000
    gameStateRef.current.gameState = "playing"
    gameStateRef.current.comboCount = 0
    gameStateRef.current.missedMoles = 0
    gameStateRef.current.maxCombo = 0
    setGameState("playing")
    setScore(0)
    setTimeLeft(60)
    setIsPaused(false)
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">Whack-the-Mole</h1>
          <div className="text-white text-lg sm:text-xl">
            Score: {score} | Time: {timeLeft}s
          </div>
        </div>

        {/* Game Preview at Top */}
        <Card className="bg-black/20 border-white/20 mb-8">
          <CardContent className="p-4">
            <div className="relative flex justify-center">
              <canvas
                ref={canvasRef}
                className="border border-white/20 rounded-lg cursor-crosshair"
                style={{ maxWidth: "100%", height: "auto", aspectRatio: "16/9" }}
              />

              {/* Game State Overlays */}
              {gameState === "menu" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Whack-the-Mole</h2>
                    <p className="text-lg mb-6">Click on the moles as they pop up! AI controls their behavior.</p>
                    <p className="text-sm mb-6 text-white/70">
                      Score points by clicking moles • Difficulty increases over time
                    </p>
                    <Button onClick={startGame} size="lg" className="bg-green-600 hover:bg-green-700">
                      <Play className="h-5 w-5 mr-2" />
                      Start Game
                    </Button>
                  </div>
                </div>
              )}

              {gameState === "gameOver" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Time&apos;s Up!</h2>
                    <p className="text-xl mb-6">Final Score: {score} points</p>
                    <Button onClick={startGame} size="lg" className="bg-green-600 hover:bg-green-700">
                      <Play className="h-5 w-5 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </div>
              )}

              {gameState === "playing" && (
                <div className="absolute top-4 right-4">
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                </div>
              )}

              {isPaused && gameState === "playing" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <h2 className="text-3xl font-bold mb-4">Paused</h2>
                    <Button onClick={togglePause} size="lg" className="bg-green-600 hover:bg-green-700">
                      <Play className="h-5 w-5 mr-2" />
                      Resume
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="text-center text-white/70 mb-8">
          <p className="text-sm">
            🎯 Click on moles as they appear • ⏱️ 60 seconds to get the highest score • 🤖 AI adjusts difficulty
            automatically
          </p>
        </div>

        {/* AI Reskin Features Below */}
        <GameReskinPanel
          gameId="whack-the-mole"
          gameName="Whack-the-Mole"
          assetSlots={[
            { id: "background", name: "Background", defaultPrompt: "whack-a-mole game background with grass and dirt", dimensions: { width: 640, height: 360 } },
            { id: "mole", name: "Mole", defaultPrompt: "cute cartoon mole character for whack-a-mole game", dimensions: { width: 60, height: 60 } },
            { id: "hole", name: "Hole", defaultPrompt: "dirt hole for mole to pop out of in whack-a-mole game", dimensions: { width: 80, height: 40 } },
            { id: "hammer", name: "Hammer", defaultPrompt: "cartoon mallet or hammer for whack-a-mole game", dimensions: { width: 40, height: 60 } },
          ]}
          gameParams={[
            { id: "gameTime", name: "Game Time (s)", type: "slider", min: 30, max: 120, step: 15, defaultValue: 60, value: gameParams.gameTime },
            { id: "moleSpeed", name: "Mole Speed", type: "slider", min: 0.5, max: 3, step: 0.25, defaultValue: 1.5, value: gameParams.moleSpeed },
            { id: "spawnRate", name: "Spawn Rate", type: "slider", min: 500, max: 3000, step: 250, defaultValue: 1500, value: gameParams.spawnRate },
            { id: "difficulty", name: "Difficulty", type: "slider", min: 1, max: 5, step: 1, defaultValue: 3, value: gameParams.difficulty },
          ]}
          isOpen={true}
          onClose={() => {}}
          onAssetsChanged={(assets) => setCustomAssets(assets)}
          onParamsChanged={handleParamsChanged}
          mode="inline"
          theme="whack-the-mole"
        />
      </div>
    </div>
  )
}
