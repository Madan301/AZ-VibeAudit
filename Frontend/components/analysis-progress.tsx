"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, StopCircle } from "lucide-react"
import { useState } from "react"

interface AnalysisProgressProps {
  currentControl: {
    name: string
    status: "analyzing" | "pass" | "fail" | null
  }
  isAnalyzing: boolean
}

export function AnalysisProgress({ currentControl, isAnalyzing }: AnalysisProgressProps) {
  const [isStopping, setIsStopping] = useState(false)

  const handleStopAnalysis = async () => {
    try {
      setIsStopping(true)
      const response = await fetch('http://localhost:8000/api/stop-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to stop analysis')
      }
      
      const data = await response.json()
      console.log('Analysis stopped successfully:', data)
      
      // Force a status check after stopping
      setTimeout(async () => {
        try {
          const statusResponse = await fetch('http://localhost:8000/api/analysis-status')
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            console.log('Updated analysis status:', statusData)
          }
        } catch (error) {
          console.error('Error checking analysis status after stop:', error)
        }
      }, 1000)
    } catch (error) {
      console.error('Error stopping analysis:', error)
    } finally {
      setIsStopping(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Analysis Progress</h3>

      {isAnalyzing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {currentControl.name ? `Analyzing: ${currentControl.name}` : 'Analyzing security controls...'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopAnalysis}
                disabled={isStopping}
                className="flex items-center gap-1"
              >
                <StopCircle className="h-4 w-4" />
                {isStopping ? 'Stopping...' : 'Stop Analysis'}
              </Button>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
          <Progress value={45} className="h-2" />
        </div>
      )}

      {currentControl.name && (
        <div className="p-4 border rounded-lg bg-card/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Current Control</h4>
              <p className="text-sm text-muted-foreground">{currentControl.name}</p>
            </div>

            {currentControl.status === "analyzing" && (
              <Badge variant="outline" className="flex items-center gap-1 bg-primary/10 text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing
              </Badge>
            )}

            {currentControl.status === "pass" && (
              <Badge variant="outline" className="flex items-center gap-1 bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-3 w-3" />
                Pass
              </Badge>
            )}

            {currentControl.status === "fail" && (
              <Badge variant="outline" className="flex items-center gap-1 bg-destructive/10 text-destructive">
                <XCircle className="h-3 w-3" />
                Fail
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
