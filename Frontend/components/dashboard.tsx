"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { FileUploader } from "@/components/file-uploader"
import { ResourceSelector } from "@/components/resource-selector"
import { AnalysisProgress } from "@/components/analysis-progress"
import { ResultsViewer } from "@/components/results-viewer"
import { ManualControls } from "@/components/manual-controls"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { ExternalLink, Download, Shield, FileJson, Server, Cloud, CheckCircle2, AlertTriangle } from "lucide-react"
import { launchBrowser as launchBrowserAPI, startAnalysis as startAnalysisAPI, getAnalysisStatus as getAnalysisStatusAPI } from "@/lib/api"
import Image from "next/image"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("benchmark")
  const [benchmarkFile, setBenchmarkFile] = useState<File | null>(null)
  const [benchmarkFileContent, setBenchmarkFileContent] = useState<string>("")
  const [resourceType, setResourceType] = useState("")
  const [resourceName, setResourceName] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [browserLaunched, setBrowserLaunched] = useState(false)
  const [currentControl, setCurrentControl] = useState<{ name: string; status: "analyzing" | "pass" | "fail" | null }>({
    name: "",
    status: null,
  })
  const [results, setResults] = useState<Array<{ id: string; name: string; status: "pass" | "fail" }>>([])
  const [manualControls, setManualControls] = useState<Array<{ id: string; name: string; selected: boolean }>>([
    { id: "1", name: "Ensure that Azure Defender is set to On for Servers", selected: false },
    { id: "2", name: "Ensure that Azure Defender is set to On for App Service", selected: false },
    { id: "3", name: "Ensure that Azure Defender is set to On for SQL servers", selected: false },
    { id: "4", name: "Ensure that Azure Defender is set to On for SQL databases", selected: false },
    { id: "5", name: "Ensure that Azure Defender is set to On for Storage", selected: false },
    { id: "6", name: "Ensure that Azure Defender is set to On for Kubernetes", selected: false },
    { id: "7", name: "Ensure that Azure Defender is set to On for Container Registries", selected: false },
    { id: "8", name: "Ensure that Azure Defender is set to On for Key Vault", selected: false },
  ])
  const [isLaunchingBrowser, setIsLaunchingBrowser] = useState(false)

  useEffect(() => {
    let statusInterval: NodeJS.Timeout;

    if (isAnalyzing) {
      statusInterval = setInterval(async () => {
        try {
          const status = await getAnalysisStatusAPI();
          if (status.is_analyzing) {
            setCurrentControl({
              name: status.current_control || "",
              status: "analyzing",
            });
            if (status.results && status.results.length > 0) {
              setResults(status.results.map((r: any) => ({
                id: r.control_id,
                name: r.description,
                status: r.passed ? "pass" : "fail"
              })));
            }
          } else {
            setIsAnalyzing(false);
            setCurrentControl({ name: "", status: null });
            clearInterval(statusInterval);
          }
        } catch (error) {
          console.error("Error polling analysis status:", error);
          setIsAnalyzing(false);
          setCurrentControl({ name: "", status: null });
          clearInterval(statusInterval);
        }
      }, 1000);
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [isAnalyzing]);

  const handleFileUpload = async (file: File) => {
    try {
      const content = await file.text();
      setBenchmarkFile(file);
      setBenchmarkFileContent(content);
    } catch (error) {
      console.error("Error reading file:", error);
    }
  }

  const launchBrowser = async () => {
    try {
      setIsLaunchingBrowser(true)
      const result = await launchBrowserAPI()
      if (result.status === "success") {
        setBrowserLaunched(true)
      } else {
        console.error("Failed to launch browser:", result.message)
      }
    } catch (error) {
      console.error("Error launching browser:", error)
    } finally {
      setIsLaunchingBrowser(false)
    }
  }

  const confirmLogin = () => {
    setIsLoggedIn(true)
  }

  const startAnalysis = async () => {
    if (!benchmarkFileContent || !resourceName) {
      console.error("Missing required fields");
      return;
    }

    try {
      setIsAnalyzing(true);
      const result = await startAnalysisAPI(benchmarkFileContent, resourceName);
      if (result.status !== "success") {
        console.error("Failed to start analysis:", result.message);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error("Error starting analysis:", error);
      setIsAnalyzing(false);
    }
  };

  const downloadResults = () => {
    const resultsData = {
      resourceType,
      resourceName,
      analysisDate: new Date().toISOString(),
      results,
    }

    const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `azure-security-analysis-${resourceName}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleManualControl = (id: string, name?: string) => {
    setManualControls((prev) => {
      // Check if the control already exists
      const existingControl = prev.find(control => control.id === id);
      if (existingControl) {
        // Toggle the selected state of the existing control
        return prev.map((control) => 
          control.id === id ? { ...control, selected: !control.selected } : control
        );
      } else {
        // Add the new control
        return [...prev, { id, name: name || id, selected: true }];
      }
    });
  }

  const mockBenchmarkControls = [
    { id: "b1", name: "Ensure that multi-factor authentication is enabled for all privileged users" },
    { id: "b2", name: "Ensure that there are no guest users" },
    { id: "b3", name: "Ensure that 'Allow access to Azure services' for PostgreSQL Database Server is disabled" },
    { id: "b4", name: "Ensure that Azure Active Directory Admin is configured for SQL servers" },
    { id: "b5", name: "Ensure that 'Auditing' is set to 'On' for SQL servers" },
    { id: "b6", name: "Ensure that Network Security Group Flow Log retention period is greater than 90 days" },
    { id: "b7", name: "Ensure that VMs are utilizing managed disks" },
    { id: "b8", name: "Ensure that 'OS and Data' disks are encrypted with Customer Managed Key" },
    { id: "b9", name: "Ensure that 'HTTP Version' is the latest for App Services" },
    { id: "b10", name: "Ensure that 'TLS Version' is the latest for App Services" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/90 p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Image src="/Icons/icons8-azure-48.png" alt="Azure Logo" width={40} height={40} className="h-10 w-10 object-contain" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              VibeAudit Azure Security Benchmark
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="benchmark" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Benchmark File
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Manual Controls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="benchmark" className="space-y-6">
            <Card className="border border-primary/20">
              <CardContent className="pt-6">
                <FileUploader onFileUpload={handleFileUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <Card className="border border-primary/20">
              <CardContent className="pt-6">
                <ManualControls controls={manualControls} onToggleControl={toggleManualControl} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 space-y-6">
          <Card className="border border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Server className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Resource Configuration</h3>
              </div>
              <ResourceSelector
                resourceType={resourceType}
                resourceName={resourceName}
                onResourceTypeChange={setResourceType}
                onResourceNameChange={setResourceName}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-primary/20">
              <CardContent className="pt-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Azure Portal Access</h3>
                </div>
                <Button 
                  onClick={launchBrowser} 
                  className="w-full" 
                  disabled={browserLaunched && isLoggedIn || isLaunchingBrowser}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {isLaunchingBrowser ? "Launching..." : "Launch Azure Portal"}
                </Button>
                <Button
                  onClick={confirmLogin}
                  variant={isLoggedIn ? "outline" : "default"}
                  className="w-full"
                  disabled={!browserLaunched || isLoggedIn}
                >
                  {isLoggedIn ? "Logged In ✓" : "Confirm Login"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary/20">
              <CardContent className="pt-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Control Analysis</h3>
                </div>
                <Button
                  onClick={startAnalysis}
                  className="w-full"
                  disabled={
                    isAnalyzing ||
                    !isLoggedIn ||
                    !resourceName ||
                    !resourceType ||
                    (activeTab === "benchmark" && !benchmarkFile) ||
                    (activeTab === "manual" && !manualControls.some((c) => c.selected))
                  }
                >
                  {isAnalyzing ? "Analysis in Progress..." : "Start Analysis"}
                </Button>
                <Button onClick={downloadResults} variant="outline" className="w-full" disabled={results.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Results
                </Button>
              </CardContent>
            </Card>
          </div>

          {(isAnalyzing || currentControl.status || results.length > 0) && (
            <Card className="border border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Analysis Progress</h3>
                </div>
                <AnalysisProgress currentControl={currentControl} isAnalyzing={isAnalyzing} />
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <Card className="border border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Results</h3>
                </div>
                <ResultsViewer results={results} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
