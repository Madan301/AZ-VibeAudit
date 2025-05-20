"use client"

import { cn } from "@/lib/utils"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Search, Shield, AlertTriangle } from "lucide-react"

interface ResultsViewerProps {
  results: Array<{
    id: string
    name: string
    status: "pass" | "fail"
  }>
}

export function ResultsViewer({ results }: ResultsViewerProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredResults = results.filter((result) => result.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const passCount = results.filter((r) => r.status === "pass").length
  const failCount = results.filter((r) => r.status === "fail").length
  const passPercentage = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Analysis Results</h3>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {passCount} Passed
          </Badge>
          <Badge variant="outline" className="bg-destructive/10 text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {failCount} Failed
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1",
              passPercentage >= 70
                ? "bg-green-500/10 text-green-500"
                : passPercentage >= 40
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-destructive/10 text-destructive",
            )}
          >
            {passPercentage >= 70 ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : passPercentage >= 40 ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {passPercentage}% Compliance
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search controls..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">ID</TableHead>
              <TableHead>Control Name</TableHead>
              <TableHead className="text-right w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.length > 0 ? (
              filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.id}</TableCell>
                  <TableCell>{result.name}</TableCell>
                  <TableCell className="text-right">
                    {result.status === "pass" ? (
                      <Badge variant="outline" className="flex items-center gap-1 bg-green-500/10 text-green-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Pass
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 bg-destructive/10 text-destructive">
                        <XCircle className="h-3 w-3" />
                        Fail
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
