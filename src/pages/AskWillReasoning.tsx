import { useState, useRef, useEffect } from "react";
import { Send, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import willAvatar from "@/assets/will-avatar.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
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
  const sourceSectionMatch = content.match(/\n---\s*\n\s*Sources?:\s*\n([\s\S]+)$/i);
  if (sourceSectionMatch) {
    const body = content.slice(0, sourceSectionMatch.index!).trimEnd();
    const sources = sourceSectionMatch[1]
      .split("\n")
      .map((l) => l.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
    return { body, sources };
  }

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

const exampleQuestions = [
  "We have a $500K renewal at risk with Acme Corp. They're evaluating competitors and citing lack of ROI visibility. What's our win-back strategy?",
  "Our enterprise pipeline is heavily concentrated in 3 accounts (60% of Q1 target). What's your risk assessment and portfolio diversification strategy?",
  "Customer X is a Salesforce shop but we're trying to position against their existing analytics investment. How do we frame our differentiated value?",
  "We're seeing early warning signs (declining usage, stakeholder changes) in our top 10 accounts. Build me a proactive retention playbook.",
];

const AskWillReasoning = () => {
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

    // Get the last 3 messages as context
    const lastThreeMessages = messages.slice(-3);
    const previousMessage1 = lastThreeMessages[0] || null;
    const previousMessage2 = lastThreeMessages[1] || null;
    const previousMessage3 = lastThreeMessages[2] || null;

    const userMessage: Message = { role: "user", content: validatedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const webhookUrl = "https://pendoio.app.n8n.cloud/webhook/e2281efe-ab46-4a42-a58d-91489c45ecc3";
      
      // Create abort controller with 5 minute timeout for deep analysis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 seconds = 5 minutes
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_query: validatedInput + "\n",
          previous_message_1: previousMessage1 ? previousMessage1.content : null,
          previous_message_2: previousMessage2 ? previousMessage2.content : null,
          previous_message_3: previousMessage3 ? previousMessage3.content : null
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        const assistantResponse = data.output || data.message || "I've analyzed your situation!";
        const assistantMessage: Message = { 
          role: "assistant", 
          content: assistantResponse
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Track the message in database
        if (user) {
          await supabase.from('ask_will_reasoning_messages').insert({
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
          content: "Sorry, the analysis timed out. Complex strategic questions may take longer. Please try breaking down your question or try again."
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

  const handleExampleClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex-1 bg-background flex flex-col">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-page-title text-foreground">Ask Will - Deep Analysis</h1>
          </div>
          <p className="text-muted-foreground">
            For complex scenarios requiring strategic reasoning. Provide detailed context for the best insights.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-visible space-y-4 mb-4">
          {messages.length === 0 && (
            <>
              <div className="flex gap-3 justify-start items-start ml-12">
                <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-primary ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img
                      src={willAvatar}
                      alt="Will"
                      className="block w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="rounded-lg px-4 py-3 bg-muted text-foreground max-w-[90%] sm:max-w-[80%]">
                  <p className="font-medium mb-1">Hi! I'm Will - Strategic Analysis Mode</p>
                  <p className="text-sm mb-3">
                    I'm ready to help with complex strategic challenges. Give me the full picture - 
                    account details, competitor dynamics, stakeholder concerns, timeline pressures - 
                    and I'll provide comprehensive analysis and actionable recommendations.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tip: The more context you provide, the more strategic and tailored my response will be.
                  </p>
                </div>
              </div>
              
              {/* Example questions */}
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Try asking about:</p>
                <div className="grid gap-2">
                  {exampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(question)}
                      className="text-left text-sm p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 items-start ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-primary ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
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
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mt-4 [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mt-2 [&>h3]:mb-1 [&>ul]:my-2 [&>ol]:my-2 [&>li]:my-0.5 [&>p]:my-2 [&>hr]:my-3">
                        <ReactMarkdown>{body}</ReactMarkdown>
                      </div>
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
                })() : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
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
              <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full ring-2 sm:ring-4 ring-primary ring-offset-2 ring-offset-background bg-white shadow-lg flex-shrink-0 mt-2">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={willAvatar} 
                    alt="Will" 
                    className="block w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted">
                <p className="text-sm text-muted-foreground mb-2">Analyzing your strategic scenario...</p>
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
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your strategic challenge in detail... (include account context, stakeholders, competitive dynamics, timeline)"
            disabled={isLoading}
            className="flex-1 min-h-[80px] resize-none"
            rows={3}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-auto"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskWillReasoning;
