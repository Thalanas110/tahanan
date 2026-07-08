import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { useLoveNotes, useCreateLoveNote, useToggleFavoriteLoveNote, useDeleteLoveNote } from "@/hooks/useLoveNotes";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Heart, HeartOff, Trash2, PenLine, Gift } from "lucide-react";

export default function LoveNotes() {
  const { data: notes, isLoading } = useLoveNotes();
  const createNote = useCreateLoveNote();
  const toggleFavorite = useToggleFavoriteLoveNote();
  const deleteNote = useDeleteLoveNote();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [isWriting, setIsWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openWhen, setOpenWhen] = useState("");

  const partnerId = dashboard?.members.find(m => m.user_id !== user?.id)?.user_id;
  const partnerName = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles?.display_name || "Partner";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !dashboard?.couple?.id) return;

    try {
      await createNote.mutateAsync({
        couple_id: dashboard.couple.id,
        recipient_id: partnerId,
        title: title.trim() || undefined,
        body: body.trim(),
        open_when: openWhen.trim() || undefined,
      });
      toast.success("Note sent");
      setIsWriting(false);
      setTitle("");
      setBody("");
      setOpenWhen("");
    } catch (err) {
      toast.error("Failed to send note");
    }
  }

  const sortedNotes = notes ? [...notes].sort((a, b) => {
    if (a.is_favorite === b.is_favorite) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.is_favorite ? -1 : 1;
  }) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-accent">Love Notes</h1>
          <p className="text-muted-foreground">Little letters left for each other.</p>
        </div>
        {!isWriting && (
          <Button onClick={() => setIsWriting(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PenLine className="w-4 h-4 mr-2" /> Write a note
          </Button>
        )}
      </header>

      {isWriting && (
        <Card className="border-accent/20 bg-accent/5 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input 
                  placeholder="Just thinking of you" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea 
                  placeholder={`Write something sweet to ${partnerName}...`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="resize-none min-h-[150px] bg-background font-serif text-lg leading-relaxed"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Open When... (optional)</Label>
                <Input 
                  placeholder="e.g., You're feeling stressed, You need a hug" 
                  value={openWhen}
                  onChange={(e) => setOpenWhen(e.target.value)}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">Add a label to save this note for a specific moment.</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsWriting(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={createNote.isPending}>
                  {createNote.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Leave Note
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : !sortedNotes.length ? (
        <Card className="border-dashed bg-transparent">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground gap-4">
            <Gift className="w-12 h-12 text-accent/50" />
            <p>No love notes yet. Surprise {partnerName} with the first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedNotes.map(note => {
            const isMine = note.created_by === user?.id;
            const authorName = isMine ? "You" : partnerName;

            return (
              <Card key={note.id} className={`flex flex-col h-full ${note.is_favorite ? 'border-accent ring-1 ring-accent/30' : ''}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    {note.title && <CardTitle className="text-lg font-serif">{note.title}</CardTitle>}
                    <div className="text-xs text-muted-foreground">
                      From {authorName} • {format(new Date(note.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 ${note.is_favorite ? 'text-accent' : 'text-muted-foreground'}`}
                      onClick={() => toggleFavorite.mutate({ id: note.id, is_favorite: !note.is_favorite })}
                    >
                      <Heart className={`w-4 h-4 ${note.is_favorite ? 'fill-current' : ''}`} />
                    </Button>
                    {isMine && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this note?")) deleteNote.mutate(note.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {note.open_when && (
                    <div className="inline-block bg-accent/10 text-accent text-xs px-2 py-1 rounded-full mb-3 font-medium">
                      Open when: {note.open_when}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap font-serif text-foreground/90 leading-relaxed">
                    {note.body}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
