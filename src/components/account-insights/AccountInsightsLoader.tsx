 import { Brain, Loader2 } from "lucide-react";
 import { Progress } from "@/components/ui/progress";
 import { useState, useEffect } from "react";
 
 const LOADING_TIPS = [
   "Fetching meeting history from Momentum...",
   "Analyzing meeting transcripts...",
   "Extracting action items and key topics...",
   "Evaluating sentiment patterns...",
   "Identifying adoption signals...",
   "Detecting risk indicators...",
   "Generating executive insights...",
   "Compiling relationship analysis...",
 ];
 
 const TECH_JOKES = [
   "Why do programmers prefer dark mode? Light attracts bugs! 🐛",
   "There are only 10 types of people: those who understand binary and those who don't.",
   "A SQL query walks into a bar, walks up to two tables and asks... 'Can I join you?'",
   "!false - It's funny because it's true.",
   "I would tell you a UDP joke, but you might not get it.",
 ];
 
interface AccountInsightsLoaderProps {
  isLoading: boolean;
  title?: string;
  tips?: string[];
}

export function AccountInsightsLoader({ isLoading, title = "Analyzing Account", tips }: AccountInsightsLoaderProps) {
  const activeTips = tips || LOADING_TIPS;
   const [progress, setProgress] = useState(0);
   const [tipIndex, setTipIndex] = useState(0);
   const [jokeIndex, setJokeIndex] = useState(0);
   const [showJoke, setShowJoke] = useState(false);
   const [elapsedSeconds, setElapsedSeconds] = useState(0);
 
   useEffect(() => {
     if (!isLoading) {
       setProgress(0);
       setTipIndex(0);
       setShowJoke(false);
       setElapsedSeconds(0);
       return;
     }
 
     // Progress bar: 1.5% per second
     const progressInterval = setInterval(() => {
       setProgress(prev => Math.min(prev + 1.5, 95));
     }, 1000);
 
     // Tips rotate every 3 seconds
     const tipInterval = setInterval(() => {
       setTipIndex(prev => (prev + 1) % activeTips.length);
     }, 3000);
 
     // Track elapsed time
     const timeInterval = setInterval(() => {
       setElapsedSeconds(prev => prev + 1);
     }, 1000);
 
     // Show joke after 8 seconds
     const jokeTimeout = setTimeout(() => {
       setShowJoke(true);
     }, 8000);
 
     // Rotate jokes every 10 seconds after showing
     const jokeInterval = setInterval(() => {
       if (showJoke) {
         setJokeIndex(prev => (prev + 1) % TECH_JOKES.length);
       }
     }, 10000);
 
     return () => {
       clearInterval(progressInterval);
       clearInterval(tipInterval);
       clearInterval(timeInterval);
       clearTimeout(jokeTimeout);
       clearInterval(jokeInterval);
     };
   }, [isLoading, showJoke]);
 
   if (!isLoading) return null;
 
   return (
     <div className="flex-1 flex items-center justify-center bg-background/95 backdrop-blur-sm min-h-[400px]">
       <div className="flex flex-col items-center gap-8 max-w-md text-center px-6">
         {/* Spinning Brain Icon with Glow */}
         <div className="relative">
           <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl animate-pulse">
             <Brain className="h-10 w-10 text-primary-foreground animate-spin" style={{ animationDuration: '3s' }} />
           </div>
           <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl animate-pulse" />
         </div>
 
         {/* Loading Text */}
          <div className="space-y-2">
            <h2 className="text-page-title">{title}</h2>
            <p className="text-muted-foreground text-sm animate-pulse">
              {activeTips[tipIndex % activeTips.length]}
           </p>
         </div>
 
         {/* Progress Bar */}
         <div className="w-full space-y-2">
           <Progress value={progress} className="h-2" />
           <div className="flex justify-between text-xs text-muted-foreground">
             <span>{Math.round(progress)}%</span>
             <span>{elapsedSeconds}s elapsed</span>
           </div>
         </div>
 
         {/* Tech Joke */}
         {showJoke && (
           <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border/50 animate-fade-in">
             <p className="text-sm text-muted-foreground italic">
               {TECH_JOKES[jokeIndex]}
             </p>
           </div>
         )}
       </div>
     </div>
   );
 }