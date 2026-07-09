import { useOnboardingLogic } from "./logic/onboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, HeartHandshake, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Onboarding() {
  const {
    createCouple,
    joinCouple,
    coupleName,
    setCoupleName,
    inviteCode,
    setInviteCode,
    createdInviteCode,
    handleCreate,
    handleJoin,
    setLocation,
  } = useOnboardingLogic();

  const [isCodeVisible, setIsCodeVisible] = useState(false);

  const handleCopyCode = () => {
    if (createdInviteCode) {
      navigator.clipboard.writeText(createdInviteCode);
      toast.success("Invite code copied to clipboard!");
    }
  };

  if (createdInviteCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20 text-center py-8">
          <CardHeader>
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <HeartHandshake className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">Space Created</CardTitle>
            <CardDescription className="text-base mt-2">
              Share this 6-character code with your partner to invite them to <b>{coupleName}</b>.
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
                <Button type="submit" className="w-full mt-2" disabled={createCouple.isPending}>
                  {createCouple.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
                <Button type="submit" className="w-full mt-2" disabled={joinCouple.isPending}>
                  {joinCouple.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
