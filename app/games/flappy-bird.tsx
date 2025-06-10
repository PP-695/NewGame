"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play, Pause } from "lucide-react"

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

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.velocity = 0
    this.size = 30
    this.gravity = 0.6
    this.jumpPower = -12
    this.rotation = 0
    this.maxVelocity = 10
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

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()

    // Translate to bird center and rotate
    ctx.translate(this.x, this.y)
    ctx.rotate((this.rotation * Math.PI) / 180)

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

  constructor(x: number, canvasHeight: number, speed: number) {
    this.x = x
    this.width = 60
    this.speed = speed
    this.scored = false
    this.gap = 120 + Math.random() * 40 // Random gap size between 120-160

    // Random gap position (not too high or low)
    const minGapY = 100
    const maxGapY = canvasHeight - 100 - this.gap
    this.gapY = minGapY + Math.random() * (maxGapY - minGapY)
    this.topHeight = this.gapY
  }

  update() {
    this.x -= this.speed
  }

  render(ctx: CanvasRenderingContext2D, canvasHeight: number) {
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
      game.pipes.push(new Pipe(canvas.width, canvas.height, game.gameSpeed))
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
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    backgroundGradient.addColorStop(0, "#87CEEB")
    backgroundGradient.addColorStop(0.7, "#98FB98")
    backgroundGradient.addColorStop(1, "#90EE90")
    ctx.fillStyle = backgroundGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw moving clouds
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

    // Draw ground
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20)

    // Draw pipes
    game.pipes.forEach((pipe) => pipe.render(ctx, canvas.height))

    // Draw particles
    game.particles.forEach((particle) => particle.render(ctx))

    // Draw bird
    game.bird.render(ctx)

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
  }, [isPaused, onScore])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 800
    canvas.height = 600

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

    game.bird = new Bird(100, 300)
    game.pipes = []
    game.particles = []
    game.score = 0
    game.gameState = "playing"
    game.pipeSpawnTimer = 0
    game.gameSpeed = 3
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
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          <h1 className="text-3xl font-bold text-white">Flappy Bird</h1>
          <div className="text-white text-xl">Score: {score}</div>
        </div>

        {/* Game Canvas */}
        <Card className="bg-black/20 border-white/20">
          <CardContent className="p-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-white/20 rounded-lg w-full cursor-pointer"
                style={{ aspectRatio: "4/3" }}
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
        <div className="mt-6 text-center text-white/70">
          <p className="text-sm">
            🐦 Click, tap, or press Space to flap • 🚫 Avoid pipes and ground • ⚡ Speed increases every 5 points • 🏆
            Reach milestones for achievements
          </p>
        </div>
      </div>
    </div>
  )
}
