import { useHealthLogic } from "./logic/health";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Loader2, Stethoscope, Eye, EyeOff, Trash2, Pencil } from "lucide-react";

export default function Health() {
  const {
    notes,
    isLoading,
    createNote,
    deleteNote,
    updateNote,
    user,
    isAdding,
    setIsAdding,
    editingId,
    type,
    setType,
    severity,
    setSeverity,
    details,
    setDetails,
    visible,
    setVisible,
    myProfile,
    partnerProfile,
    handleSubmit,
    handleEdit,
  } = useHealthLogic();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">Health Log</h1>
          <p className="text-muted-foreground">Track symptoms, cycles, or general well-being.</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Stethoscope className="w-4 h-4 mr-2" /> Log symptom
          </Button>
        )}
      </header>

      {isAdding && (
        <Card className="border-secondary/20 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>What are you logging?</Label>
                <Input 
                  placeholder="e.g., Headache, Fever, Menstrual Cycle" 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Severity / Intensity</Label>
                  <span className="text-sm font-medium text-secondary">{severity[0]} / 10</span>
                </div>
                <Slider 
                  value={severity} 
                  onValueChange={setSeverity} 
                  max={10} 
                  min={1} 
                  step={1} 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mild</span>
                  <span>Severe</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Details (optional)</Label>
                <Textarea 
                  placeholder="Any context or medications taken?"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="resize-none min-h-[100px]"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <Switch 
                    id="visible" 
                    checked={visible} 
                    onCheckedChange={setVisible} 
                  />
                  <Label htmlFor="visible" className="flex items-center gap-2 cursor-pointer">
                    {visible ? <Eye className="w-4 h-4 text-secondary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    {visible ? "Shared with partner" : "Private to me"}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={createNote.isPending || updateNote?.isPending}>
                    {(createNote.isPending || updateNote?.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingId ? "Update" : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
      ) : !notes?.length ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            No health logs found. Stay healthy!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map(note => {
            const isMine = note.user_id === user?.id;
            const profile = isMine ? myProfile : partnerProfile;

            // Only show partner's notes if they are marked visible
            if (!isMine && !note.visible_to_partner) return null;

            return (
              <Card key={note.id} className="overflow-hidden">
                <div className={`px-4 py-2 border-b flex justify-between items-center ${isMine ? 'bg-muted/50' : 'bg-secondary/10 border-secondary/20'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{isMine ? "You" : profile?.display_name}</span>
                    {isMine && (
                      note.visible_to_partner 
                        ? <span className="text-[10px] bg-secondary/20 text-secondary px-2 py-0.5 rounded-full flex items-center gap-1"><Eye className="w-3 h-3"/> Shared</span>
                        : <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full flex items-center gap-1"><EyeOff className="w-3 h-3"/> Private</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy")}
                    </span>
                    {isMine && (
                      <div className="flex gap-1 items-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(note)} className="h-6 w-6 text-muted-foreground hover:text-primary">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Health Log</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this log? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteNote.mutate(note.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif font-bold text-lg">{note.health_type || "General Log"}</h3>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      Severity: <span className={note.severity && note.severity >= 7 ? "text-destructive" : ""}>{note.severity}/10</span>
                    </div>
                  </div>
                  {note.notes && (
                    <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{note.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
