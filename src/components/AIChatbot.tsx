import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, X, Sparkles, Bot, Check, XIcon, Zap, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentAction {
  id: string;
  action_type: string;
  description: string;
  action_data: any;
  status: string;
  created_at: string;
}

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingActions]);

  // Subscribe to agent_actions realtime
  useEffect(() => {
    if (!isOpen) return;

    fetchPendingActions();

    const channel = supabase
      .channel('agent-actions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_actions' },
        () => fetchPendingActions()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen]);

  const fetchPendingActions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setPendingActions(data as AgentAction[]);
  };

  const handleAgentChat = async (allMessages: Message[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Please log in to use the AI agent.");
    }
    const token = session.access_token;

    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `Error ${resp.status}`);
    }

    const data = await resp.json();
    return data;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const data = await handleAgentChat(updatedMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      if (data.pending_actions?.length) {
        setPendingActions(data.pending_actions);
      }
    } catch (error: any) {
      console.error('Agent error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAction = useCallback(async (action: AgentAction) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Execute the action based on type
      if (action.action_type === 'auto_match' && action.action_data.donation_id) {
        const { error } = await supabase.from('donation_matches').insert({
          donation_id: action.action_data.donation_id,
          recipient_id: user.id,
          status: 'pending',
        });
        if (error) throw error;
      } else if (action.action_type === 'task_execute' && action.action_data.task === 'create_donation') {
        const donationData = action.action_data.donation_data;
        const { error } = await supabase.from('food_donations').insert({
          ...donationData,
          donor_id: user.id,
          status: 'available',
        });
        if (error) throw error;
      }

      // Mark action as approved
      await supabase
        .from('agent_actions')
        .update({ status: 'approved' })
        .eq('id', action.id);

      setPendingActions(prev => prev.filter(a => a.id !== action.id));
      toast({ title: '✅ Action Approved', description: action.description });

      // Inform the chat
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `✅ **Action approved**: ${action.description}` },
      ]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const handleRejectAction = useCallback(async (action: AgentAction) => {
    await supabase
      .from('agent_actions')
      .update({ status: 'rejected' })
      .eq('id', action.id);

    setPendingActions(prev => prev.filter(a => a.id !== action.id));
    toast({ title: 'Action Rejected', description: 'The proposed action was dismissed.' });
  }, [toast]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'auto_match': return <Zap className="h-4 w-4 text-cyan-400" />;
      case 'route_optimize': return <Brain className="h-4 w-4 text-teal-400" />;
      case 'proactive_alert': return <Sparkles className="h-4 w-4 text-cyan-400" />;
      case 'task_execute': return <Check className="h-4 w-4 text-emerald-400" />;
      default: return <Bot className="h-4 w-4 text-cyan-400" />;
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
          className="relative rounded-full h-16 w-16 shadow-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-600 hover:via-teal-600 hover:to-emerald-600 border-0 group overflow-hidden hologram-glow"
          size="icon"
        >
          {/* Rotating energy ring */}
          <motion.div
            className="absolute inset-1 rounded-full border-2 border-cyan-300/40 border-t-cyan-200 border-b-transparent"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner rotating ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-teal-300/30 border-l-teal-200 border-r-transparent"
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          
          {pendingActions.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center z-20 font-bold shadow-[0_0_10px_hsl(180_100%_50%_/0.8)]">
              {pendingActions.length}
            </span>
          )}
          
          {/* Ping rings */}
          <div className="absolute inset-0 rounded-full ring-2 ring-cyan-400/30 animate-ping" />
          <div className="absolute inset-0 rounded-full ring-2 ring-teal-400/20 animate-ping" style={{ animationDelay: '0.5s' }} />
          
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="relative z-10"
          >
            <Brain className="h-7 w-7 text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
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
        <Card className="w-[420px] h-[600px] shadow-2xl flex flex-col overflow-hidden border-0 bg-slate-950/90 backdrop-blur-2xl hologram-border hologram-scanlines hologram-glow">
          {/* Holographic header */}
          <CardHeader className="relative pb-4 bg-gradient-to-r from-cyan-600/80 via-teal-600/80 to-emerald-600/80 text-white border-b border-cyan-400/30">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMSIgY3g9IjIwIiBjeT0iMjAiIHI9IjEiLz48L2c+PC9zdmc+')] opacity-50" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                {/* Holographic avatar */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-cyan-300/50 border-t-cyan-100 border-b-transparent"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-1 rounded-full border-2 border-teal-300/40 border-l-teal-100 border-r-transparent"
                    animate={{ rotate: [360, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(34,211,238,0.4)",
                        "0 0 0 10px rgba(34,211,238,0)",
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-cyan-500/30 backdrop-blur-sm flex items-center justify-center border border-cyan-300/50"
                  >
                    <Brain className="h-5 w-5 text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-wide drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">NourishNet Agent</h3>
                  <p className="text-xs text-cyan-100/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse shadow-[0_0_8px_hsl(180_100%_50%)]" />
                    Holographic AI • Suggest & Confirm
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-cyan-500/20 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 bg-gradient-to-b from-cyan-950/20 to-slate-950/80">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
                {messages.length === 0 && pendingActions.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center"
                    >
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-cyan-400/40 border-t-cyan-300"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border-2 border-teal-400/30 border-l-teal-300"
                        animate={{ rotate: [360, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                      />
                      <Brain className="h-8 w-8 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                    </motion.div>
                    <p className="font-semibold text-cyan-100 mb-1">NourishNet AI Agent</p>
                    <p className="text-sm text-cyan-200/60 mb-4">
                      I can search donations, create matches, optimize routes, and more — all with your approval.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {["Find me food nearby", "Donate my surplus", "Check expiring donations", "My stats"].map((q) => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          className="text-xs rounded-full border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/20 hover:text-white"
                          onClick={() => { setInput(q); }}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
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
                          ? 'bg-gradient-to-br from-cyan-500 to-teal-500 text-white rounded-br-md shadow-[0_0_20px_-5px_hsl(180_100%_50%_/0.4)]'
                          : 'bg-slate-900/80 border border-cyan-400/30 rounded-bl-md backdrop-blur-sm'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none leading-relaxed [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 text-cyan-50">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Pending Actions */}
                {pendingActions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-cyan-300 uppercase tracking-wider">
                      <Zap className="h-3 w-3" />
                      Pending Approvals
                    </div>
                    {pendingActions.map((action) => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900/80 border-2 border-cyan-400/40 rounded-xl p-4 shadow-sm backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3">
                          {getActionIcon(action.action_type)}
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-xs mb-2 border-cyan-400/40 text-cyan-200">
                              {action.action_type.replace('_', ' ')}
                            </Badge>
                            <p className="text-sm text-cyan-50 leading-relaxed">
                              {action.description}
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => handleApproveAction(action)}
                                className="text-xs gap-1 bg-cyan-500 hover:bg-cyan-600 shadow-[0_0_15px_-3px_hsl(180_100%_50%_/0.5)]"
                              >
                                <Check className="h-3 w-3" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectAction(action)}
                                className="text-xs gap-1 text-cyan-200 hover:bg-cyan-500/20"
                              >
                                <XIcon className="h-3 w-3" /> Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-slate-900/80 border border-cyan-400/30 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Brain className="h-4 w-4 text-cyan-400" />
                        </motion.div>
                        <span className="text-xs text-cyan-200/70">Agent is thinking & executing tools...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-cyan-400/30 bg-slate-950/80 backdrop-blur-sm">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask the holographic agent anything..."
                  disabled={isLoading}
                  className="border-cyan-400/30 focus-visible:ring-cyan-400 rounded-xl bg-slate-900/80 text-cyan-50 placeholder:text-cyan-200/40"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-[0_0_20px_-5px_hsl(180_100%_50%_/0.5)] border-0"
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
