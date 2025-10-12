"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { DataService, ImportResult } from "@/lib/data-service"
import { toast } from "sonner"

function DataManagementContent() {
  const { user } = useAuth()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<string>("")
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [includeInactive, setIncludeInactive] = useState(false)

  const dataService = DataService.getInstance()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error("Please select a CSV file")
      return
    }

    setCsvFile(file)
    
    // Read file preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const lines = content.split('\n').slice(0, 6) // First 5 lines + header
      setCsvPreview(lines.join('\n'))
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvFile || !user) return

    setImporting(true)
    setImportResult(null)

    try {
      const fileContent = await csvFile.text()
      
      // Validate CSV format first
      const validation = dataService.validateCSVFormat(fileContent)
      if (!validation.valid) {
        toast.error(`Invalid CSV format: ${validation.errors.join(', ')}`)
        return
      }

      const result = await dataService.importTransactionsFromCSV(
        user.uid, 
        fileContent, 
        skipDuplicates
      )
      
      setImportResult(result)
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} transactions!`)
      } else {
        toast.error("Import failed. Check the results below.")
      }

    } catch (error) {
      console.error("Import error:", error)
      toast.error("Failed to import data. Please try again.")
    } finally {
      setImporting(false)
    }
  }

  const handleExportTransactions = async () => {
    if (!user) return

    setExporting(true)
    try {
      const exportData = await dataService.exportUserData(user.uid, includeInactive)
      const csvContent = dataService.generateTransactionCSV(exportData.transactions)
      
      const filename = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      dataService.downloadCSV(csvContent, filename)
      
      toast.success(`Exported ${exportData.transactions.length} transactions`)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data")
    } finally {
      setExporting(false)
    }
  }

  const handleExportBudgets = async () => {
    if (!user) return

    setExporting(true)
    try {
      const exportData = await dataService.exportUserData(user.uid, includeInactive)
      const csvContent = dataService.generateBudgetCSV(exportData.budgets)
      
      const filename = `budgets-${new Date().toISOString().split('T')[0]}.csv`
      dataService.downloadCSV(csvContent, filename)
      
      toast.success(`Exported ${exportData.budgets.length} budgets`)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export budgets")
    } finally {
      setExporting(false)
    }
  }

  const handleFullBackup = async () => {
    if (!user) return

    setExporting(true)
    try {
      const backupContent = await dataService.createFullBackup(user.uid)
      const filename = `finance-backup-${new Date().toISOString().split('T')[0]}.json`
      
      const blob = new Blob([backupContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      
      toast.success("Full backup created successfully!")
    } catch (error) {
      console.error("Backup error:", error)
      toast.error("Failed to create backup")
    } finally {
      setExporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = dataService.getImportTemplate()
    dataService.downloadCSV(template, 'transaction-template.csv')
    toast.success("Template downloaded!")
  }

  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <Sidebar />

        <section className="flex flex-col gap-4">
          <header className="brut-border brut-shadow rounded-md p-4 bg-card">
            <h1 className="heading text-2xl md:text-3xl">Data Management</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Import, export, and backup your financial data
            </p>
          </header>

          <Tabs defaultValue="import" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="import">Import Data</TabsTrigger>
              <TabsTrigger value="export">Export Data</TabsTrigger>
              <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            </TabsList>

            {/* IMPORT TAB */}
            <TabsContent value="import" className="space-y-4">
              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle>Import Transactions</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file to import your transaction data
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Select CSV File</Label>
                    <div className="flex gap-2">
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="brut-border"
                      />
                      <Button variant="outline" onClick={downloadTemplate} className="brut-border">
                        Download Template
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="skip-duplicates"
                      checked={skipDuplicates}
                      onCheckedChange={setSkipDuplicates}
                    />
                    <Label htmlFor="skip-duplicates">Skip duplicate transactions</Label>
                  </div>

                  {csvPreview && (
                    <div className="space-y-2">
                      <Label>File Preview</Label>
                      <Textarea
                        value={csvPreview}
                        readOnly
                        className="brut-border font-mono text-xs"
                        rows={6}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleImport}
                    disabled={!csvFile || importing}
                    className="brut-border brut-shadow w-full"
                  >
                    {importing ? "Importing..." : "Import Transactions"}
                  </Button>

                  {importResult && (
                    <Alert className={`brut-border ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex gap-4">
                            <Badge variant="outline">Imported: {importResult.imported}</Badge>
                            <Badge variant="outline">Skipped: {importResult.skipped}</Badge>
                            <Badge variant="outline">Duplicates: {importResult.duplicates}</Badge>
                          </div>
                          
                          {importResult.errors.length > 0 && (
                            <div>
                              <p className="font-medium text-red-600">Errors:</p>
                              <ul className="text-xs space-y-1">
                                {importResult.errors.slice(0, 5).map((error, i) => (
                                  <li key={i}>• {error}</li>
                                ))}
                                {importResult.errors.length > 5 && (
                                  <li>... and {importResult.errors.length - 5} more errors</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* EXPORT TAB */}
            <TabsContent value="export" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="brut-border brut-shadow">
                  <CardHeader>
                    <CardTitle>Export Transactions</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Download all your transactions as CSV
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleExportTransactions}
                      disabled={exporting}
                      className="brut-border brut-shadow w-full"
                    >
                      {exporting ? "Exporting..." : "Export Transactions"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="brut-border brut-shadow">
                  <CardHeader>
                    <CardTitle>Export Budgets</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Download your budget configurations
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleExportBudgets}
                      disabled={exporting}
                      className="brut-border brut-shadow w-full"
                    >
                      {exporting ? "Exporting..." : "Export Budgets"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-inactive"
                      checked={includeInactive}
                      onCheckedChange={setIncludeInactive}
                    />
                    <Label htmlFor="include-inactive">Include inactive items</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BACKUP TAB */}
            <TabsContent value="backup" className="space-y-4">
              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle>Full Backup</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Create a complete backup of all your financial data
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">
                    This will create a JSON backup file containing all your transactions, 
                    budgets, goals, and settings. Keep this file safe for disaster recovery.
                  </p>
                  
                  <Button
                    onClick={handleFullBackup}
                    disabled={exporting}
                    className="brut-border brut-shadow w-full"
                  >
                    {exporting ? "Creating Backup..." : "Create Full Backup"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle>Data Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Transactions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Budgets</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Goals</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Categories</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  )
}

export default function DataManagementPage() {
  return (
    <ProtectedRoute>
      <DataManagementContent />
    </ProtectedRoute>
  )
}