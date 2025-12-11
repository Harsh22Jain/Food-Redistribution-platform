import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Sparkles, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (messages: Message[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
    
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok || !resp.body) throw new Error('Failed to start stream');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: 'assistant', content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="relative rounded-full h-16 w-16 shadow-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 border-0 group overflow-hidden"
          size="icon"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-emerald-400/50 via-transparent to-cyan-400/50"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <div className="absolute inset-0 rounded-full ring-2 ring-emerald-400/30 animate-ping" />
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-7 w-7 text-white relative z-10" />
          </motion.div>
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Card className="w-96 h-[520px] shadow-2xl flex flex-col overflow-hidden border-0 bg-gradient-to-b from-background to-background/95 backdrop-blur-xl">
          {/* Header with gradient */}
          <CardHeader className="relative pb-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMSIgY3g9IjIwIiBjeT0iMjAiIHI9IjEiLz48L2c+PC9zdmc+')] opacity-50" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 0 0 rgba(255,255,255,0.4)",
                      "0 0 0 10px rgba(255,255,255,0)",
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <Bot className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg">NourishNet AI</h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                    Online & Ready to Help
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background">
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              <div className="space-y-4 py-4">
                {messages.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
                    >
                      <Sparkles className="h-8 w-8 text-white" />
                    </motion.div>
                    <p className="font-semibold text-foreground mb-1">Welcome to NourishNet AI!</p>
                    <p className="text-sm text-muted-foreground">
                      Ask me about donations, volunteering, or anything about the platform!
                    </p>
                  </motion.div>
                )}
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[85%] shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/30 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 bg-emerald-500 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-teal-500 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-cyan-500 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-emerald-100 dark:border-emerald-900/30 bg-background/80 backdrop-blur-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  className="border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500 rounded-xl bg-white dark:bg-slate-900"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIChatbot;