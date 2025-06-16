"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play, Pause } from "lucide-react"
import GameReskinPanel from "@/components/game-reskin-panel"

interface FlappyBirdProps {
  onBack: () => void
  onScore: (score: number) => void
}

interface CollisionRect {
  x: number
  y: number
  width: number
  height: number
}

class Bird {
  x: number
  y: number
  velocity: number
  size: number
  gravity: number
  jumpPower: number
  rotation: number
  maxVelocity: number

  constructor(x: number, y: number, gravity = 0.6, jumpPower = 12) {
    this.x = x
    this.y = y
    this.velocity = 0
    this.size = 30
    this.gravity = gravity
    this.jumpPower = -Math.abs(jumpPower) // Ensure negative for upward movement
    this.rotation = 0
    this.maxVelocity = 10
  }

  updateParams(gravity: number, jumpPower: number) {
    this.gravity = gravity
    this.jumpPower = -Math.abs(jumpPower)
  }

  update() {
    // Apply gravity
    this.velocity += this.gravity

    // Limit velocity
    if (this.velocity > this.maxVelocity) {
      this.velocity = this.maxVelocity
    }

    // Update position
    this.y += this.velocity

    // Update rotation based on velocity
    this.rotation = Math.min(Math.max(this.velocity * 3, -30), 90)
  }

  flap() {
    this.velocity = this.jumpPower
  }

  render(ctx: CanvasRenderingContext2D, customImage?: HTMLImageElement) {
    ctx.save()

    // Translate to bird center and rotate
    ctx.translate(this.x, this.y)
    ctx.rotate((this.rotation * Math.PI) / 180)

    if (customImage) {
      // Draw custom bird image
      const scale = this.size / Math.max(customImage.width, customImage.height)
      const width = customImage.width * scale
      const height = customImage.height * scale
      ctx.drawImage(customImage, -width/2, -height/2, width, height)
    } else {
      // Default bird rendering
      // Bird body
      ctx.fillStyle = "#FFD700"
      ctx.beginPath()
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2)
      ctx.fill()

      // Bird wing (animated)
      const wingOffset = Math.sin(Date.now() * 0.02) * 3
      ctx.fillStyle = "#FFA500"
      ctx.beginPath()
      ctx.ellipse(-5, wingOffset, 8, 12, 0, 0, Math.PI * 2)
      ctx.fill()

      // Bird eye
      ctx.fillStyle = "white"
      ctx.beginPath()
      ctx.arc(5, -5, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "black"
      ctx.beginPath()
      ctx.arc(7, -5, 2, 0, Math.PI * 2)
      ctx.fill()

      // Bird beak
      ctx.fillStyle = "#FF6B35"
      ctx.beginPath()
      ctx.moveTo(this.size / 2, 0)
      ctx.lineTo(this.size / 2 + 8, -3)
      ctx.lineTo(this.size / 2 + 8, 3)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }

  getBounds() {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size / 2,
      width: this.size,
      height: this.size,
    }
  }
}

class Pipe {
  x: number
  topHeight: number
  gap: number
  width: number
  speed: number
  scored: boolean
  gapY: number

  constructor(x: number, canvasHeight: number, speed: number, baseGap = 120) {
    this.x = x
    this.width = 60
    this.speed = speed
    this.scored = false
    this.gap = baseGap + Math.random() * 40 // Random gap size variation

    // Random gap position (not too high or low)
    const minGapY = 100
    const maxGapY = canvasHeight - 100 - this.gap
    this.gapY = minGapY + Math.random() * (maxGapY - minGapY)
    this.topHeight = this.gapY
  }

  update() {
    this.x -= this.speed
  }

  render(ctx: CanvasRenderingContext2D, canvasHeight: number, customImage?: HTMLImageElement) {
    if (customImage) {
      // Draw custom pipe image
      const pipeWidth = this.width
      const topHeight = this.topHeight
      const bottomHeight = canvasHeight - (this.gapY + this.gap)
      
      // Top pipe
      ctx.save()
      ctx.scale(1, -1) // Flip vertically for top pipe
      ctx.drawImage(customImage, this.x, -topHeight, pipeWidth, topHeight)
      ctx.restore()
      
      // Bottom pipe
      const bottomY = this.gapY + this.gap
      ctx.drawImage(customImage, this.x, bottomY, pipeWidth, bottomHeight)
    } else {
      // Default pipe rendering
      // Pipe color with gradient
      const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0)
      gradient.addColorStop(0, "#4CAF50")
      gradient.addColorStop(0.5, "#66BB6A")
      gradient.addColorStop(1, "#4CAF50")
      ctx.fillStyle = gradient

      // Top pipe
      ctx.fillRect(this.x, 0, this.width, this.topHeight)

      // Bottom pipe
      const bottomPipeY = this.gapY + this.gap
      const bottomPipeHeight = canvasHeight - bottomPipeY
      ctx.fillRect(this.x, bottomPipeY, this.width, bottomPipeHeight)

      // Pipe caps (decorative)
      ctx.fillStyle = "#45a049"

      // Top pipe cap
      ctx.fillRect(this.x - 5, this.topHeight - 20, this.width + 10, 20)

      // Bottom pipe cap
      ctx.fillRect(this.x - 5, bottomPipeY, this.width + 10, 20)

      // Pipe highlights
      ctx.fillStyle = "#81C784"
      ctx.fillRect(this.x + 5, 0, 8, this.topHeight - 20)
      ctx.fillRect(this.x + 5, bottomPipeY + 20, 8, bottomPipeHeight - 20)
    }
  }

  getBounds(canvasHeight: number) {
    return [
      {
        x: this.x,
        y: 0,
        width: this.width,
        height: this.topHeight,
      },
      {
        x: this.x,
        y: this.gapY + this.gap,
        width: this.width,
        height: canvasHeight - (this.gapY + this.gap),
      },
    ]
  }
}

class Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number

  constructor(x: number, y: number, color: string) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 4
    this.vy = (Math.random() - 0.5) * 4
    this.life = 1
    this.maxLife = 30 + Math.random() * 30
    this.color = color
    this.size = 2 + Math.random() * 3
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += 0.1 // gravity
    this.life -= 1 / this.maxLife
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = this.life
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  isDead() {
    return this.life <= 0
  }
}

export default function FlappyBird({ onBack, onScore }: FlappyBirdProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef({
    bird: new Bird(100, 300),
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    score: 0,
    gameState: "menu" as "menu" | "playing" | "gameOver",
    pipeSpawnTimer: 0,
    pipeSpawnInterval: 1800, // 1.8 seconds
    gameSpeed: 3,
    speedIncreaseInterval: 5, // Increase speed every 5 points
    lastSpeedIncrease: 0,
    bestScore: 0,
    milestones: [10, 25, 50, 100] as number[],
    achievedMilestones: [] as number[],
  })

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [customAssets, setCustomAssets] = useState<Record<string, string>>({})
  
  // Game parameters state
  const [gameParams, setGameParams] = useState({
    gravity: 0.6,
    jumpPower: 12,
    pipeGap: 120,
    gameSpeed: 3
  })

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

  // Update bird parameters when gameParams change
  useEffect(() => {
    const game = gameStateRef.current
    game.bird.updateParams(gameParams.gravity, gameParams.jumpPower)
    game.gameSpeed = gameParams.gameSpeed
  }, [gameParams])

  // Handle parameter changes from reskin panel
  const handleParamsChanged = useCallback((params: Record<string, number | string>) => {
    const newParams = {
      gravity: typeof params.gravity === 'number' ? params.gravity : gameParams.gravity,
      jumpPower: typeof params.jumpPower === 'number' ? params.jumpPower : gameParams.jumpPower,
      pipeGap: typeof params.pipeGap === 'number' ? params.pipeGap : gameParams.pipeGap,
      gameSpeed: typeof params.gameSpeed === 'number' ? params.gameSpeed : gameParams.gameSpeed
    }
    setGameParams(newParams)
  }, [gameParams])

  const checkCollision = (rect1: CollisionRect, rect2: CollisionRect) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  const createParticles = (x: number, y: number, color: string, count = 10) => {
    const game = gameStateRef.current
    for (let i = 0; i < count; i++) {
      game.particles.push(new Particle(x, y, color))
    }
  }

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")!
    const game = gameStateRef.current

    if (game.gameState !== "playing" || isPaused) return

    // Update bird
    game.bird.update()

    // Update pipes
    game.pipes.forEach((pipe) => pipe.update())

    // Remove off-screen pipes
    game.pipes = game.pipes.filter((pipe) => pipe.x > -pipe.width)

    // Spawn new pipes
    game.pipeSpawnTimer += 16 // Assuming 60fps
    if (game.pipeSpawnTimer >= game.pipeSpawnInterval) {
      game.pipes.push(new Pipe(canvas.width, canvas.height, game.gameSpeed, gameParams.pipeGap))
      game.pipeSpawnTimer = 0
    }

    // Update particles
    game.particles.forEach((particle) => particle.update())
    game.particles = game.particles.filter((particle) => !particle.isDead())

    // Check collisions
    const birdBounds = game.bird.getBounds()

    // Check pipe collisions
    for (const pipe of game.pipes) {
      const pipeBounds = pipe.getBounds(canvas.height)
      for (const bound of pipeBounds) {
        if (checkCollision(birdBounds, bound)) {
          // Create collision particles
          createParticles(game.bird.x, game.bird.y, "#FF4444", 15)

          game.gameState = "gameOver"
          setGameState("gameOver")
          onScore(game.score)
          return
        }
      }

      // Score when passing pipe
      if (!pipe.scored && pipe.x + pipe.width < game.bird.x) {
        game.score++
        setScore(game.score)
        pipe.scored = true

        // Create score particles
        createParticles(pipe.x + pipe.width, pipe.gapY + pipe.gap / 2, "#FFD700", 8)

        // Check for milestones
        if (game.milestones.includes(game.score) && !game.achievedMilestones.includes(game.score)) {
          game.achievedMilestones.push(game.score)
          createParticles(canvas.width / 2, 100, "#00FF00", 20)
        }

        // Increase speed at intervals
        if (game.score > 0 && game.score % game.speedIncreaseInterval === 0 && game.score > game.lastSpeedIncrease) {
          game.gameSpeed += 0.5
          game.lastSpeedIncrease = game.score

          // Reduce pipe spawn interval slightly
          game.pipeSpawnInterval = Math.max(1200, game.pipeSpawnInterval - 50)

          createParticles(canvas.width / 2, canvas.height / 2, "#FF6B35", 12)
        }
      }
    }

    // Check bounds
    if (game.bird.y > canvas.height || game.bird.y < 0) {
      // Create crash particles
      createParticles(game.bird.x, Math.max(0, Math.min(canvas.height, game.bird.y)), "#FF4444", 20)

      game.gameState = "gameOver"
      setGameState("gameOver")
      onScore(game.score)
      return
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background with parallax effect
    if (imageCache['background']) {
      // Draw custom background image
      ctx.drawImage(imageCache['background'], 0, 0, canvas.width, canvas.height)
    } else {
      // Default background
      const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      backgroundGradient.addColorStop(0, "#87CEEB")
      backgroundGradient.addColorStop(0.7, "#98FB98")
      backgroundGradient.addColorStop(1, "#90EE90")
      ctx.fillStyle = backgroundGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Draw moving clouds (only if no custom background)
    if (!imageCache['background']) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
      for (let i = 0; i < 5; i++) {
        const x = ((i * 200 + Date.now() * 0.02) % (canvas.width + 100)) - 50
        const y = 50 + i * 30
        ctx.beginPath()
        ctx.arc(x, y, 20, 0, Math.PI * 2)
        ctx.arc(x + 20, y, 25, 0, Math.PI * 2)
        ctx.arc(x + 40, y, 20, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw ground
    if (imageCache['ground']) {
      // Draw custom ground image
      const pattern = ctx.createPattern(imageCache['ground'], 'repeat-x')
      if (pattern) {
        ctx.fillStyle = pattern
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50)
      }
    } else {
      // Default ground
      ctx.fillStyle = "#8B4513"
      ctx.fillRect(0, canvas.height - 20, canvas.width, 20)
    }

    // Draw pipes
    game.pipes.forEach((pipe) => pipe.render(ctx, canvas.height, imageCache['pipe']))

    // Draw particles
    game.particles.forEach((particle) => particle.render(ctx))

    // Draw bird
    game.bird.render(ctx, imageCache['bird'])

    // Draw UI
    ctx.fillStyle = "white"
    ctx.font = "bold 48px Arial"
    ctx.strokeStyle = "black"
    ctx.lineWidth = 3
    ctx.textAlign = "center"

    // Score
    ctx.strokeText(game.score.toString(), canvas.width / 2, 80)
    ctx.fillText(game.score.toString(), canvas.width / 2, 80)

    // Speed indicator
    ctx.font = "16px Arial"
    ctx.textAlign = "left"
    ctx.fillStyle = "white"
    ctx.strokeStyle = "black"
    ctx.lineWidth = 1
    ctx.strokeText(`Speed: ${game.gameSpeed.toFixed(1)}x`, 20, canvas.height - 40)
    ctx.fillText(`Speed: ${game.gameSpeed.toFixed(1)}x`, 20, canvas.height - 40)

    // Next milestone
    const nextMilestone = game.milestones.find((m) => m > game.score)
    if (nextMilestone) {
      ctx.strokeText(`Next: ${nextMilestone}`, 20, canvas.height - 20)
      ctx.fillText(`Next: ${nextMilestone}`, 20, canvas.height - 20)
    }

    // Best score
    if (game.bestScore > 0) {
      ctx.textAlign = "right"
      ctx.strokeText(`Best: ${game.bestScore}`, canvas.width - 20, canvas.height - 40)
      ctx.fillText(`Best: ${game.bestScore}`, canvas.width - 20, canvas.height - 40)
    }

    ctx.textAlign = "left"
  }, [isPaused, onScore, gameParams, imageCache])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 800
    canvas.height = 450

    let animationId: number

    const animate = () => {
      gameLoop()
      animationId = requestAnimationFrame(animate)
    }

    if (gameState === "playing") {
      animationId = requestAnimationFrame(animate)
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [gameLoop, gameState])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't prevent default if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }
      
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        if (gameStateRef.current.gameState === "playing") {
          gameStateRef.current.bird.flap()
          // Create flap particles
          createParticles(gameStateRef.current.bird.x - 10, gameStateRef.current.bird.y + 10, "#87CEEB", 5)
        }
      }
    }

    const handleClick = () => {
      if (gameStateRef.current.gameState === "playing") {
        gameStateRef.current.bird.flap()
        // Create flap particles
        createParticles(gameStateRef.current.bird.x - 10, gameStateRef.current.bird.y + 10, "#87CEEB", 5)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener("click", handleClick)
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (canvas) {
        canvas.removeEventListener("click", handleClick)
      }
    }
  }, [])

  const startGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const game = gameStateRef.current

    // Update best score
    if (game.score > game.bestScore) {
      game.bestScore = game.score
    }

    game.bird = new Bird(100, 300, gameParams.gravity, gameParams.jumpPower)
    game.pipes = []
    game.particles = []
    game.score = 0
    game.gameState = "playing"
    game.pipeSpawnTimer = 0
    game.gameSpeed = gameParams.gameSpeed
    game.lastSpeedIncrease = 0
    game.achievedMilestones = []
    setGameState("playing")
    setScore(0)
    setIsPaused(false)
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-pink-900 p-2 sm:p-4 lg:p-6">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">Flappy Bird</h1>
          <div className="text-white text-lg sm:text-xl">Score: {score}</div>
        </div>

        {/* Game Preview at Top */}
        <Card className="bg-black/20 border-white/20 mb-8">
          <CardContent className="p-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-white/20 rounded-lg w-full cursor-pointer"
                style={{ aspectRatio: "16/9" }}
              />

              {/* Game State Overlays */}
              {gameState === "menu" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Flappy Bird</h2>
                    <p className="text-lg mb-6">Navigate through pipes with realistic physics and gravity!</p>
                    <p className="text-sm mb-6 text-white/70">
                      Click, tap, or press Space to flap • Avoid pipes and ground • Speed increases over time
                    </p>
                    <Button onClick={startGame} size="lg" className="bg-red-600 hover:bg-red-700">
                      <Play className="h-5 w-5 mr-2" />
                      Start Game
                    </Button>
                  </div>
                </div>
              )}

              {gameState === "gameOver" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
                    <p className="text-xl mb-2">Score: {score}</p>
                    {gameStateRef.current.bestScore > 0 && (
                      <p className="text-lg mb-4 text-yellow-400">Best: {gameStateRef.current.bestScore}</p>
                    )}
                    {gameStateRef.current.achievedMilestones.length > 0 && (
                      <p className="text-sm mb-4 text-green-400">
                        Milestones: {gameStateRef.current.achievedMilestones.join(", ")}
                      </p>
                    )}
                    <Button onClick={startGame} size="lg" className="bg-red-600 hover:bg-red-700">
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
                    <Button onClick={togglePause} size="lg" className="bg-red-600 hover:bg-red-700">
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
            🐦 Click, tap, or press Space to flap • 🚫 Avoid pipes and ground • ⚡ Speed increases every 5 points • 🏆
            Reach milestones for achievements
          </p>
        </div>

        {/* AI Reskin Features Below */}
        <GameReskinPanel
          gameId="flappy-bird"
          gameName="Flappy Bird"
          assetSlots={[
  {
    id: "background",
    name: "Background",
    defaultPrompt: "anime-style side-scrolling game background with bright blue sky, fluffy clouds, distant mountains, warm lighting, soft pastel tones",
    dimensions: { width: 800, height: 450 },
  },
  {
    id: "bird",
    name: "Bird",
    defaultPrompt: "adorable anime-style bird character in side view, expressive eyes, detailed feathers, cel-shaded, flying with a determined look",
    dimensions: { width: 30, height: 30 },
  },
  {
    id: "pipe",
    name: "Pipe",
    defaultPrompt: "anime-style cylindrical green pipe obstacle with soft shadows and cel shading, matches colorful side-scrolling anime game background",
    dimensions: { width: 60, height: 200 },
  },
  {
    id: "ground",
    name: "Ground",
    defaultPrompt: "anime-style ground platform with grassy top and dirt layers, detailed textures, soft outlines, pastel color palette",
    dimensions: { width: 800, height: 20 },
  },
]}

          gameParams={[
            { id: "gravity", name: "Gravity", type: "slider", min: 0.1, max: 1.5, step: 0.1, defaultValue: 0.6, value: gameParams.gravity },
            { id: "jumpPower", name: "Jump Power", type: "slider", min: 5, max: 20, step: 1, defaultValue: 12, value: gameParams.jumpPower },
            { id: "pipeGap", name: "Pipe Gap", type: "slider", min: 80, max: 200, step: 10, defaultValue: 120, value: gameParams.pipeGap },
            { id: "gameSpeed", name: "Game Speed", type: "slider", min: 1, max: 8, step: 0.5, defaultValue: 3, value: gameParams.gameSpeed },
          ]}
          isOpen={true}
          onClose={() => {}}
          onAssetsChanged={(assets) => setCustomAssets(assets)}
          onParamsChanged={handleParamsChanged}
          mode="inline"
          theme="flappy-bird"
        />
      </div>
    </div>
  )
}
