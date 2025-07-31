"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Save, Shield } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const formSchema = z.object({
  name: z.string().min(5, {
    message: "Control name must be at least 5 characters.",
  }),
})

interface ManualControlsProps {
  controls: Array<{
    id: string
    name: string
    selected: boolean
  }>
  onToggleControl: (id: string, name: string) => void
}

export function ManualControls({ controls, onToggleControl }: ManualControlsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [localControls, setLocalControls] = useState(controls)

  useEffect(() => {
    setLocalControls(controls)
  }, [controls])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  })

  const filteredControls = localControls.filter((control) =>
    control.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedCount = localControls.filter((c) => c.selected).length

  const addCustomControl = (data: z.infer<typeof formSchema>) => {
    const newControl = {
      id: `custom-${Date.now()}`,
      name: data.name,
      selected: true,
    }

    const updatedControls = [...localControls, newControl]
    setLocalControls(updatedControls)
    onToggleControl(newControl.id, newControl.name)
    form.reset()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Manual Security Controls</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Custom Control
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Security Control</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(addCustomControl)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Control Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter security control name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Add Control
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {filteredControls.map((control) => (
          <div
            key={control.id}
            className="flex items-start space-x-3 p-3 rounded-md border hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              id={`control-${control.id}`}
              checked={control.selected}
              onCheckedChange={() => {
                onToggleControl(control.id, control.name)
                setLocalControls(prevControls =>
                  prevControls.map(c =>
                    c.id === control.id ? { ...c, selected: !c.selected } : c
                  )
                )
              }}
            />
            <Label htmlFor={`control-${control.id}`} className="text-sm cursor-pointer">
              {control.name}
              {control.id.startsWith("custom-") && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Custom</span>
              )}
            </Label>
          </div>
        ))}

        {filteredControls.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">No controls found matching your search.</div>
        )}
      </div>
    </div>
  )
}
