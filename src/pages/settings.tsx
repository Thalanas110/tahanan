import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, HeartHandshake, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const couple = dashboard?.couple;
  const members = dashboard?.members || [];
  const partnerProfile = members.find(m => m.user_id !== profile?.id)?.profiles;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and shared space.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" />
            <CardTitle>Your Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Display Name</p>
            <p className="text-lg">{profile?.display_name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Member Since</p>
            <p className="text-lg">{profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : ""}</p>
          </div>
        </CardContent>
      </Card>

      {couple && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-accent" />
              <CardTitle>Shared Space</CardTitle>
            </div>
            <CardDescription>Details about your connection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Space Name</p>
              <p className="text-lg">{couple.name}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Partner</p>
              <p className="text-lg">{partnerProfile?.display_name || "Unknown"}</p>
            </div>

            <div className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm font-medium text-muted-foreground">Invite Code</p>
              <div className="flex items-center gap-4">
                <code className="text-xl font-bold tracking-widest text-primary bg-background px-3 py-1 rounded">
                  {couple.invite_code}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                If someone else needs to join (though spaces are for two), they can use this code.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="w-full sm:w-auto" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
