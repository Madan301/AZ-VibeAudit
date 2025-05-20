"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileJson, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFileUpload: (file: File) => void
}

export function FileUploader({ onFileUpload }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const validateFile = (file: File): boolean => {
    if (!file.name.endsWith(".json")) {
      setError("Please upload a JSON file")
      return false
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError("File size exceeds 10MB limit")
      return false
    }

    return true
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        setFile(droppedFile)
        onFileUpload(droppedFile)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
        onFileUpload(selectedFile)
      }
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileJson className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Upload Azure Benchmark File</h3>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          file ? "bg-primary/5" : "",
        )}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

        {!file ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <FileJson className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Drag and drop your benchmark file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse (JSON files only)</p>
            </div>
            <Button onClick={handleButtonClick} variant="outline" className="mt-2">
              <Upload className="mr-2 h-4 w-4" />
              Select File
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <FileJson className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium truncate max-w-[250px]">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeFile} className="text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-destructive text-sm flex items-center gap-2">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}

      {file && (
        <div className="text-primary text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          Benchmark file uploaded successfully
        </div>
      )}
    </div>
  )
}
