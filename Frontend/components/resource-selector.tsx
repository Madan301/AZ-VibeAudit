"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Server, Database, Cloud, Lock, HardDrive, Globe, Box } from "lucide-react"
import { Shield } from "lucide-react"

interface ResourceSelectorProps {
  resourceType: string
  resourceName: string
  onResourceTypeChange: (value: string) => void
  onResourceNameChange: (value: string) => void
}

export function ResourceSelector({
  resourceType,
  resourceName,
  onResourceTypeChange,
  onResourceNameChange,
}: ResourceSelectorProps) {
  // Function to get the appropriate icon based on resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "virtual-machine":
        return <Server className="h-4 w-4 mr-2" />
      case "app-service":
        return <Globe className="h-4 w-4 mr-2" />
      case "sql-database":
        return <Database className="h-4 w-4 mr-2" />
      case "storage-account":
        return <HardDrive className="h-4 w-4 mr-2" />
      case "key-vault":
        return <Lock className="h-4 w-4 mr-2" />
      case "kubernetes-service":
        return <Box className="h-4 w-4 mr-2" />
      case "container-registry":
        return <Box className="h-4 w-4 mr-2" />
      case "network-security-group":
        return <Shield className="h-4 w-4 mr-2" />
      default:
        return <Cloud className="h-4 w-4 mr-2" />
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="resource-type">Resource Type</Label>
        <Select value={resourceType} onValueChange={onResourceTypeChange}>
          <SelectTrigger id="resource-type">
            <SelectValue placeholder="Select resource type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="virtual-machine" className="flex items-center">
              <div className="flex items-center">
                <Server className="h-4 w-4 mr-2" />
                Virtual Machine
              </div>
            </SelectItem>
            <SelectItem value="app-service">
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                App Service
              </div>
            </SelectItem>
            <SelectItem value="sql-database">
              <div className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                SQL Database
              </div>
            </SelectItem>
            <SelectItem value="storage-account">
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 mr-2" />
                Storage Account
              </div>
            </SelectItem>
            <SelectItem value="key-vault">
              <div className="flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Key Vault
              </div>
            </SelectItem>
            <SelectItem value="kubernetes-service">
              <div className="flex items-center">
                <Box className="h-4 w-4 mr-2" />
                Kubernetes Service
              </div>
            </SelectItem>
            <SelectItem value="container-registry">
              <div className="flex items-center">
                <Box className="h-4 w-4 mr-2" />
                Container Registry
              </div>
            </SelectItem>
            <SelectItem value="network-security-group">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Network Security Group
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resource-name">Resource Name</Label>
        <div className="flex items-center">
          {resourceType && <div className="mr-2">{getResourceIcon(resourceType)}</div>}
          <Input
            id="resource-name"
            placeholder="Enter resource name"
            value={resourceName}
            onChange={(e) => onResourceNameChange(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  )
}
