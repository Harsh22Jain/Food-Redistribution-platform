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
      case 'auto_match': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'route_optimize': return <Brain className="h-4 w-4 text-blue-500" />;
      case 'proactive_alert': return <Sparkles className="h-4 w-4 text-orange-500" />;
      case 'task_execute': return <Check className="h-4 w-4 text-green-500" />;
      default: return <Bot className="h-4 w-4" />;
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
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          {pendingActions.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center z-20 font-bold">
              {pendingActions.length}
            </span>
          )}
          <div className="absolute inset-0 rounded-full ring-2 ring-emerald-400/30 animate-ping" />
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Brain className="h-7 w-7 text-white relative z-10" />
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
        <Card className="w-[420px] h-[600px] shadow-2xl flex flex-col overflow-hidden border-0 bg-gradient-to-b from-background to-background/95 backdrop-blur-xl">
          <CardHeader className="relative pb-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMSIgY3g9IjIwIiBjeT0iMjAiIHI9IjEiLz48L2c+PC9zdmc+')] opacity-50" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(255,255,255,0.4)",
                      "0 0 0 10px rgba(255,255,255,0)",
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <Brain className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg">NourishNet Agent</h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                    Agentic AI • Suggest & Confirm
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
                      className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
                    >
                      <Brain className="h-8 w-8 text-white" />
                    </motion.div>
                    <p className="font-semibold text-foreground mb-1">NourishNet AI Agent</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      I can search donations, create matches, optimize routes, and more — all with your approval.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {["Find me food nearby", "Donate my surplus", "Check expiring donations", "My stats"].map((q) => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          className="text-xs rounded-full"
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
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/30 rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none leading-relaxed [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
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
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Zap className="h-3 w-3" />
                      Pending Approvals
                    </div>
                    {pendingActions.map((action) => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-800 border-2 border-primary/20 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          {getActionIcon(action.action_type)}
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-xs mb-2">
                              {action.action_type.replace('_', ' ')}
                            </Badge>
                            <p className="text-sm text-foreground leading-relaxed">
                              {action.description}
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => handleApproveAction(action)}
                                className="text-xs gap-1 bg-emerald-500 hover:bg-emerald-600"
                              >
                                <Check className="h-3 w-3" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectAction(action)}
                                className="text-xs gap-1 text-destructive"
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
                    <div className="bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Brain className="h-4 w-4 text-primary" />
                        </motion.div>
                        <span className="text-xs text-muted-foreground">Agent is thinking & executing tools...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-emerald-100 dark:border-emerald-900/30 bg-background/80 backdrop-blur-sm">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask the agent anything..."
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
