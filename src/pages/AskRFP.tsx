import { useState, useRef, useEffect } from "react";
import { Send, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import rfpAvatar from "@/assets/rfp-avatar.png";
import { validateQuery } from "@/lib/validation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AskRFP = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Validate input
    const validation = validateQuery(input);
    if (!validation.valid) {
      toast({
        title: "Invalid input",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const validatedInput = validation.value!;

    // Get the last 2 messages as context (before adding the new user message)
    const lastTwoMessages = messages.slice(-2);
    const previousMessage1 = lastTwoMessages[0] || null;
    const previousMessage2 = lastTwoMessages[1] || null;

    const userMessage: Message = { role: "user", content: validatedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const webhookUrl = `https://pendoio.app.n8n.cloud/webhook/126f3362-b9a8-4667-8aa2-f1c9aa9df983?user_query=${encodeURIComponent(validatedInput)}`;
      
      // Create abort controller with 2.5 minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 150000); // 150 seconds = 2.5 minutes
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_query: validatedInput,
          previous_message_1: previousMessage1 ? {
            role: previousMessage1.role,
            content: previousMessage1.content
          } : null,
          previous_message_2: previousMessage2 ? {
            role: previousMessage2.role,
            content: previousMessage2.content
          } : null
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = { 
          role: "assistant", 
          content: data.output || data.message || "I received your question!"
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const timeoutMessage: Message = { 
          role: "assistant", 
          content: "Sorry, the request timed out. Please try asking your question again."
        };
        setMessages((prev) => [...prev, timeoutMessage]);
      } else {
        toast({
          title: "Error",
          description: "Failed to send question. Please try again.",
          variant: "destructive",
        });
        console.error("Error sending question:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 bg-background flex flex-col">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-page-title text-foreground">Ask RFP</h1>
            <p className="text-muted-foreground mt-2">
              Your RFP expert is here to help
            </p>
          </div>
          
          <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                How to Use
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>How to Use the RFP AI Assistant</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">🎯 What This Tool Does</h3>
                  <p className="text-muted-foreground text-sm">
                    This AI assistant helps you answer RFP (Request for Proposal) questions by searching through your company's knowledge base. Think of it as your intelligent RFP response companion that knows what your company can and cannot do.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Good Examples:</h3>
                  <ul className="text-muted-foreground text-sm space-y-2 ml-4 list-disc">
                    <li>"What are our data protection compliance certifications?"</li>
                    <li>"Do we support Chromebook devices for administrators?"</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-visible space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="flex gap-3 justify-start items-start ml-12">
              <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-[hsl(var(--pendo-pink))] ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={rfpAvatar}
                    alt="RFP Assistant"
                    className="block w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted text-foreground max-w-[90%] sm:max-w-[80%]">
                <p className="font-medium mb-1">Hi! I'm your RFP Assistant</p>
                <p className="text-sm">I can help you with RFP questions, requirements, and responses!</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 items-start ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-[hsl(var(--pendo-pink))] ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img 
                      src={rfpAvatar}
                      alt="RFP Assistant" 
                      className="block w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div
                className={`rounded-lg px-4 py-3 max-w-[90%] sm:max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.role === "user" && (
                  <p className="font-semibold text-xs mb-1 opacity-90">Pendozer</p>
                )}
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="w-10 h-10 sm:w-24 sm:h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-3xl shadow-lg flex-shrink-0">
                  P
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-start ml-12">
              <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-[hsl(var(--pendo-pink))] ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={rfpAvatar} 
                    alt="RFP Assistant" 
                    className="block w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about RFPs..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskRFP;
