import { Button } from '@/components/ui/button';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background p-4 overflow-hidden relative">
      {/* Decorative ambient background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="absolute w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/4"></div>
      </div>
      
      <div className="max-w-md w-full text-center space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="relative flex justify-center mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-[2] z-0 animate-pulse duration-[3000ms]" />
          <div className="relative z-10 bg-background/50 p-6 rounded-full backdrop-blur-sm border border-primary/10 shadow-lg">
            <Compass className="w-24 h-24 text-primary animate-[spin_10s_linear_infinite]" strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-8xl font-bold tracking-tighter text-foreground font-serif drop-shadow-sm">404</h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">You've wandered off the path</h2>
          <p className="text-muted-foreground text-lg px-2">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Button asChild size="lg" className="w-full sm:w-auto gap-2 rounded-full h-14 px-8 text-base shadow-lg shadow-primary/20 transition-transform hover:scale-105">
            <Link href="/">
              <Home className="w-5 h-5" />
              Return Home
            </Link>
          </Button>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto gap-2 rounded-full h-14 px-8 text-base border-primary/20 hover:bg-primary/5 transition-transform hover:scale-105 backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
