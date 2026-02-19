import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, MessageSquare, Lightbulb } from "lucide-react";
import strategyHeroImage from "@/assets/strategy-hero.png";

interface StrategyHeroProps {
  onNeedHelp: () => void;
  onGotIdea: () => void;
  message?: string;
}

const StrategyHero = ({ onNeedHelp, onGotIdea, message }: StrategyHeroProps) => {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string>("");

  useEffect(() => {
    // Check if user has minimized before in this session
    const wasMinimized = sessionStorage.getItem("revbot-minimized");
    
    if (wasMinimized === "true") {
      // Keep it minimized if user minimized it before
      setIsMinimized(true);
      return;
    }

    // If first time, wait 10-15 seconds before auto-expanding
    const randomDelay = 10000 + Math.random() * 5000; // 10-15 seconds
    
    const timer = setTimeout(() => {
      setIsMinimized(false);
      setHasAutoExpanded(true);
    }, randomDelay);

    return () => clearTimeout(timer);
  }, []);

  // Handle incoming messages
  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setIsMinimized(false);
      sessionStorage.removeItem("revbot-minimized");
      
      // Auto-hide message and minimize after 5 seconds
      const timer = setTimeout(() => {
        setDisplayMessage("");
        setIsMinimized(true);
        sessionStorage.setItem("revbot-minimized", "true");
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleMinimize = () => {
    setIsMinimized(true);
    // Remember that user minimized it in this session
    sessionStorage.setItem("revbot-minimized", "true");
  };



  if (isMinimized) {
    return (
      <div className="fixed right-6 bottom-6 z-50 animate-float">
        <button
          onClick={() => setIsMinimized(false)}
          className="relative group"
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-pendo-pink to-primary rounded-full opacity-75 group-hover:opacity-100 blur transition duration-200"></div>
          <img
            src={strategyHeroImage}
            alt="Strategy Hero"
            className="relative h-20 w-20 rounded-full border-4 border-background shadow-lg hover:scale-110 transition-transform"
          />
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-pendo-pink rounded-full animate-pulse"></div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 animate-fade-in">
      <Card className="w-80 shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
        <div className="relative">
          {/* Minimize button */}
          <button
            onClick={handleMinimize}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Hero Image */}
          <div className="flex justify-center pt-6 pb-4">
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-pendo-pink to-primary rounded-full opacity-50 blur-lg animate-pulse"></div>
              <img
                src={strategyHeroImage}
                alt="Revenue Strategy Hero"
                className="relative h-24 w-24 rounded-full border-4 border-background"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold bg-gradient-to-r from-pendo-pink to-primary bg-clip-text text-transparent">
                Hey! I'm RevBot 🚀
              </h3>
              {displayMessage ? (
                <div className="bg-pendo-pink/10 border border-pendo-pink/20 rounded-lg p-3 animate-fade-in">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {displayMessage}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your AI-powered revenue strategy assistant! I help automate your GTM workflows and provide instant insights.
                </p>
              )}
            </div>

            {/* Features */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-pendo-pink mt-1.5"></div>
                <p className="text-muted-foreground">
                  Launch <span className="font-semibold text-foreground">AI Workflows</span> for account research & strategy
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-pendo-pink mt-1.5"></div>
                <p className="text-muted-foreground">
                  Chat with <span className="font-semibold text-foreground">Ask Will</span> for instant answers
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-pendo-pink mt-1.5"></div>
                <p className="text-muted-foreground">
                  Get support from the <span className="font-semibold text-foreground">Revenue Strategy team</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={onNeedHelp}
                variant="default"
                className="w-full gap-2 bg-pendo-pink hover:bg-pendo-pink/90 text-white"
              >
                <MessageSquare className="h-4 w-4" />
                Need Help?
              </Button>
              <Button
                onClick={onGotIdea}
                variant="outline"
                className="w-full gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Got an Idea?
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StrategyHero;
