import { useLoveNotesLogic } from "./logic/love-notes";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Loader2, Heart, HeartOff, Trash2, PenLine, Gift, MailOpen, Pencil } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import type { LoveNote } from "@/types/database";

export default function LoveNotes() {
  const {
    isLoading,
    createNote,
    toggleFavorite,
    deleteNote,
    updateNote,
    user,
    activeRoomType,
    isWriting,
    setIsWriting,
    editingId,
    title,
    setTitle,
    body,
    setBody,
    openWhen,
    setOpenWhen,
    partnerName,
    relationshipStartDate,
    targetMonthsaryDate,
    monthsaryComposerBlocker,
    monthsaryTitle,
    setMonthsaryTitle,
    monthsaryBody,
    setMonthsaryBody,
    editableMonthsaryMessage,
    partnerId,
    createMonthsaryMessage,
    updateMonthsaryMessage,
    handleSubmit,
    handleMonthsarySubmit,
    handleEdit,
    sortedNotes,
  } = useLoveNotesLogic();

  const [selectedNote, setSelectedNote] = useState<LoveNote | null>(null);

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

      {activeRoomType === "partner" && (
        <Card className="border-primary/20 bg-primary/5 shadow-md">
          <CardHeader>
            <CardTitle className="font-serif text-primary">Next Monthsary Message</CardTitle>
            <p className="text-sm text-muted-foreground">
              {relationshipStartDate && targetMonthsaryDate
                ? partnerId
                  ? `This message targets ${format(new Date(`${targetMonthsaryDate}T12:00:00`), "MMMM d, yyyy")}. If that date has already passed, your partner will see it the next time they open the app.`
                  : `This message targets ${format(new Date(`${targetMonthsaryDate}T12:00:00`), "MMMM d, yyyy")}. It will be assigned to the first partner who joins this space, and if that date has already passed they will see it right away.`
                : "Add your relationship start date in Settings to unlock monthsary messages."}
            </p>
          </CardHeader>
          <CardContent>
            {relationshipStartDate && targetMonthsaryDate ? (
              <form onSubmit={handleMonthsarySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title (optional)</Label>
                  <Input
                    placeholder="Happy monthsary"
                    value={monthsaryTitle}
                    onChange={(e) => setMonthsaryTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={monthsaryBody}
                    onChange={(e) => setMonthsaryBody(e.target.value)}
                    className="min-h-[160px] resize-none font-serif text-lg leading-relaxed"
                    required
                  />
                </div>
                {monthsaryComposerBlocker ? (
                  <p className="text-sm text-muted-foreground">{monthsaryComposerBlocker}</p>
                ) : null}
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={
                    !!monthsaryComposerBlocker ||
                    createMonthsaryMessage.isPending ||
                    updateMonthsaryMessage.isPending
                  }
                >
                  {(createMonthsaryMessage.isPending || updateMonthsaryMessage.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {editableMonthsaryMessage ? "Update Monthsary Message" : "Save Monthsary Message"}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      )}

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
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={createNote.isPending || updateNote?.isPending}>
                  {(createNote.isPending || updateNote?.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId ? "Update Note" : "Leave Note"}
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
              <Card 
                key={note.id} 
                className={`flex flex-col h-full cursor-pointer transition-all duration-200 hover:shadow-md hover:border-accent/40 ${note.is_favorite ? 'border-accent ring-1 ring-accent/30' : ''}`}
                onClick={() => setSelectedNote(note)}
              >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite.mutate({ id: note.id, is_favorite: !note.is_favorite });
                      }}
                    >
                      <Heart className={`w-4 h-4 ${note.is_favorite ? 'fill-current' : ''}`} />
                    </Button>
                    {isMine && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(note);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this note? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={(e) => {
                                e.stopPropagation();
                                deleteNote.mutate(note.id);
                              }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {note.open_when && (
                    <div className="inline-block bg-accent/10 text-accent text-xs px-2 py-1 rounded-full mb-3 font-medium">
                      Open when: {note.open_when}
                    </div>
                  )}
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors">
                    <MailOpen className="w-8 h-8 text-accent mb-2" />
                    <span className="text-sm font-serif font-medium text-accent">Read Note</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={selectedNote !== null} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-md w-11/12 bg-card p-6 border-accent/20">
          {selectedNote && (
            <>
              <DialogHeader className="space-y-1">
                {selectedNote.open_when && (
                  <div className="inline-block self-start bg-accent/10 text-accent text-xs px-2 py-1 rounded-full font-medium mb-1">
                    Open when: {selectedNote.open_when}
                  </div>
                )}
                <DialogTitle className="text-2xl font-serif text-accent">
                  {selectedNote.title || "A Sweet Note"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  From {selectedNote.created_by === user?.id ? "You" : partnerName} • {format(new Date(selectedNote.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 p-5 bg-muted/40 rounded-lg border border-border/50">
                <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-foreground/90 italic">
                  "{selectedNote.body}"
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
