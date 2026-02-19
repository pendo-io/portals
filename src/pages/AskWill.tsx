import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import willAvatar from "@/assets/will-avatar.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { validateQuery } from "@/lib/validation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getUserInfo() {
  const stored = localStorage.getItem("sfdc_dev_session");
  if (!stored) return { name: "", initials: "?" };
  try {
    const session = JSON.parse(stored);
    const name = session.name || session.email?.split("@")[0] || "";
    const parts = name.split(" ").filter(Boolean);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (name[0] || "?").toUpperCase();
    return { name, initials };
  } catch {
    return { name: "", initials: "?" };
  }
}

function formatResponse(content: string): { body: string; sources: string[] } {
  // Split out a trailing sources block (lines starting with "Source:" or a "Sources:" section)
  const sourceSectionMatch = content.match(/\n---\s*\n\s*Sources?:\s*\n([\s\S]+)$/i);
  if (sourceSectionMatch) {
    const body = content.slice(0, sourceSectionMatch.index!).trimEnd();
    const sources = sourceSectionMatch[1]
      .split("\n")
      .map((l) => l.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
    return { body, sources };
  }

  // Fallback: collect inline "Source:" lines
  const lines = content.split("\n");
  const bodyLines: string[] = [];
  const sources: string[] = [];
  for (const line of lines) {
    if (/^\s*Source:\s*/i.test(line)) {
      sources.push(line.replace(/^\s*Source:\s*/i, "").trim());
    } else {
      bodyLines.push(line);
    }
  }
  return { body: bodyLines.join("\n").trimEnd(), sources };
}

const AskWill = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const userInfo = getUserInfo();

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
      const webhookUrl = `https://pendoio.app.n8n.cloud/webhook/a7b3990d-036a-4f9e-95a8-aeca86c41d42?user_query=${encodeURIComponent(validatedInput)}`;
      
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
        
        const assistantResponse = data.output || data.message || "I received your question!";
        const assistantMessage: Message = { 
          role: "assistant", 
          content: assistantResponse
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Track the message in database
        if (user) {
          await supabase.from('ask_will_messages').insert({
            user_id: user.id,
            user_query: validatedInput,
            assistant_response: assistantResponse
          });
        }
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
        <div className="flex-1 overflow-y-auto overflow-x-visible space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="flex gap-3 justify-start items-start ml-12">
              <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-[hsl(var(--pendo-pink))] ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={willAvatar}
                    alt="Will"
                    className="block w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted text-foreground max-w-[90%] sm:max-w-[80%]">
                <p className="font-medium mb-1">Hi! I'm Will</p>
                <p className="text-sm">Your revenue strategy expert. Ask me anything about revenue strategy!</p>
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
                      src={willAvatar}
                      alt="Will" 
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
                {message.role === "user" && userInfo.name && (
                  <p className="font-semibold text-xs mb-1 opacity-90">{userInfo.name}</p>
                )}
                {message.role === "assistant" ? (() => {
                  const { body, sources } = formatResponse(message.content);
                  return (
                    <>
                      <div className="whitespace-pre-wrap">{body}</div>
                      {sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sources</p>
                          <ul className="space-y-0.5">
                            {sources.map((s, i) => (
                              <li key={i} className="text-xs text-muted-foreground">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })() : message.content}
              </div>
              {message.role === "user" && (
                <div className="w-10 h-10 sm:w-24 sm:h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-3xl shadow-lg flex-shrink-0">
                  {userInfo.initials}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-start ml-12">
              <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-[hsl(var(--pendo-pink))] ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={willAvatar} 
                    alt="Will" 
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
            placeholder="Ask about revenue strategy..."
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

export default AskWill;
