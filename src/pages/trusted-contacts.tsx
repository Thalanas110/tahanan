import { useTrustedContactsLogic } from "./logic/trusted-contacts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus, Phone, Mail, Trash2, Users, X } from "lucide-react";
import { format } from "date-fns";

export default function TrustedContacts() {
  const {
    contacts,
    isLoading,
    activeRoomId,
    createContact,
    isAdding,
    setIsAdding,
    name, setName,
    relationship, setRelationship,
    phone, setPhone,
    email, setEmail,
    notes, setNotes,
    handleSubmit,
    handleDelete,
  } = useTrustedContactsLogic();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-serif font-bold text-foreground">Trusted Contacts</h1>
        </div>
        <p className="text-muted-foreground">
          People you and your close friend trust in case of an emergency.
        </p>
      </header>

      {/* Add Contact Form */}
      {isAdding ? (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">New Trusted Contact</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tc-name">Name *</Label>
                  <Input
                    id="tc-name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tc-relationship">Relationship</Label>
                  <Input
                    id="tc-relationship"
                    placeholder="e.g. Parent, Sibling, Best friend"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tc-phone">Phone</Label>
                  <Input
                    id="tc-phone"
                    type="tel"
                    placeholder="+1 555 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tc-email">Email</Label>
                  <Input
                    id="tc-email"
                    type="email"
                    placeholder="contact@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tc-notes">Notes</Label>
                <Textarea
                  id="tc-notes"
                  placeholder="Any important notes about this contact..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createContact.isPending}>
                  {createContact.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Contact
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Trusted Contact
        </Button>
      )}

      {/* Contact List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : contacts && contacts.length > 0 ? (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-4">
                  <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold text-lg">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{contact.name}</p>
                        {contact.relationship && (
                          <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDelete(contact.id)}
                        title="Remove contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-border pl-2">
                        {contact.notes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Added {format(new Date(contact.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <Users className="w-10 h-10 text-muted-foreground/50" />
            <CardTitle className="text-base font-medium text-muted-foreground">No trusted contacts yet</CardTitle>
            <CardDescription>
              Add people who should be reachable in an emergency.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
