import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import aceAvatar from "@/assets/ace-avatar.png";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AskAce = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Service is not yet configured - show friendly message
      const assistantMessage: Message = {
        role: "assistant",
        content: "I'm Ace, your RFP assistant. This feature is currently being set up and will be available soon. In the meantime, please try one of our other workflows for RFP assistance.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-background via-background to-muted flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1 flex flex-col">
        <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={aceAvatar} alt="Ace" />
                  <AvatarFallback>ACE</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-page-title text-foreground mb-2">
                    Meet Ace, Your RFP Assistant
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    I'm here to help you with RFP questions, draft responses, and navigate complex requirements. Ask me anything!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={aceAvatar} alt="Ace" />
                      <AvatarFallback>ACE</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 max-w-[90%] sm:max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={aceAvatar} alt="Ace" />
                  <AvatarFallback>ACE</AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-4 py-3 bg-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-card">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Ace about RFPs, requirements, or draft responses..."
                className="min-h-[60px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[60px] w-[60px] flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AskAce;
