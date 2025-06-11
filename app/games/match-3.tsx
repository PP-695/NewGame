"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play, Pause, Lightbulb } from "lucide-react"
import GameReskinPanel from "@/components/game-reskin-panel"

interface Match3Props {
  onBack: () => void
  onScore: (score: number) => void
}

type GemType = "red" | "blue" | "green" | "yellow" | "purple" | "orange" | "bomb" | "lineClear"

class Gem {
  x: number
  y: number
  gridX: number
  gridY: number
  type: GemType
  size: number
  targetX: number
  targetY: number
  isAnimating: boolean
  animationSpeed: number
  isMatched: boolean
  fallSpeed: number
  isSpecial: boolean
  animationProgress: number
  swapAnimationDuration: number

  constructor(gridX: number, gridY: number, type: GemType, size: number) {
    this.gridX = gridX
    this.gridY = gridY
    this.type = type
    this.size = size
    this.x = gridX * size
    this.y = gridY * size
    this.targetX = this.x
    this.targetY = this.y
    this.isAnimating = false
    this.animationSpeed = 8
    this.isMatched = false
    this.fallSpeed = 0
    this.isSpecial = type === "bomb" || type === "lineClear"
    this.animationProgress = 0
    this.swapAnimationDuration = 300 // milliseconds
  }

  update(deltaTime: number) {
    if (this.isAnimating) {
      this.animationProgress += deltaTime
      const progress = Math.min(1, this.animationProgress / this.swapAnimationDuration)

      // Use easing function for smoother animation
      const easedProgress = this.easeInOutCubic(progress)

      const startX = this.x - ((this.targetX - this.x) * easedProgress) / (1 - easedProgress || 0.001)
      const startY = this.y - ((this.targetY - this.y) * easedProgress) / (1 - easedProgress || 0.001)

      this.x = startX + (this.targetX - startX) * easedProgress
      this.y = startY + (this.targetY - startY) * easedProgress

      if (progress >= 1) {
        this.x = this.targetX
        this.y = this.targetY
        this.isAnimating = false
        this.animationProgress = 0
      }
    }
  }

  easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  setTarget(gridX: number, gridY: number) {
    this.gridX = gridX
    this.gridY = gridY
    this.targetX = gridX * this.size
    this.targetY = gridY * this.size
    this.isAnimating = true
    this.animationProgress = 0
  }

  render(ctx: CanvasRenderingContext2D) {
    const colors = {
      red: "#FF4444",
      blue: "#4444FF",
      green: "#44FF44",
      yellow: "#FFFF44",
      purple: "#FF44FF",
      orange: "#FF8844",
      bomb: "#2F2F2F",
      lineClear: "#FFFFFF",
    }

    ctx.fillStyle = colors[this.type]

    if (this.type === "bomb") {
      // Draw bomb with enhanced visuals
      ctx.beginPath()
      ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2 - 2, 0, Math.PI * 2)
      ctx.fill()

      // Bomb fuse with glow effect
      ctx.shadowColor = "#FF6B35"
      ctx.shadowBlur = 5
      ctx.strokeStyle = "#FF6B35"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(this.x + this.size / 2, this.y + 5)
      ctx.lineTo(this.x + this.size / 2 + 8, this.y - 5)
      ctx.stroke()
      ctx.shadowBlur = 0

      // Bomb symbol
      ctx.fillStyle = "white"
      ctx.font = "20px Arial"
      ctx.textAlign = "center"
      ctx.fillText("💣", this.x + this.size / 2, this.y + this.size / 2 + 7)
    } else if (this.type === "lineClear") {
      // Draw line clear gem with shimmer effect
      ctx.fillRect(this.x + 2, this.y + 2, this.size - 4, this.size - 4)

      // Animated shimmer effect
      const shimmerOffset = (Date.now() * 0.005) % 1
      const gradient = ctx.createLinearGradient(
        this.x + shimmerOffset * this.size,
        this.y,
        this.x + (shimmerOffset + 0.3) * this.size,
        this.y + this.size,
      )
      gradient.addColorStop(0, "rgba(255, 215, 0, 0)")
      gradient.addColorStop(0.5, "rgba(255, 215, 0, 0.8)")
      gradient.addColorStop(1, "rgba(255, 215, 0, 0)")

      ctx.fillStyle = gradient
      ctx.fillRect(this.x + 2, this.y + 2, this.size - 4, this.size - 4)

      // Line clear pattern
      ctx.strokeStyle = "#FFD700"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(this.x + 5, this.y + this.size / 2)
      ctx.lineTo(this.x + this.size - 5, this.y + this.size / 2)
      ctx.moveTo(this.x + this.size / 2, this.y + 5)
      ctx.lineTo(this.x + this.size / 2, this.y + this.size - 5)
      ctx.stroke()
    } else {
      // Regular gem with enhanced shine effect
      ctx.beginPath()
      ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2 - 2, 0, Math.PI * 2)
      ctx.fill()

      // Enhanced shine effect
      const shineGradient = ctx.createRadialGradient(
        this.x + this.size / 3,
        this.y + this.size / 3,
        0,
        this.x + this.size / 3,
        this.y + this.size / 3,
        this.size / 3,
      )
      shineGradient.addColorStop(0, "rgba(255, 255, 255, 0.6)")
      shineGradient.addColorStop(1, "rgba(255, 255, 255, 0)")

      ctx.fillStyle = shineGradient
      ctx.beginPath()
      ctx.arc(this.x + this.size / 3, this.y + this.size / 3, this.size / 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

class Match3AI {
  grid: (Gem | null)[][]
  gridWidth: number
  gridHeight: number
  hints: { x: number; y: number; direction: "horizontal" | "vertical" }[]

  constructor(grid: (Gem | null)[][], gridWidth: number, gridHeight: number) {
    this.grid = grid
    this.gridWidth = gridWidth
    this.gridHeight = gridHeight
    this.hints = []
  }

  findPossibleMoves(): { x: number; y: number; direction: "horizontal" | "vertical" }[] {
    const moves: { x: number; y: number; direction: "horizontal" | "vertical" }[] = []

    // Check horizontal swaps
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth - 1; x++) {
        if (this.grid[y][x] && this.grid[y][x + 1]) {
          // Simulate swap
          this.swapGems(x, y, x + 1, y)
          if (this.hasMatches()) {
            moves.push({ x, y, direction: "horizontal" })
          }
          // Swap back
          this.swapGems(x, y, x + 1, y)
        }
      }
    }

    // Check vertical swaps
    for (let y = 0; y < this.gridHeight - 1; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x] && this.grid[y + 1][x]) {
          // Simulate swap
          this.swapGems(x, y, x, y + 1)
          if (this.hasMatches()) {
            moves.push({ x, y, direction: "vertical" })
          }
          // Swap back
          this.swapGems(x, y, x, y + 1)
        }
      }
    }

    return moves
  }

  swapGems(x1: number, y1: number, x2: number, y2: number) {
    const temp = this.grid[y1][x1]
    this.grid[y1][x1] = this.grid[y2][x2]
    this.grid[y2][x2] = temp

    if (this.grid[y1][x1]) {
      this.grid[y1][x1]!.gridX = x1
      this.grid[y1][x1]!.gridY = y1
    }
    if (this.grid[y2][x2]) {
      this.grid[y2][x2]!.gridX = x2
      this.grid[y2][x2]!.gridY = y2
    }
  }

  hasMatches(): boolean {
    // Check horizontal matches
    for (let y = 0; y < this.gridHeight; y++) {
      let count = 1
      let currentType = this.grid[y][0]?.type

      for (let x = 1; x < this.gridWidth; x++) {
        if (this.grid[y][x]?.type === currentType && currentType && !this.grid[y][x]?.isSpecial) {
          count++
        } else {
          if (count >= 3) return true
          count = 1
          currentType = this.grid[y][x]?.type
        }
      }
      if (count >= 3) return true
    }

    // Check vertical matches
    for (let x = 0; x < this.gridWidth; x++) {
      let count = 1
      let currentType = this.grid[0][x]?.type

      for (let y = 1; y < this.gridHeight; y++) {
        if (this.grid[y][x]?.type === currentType && currentType && !this.grid[y][x]?.isSpecial) {
          count++
        } else {
          if (count >= 3) return true
          count = 1
          currentType = this.grid[y][x]?.type
        }
      }
      if (count >= 3) return true
    }

    return false
  }

  getHint(): { x: number; y: number; direction: "horizontal" | "vertical" } | null {
    const moves = this.findPossibleMoves()
    return moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null
  }
}

export default function Match3Game({ onBack, onScore }: Match3Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef({
    grid: [] as (Gem | null)[][],
    gridWidth: 8,
    gridHeight: 8,
    gemSize: 50,
    selectedGem: null as { x: number; y: number } | null,
    score: 0,
    moves: 30,
    targetScore: 1000,
    level: 1,
    gameState: "menu" as "menu" | "playing" | "gameOver" | "levelComplete",
    ai: null as Match3AI | null,
    hintGem: null as { x: number; y: number; direction: "horizontal" | "vertical" } | null,
    hintTimer: 0,
    cascadeMultiplier: 1,
    specialGemChance: 0.1,
    lastTime: 0,
    scoreHistory: [] as number[],
    levelProgress: 0,
  })

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver" | "levelComplete">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [moves, setMoves] = useState(30)
  const [targetScore, setTargetScore] = useState(1000)
  const [isPaused, setIsPaused] = useState(false)
  const [customAssets, setCustomAssets] = useState<Record<string, string>>({})

  // TODO: implement asset rendering
  void customAssets

  // Reskin panel configuration
  const assetSlots = [
    {
      id: "background",
      name: "Background",
      defaultPrompt: "magical gem matching game background with sparkles and mystical atmosphere",
      dimensions: { width: 800, height: 600 }
    },
    {
      id: "red_gem",
      name: "Red Gem",
      defaultPrompt: "beautiful red ruby gem crystal for match-3 game, sparkling and faceted",
      dimensions: { width: 48, height: 48 }
    },
    {
      id: "blue_gem",
      name: "Blue Gem",
      defaultPrompt: "brilliant blue sapphire gem crystal for match-3 game, sparkling and faceted",
      dimensions: { width: 48, height: 48 }
    },
    {
      id: "green_gem",
      name: "Green Gem",
      defaultPrompt: "vibrant green emerald gem crystal for match-3 game, sparkling and faceted",
      dimensions: { width: 48, height: 48 }
    }
  ]

  const gameParams = [
    {
      id: "gridSize",
      name: "Grid Size",
      type: 'slider' as const,
      min: 6,
      max: 10,
      step: 1,
      defaultValue: 8,
      value: 8
    },
    {
      id: "movesPerLevel",
      name: "Moves Per Level",
      type: 'slider' as const,
      min: 20,
      max: 50,
      step: 5,
      defaultValue: 30,
      value: 30
    },
    {
      id: "specialGemChance",
      name: "Special Gem Chance (%)",
      type: 'slider' as const,
      min: 5,
      max: 30,
      step: 5,
      defaultValue: 10,
      value: 10
    },
    {
      id: "targetScore",
      name: "Target Score",
      type: 'slider' as const,
      min: 500,
      max: 2000,
      step: 250,
      defaultValue: 1000,
      value: 1000
    }
  ]

  const createRandomGem = (x: number, y: number): Gem => {
    const game = gameStateRef.current
    let type: GemType

    // Chance to create special gems
    if (Math.random() < game.specialGemChance) {
      const specialTypes: GemType[] = ["bomb", "lineClear"]
      type = specialTypes[Math.floor(Math.random() * specialTypes.length)]
    } else {
      const normalTypes: GemType[] = ["red", "blue", "green", "yellow", "purple", "orange"]
      type = normalTypes[Math.floor(Math.random() * normalTypes.length)]
    }

    return new Gem(x, y, type, game.gemSize)
  }

  const initializeGrid = () => {
    const game = gameStateRef.current
    game.grid = []

    for (let y = 0; y < game.gridHeight; y++) {
      game.grid[y] = []
      for (let x = 0; x < game.gridWidth; x++) {
        game.grid[y][x] = createRandomGem(x, y)
      }
    }

    // Ensure no initial matches
    let hasInitialMatches = true
    let attempts = 0
    while (hasInitialMatches && attempts < 100) {
      hasInitialMatches = false
      for (let y = 0; y < game.gridHeight; y++) {
        for (let x = 0; x < game.gridWidth; x++) {
          if (checkMatchAt(x, y)) {
            game.grid[y][x] = createRandomGem(x, y)
            hasInitialMatches = true
          }
        }
      }
      attempts++
    }

    game.ai = new Match3AI(game.grid, game.gridWidth, game.gridHeight)
  }

  const checkMatchAt = (x: number, y: number): boolean => {
    const game = gameStateRef.current
    const gem = game.grid[y][x]
    if (!gem || gem.isSpecial) return false

    // Check horizontal
    let horizontalCount = 1
    // Check left
    for (let i = x - 1; i >= 0; i--) {
      const leftGem = game.grid[y][i]
      if (leftGem?.type === gem.type && !leftGem.isSpecial) {
        horizontalCount++
      } else {
        break
      }
    }
    // Check right
    for (let i = x + 1; i < game.gridWidth; i++) {
      const rightGem = game.grid[y][i]
      if (rightGem?.type === gem.type && !rightGem.isSpecial) {
        horizontalCount++
      } else {
        break
      }
    }

    // Check vertical
    let verticalCount = 1
    // Check up
    for (let i = y - 1; i >= 0; i--) {
      const upGem = game.grid[i][x]
      if (upGem?.type === gem.type && !upGem.isSpecial) {
        verticalCount++
      } else {
        break
      }
    }
    // Check down
    for (let i = y + 1; i < game.gridHeight; i++) {
      const downGem = game.grid[i][x]
      if (downGem?.type === gem.type && !downGem.isSpecial) {
        verticalCount++
      } else {
        break
      }
    }

    return horizontalCount >= 3 || verticalCount >= 3
  }

  const handleSpecialGem = (gem: Gem): { x: number; y: number }[] => {
    const game = gameStateRef.current
    const toRemove: { x: number; y: number }[] = []

    if (gem.type === "bomb") {
      // Remove 3x3 area around bomb
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const newX = gem.gridX + dx
          const newY = gem.gridY + dy
          if (newX >= 0 && newX < game.gridWidth && newY >= 0 && newY < game.gridHeight) {
            toRemove.push({ x: newX, y: newY })
          }
        }
      }
    } else if (gem.type === "lineClear") {
      // Remove entire row and column
      for (let x = 0; x < game.gridWidth; x++) {
        toRemove.push({ x, y: gem.gridY })
      }
      for (let y = 0; y < game.gridHeight; y++) {
        toRemove.push({ x: gem.gridX, y })
      }
    }

    return toRemove
  }

  const findAndRemoveMatches = (): number => {
    const game = gameStateRef.current
    const toRemove: { x: number; y: number }[] = []

    // Find regular matches
    for (let y = 0; y < game.gridHeight; y++) {
      for (let x = 0; x < game.gridWidth; x++) {
        if (checkMatchAt(x, y)) {
          toRemove.push({ x, y })
        }
      }
    }

    // Handle special gems
    const specialGems = toRemove.filter((pos) => {
      const gem = game.grid[pos.y][pos.x]
      return gem && gem.isSpecial
    })

    specialGems.forEach((pos) => {
      const gem = game.grid[pos.y][pos.x]
      if (gem) {
        const specialRemoves = handleSpecialGem(gem)
        toRemove.push(...specialRemoves)
      }
    })

    // Remove duplicates
    const uniqueRemoves = toRemove.filter(
      (pos, index, self) => index === self.findIndex((p) => p.x === pos.x && p.y === pos.y),
    )

    // Remove matched gems
    uniqueRemoves.forEach(({ x, y }) => {
      game.grid[y][x] = null
    })

    return uniqueRemoves.length
  }

  const applyGravity = () => {
    const game = gameStateRef.current

    for (let x = 0; x < game.gridWidth; x++) {
      // Collect non-null gems
      const gems: Gem[] = []
      for (let y = game.gridHeight - 1; y >= 0; y--) {
        if (game.grid[y][x]) {
          gems.push(game.grid[y][x]!)
        }
      }

      // Clear column
      for (let y = 0; y < game.gridHeight; y++) {
        game.grid[y][x] = null
      }

      // Place gems at bottom
      for (let i = 0; i < gems.length; i++) {
        const y = game.gridHeight - 1 - i
        game.grid[y][x] = gems[i]
        gems[i].setTarget(x, y)
      }

      // Fill empty spaces with new gems
      for (let y = 0; y < game.gridHeight - gems.length; y++) {
        game.grid[y][x] = createRandomGem(x, y)
        game.grid[y][x]!.setTarget(x, y)
      }
    }
  }

  const updateScore = (points: number, cascadeLevel = 1) => {
    const game = gameStateRef.current
    const basePoints = points * 10
    const cascadeBonus = cascadeLevel > 1 ? Math.floor(basePoints * (cascadeLevel - 1) * 0.5) : 0
    const totalPoints = basePoints + cascadeBonus

    game.score += totalPoints
    game.scoreHistory.push(totalPoints)

    // Update level based on score thresholds
    const newLevel = Math.floor(game.score / 1000) + 1
    if (newLevel > game.level) {
      game.level = newLevel
      game.targetScore = newLevel * 1000
      game.moves += 10 // Bonus moves for new level
      game.specialGemChance = Math.min(0.3, 0.1 + newLevel * 0.02)
      setLevel(newLevel)
      setTargetScore(game.targetScore)
    }

    // Update level progress
    game.levelProgress = (game.score % 1000) / 1000

    setScore(game.score)
    setMoves(game.moves)
  }

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null)

  const swapGems = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const game = gameStateRef.current

    // Perform swap
    const temp = game.grid[y1][x1]
    game.grid[y1][x1] = game.grid[y2][x2]
    game.grid[y2][x2] = temp

    if (game.grid[y1][x1]) {
      game.grid[y1][x1]!.setTarget(x1, y1)
    }
    if (game.grid[y2][x2]) {
      game.grid[y2][x2]!.setTarget(x2, y2)
    }

    // Check for matches after animation completes
    setTimeout(() => {
      const matchesFound = findAndRemoveMatches()
      if (matchesFound > 0) {
        // Decrease moves only if match was made
        game.moves--
        setMoves(game.moves)

        game.cascadeMultiplier = 1
        updateScore(matchesFound, game.cascadeMultiplier)

        setTimeout(() => {
          applyGravity()

          // Check for cascade matches
          setTimeout(() => {
            let cascadeMatches = findAndRemoveMatches()
            while (cascadeMatches > 0) {
              game.cascadeMultiplier++
              updateScore(cascadeMatches, game.cascadeMultiplier)
              applyGravity()
              cascadeMatches = findAndRemoveMatches()
            }

            // Check win/lose conditions
            if (game.moves <= 0) {
              if (game.score >= game.targetScore) {
                game.gameState = "levelComplete"
                setGameState("levelComplete")
              } else {
                game.gameState = "gameOver"
                setGameState("gameOver")
                onScore(game.score)
              }
            }
          }, 300)
        }, 200)
      } else {
        // No matches, swap back
        const temp = game.grid[y1][x1]
        game.grid[y1][x1] = game.grid[y2][x2]
        game.grid[y2][x2] = temp

        if (game.grid[y1][x1]) {
          game.grid[y1][x1]!.setTarget(x1, y1)
        }
        if (game.grid[y2][x2]) {
          game.grid[y2][x2]!.setTarget(x2, y2)
        }
      }
    }, 350) // Wait for swap animation to complete
  }, [findAndRemoveMatches, applyGravity, updateScore, setMoves, setGameState, onScore])

  const handleMouseDown = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas || gameStateRef.current.gameState !== "playing") return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const mouseX = (event.clientX - rect.left) * scaleX
    const mouseY = (event.clientY - rect.top) * scaleY

    const game = gameStateRef.current
    const gridX = Math.floor(mouseX / game.gemSize)
    const gridY = Math.floor(mouseY / game.gemSize)

    if (gridX >= 0 && gridX < game.gridWidth && gridY >= 0 && gridY < game.gridHeight) {
      setIsDragging(true)
      setDragStart({ x: gridX, y: gridY })
      setDragEnd({ x: gridX, y: gridY })
      game.selectedGem = { x: gridX, y: gridY }
      game.hintGem = null // Clear hint when user interacts
    }
  }, [])

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !dragStart) return

      const canvas = canvasRef.current
      if (!canvas || gameStateRef.current.gameState !== "playing") return

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const mouseX = (event.clientX - rect.left) * scaleX
      const mouseY = (event.clientY - rect.top) * scaleY

      const game = gameStateRef.current
      const gridX = Math.floor(mouseX / game.gemSize)
      const gridY = Math.floor(mouseY / game.gemSize)

      if (gridX >= 0 && gridX < game.gridWidth && gridY >= 0 && gridY < game.gridHeight) {
        setDragEnd({ x: gridX, y: gridY })

        // Only allow adjacent cells
        const dx = Math.abs(gridX - dragStart.x)
        const dy = Math.abs(gridY - dragStart.y)

        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
          game.selectedGem = { x: gridX, y: gridY }
        } else if (dx === 0 && dy === 0) {
          game.selectedGem = { x: dragStart.x, y: dragStart.y }
        }
      }
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
      gameStateRef.current.selectedGem = null
      return
    }

    const dx = Math.abs(dragEnd.x - dragStart.x)
    const dy = Math.abs(dragEnd.y - dragStart.y)

    // Check if it's a valid adjacent swap
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      swapGems(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y)
    }

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    gameStateRef.current.selectedGem = null
  }, [isDragging, dragStart, dragEnd, swapGems])

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      event.preventDefault()
      const touch = event.touches[0]
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      handleMouseDown(mouseEvent)
    },
    [handleMouseDown],
  )

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      event.preventDefault()
      const touch = event.touches[0]
      const mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      handleMouseMove(mouseEvent)
    },
    [handleMouseMove],
  )

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      event.preventDefault()
      handleMouseUp()
    },
    [handleMouseUp],
  )

  const nextLevel = () => {
    const game = gameStateRef.current
    game.level++
    game.moves = 30 + game.level * 5 // More moves for higher levels
    game.targetScore = game.level * 1000 // Higher target score
    game.specialGemChance = Math.min(0.3, 0.1 + game.level * 0.02) // More special gems
    game.gameState = "playing"
    setGameState("playing")
    setLevel(game.level)
    setMoves(game.moves)
    setTargetScore(game.targetScore)
    initializeGrid()
  }

  const showHint = () => {
    const game = gameStateRef.current
    if (game.ai) {
      game.hintGem = game.ai.getHint()
      game.hintTimer = 3000 // Show hint for 3 seconds
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

      // Update hint timer
      if (game.hintTimer > 0) {
        game.hintTimer -= deltaTime
        if (game.hintTimer <= 0) {
          game.hintGem = null
        }
      }

      // Update gems with delta time for smooth animations
      for (let y = 0; y < game.gridHeight; y++) {
        for (let x = 0; x < game.gridWidth; x++) {
          if (game.grid[y][x]) {
            game.grid[y][x]!.update(deltaTime)
          }
        }
      }

      // Render game board
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "#2C1810")
      gradient.addColorStop(1, "#1A0F08")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.lineWidth = 1
      for (let x = 0; x <= game.gridWidth; x++) {
        ctx.beginPath()
        ctx.moveTo(x * game.gemSize, 0)
        ctx.lineTo(x * game.gemSize, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= game.gridHeight; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * game.gemSize)
        ctx.lineTo(canvas.width, y * game.gemSize)
        ctx.stroke()
      }

      // Draw gems
      for (let y = 0; y < game.gridHeight; y++) {
        for (let x = 0; x < game.gridWidth; x++) {
          if (game.grid[y][x]) {
            game.grid[y][x]!.render(ctx)
          }
        }
      }

      // Draw selection highlight and drag preview
      if (game.selectedGem) {
        ctx.strokeStyle = "#FFD700"
        ctx.lineWidth = 3
        ctx.strokeRect(
          game.selectedGem.x * game.gemSize + 2,
          game.selectedGem.y * game.gemSize + 2,
          game.gemSize - 4,
          game.gemSize - 4,
        )
      }

      // Draw drag line if dragging
      if (isDragging && dragStart && dragEnd && (dragStart.x !== dragEnd.x || dragStart.y !== dragEnd.y)) {
        const dx = Math.abs(dragEnd.x - dragStart.x)
        const dy = Math.abs(dragEnd.y - dragStart.y)

        // Only show line for valid adjacent moves
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
          ctx.strokeStyle = "#00FF00"
          ctx.lineWidth = 4
          ctx.setLineDash([])

          const startX = dragStart.x * game.gemSize + game.gemSize / 2
          const startY = dragStart.y * game.gemSize + game.gemSize / 2
          const endX = dragEnd.x * game.gemSize + game.gemSize / 2
          const endY = dragEnd.y * game.gemSize + game.gemSize / 2

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
          ctx.stroke()

          // Draw arrow head
          const angle = Math.atan2(endY - startY, endX - startX)
          const arrowLength = 15

          ctx.beginPath()
          ctx.moveTo(endX, endY)
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6),
          )
          ctx.moveTo(endX, endY)
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6),
          )
          ctx.stroke()
        } else if (dx > 1 || dy > 1) {
          // Show invalid move indicator
          ctx.strokeStyle = "#FF0000"
          ctx.lineWidth = 3
          ctx.setLineDash([5, 5])
          ctx.strokeRect(
            dragStart.x * game.gemSize + 2,
            dragStart.y * game.gemSize + 2,
            game.gemSize - 4,
            game.gemSize - 4,
          )
          ctx.setLineDash([])
        }
      }
    },
    [isPaused, isDragging, dragStart, dragEnd],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = gameStateRef.current.gridWidth * gameStateRef.current.gemSize
    canvas.height = gameStateRef.current.gridHeight * gameStateRef.current.gemSize

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

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseleave", handleMouseUp) // Handle mouse leaving canvas

    // Touch events for mobile
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mouseleave", handleMouseUp)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd])

  const startGame = () => {
    initializeGrid()
    const game = gameStateRef.current
    game.score = 0
    game.moves = 30
    game.targetScore = 1000
    game.level = 1
    game.gameState = "playing"
    game.selectedGem = null
    game.hintGem = null
    game.cascadeMultiplier = 1
    game.specialGemChance = 0.1
    game.scoreHistory = []
    game.levelProgress = 0
    setGameState("playing")
    setScore(0)
    setLevel(1)
    setMoves(30)
    setTargetScore(1000)
    setIsPaused(false)
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 p-2 sm:p-4 lg:p-6">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">Match-3 Puzzle</h1>
          <div className="text-white text-lg sm:text-xl">Level {level}</div>
        </div>

        {/* Game Preview at Top */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Game Board */}
          <Card className="bg-black/20 border-white/20 flex-shrink-0">
            <CardContent className="p-4">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="border border-white/20 rounded-lg cursor-pointer"
                  style={{ width: "400px", height: "400px" }}
                />

                {/* Game State Overlays */}
                {gameState === "menu" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <h2 className="text-4xl font-bold mb-4">Match-3 Puzzle</h2>
                      <p className="text-lg mb-6">
                        Match 3 or more gems to score points! AI provides hints when needed.
                      </p>
                      <p className="text-sm mb-6 text-white/70">
                        Click gems to select • Click adjacent gem to swap • Chain matches for bonus points
                      </p>
                      <Button onClick={startGame} size="lg" className="bg-purple-600 hover:bg-purple-700">
                        <Play className="h-5 w-5 mr-2" />
                        Start Game
                      </Button>
                    </div>
                  </div>
                )}

                {gameState === "playing" && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      onClick={showHint}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white"
                    >
                      <Lightbulb className="h-4 w-4" />
                    </Button>
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
                      <Button onClick={togglePause} size="lg" className="bg-purple-600 hover:bg-purple-700">
                        <Play className="h-5 w-5 mr-2" />
                        Resume
                      </Button>
                    </div>
                  </div>
                )}

                {gameState === "levelComplete" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <h2 className="text-4xl font-bold mb-4">Level Complete!</h2>
                      <p className="text-xl mb-6">
                        Score: {score} / {targetScore}
                      </p>
                      <Button onClick={nextLevel} size="lg" className="bg-purple-600 hover:bg-purple-700 mr-4">
                        Next Level
                      </Button>
                      <Button
                        onClick={startGame}
                        size="lg"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white"
                      >
                        Restart
                      </Button>
                    </div>
                  </div>
                )}

                {gameState === "gameOver" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
                      <p className="text-xl mb-6">Final Score: {score}</p>
                      <Button onClick={startGame} size="lg" className="bg-purple-600 hover:bg-purple-700">
                        <Play className="h-5 w-5 mr-2" />
                        Play Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side Panel with Score and Level Info */}
          <div className="flex-1 space-y-4">
            {/* Score Display */}
            <Card className="bg-black/20 border-white/20">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-4">Score</h3>
                <div className="text-4xl font-bold text-yellow-400 mb-2">{score.toLocaleString()}</div>
                <div className="text-sm text-white/70">
                  {gameStateRef.current.cascadeMultiplier > 1 && (
                    <span className="text-orange-400">Cascade x{gameStateRef.current.cascadeMultiplier}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Level Display */}
            <Card className="bg-black/20 border-white/20">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-4">Level {level}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-white">
                    <span>Target:</span>
                    <span className="font-bold">{targetScore.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-white/70">
                    {Math.max(0, targetScore - score).toLocaleString()} points to next level
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moves Display */}
            <Card className="bg-black/20 border-white/20">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-4">Moves</h3>
                <div className="text-3xl font-bold text-blue-400">{moves}</div>
                <div className="text-sm text-white/70 mt-2">
                  {moves <= 5 && moves > 0 && <span className="text-red-400">Running low!</span>}
                  {moves === 0 && <span className="text-red-500">No moves left!</span>}
                </div>
              </CardContent>
            </Card>

            {/* Game Stats */}
            <Card className="bg-black/20 border-white/20">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Game Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/70">
                    <span>Special Gem Chance:</span>
                    <span>{Math.round(gameStateRef.current.specialGemChance * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Best Cascade:</span>
                    <span>x{Math.max(...gameStateRef.current.scoreHistory.map((_, i) => i + 1), 1)}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Total Matches:</span>
                    <span>{gameStateRef.current.scoreHistory.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-black/20 border-white/20 mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-3">How to Play</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-white/70">
              <div>💎 Click and drag gems to swap</div>
              <div>🔄 Drag to adjacent gem to make moves</div>
              <div>💡 Use hint button for AI suggestions</div>
              <div>⚡ Chain matches for bonus points</div>
              <div>💣 Special gems have unique effects</div>
              <div>📱 Touch and drag on mobile devices</div>
            </div>
          </CardContent>
        </Card>

        {/* AI Reskin Features Below */}
        <GameReskinPanel
          gameId="match-3"
          gameName="Match-3 Puzzle"
          assetSlots={assetSlots}
          gameParams={gameParams}
          isOpen={true}
          onClose={() => {}}
          onAssetsChanged={(assets) => setCustomAssets(assets)}
          mode="inline"
          theme="match-3"
        />
      </div>
    </div>
  )
}
