"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Palette, Sparkles } from "lucide-react"
import GameReskinPanel from "./game-reskin-panel"

interface ReskinTriggerProps {
  gameId: string
  gameName: string
  assetSlots: any[]
  gameParams: any[]
  theme: string
  onAssetsChanged?: (assets: Record<string, string>) => void
}

export default function ReskinTrigger({
  gameId,
  gameName,
  assetSlots,
  gameParams,
  theme,
  onAssetsChanged
}: ReskinTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case 'flappy-bird': return 'from-red-500 to-pink-500'
      case 'crossy-road': return 'from-cyan-500 to-blue-500'
      case 'match-3': return 'from-purple-500 to-pink-500'
      case 'speed-runner': return 'from-orange-500 to-yellow-500'
      case 'whack-the-mole': return 'from-green-500 to-blue-500'
      default: return 'from-purple-500 to-pink-500'
    }
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-30 bg-gradient-to-r ${getThemeColor(theme)} hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl rounded-full p-4 h-auto`}
        size="lg"
      >
        <div className="flex flex-col items-center gap-1">
          <Palette className="h-6 w-6" />
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-medium">Reskin</span>
        </div>
      </Button>

      {/* Floating Panel */}
      {isOpen && (
        <GameReskinPanel
          gameId={gameId}
          gameName={gameName}
          assetSlots={assetSlots}
          gameParams={gameParams}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAssetsChanged={onAssetsChanged}
          mode="floating"
          theme={theme as any}
        />
      )}
    </>
  )
}
