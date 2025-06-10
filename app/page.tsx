"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import CrossyRoad from "./games/crossy-road"
import FlappyBird from "./games/flappy-bird"
import Match3Game from "./games/match-3"
import SpeedRunner from "./games/speed-runner"
import WhackTheMole from "./games/whack-the-mole"
import ReskinWizard from "@/components/reskin-wizard"

type GameType = "crossy-road" | "flappy-bird" | "match-3" | "speed-runner" | "whack-the-mole" | "reskin-wizard" | null

export default function Home() {
  const [currentGame, setCurrentGame] = useState<GameType>(null)
  const [highScores, setHighScores] = useState<Record<string, number>>({
    "crossy-road": 0,
    "flappy-bird": 0,
    "match-3": 0,
    "speed-runner": 0,
    "whack-the-mole": 0,
    "reskin-wizard": 0,
  })

  const handleScore = (game: string, score: number) => {
    setHighScores(prev => ({
      ...prev,
      [game]: Math.max(prev[game] || 0, score)
    }))
  }

  const handleBack = () => {
    setCurrentGame(null)
  }

  const games = [
    {
      id: "crossy-road" as const,
      title: "Crossy Road",
      description: "Help the character cross busy roads, rivers, and railways!",
      emoji: "🐸",
      color: "from-green-400 to-blue-500"
    },
    {
      id: "flappy-bird" as const,
      title: "Flappy Bird",
      description: "Navigate through pipes by tapping to keep the bird flying!",
      emoji: "🐦",
      color: "from-yellow-400 to-orange-500"
    },
    {
      id: "match-3" as const,
      title: "Match 3",
      description: "Match three or more gems to score points!",
      emoji: "💎",
      color: "from-purple-400 to-pink-500"
    },
    {
      id: "speed-runner" as const,
      title: "Speed Runner",
      description: "Run as far as you can while avoiding obstacles!",
      emoji: "🏃",
      color: "from-red-400 to-pink-500"
    },
    {
      id: "whack-the-mole" as const,
      title: "Whack the Mole",
      description: "Hit the moles as they pop up from their holes!",
      emoji: "🔨",
      color: "from-brown-400 to-yellow-500"
    },
    {
      id: "reskin-wizard" as const,
      title: "Reskin Wizard",
      description: "Create custom game assets with AI and export your own game!",
      emoji: "🎨",
      color: "from-blue-400 to-purple-500"
    }
  ]

  if (currentGame) {
    switch (currentGame) {
      case "crossy-road":
        return <CrossyRoad onBack={handleBack} onScore={(score) => handleScore("crossy-road", score)} />
      case "flappy-bird":
        return <FlappyBird onBack={handleBack} onScore={(score) => handleScore("flappy-bird", score)} />
      case "match-3":
        return <Match3Game onBack={handleBack} onScore={(score) => handleScore("match-3", score)} />
      case "speed-runner":
        return <SpeedRunner onBack={handleBack} onScore={(score) => handleScore("speed-runner", score)} />
      case "whack-the-mole":
        return <WhackTheMole onBack={handleBack} onScore={(score) => handleScore("whack-the-mole", score)} />
      case "reskin-wizard":
        return <ReskinWizard onBack={handleBack} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
            🎮 Game Arcade
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Welcome to the ultimate gaming experience! Choose your adventure and beat your high scores!
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {games.map((game) => (
            <Card 
              key={game.id}
              className="group hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900"
              onClick={() => setCurrentGame(game.id)}
            >
              <CardHeader className="relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="relative z-10 text-center">
                  <div className="text-4xl mb-2">{game.emoji}</div>
                  <CardTitle className="text-2xl text-white group-hover:text-yellow-300 transition-colors">
                    {game.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-gray-300 mb-4 text-center">{game.description}</p>
                <div className="text-center">
                  {game.id !== "reskin-wizard" && (
                    <>
                      <div className="text-sm text-gray-400 mb-2">High Score</div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {highScores[game.id]?.toLocaleString() || "0"}
                      </div>
                    </>
                  )}
                  {game.id === "reskin-wizard" && (
                    <div className="text-sm text-gray-400 mb-2">AI Game Creator</div>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <button className={`px-6 py-2 rounded-full bg-gradient-to-r ${game.color} text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200`}>
                    Play Now
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>Built with Next.js, TypeScript, and Tailwind CSS</p>
          <p className="mt-2">🎯 Challenge yourself and have fun!</p>
        </div>
      </div>
    </div>
  )
}
