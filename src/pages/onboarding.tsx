import { useOnboardingLogic } from "./logic/onboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, HeartHandshake, Copy, Eye, EyeOff, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Onboarding() {
  const {
    createPending,
    joinPending,
    coupleName,
    setCoupleName,
    relationshipStartDate,
    setRelationshipStartDate,
    inviteCode,
    setInviteCode,
    createdInviteCode,
    handleCreate,
    handleJoin,
    setLocation,
    isCofMode,
    hasCofCouple,
  } = useOnboardingLogic();

  const [isCodeVisible, setIsCodeVisible] = useState(false);

  const handleCopyCode = () => {
    if (createdInviteCode) {
      navigator.clipboard.writeText(createdInviteCode);
      toast.success("Invite code copied to clipboard!");
    }
  };

  // ── Invite-code success screen (same for both partner and COF) ──────────────
  if (createdInviteCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20 text-center py-8">
          <CardHeader>
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              {isCofMode
                ? <Users className="w-8 h-8 text-primary" />
                : <HeartHandshake className="w-8 h-8 text-primary" />
              }
            </div>
            <CardTitle className="text-2xl font-serif">
              {isCofMode ? "COF Space Created" : "Space Created"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Share this 6-character code with your{" "}
              {isCofMode ? "friend" : "partner"} to invite them to{" "}
              <b>{coupleName}</b>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center my-8">
              <div className="flex items-center gap-2 bg-muted p-4 rounded-xl border border-border w-full max-w-[280px]">
                <code className="text-4xl font-mono tracking-widest text-primary font-bold text-center flex-1">
                  {isCodeVisible ? createdInviteCode : "••••••"}
                </code>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCodeVisible(!isCodeVisible)}
                    title={isCodeVisible ? "Hide code" : "Show code"}
                    className="h-8 w-8"
                  >
                    {isCodeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                    title="Copy code"
                    className="h-8 w-8"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-8 text-center">
              They can enter this code when they sign up to join your shared space.
            </p>
            <Button onClick={() => setLocation("/dashboard")} className="w-full" size="lg">
              Go to our home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── COF mode: user already has a partner couple ─────────────────────────────
  if (isCofMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mb-2">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-3xl font-serif text-primary">COF Room</CardTitle>
            <CardDescription className="text-base">
              Create a <b>Close/Couple of Friends</b> space or join one with a code.
              You can only have one COF room — one best friend at a time! 🤝
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCofCouple ? (
              // Edge case: user somehow navigated here but already has both rooms.
              <div className="text-center space-y-4 py-4">
                <p className="text-muted-foreground text-sm">
                  You already have a COF space. Head back home!
                </p>
                <Button onClick={() => setLocation("/dashboard")} className="w-full" size="lg">
                  Go to our home
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="create" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="create">Create COF Space</TabsTrigger>
                  <TabsTrigger value="join">Join COF Space</TabsTrigger>
                </TabsList>

                <TabsContent value="create">
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="coupleName">Name your COF space</Label>
                      <Input
                        id="coupleName"
                        placeholder="e.g. Alex & Jamie's Friend Zone"
                        value={coupleName}
                        onChange={(e) => setCoupleName(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        You'll get an invite code to share with your close friend.
                      </p>
                    </div>
                    <Button type="submit" className="w-full mt-2" disabled={createPending}>
                      {createPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create COF Space
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="join">
                  <form onSubmit={handleJoin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Friend's Invite Code</Label>
                      <Input
                        id="inviteCode"
                        placeholder="6-character code"
                        className="font-mono text-center text-lg uppercase tracking-widest"
                        maxLength={6}
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full mt-2" disabled={joinPending}>
                      {joinPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Join COF Space
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Normal mode: user has no couple yet ────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-serif text-primary">Pairing</CardTitle>
          <CardDescription className="text-base">
            Create a new space for you and your partner, or join an existing one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create">Create Space</TabsTrigger>
              <TabsTrigger value="join">Join Partner</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupleName">Name your space</Label>
                  <Input
                    id="coupleName"
                    placeholder="e.g. Alex & Sam's Home"
                    value={coupleName}
                    onChange={(e) => setCoupleName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll get an invite code to share after creating.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationshipStartDate">Relationship start date</Label>
                  <Input
                    id="relationshipStartDate"
                    type="date"
                    value={relationshipStartDate}
                    onChange={(e) => setRelationshipStartDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This date is used to calculate your recurring monthsary.
                  </p>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={createPending}>
                  {createPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create & Get Code
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Partner's Invite Code</Label>
                  <Input
                    id="inviteCode"
                    placeholder="6-character code"
                    className="font-mono text-center text-lg uppercase tracking-widest"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <Button type="submit" className="w-full mt-2" disabled={joinPending}>
                  {joinPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Join Space
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
