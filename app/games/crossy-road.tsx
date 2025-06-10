"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play, Pause, Car, Shield, Zap } from "lucide-react"

interface CrossyRoadProps {
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
  size: number
  gridSize: number
  isMoving: boolean
  targetX: number
  targetY: number
  moveSpeed: number
  isOnLog: boolean
  logSpeed: number
  isInvincible: boolean
  invincibilityTimer: number

  constructor(x: number, y: number, gridSize: number) {
    this.x = x
    this.y = y
    this.size = 30
    this.gridSize = gridSize
    this.isMoving = false
    this.targetX = x
    this.targetY = y
    this.moveSpeed = 0.2
    this.isOnLog = false
    this.logSpeed = 0
    this.isInvincible = false
    this.invincibilityTimer = 0
  }

  update(deltaTime: number) {
    // Smooth movement animation
    if (this.isMoving) {
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        this.x = this.targetX
        this.y = this.targetY
        this.isMoving = false
      } else {
        this.x += dx * this.moveSpeed
        this.y += dy * this.moveSpeed
      }
    }

    // Move with log if on one
    if (this.isOnLog && !this.isMoving) {
      this.x += this.logSpeed
      this.targetX += this.logSpeed
    }

    // Update power-up timers
    if (this.isInvincible) {
      this.invincibilityTimer -= deltaTime
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false
      }
    }
  }

  move(direction: "up" | "down" | "left" | "right", canvasWidth: number) {
    if (this.isMoving) return

    const newTargetX = this.targetX
    const newTargetY = this.targetY

    switch (direction) {
      case "up":
        this.targetY -= this.gridSize
        break
      case "down":
        this.targetY += this.gridSize
        break
      case "left":
        this.targetX = Math.max(this.gridSize / 2, this.targetX - this.gridSize)
        break
      case "right":
        this.targetX = Math.min(canvasWidth - this.gridSize / 2, this.targetX + this.gridSize)
        break
    }

    // Only move if target changed
    if (this.targetX !== newTargetX || this.targetY !== newTargetY) {
      this.isMoving = true
      this.isOnLog = false
    }
  }

  activateInvincibility(duration: number) {
    this.isInvincible = true
    this.invincibilityTimer = duration
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()

    // Invincibility effect
    if (this.isInvincible && Math.floor(Date.now() / 100) % 2) {
      ctx.globalAlpha = 0.5
    }

    // Player body (frog)
    ctx.fillStyle = "#4CAF50"
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2)
    ctx.fill()

    // Frog spots
    ctx.fillStyle = "#2E7D32"
    ctx.beginPath()
    ctx.arc(this.x - 8, this.y - 5, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x + 8, this.y - 5, 3, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    ctx.fillStyle = "#FFEB3B"
    ctx.beginPath()
    ctx.arc(this.x - 6, this.y - 8, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x + 6, this.y - 8, 4, 0, Math.PI * 2)
    ctx.fill()

    // Eye pupils
    ctx.fillStyle = "black"
    ctx.beginPath()
    ctx.arc(this.x - 6, this.y - 8, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x + 6, this.y - 8, 2, 0, Math.PI * 2)
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

class Vehicle {
  x: number
  y: number
  width: number
  height: number
  speed: number
  direction: number
  color: string
  type: "car" | "truck" | "bus"

  constructor(x: number, y: number, speed: number, direction: number, type: "car" | "truck" | "bus" = "car") {
    this.x = x
    this.y = y
    this.speed = speed
    this.direction = direction
    this.type = type
    this.color = this.getRandomColor()

    switch (type) {
      case "truck":
        this.width = 80
        this.height = 35
        break
      case "bus":
        this.width = 100
        this.height = 40
        break
      default:
        this.width = 60
        this.height = 30
    }
  }

  getRandomColor(): string {
    const colors = ["#FF4444", "#44FF44", "#4444FF", "#FFFF44", "#FF44FF", "#44FFFF", "#FFA500"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  update() {
    this.x += this.speed * this.direction
  }

  render(ctx: CanvasRenderingContext2D) {
    // Vehicle body
    ctx.fillStyle = this.color
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height)

    // Vehicle details
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(this.x - this.width / 2 + 5, this.y - this.height / 2 + 5, this.width - 10, 8)

    // Wheels
    ctx.fillStyle = "black"
    const wheelY = this.y + this.height / 2
    ctx.beginPath()
    ctx.arc(this.x - this.width / 3, wheelY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x + this.width / 3, wheelY, 5, 0, Math.PI * 2)
    ctx.fill()

    // Type-specific details
    if (this.type === "truck") {
      ctx.fillStyle = "#666666"
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width, 10)
    } else if (this.type === "bus") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(this.x - this.width / 2 + 10 + i * 20, this.y - this.height / 2 + 8, 15, 12)
      }
    }
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    }
  }
}

class Log {
  x: number
  y: number
  width: number
  height: number
  speed: number
  direction: number

  constructor(x: number, y: number, width: number, speed: number, direction: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = 35
    this.speed = speed
    this.direction = direction
  }

  update() {
    this.x += this.speed * this.direction
  }

  render(ctx: CanvasRenderingContext2D) {
    // Log body
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height)

    // Log texture
    ctx.strokeStyle = "#654321"
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2 + i * 12)
      ctx.lineTo(this.x + this.width / 2, this.y - this.height / 2 + i * 12)
      ctx.stroke()
    }

    // Log ends
    ctx.fillStyle = "#A0522D"
    ctx.beginPath()
    ctx.arc(this.x - this.width / 2, this.y, this.height / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x + this.width / 2, this.y, this.height / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    }
  }
}

class PowerUp {
  x: number
  y: number
  size: number
  type: "invincibility"
  collected: boolean
  animationOffset: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.size = 25
    this.type = "invincibility"
    this.collected = false
    this.animationOffset = Math.random() * Math.PI * 2
  }

  update(deltaTime: number) {
    this.animationOffset += deltaTime * 0.005
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.collected) return

    const bounce = Math.sin(this.animationOffset) * 5

    // Shield power-up
    ctx.fillStyle = "#00BFFF"
    ctx.beginPath()
    ctx.arc(this.x, this.y + bounce, this.size / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "white"
    ctx.font = "16px Arial"
    ctx.textAlign = "center"
    ctx.fillText("🛡", this.x, this.y + bounce + 5)
  }

  getBounds() {
    return this.collected
      ? null
      : {
          x: this.x - this.size / 2,
          y: this.y - this.size / 2,
          width: this.size,
          height: this.size,
        }
  }
}

class Lane {
  y: number
  type: "safe" | "road" | "river"
  vehicles: Vehicle[]
  logs: Log[]
  powerUps: PowerUp[]
  spawnTimer: number
  spawnInterval: number
  direction: number
  speed: number

  constructor(y: number, type: "safe" | "road" | "river") {
    this.y = y
    this.type = type
    this.vehicles = []
    this.logs = []
    this.powerUps = []
    this.spawnTimer = 0
    this.spawnInterval = 2000 + Math.random() * 3000
    this.direction = Math.random() > 0.5 ? 1 : -1
    this.speed = 1 + Math.random() * 2
  }

  update(deltaTime: number, canvasWidth: number, difficulty: number) {
    this.spawnTimer += deltaTime

    const adjustedInterval = Math.max(800, this.spawnInterval - difficulty * 100)

    if (this.spawnTimer >= adjustedInterval) {
      this.spawn(canvasWidth, difficulty)
      this.spawnTimer = 0
    }

    // Update vehicles
    this.vehicles.forEach((vehicle) => vehicle.update())
    this.vehicles = this.vehicles.filter((vehicle) => {
      return vehicle.x > -200 && vehicle.x < canvasWidth + 200
    })

    // Update logs
    this.logs.forEach((log) => log.update())
    this.logs = this.logs.filter((log) => {
      return log.x > -200 && log.x < canvasWidth + 200
    })

    // Update power-ups
    this.powerUps.forEach((powerUp) => powerUp.update(deltaTime))
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.collected)
  }

  spawn(canvasWidth: number, difficulty: number) {
    const startX = this.direction > 0 ? -100 : canvasWidth + 100
    const adjustedSpeed = this.speed * (1 + difficulty * 0.2)

    if (this.type === "road") {
      const vehicleTypes: ("car" | "truck" | "bus")[] = ["car", "car", "truck", "bus"]
      const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
      this.vehicles.push(new Vehicle(startX, this.y, adjustedSpeed, this.direction, type))
    } else if (this.type === "river") {
      // Spawn log
      const logWidth = 80 + Math.random() * 60
      this.logs.push(new Log(startX, this.y, logWidth, adjustedSpeed * 0.5, this.direction))
    }

    // Occasionally spawn power-ups on safe lanes
    if (this.type === "safe" && Math.random() < 0.03) {
      this.powerUps.push(new PowerUp(canvasWidth / 2 + (Math.random() - 0.5) * 200, this.y))
    }
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number) {
    // Lane background
    if (this.type === "safe") {
      ctx.fillStyle = "#90EE90"
    } else if (this.type === "road") {
      ctx.fillStyle = "#333333"
    } else {
      ctx.fillStyle = "#4169E1"
    }
    ctx.fillRect(0, this.y - 20, canvasWidth, 40)

    // Lane markings for roads
    if (this.type === "road") {
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 2
      ctx.setLineDash([20, 20])
      ctx.beginPath()
      ctx.moveTo(0, this.y)
      ctx.lineTo(canvasWidth, this.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Water effect for rivers
    if (this.type === "river") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
      for (let i = 0; i < canvasWidth; i += 30) {
        const waveOffset = Math.sin(Date.now() * 0.003 + i * 0.01) * 3
        ctx.fillRect(i, this.y - 20 + waveOffset, 20, 2)
      }
    }

    // Render objects
    this.vehicles.forEach((vehicle) => vehicle.render(ctx))
    this.logs.forEach((log) => log.render(ctx))
    this.powerUps.forEach((powerUp) => powerUp.render(ctx))
  }
}

export default function CrossyRoad({ onBack, onScore }: CrossyRoadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef({
    player: new Player(400, 550, 40),
    lanes: [] as Lane[],
    camera: { y: 0 },
    score: 0,
    gameState: "menu" as "menu" | "gameOver",
    keys: {} as Record<string, boolean>,
    lastTime: 0,
    gridSize: 40,
    difficulty: 1,
    bonusPoints: 0,
    consecutiveLanes: 0,
    bestScore: 0,
  })

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const checkCollision = (rect1: CollisionRect | null, rect2: CollisionRect | null) => {
    if (!rect1 || !rect2) return false
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  const initializeLanes = () => {
    const game = gameStateRef.current
    game.lanes = []

    // Create initial lanes
    for (let i = 0; i < 20; i++) {
      const y = 600 - i * 40
      let type: "safe" | "road" | "river"

      if (i === 0) {
        type = "safe" // Starting lane
      } else if (i % 6 === 0) {
        type = "safe" // Safe lane every 6 lanes
      } else if (Math.random() < 0.5) {
        type = "road"
      } else {
        type = "river"
      }

      game.lanes.push(new Lane(y, type))
    }
  }

  const gameLoop = useCallback(
    (currentTime: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")!
      const game = gameStateRef.current

      if (game.gameState !== "playing" || isPaused) return

      const deltaTime = currentTime - game.lastTime
      game.lastTime = currentTime

      // Handle input
      if (game.keys["ArrowUp"] || game.keys["KeyW"]) {
        game.player.move("up", canvas.width)
        game.keys["ArrowUp"] = false
        game.keys["KeyW"] = false

        // Score for moving forward
        const newScore = Math.max(game.score, Math.floor((600 - game.player.y) / 40))
        if (newScore > game.score) {
          game.consecutiveLanes++
          game.score = newScore
          setScore(game.score)

          // Bonus points for consecutive lanes
          if (game.consecutiveLanes >= 5) {
            game.bonusPoints += 10
            game.consecutiveLanes = 0
          }
        }
      }
      if (game.keys["ArrowDown"] || game.keys["KeyS"]) {
        game.player.move("down", canvas.width)
        game.keys["ArrowDown"] = false
        game.keys["KeyS"] = false
        game.consecutiveLanes = 0
      }
      if (game.keys["ArrowLeft"] || game.keys["KeyA"]) {
        game.player.move("left", canvas.width)
        game.keys["ArrowLeft"] = false
        game.keys["KeyA"] = false
      }
      if (game.keys["ArrowRight"] || game.keys["KeyD"]) {
        game.player.move("right", canvas.width)
        game.keys["ArrowRight"] = false
        game.keys["KeyD"] = false
      }

      // Update player
      game.player.update(deltaTime)

      // Update difficulty
      game.difficulty = 1 + Math.floor(game.score / 10) * 0.3

      // Update camera to follow player
      const targetCameraY = game.player.y - canvas.height + 150
      game.camera.y += (targetCameraY - game.camera.y) * 0.1

      // Update lanes
      game.lanes.forEach((lane) => {
        lane.update(deltaTime, canvas.width, game.difficulty)
      })

      // Add new lanes at the top
      if (game.lanes.length > 0 && game.lanes[game.lanes.length - 1].y > game.camera.y - 100) {
        const newY = game.lanes[game.lanes.length - 1].y - 40
        let type: "safe" | "road" | "river"

        if (game.lanes.length % 6 === 0) {
          type = "safe"
        } else if (Math.random() < 0.5) {
          type = "road"
        } else {
          type = "river"
        }

        game.lanes.push(new Lane(newY, type))
      }

      // Remove old lanes
      game.lanes = game.lanes.filter((lane) => lane.y < game.camera.y + canvas.height + 100)

      // Check what lane player is on
      const playerLane = game.lanes.find((lane) => Math.abs(lane.y - game.player.y) < 20)

      if (playerLane) {
        game.player.isOnLog = false

        // Check collisions and interactions
        const playerBounds = game.player.getBounds()

        if (playerLane.type === "road" && !game.player.isInvincible) {
          // Check vehicle collisions
          for (const vehicle of playerLane.vehicles) {
            if (checkCollision(playerBounds, vehicle.getBounds())) {
              game.gameState = "gameOver"
              setGameState("gameOver")
              if (game.score > game.bestScore) {
                game.bestScore = game.score
              }
              onScore(game.score + game.bonusPoints)
              return
            }
          }
        } else if (playerLane.type === "river") {
          let onLog = false

          // Check log collisions
          for (const log of playerLane.logs) {
            if (checkCollision(playerBounds, log.getBounds())) {
              game.player.isOnLog = true
              game.player.logSpeed = log.speed * log.direction
              onLog = true
              break
            }
          }

          // Drown if not on log
          if (!onLog) {
            game.gameState = "gameOver"
            setGameState("gameOver")
            if (game.score > game.bestScore) {
              game.bestScore = game.score
            }
            onScore(game.score + game.bonusPoints)
            return
          }
        }

        // Check power-up collisions
        for (const powerUp of playerLane.powerUps) {
          const powerUpBounds = powerUp.getBounds()
          if (powerUpBounds && checkCollision(playerBounds, powerUpBounds)) {
            powerUp.collected = true
            game.bonusPoints += 50
            game.player.activateInvincibility(5000)
          }
        }
      }

      // Check if player fell off screen
      if (game.player.y > game.camera.y + canvas.height) {
        game.gameState = "gameOver"
        setGameState("gameOver")
        if (game.score > game.bestScore) {
          game.bestScore = game.score
        }
        onScore(game.score + game.bonusPoints)
        return
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Save context for camera
      ctx.save()
      ctx.translate(0, -game.camera.y)

      // Draw background
      const gradient = ctx.createLinearGradient(0, game.camera.y, 0, game.camera.y + canvas.height)
      gradient.addColorStop(0, "#87CEEB")
      gradient.addColorStop(1, "#98FB98")
      ctx.fillStyle = gradient
      ctx.fillRect(0, game.camera.y, canvas.width, canvas.height)

      // Draw lanes
      game.lanes.forEach((lane) => lane.render(ctx, canvas.width))

      // Draw player
      game.player.render(ctx)

      // Restore context
      ctx.restore()

      // Draw UI
      ctx.fillStyle = "white"
      ctx.font = "bold 24px Arial"
      ctx.strokeStyle = "black"
      ctx.lineWidth = 2

      ctx.strokeText(`Score: ${game.score + game.bonusPoints}`, 20, 40)
      ctx.fillText(`Score: ${game.score + game.bonusPoints}`, 20, 40)

      ctx.strokeText(`Difficulty: ${game.difficulty.toFixed(1)}x`, 20, 70)
      ctx.fillText(`Difficulty: ${game.difficulty.toFixed(1)}x`, 20, 70)

      // Power-up indicators
      if (game.player.isInvincible) {
        ctx.fillStyle = "#00BFFF"
        ctx.fillText(`🛡 ${Math.ceil(game.player.invincibilityTimer / 1000)}s`, canvas.width - 150, 40)
      }

      if (game.bonusPoints > 0) {
        ctx.fillStyle = "#FFD700"
        ctx.fillText(`Bonus: ${game.bonusPoints}`, canvas.width - 150, 70)
      }
    },
    [isPaused, onScore],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 800
    canvas.height = 600

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
    const handleKeyDown = (e: KeyboardEvent) => {
      gameStateRef.current.keys[e.code] = true
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keys[e.code] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const startGame = () => {
    const game = gameStateRef.current
    game.player = new Player(400, 550, 40)
    game.camera = { y: 0 }
    game.score = 0
    game.bonusPoints = 0
    game.consecutiveLanes = 0
    game.difficulty = 1
    game.gameState = "playing"
    setGameState("playing")
    setScore(0)
    setIsPaused(false)
    initializeLanes()
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-white flex items-center justify-center gap-3">
              <Car className="h-8 w-8 text-cyan-400" />
              Crossy Road
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mx-auto mt-2"></div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2">
            <div className="text-white text-lg font-bold">{score}</div>
            <div className="text-cyan-300 text-xs">Score</div>
          </div>
        </div>

        {/* Game Canvas */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardContent className="p-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-white/20 rounded-xl w-full shadow-2xl"
                style={{ aspectRatio: "4/3" }}
              />

              {/* Game State Overlays */}
              {gameState === "menu" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <div className="text-center text-white max-w-md">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <Car className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200">
                      Crossy Road
                    </h2>
                    <p className="text-lg mb-6 text-slate-300 leading-relaxed">
                      Cross busy roads and rivers! Avoid cars and hop on logs to survive.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div className="bg-white/10 rounded-lg p-3">
                        <Car className="h-5 w-5 text-red-400 mx-auto mb-1" />
                        <div>Avoid traffic on roads</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <Shield className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                        <div>Hop on logs in rivers</div>
                      </div>
                    </div>
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Crossing
                    </Button>
                  </div>
                </div>
              )}

              {gameState === "gameOver" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <div className="text-center text-white max-w-md">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <Zap className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-red-200">
                      Game Over!
                    </h2>
                    <div className="bg-white/10 rounded-xl p-6 mb-6">
                      <div className="text-3xl font-bold text-cyan-400 mb-2">{score}</div>
                      <div className="text-slate-300">Final Score</div>
                      {gameStateRef.current.bestScore > 0 && (
                        <div className="text-sm text-yellow-400 mt-2">Best: {gameStateRef.current.bestScore}</div>
                      )}
                    </div>
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Try Again
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
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 rounded-lg p-2">
                  <kbd className="bg-white/20 px-2 py-1 rounded text-xs">WASD</kbd>
                </div>
                <span>Move in all directions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 rounded-lg p-2">
                  <Car className="h-4 w-4 text-red-400" />
                </div>
                <span>Avoid cars on roads</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 rounded-lg p-2">
                  <div className="w-4 h-2 bg-amber-600 rounded"></div>
                </div>
                <span>Jump on logs in rivers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 rounded-lg p-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                </div>
                <span>Collect shields for protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
