import { useSignupLogic } from "./logic/signup";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";

export default function Signup() {
  const {
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleSubmit,
    acceptedTerms,
    setAcceptedTerms,
    hasScrolledToBottom,
    setHasScrolledToBottom,
    isTermsModalOpen,
    setIsTermsModalOpen,
  } = useSignupLogic();

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-serif text-primary">Tahanan</CardTitle>
          <CardDescription className="text-base">Start building your shared space.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">What should your partner call you?</Label>
              <Input
                id="displayName"
                placeholder="First name or nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => {
                  if (!hasScrolledToBottom) {
                    setIsTermsModalOpen(true);
                  } else {
                    setAcceptedTerms(checked as boolean);
                  }
                }}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-primary hover:underline focus:outline-none"
                >
                  Terms and Conditions & Privacy Policy
                </button>
              </label>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading || !acceptedTerms}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>

      <Dialog open={isTermsModalOpen} onOpenChange={setIsTermsModalOpen}>
        <DialogContent className="max-w-md w-11/12">
          <DialogHeader>
            <DialogTitle>Terms & Conditions and Privacy Policy</DialogTitle>
            <DialogDescription>
              Please read through our terms completely to continue.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="max-h-[50vh] overflow-y-auto p-4 border rounded-md text-sm space-y-4"
            onScroll={(e) => {
              const target = e.currentTarget;
              // Add a 10px buffer to account for rounding errors in scroll position
              if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
                setHasScrolledToBottom(true);
              }
            }}
          >
            <h3 className="font-semibold text-base">Welcome to Tahanan</h3>
            <p>These terms and conditions outline the rules and regulations for the use of Tahanan's App.</p>
            
            <h4 className="font-semibold mt-4">1. Acceptance of Terms</h4>
            <p>By accessing this app we assume you accept these terms and conditions. Do not continue to use Tahanan if you do not agree to take all of the terms and conditions stated on this page.</p>

            <h4 className="font-semibold mt-4">2. Privacy & Data Collection</h4>
            <p>We respect your privacy and are committed to protecting it. We collect personal information you provide to us, including your name, email address, and interactions within the app to provide a personalized experience.</p>
            
            <h4 className="font-semibold mt-4">3. Location Tracking Feature</h4>
            <p><strong>Important:</strong> Tahanan includes location tracking features to help you and your partner stay connected and safe. By using our services, you consent to the collection, use, and sharing of your real-time location data with your connected partner. You can disable this feature at any time in your device settings, but certain location-dependent features may become unavailable.</p>

            <h4 className="font-semibold mt-4">4. User Content</h4>
            <p>You grant Tahanan a non-exclusive license to use, reproduce, and edit any of your comments or shared content within the app as necessary to provide the service to you and your partner.</p>

            <h4 className="font-semibold mt-4">5. Disclaimer</h4>
            <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our app and the use of this app. The app is provided "as is" for your personal use.</p>
            
            <p className="pt-4 text-muted-foreground italic text-center">Scroll to the bottom to accept.</p>
          </div>
          <DialogFooter className="sm:justify-between gap-2 sm:gap-0 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsTermsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              disabled={!hasScrolledToBottom}
              onClick={() => {
                setAcceptedTerms(true);
                setIsTermsModalOpen(false);
              }}
            >
              I Agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
