"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play, Pause, Zap, Shield, Star } from "lucide-react"

interface SpeedRunnerProps {
  onBack: () => void
  onScore: (score: number) => void
}

interface CollisionRect {
  x: number
  y: number
  width: number
  height: number
}

class Player {
  x: number
  y: number
  width: number
  height: number
  velocityY: number
  isGrounded: boolean
  baseSpeed: number
  currentSpeed: number
  speedMultiplier: number
  isSliding: boolean
  slideTimer: number
  maxSlideTime: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.width = 30
    this.height = 40
    this.velocityY = 0
    this.isGrounded = false
    this.baseSpeed = 3
    this.currentSpeed = this.baseSpeed
    this.speedMultiplier = 1
    this.isSliding = false
    this.slideTimer = 0
    this.maxSlideTime = 1000 // 1 second max slide
  }

  update(gravity: number, groundY: number, distance: number) {
    // Progressive speed increase every 100 meters
    this.speedMultiplier = 1 + Math.floor(distance / 100) * 0.2
    this.currentSpeed = this.baseSpeed * this.speedMultiplier

    // Auto-run (move forward automatically)
    this.x += this.currentSpeed

    // Apply gravity
    if (!this.isGrounded) {
      this.velocityY += gravity
    }

    // Update position
    this.y += this.velocityY

    // Handle sliding
    if (this.isSliding) {
      this.slideTimer -= 16 // Assuming 60fps
      if (this.slideTimer <= 0) {
        this.stopSlide()
      }
    }

    // Ground collision
    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height
      this.velocityY = 0
      this.isGrounded = true
    } else {
      this.isGrounded = false
    }
  }

  jump() {
    if (this.isGrounded && !this.isSliding) {
      this.velocityY = -15
      this.isGrounded = false
    }
  }

  startSlide() {
    if (this.isGrounded && !this.isSliding) {
      this.isSliding = true
      this.slideTimer = this.maxSlideTime
      this.height = 20 // Reduce height when sliding
    }
  }

  stopSlide() {
    this.isSliding = false
    this.height = 40 // Restore normal height
  }

  render(ctx: CanvasRenderingContext2D) {
    // Player body
    ctx.fillStyle = "#4A90E2"
    if (this.isSliding) {
      // Draw sliding pose
      ctx.fillRect(this.x, this.y, this.width + 10, this.height)
    } else {
      ctx.fillRect(this.x, this.y, this.width, this.height)
    }

    // Player head
    ctx.fillStyle = "#FFD700"
    ctx.beginPath()
    ctx.arc(this.x + this.width / 2, this.y + 10, 8, 0, Math.PI * 2)
    ctx.fill()

    // Speed indicator
    ctx.fillStyle = `hsl(${Math.min(this.speedMultiplier * 60, 120)}, 70%, 50%)`
    ctx.fillRect(this.x - 5, this.y - 10, 5, 5)
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.isSliding ? this.width + 10 : this.width,
      height: this.height,
    }
  }
}

class Obstacle {
  x: number
  y: number
  width: number
  height: number
  type: "ground" | "air" | "tall"

  constructor(x: number, y: number, type: "ground" | "air" | "tall") {
    this.x = x
    this.y = y
    this.type = type

    switch (type) {
      case "ground":
        this.width = 30
        this.height = 40
        break
      case "air":
        this.width = 40
        this.height = 30
        this.y = y - 80 // Floating obstacle
        break
      case "tall":
        this.width = 25
        this.height = 80
        this.y = y - 80
        break
    }
  }

  update(speed: number) {
    this.x -= speed
  }

  render(ctx: CanvasRenderingContext2D) {
    switch (this.type) {
      case "ground":
        ctx.fillStyle = "#8B4513"
        ctx.fillRect(this.x, this.y, this.width, this.height)
        break
      case "air":
        ctx.fillStyle = "#FF6B6B"
        ctx.fillRect(this.x, this.y, this.width, this.height)
        // Add spikes
        ctx.fillStyle = "#FF4444"
        for (let i = 0; i < this.width; i += 8) {
          ctx.beginPath()
          ctx.moveTo(this.x + i, this.y + this.height)
          ctx.lineTo(this.x + i + 4, this.y + this.height + 8)
          ctx.lineTo(this.x + i + 8, this.y + this.height)
          ctx.fill()
        }
        break
      case "tall":
        ctx.fillStyle = "#654321"
        ctx.fillRect(this.x, this.y, this.width, this.height)
        break
    }
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    }
  }
}

class PowerUp {
  x: number
  y: number
  width: number
  height: number
  type: "shield" | "doubleScore"
  duration: number

  constructor(x: number, y: number, type: "shield" | "doubleScore") {
    this.x = x
    this.y = y
    this.width = 25
    this.height = 25
    this.type = type
    this.duration = type === "shield" ? 5000 : 10000 // 5s shield, 10s double score
  }

  update(speed: number) {
    this.x -= speed
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.type === "shield") {
      ctx.fillStyle = "#00BFFF"
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2)
      ctx.fill()

      // Shield symbol
      ctx.fillStyle = "white"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("🛡", this.x + this.width / 2, this.y + this.height / 2 + 5)
    } else {
      ctx.fillStyle = "#FFD700"
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2)
      ctx.fill()

      // Double score symbol
      ctx.fillStyle = "white"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("2X", this.x + this.width / 2, this.y + this.height / 2 + 4)
    }
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    }
  }
}

export default function SpeedRunner({ onBack, onScore }: SpeedRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef({
    player: new Player(50, 300),
    obstacles: [] as Obstacle[],
    powerUps: [] as PowerUp[],
    camera: { x: 0 },
    score: 0,
    distance: 0,
    gameState: "menu" as "menu" | "playing" | "gameOver",
    keys: {} as Record<string, boolean>,
    isJumpPressed: false,
    isSlidePressed: false,
    shieldActive: false,
    shieldTimer: 0,
    doubleScoreActive: false,
    doubleScoreTimer: 0,
    obstacleSpawnTimer: 0,
    powerUpSpawnTimer: 0,
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

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")!
    const game = gameStateRef.current

    if (game.gameState !== "playing" || isPaused) return

    // Update player
    game.player.update(0.8, 380, game.distance)

    // Handle input
    if (game.isJumpPressed && !game.isSlidePressed) {
      game.player.jump()
      game.isJumpPressed = false
    }

    if (game.isSlidePressed) {
      game.player.startSlide()
    } else {
      game.player.stopSlide()
    }

    // Update camera to follow player
    game.camera.x = game.player.x - canvas.width / 3

    // Update distance and score
    game.distance = Math.floor(game.player.x / 10)
    const baseScore = game.distance
    const speedBonus = Math.floor(game.distance / 100) * 50
    const multiplier = game.doubleScoreActive ? 2 : 1
    game.score = (baseScore + speedBonus) * multiplier
    setScore(game.score)

    // Spawn obstacles
    game.obstacleSpawnTimer += 16
    if (game.obstacleSpawnTimer > 1000 + Math.random() * 1000) {
      // Random spawn between 1-2 seconds
      const obstacleTypes: ("ground" | "air" | "tall")[] = ["ground", "air", "tall"]
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]
      game.obstacles.push(new Obstacle(game.player.x + 800, 380, type))
      game.obstacleSpawnTimer = 0
    }

    // Spawn power-ups
    game.powerUpSpawnTimer += 16
    if (game.powerUpSpawnTimer > 8000 + Math.random() * 5000) {
      // Random spawn between 8-13 seconds
      const powerUpTypes: ("shield" | "doubleScore")[] = ["shield", "doubleScore"]
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
      game.powerUps.push(new PowerUp(game.player.x + 600, 350, type))
      game.powerUpSpawnTimer = 0
    }

    // Update obstacles
    game.obstacles.forEach((obstacle) => {
      obstacle.update(game.player.currentSpeed)
    })
    game.obstacles = game.obstacles.filter((obstacle) => obstacle.x > game.player.x - 200)

    // Update power-ups
    game.powerUps.forEach((powerUp) => {
      powerUp.update(game.player.currentSpeed)
    })
    game.powerUps = game.powerUps.filter((powerUp) => powerUp.x > game.player.x - 200)

    // Update power-up timers
    if (game.shieldActive) {
      game.shieldTimer -= 16
      if (game.shieldTimer <= 0) {
        game.shieldActive = false
      }
    }

    if (game.doubleScoreActive) {
      game.doubleScoreTimer -= 16
      if (game.doubleScoreTimer <= 0) {
        game.doubleScoreActive = false
      }
    }

    // Check collisions
    const playerBounds = game.player.getBounds()

    // Obstacle collisions
    if (!game.shieldActive) {
      for (const obstacle of game.obstacles) {
        if (checkCollision(playerBounds, obstacle.getBounds())) {
          game.gameState = "gameOver"
          setGameState("gameOver")
          onScore(game.score)
          return
        }
      }
    }

    // Power-up collisions
    for (let i = game.powerUps.length - 1; i >= 0; i--) {
      const powerUp = game.powerUps[i]
      if (checkCollision(playerBounds, powerUp.getBounds())) {
        if (powerUp.type === "shield") {
          game.shieldActive = true
          game.shieldTimer = powerUp.duration
        } else if (powerUp.type === "doubleScore") {
          game.doubleScoreActive = true
          game.doubleScoreTimer = powerUp.duration
        }
        game.powerUps.splice(i, 1)
      }
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context for camera
    ctx.save()
    ctx.translate(-game.camera.x, 0)

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#87CEEB")
    gradient.addColorStop(1, "#98FB98")
    ctx.fillStyle = gradient
    ctx.fillRect(game.camera.x, 0, canvas.width, canvas.height)

    // Draw ground
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(game.camera.x, 380, canvas.width, 20)

    // Draw obstacles
    game.obstacles.forEach((obstacle) => obstacle.render(ctx))

    // Draw power-ups
    game.powerUps.forEach((powerUp) => powerUp.render(ctx))

    // Draw player
    game.player.render(ctx)

    // Draw shield effect
    if (game.shieldActive) {
      ctx.strokeStyle = "#00BFFF"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(game.player.x + game.player.width / 2, game.player.y + game.player.height / 2, 30, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Restore context
    ctx.restore()

    // Draw UI
    ctx.fillStyle = "white"
    ctx.font = "24px Arial"
    ctx.strokeStyle = "black"
    ctx.lineWidth = 2

    ctx.strokeText(`Score: ${game.score}`, 20, 40)
    ctx.fillText(`Score: ${game.score}`, 20, 40)

    ctx.strokeText(`Distance: ${game.distance}m`, 20, 70)
    ctx.fillText(`Distance: ${game.distance}m`, 20, 70)

    ctx.strokeText(`Speed: ${game.player.speedMultiplier.toFixed(1)}x`, 20, 100)
    ctx.fillText(`Speed: ${game.player.speedMultiplier.toFixed(1)}x`, 20, 100)

    // Power-up indicators
    if (game.shieldActive) {
      ctx.fillStyle = "#00BFFF"
      ctx.fillText(`🛡 ${Math.ceil(game.shieldTimer / 1000)}s`, canvas.width - 150, 40)
    }

    if (game.doubleScoreActive) {
      ctx.fillStyle = "#FFD700"
      ctx.fillText(`2X ${Math.ceil(game.doubleScoreTimer / 1000)}s`, canvas.width - 150, 70)
    }
  }, [isPaused, onScore])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 800
    canvas.height = 400

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
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault()
        gameStateRef.current.isJumpPressed = true
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault()
        gameStateRef.current.isSlidePressed = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        gameStateRef.current.isSlidePressed = false
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      gameStateRef.current.isJumpPressed = true
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      gameStateRef.current.isSlidePressed = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  const startGame = () => {
    const game = gameStateRef.current
    game.player = new Player(50, 300)
    game.obstacles = []
    game.powerUps = []
    game.camera = { x: 0 }
    game.score = 0
    game.distance = 0
    game.gameState = "playing"
    game.shieldActive = false
    game.doubleScoreActive = false
    game.obstacleSpawnTimer = 0
    game.powerUpSpawnTimer = 0
    setGameState("playing")
    setScore(0)
    setIsPaused(false)
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="bg-white/10 backdrop-blur-xl border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>

          <div className="text-center">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-white flex items-center justify-center gap-3">
              <Zap className="h-8 w-8 text-orange-400" />
              Speed Runner
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full mx-auto mt-2"></div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2">
            <div className="text-white text-lg font-bold">{score}m</div>
            <div className="text-orange-300 text-xs">Distance</div>
          </div>
        </div>

        {/* Game Canvas */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardContent className="p-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-white/20 rounded-xl w-full shadow-2xl"
                style={{ aspectRatio: "2/1" }}
              />

              {/* Game State Overlays */}
              {gameState === "menu" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <div className="text-center text-white max-w-md">
                    <div className="bg-gradient-to-r from-orange-500 to-yellow-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <Zap className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-orange-200">
                      Speed Runner
                    </h2>
                    <p className="text-lg mb-6 text-slate-300 leading-relaxed">
                      Run as far as you can! Avoid obstacles and collect power-ups in this endless runner.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div className="bg-white/10 rounded-lg p-3">
                        <Zap className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                        <div>Auto-run with increasing speed</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <Shield className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                        <div>Collect power-ups for abilities</div>
                      </div>
                    </div>
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white border-0 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Running
                    </Button>
                  </div>
                </div>
              )}

              {gameState === "gameOver" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <div className="text-center text-white max-w-md">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <Star className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-red-200">
                      Run Complete!
                    </h2>
                    <div className="bg-white/10 rounded-xl p-6 mb-6">
                      <div className="text-3xl font-bold text-orange-400 mb-2">{score}m</div>
                      <div className="text-slate-300">Final Distance</div>
                    </div>
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white border-0 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Run Again
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
                    className="bg-white/10 backdrop-blur-xl border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                </div>
              )}

              {isPaused && gameState === "playing" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <div className="text-center text-white">
                    <h2 className="text-3xl font-bold mb-6">Game Paused</h2>
                    <Button
                      onClick={togglePause}
                      size="lg"
                      className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white border-0 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
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
        <div className="mt-8 text-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/20 rounded-lg p-2">
                  <kbd className="bg-white/20 px-2 py-1 rounded text-xs">SPACE</kbd>
                </div>
                <span>Jump over obstacles</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/20 rounded-lg p-2">
                  <kbd className="bg-white/20 px-2 py-1 rounded text-xs">↓</kbd>
                </div>
                <span>Slide under barriers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/20 rounded-lg p-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                </div>
                <span>Collect power-ups for abilities</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
