import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send,
  Sparkles,
  TrendingUp,
  Brain,
  Loader2,
  ArrowLeft,
  BarChart3,
  Heart,
  Target,
  Lightbulb,
  Calendar,
  CheckCircle2,
  Activity,
  Zap,
  MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO, subDays, differenceInDays } from "date-fns";

const QUICK_PROMPTS = [
  { label: "Analyze my mood trends", icon: TrendingUp, prompt: "Can you analyze my mood trends over the past week and tell me what patterns you see?" },
  { label: "Review my goals", icon: Target, prompt: "Can you review my current goals and help me understand which ones I should prioritize?" },
  { label: "Weekly check-in", icon: Calendar, prompt: "Let's do a weekly check-in. How am I doing overall?" },
  { label: "What patterns do you see?", icon: Brain, prompt: "What patterns have you noticed in my journal entries and mood check-ins?" }
];

export default function AIMentor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [proactiveInsights, setProactiveInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: allEntries = [] } = useQuery({
    queryKey: ['allEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-created_date', 100),
  });

  const { data: allMoods = [] } = useQuery({
    queryKey: ['allMoods'],
    queryFn: () => base44.entities.MoodCheckin.list('-created_date', 100),
  });

  const { data: allGoals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 100),
  });

  const recentEntries = allEntries.slice(0, 10);
  const recentMoods = allMoods.slice(0, 10);
  const activeGoals = allGoals.filter(g => g.status === 'in_progress');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateUserContext = () => {
    const last7Days = subDays(new Date(), 7);
    const last30Days = subDays(new Date(), 30);

    const recent7Entries = allEntries.filter(e => new Date(e.created_date) >= last7Days);
    const recent7Moods = allMoods.filter(m => new Date(m.created_date) >= last7Days);
    const recent30Entries = allEntries.filter(e => new Date(e.created_date) >= last30Days);

    const avgMood7d = recent7Moods.length > 0 
      ? (recent7Moods.reduce((s, m) => s + m.mood_score, 0) / recent7Moods.length).toFixed(1)
      : null;

    const avgMood30d = allMoods.filter(m => new Date(m.created_date) >= last30Days).length > 0
      ? (allMoods.filter(m => new Date(m.created_date) >= last30Days).reduce((s, m) => s + m.mood_score, 0) / allMoods.filter(m => new Date(m.created_date) >= last30Days).length).toFixed(1)
      : null;

    const allThemes = recent30Entries.flatMap(e => e.ai_themes || []);
    const themeFreq = {};
    allThemes.forEach(t => themeFreq[t] = (themeFreq[t] || 0) + 1);
    const topThemes = Object.entries(themeFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => `${theme} (${count}x)`);

    const allEmotions = recent30Entries.flatMap(e => e.emotions || []);
    const emotionFreq = {};
    allEmotions.forEach(e => emotionFreq[e] = (emotionFreq[e] || 0) + 1);
    const topEmotions = Object.entries(emotionFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, count]) => `${emotion} (${count}x)`);

    const sentiments = recent30Entries.filter(e => e.ai_sentiment).map(e => e.ai_sentiment);
    const sentimentCounts = {
      positive: sentiments.filter(s => s.includes('positive')).length,
      negative: sentiments.filter(s => s.includes('negative')).length,
      neutral: sentiments.filter(s => s === 'neutral').length
    };

    const avgSleep = recent7Moods.filter(m => m.sleep_hours).length > 0
      ? (recent7Moods.reduce((s, m) => s + (m.sleep_hours || 0), 0) / recent7Moods.filter(m => m.sleep_hours).length).toFixed(1)
      : null;

    const avgExercise = recent7Moods.filter(m => m.exercise_minutes).length > 0
      ? (recent7Moods.reduce((s, m) => s + (m.exercise_minutes || 0), 0) / recent7Moods.filter(m => m.exercise_minutes).length).toFixed(0)
      : null;

    const avgStress = recent7Moods.filter(m => m.stress_level).length > 0
      ? (recent7Moods.reduce((s, m) => s + (m.stress_level || 0), 0) / recent7Moods.filter(m => m.stress_level).length).toFixed(1)
      : null;

    const goalSummary = activeGoals.map(g => ({
      title: g.title,
      progress: g.progress_percentage || 0,
      category: g.category,
      daysUntilTarget: g.target_date ? differenceInDays(parseISO(g.target_date), new Date()) : null
    }));

    const coachHistory = user?.ai_coach_history || [];
    const recentHistory = coachHistory.slice(-3);

    return {
      profile: {
        name: user?.full_name?.split(' ')[0] || 'there',
        relationship_status: user?.relationship_status,
        employment: user?.employment,
        life_stage: user?.life_stage,
        parenthood: user?.parenthood
      },
      journaling: {
        total_entries: user?.total_entries || 0,
        current_streak: user?.current_streak || 0,
        longest_streak: user?.longest_streak || 0,
        entries_last_7d: recent7Entries.length,
        entries_last_30d: recent30Entries.length
      },
      mood: {
        avg_7d: avgMood7d,
        avg_30d: avgMood30d,
        trend: avgMood7d && avgMood30d ? (parseFloat(avgMood7d) > parseFloat(avgMood30d) ? 'improving' : parseFloat(avgMood7d) < parseFloat(avgMood30d) ? 'declining' : 'stable') : null,
        recent_checkins: recent7Moods.length
      },
      patterns: {
        top_themes: topThemes,
        top_emotions: topEmotions,
        sentiment_distribution: sentimentCounts
      },
      lifestyle: {
        avg_sleep_7d: avgSleep,
        avg_exercise_7d: avgExercise,
        avg_stress_7d: avgStress
      },
      goals: {
        active_count: activeGoals.length,
        completed_count: allGoals.filter(g => g.status === 'completed').length,
        summary: goalSummary
      },
      recent_insights: recentEntries.slice(0, 3).map(e => ({
        date: format(parseISO(e.created_date), 'MMM d'),
        insight: e.ai_insights,
        sentiment: e.ai_sentiment,
        themes: e.ai_themes
      })),
      previous_coaching: {
        recent_sessions: recentHistory,
        all_suggestions: coachHistory.flatMap(h => h.suggestions_given || []),
        all_patterns: coachHistory.flatMap(h => h.patterns_identified || []),
        all_topics: coachHistory.flatMap(h => h.topics_discussed || [])
      }
    };
  };

  const generateProactiveInsights = async () => {
    if (allEntries.length < 3) {
      setProactiveInsights({
        message: "Keep journaling! I need a bit more data to provide meaningful insights.",
        insights: [],
        patterns: [],
        recommendations: [],
        encouragement: "You're off to a great start. Write 3+ entries and I'll provide personalized analysis."
      });
      return;
    }

    setLoadingInsights(true);
    try {
      const context = generateUserContext();

      const prompt = `You are an AI mental health coach analyzing data for ${context.profile.name}, a man working on his mental health.

COMPLETE USER PROFILE:
${JSON.stringify(context, null, 2)}

PREVIOUS COACHING HISTORY:
${context.previous_coaching.recent_sessions.length > 0 ? `
Last sessions: ${JSON.stringify(context.previous_coaching.recent_sessions, null, 2)}

Previously suggested actions (DO NOT REPEAT THESE):
${context.previous_coaching.all_suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Previously identified patterns (acknowledge if still relevant, but focus on NEW patterns):
${context.previous_coaching.all_patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}
` : 'First coaching session - no previous history'}

As his AI coach, provide FRESH insights:

1. PATTERN RECOGNITION (2-3 NEW patterns not previously identified)
   - Look for NEW correlations between mood, sleep, exercise, stress
   - Identify EMERGING or CHANGED patterns since last session
   - Note NEW behavioral patterns
   - If old patterns persist, briefly acknowledge progress/lack of progress

2. PERSONALIZED INSIGHTS (3-4 specific NEW observations)
   - What's NEWLY working well for him
   - What RECENTLY needs attention
   - NEW discoveries in his data since last session
   - Recent progress on previously discussed issues

3. ACTIONABLE RECOMMENDATIONS (3-4 concrete DIFFERENT next steps)
   - MUST BE DIFFERENT from previously given suggestions
   - Based on NEW patterns or lack of progress on old patterns
   - Specific to his current situation
   - Prioritized by current impact
   - Include "why now" for each recommendation

4. ENCOURAGING OBSERVATION (1-2 sentences)
   - Acknowledge his continued effort
   - Highlight specific progress since last session
   - Masculine, direct, motivating tone

IMPORTANT: 
- Focus on what's CHANGED or is NEW
- Do NOT repeat old suggestions unless explaining why they're still critical
- If suggesting something previously mentioned, acknowledge it: "I mentioned X before - here's why it's even more important now..."
- Provide FRESH perspectives and NEW actionable steps

Return JSON format. Be specific and reference actual data points.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: { type: "string" }
            },
            insights: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  reason: { type: "string" },
                  priority: { type: "string" },
                  is_new: { type: "boolean" }
                }
              }
            },
            encouragement: { type: "string" }
          }
        }
      });

      const coachHistory = user?.ai_coach_history || [];
      const newSession = {
        date: new Date().toISOString().split('T')[0],
        suggestions_given: result.recommendations?.map(r => r.action) || [],
        patterns_identified: result.patterns || [],
        topics_discussed: [...new Set([
          ...context.patterns.top_themes.map(t => t.split(' ')[0]),
          ...(result.patterns || []).map(p => p.split(' ')[0].toLowerCase())
        ])].slice(0, 5)
      };

      await base44.auth.updateMe({
        ai_coach_history: [...coachHistory, newSession]
      });

      const updatedUser = await base44.auth.me();
      setUser(updatedUser);

      setProactiveInsights(result);
    } catch (error) {
      console.error("Insights generation failed:", error);
      setProactiveInsights({
        patterns: [],
        insights: [],
        recommendations: [],
        encouragement: "Having trouble analyzing your data right now. Try again later."
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (user && !initialized && allEntries.length >= 3 && messages.length === 0) {
      const initializeCoach = async () => {
        const context = generateUserContext();

        const welcomePrompt = `You are an AI mental health coach greeting ${context.profile.name}.

DATA SUMMARY:
- Journaling: ${context.journaling.total_entries} entries, ${context.journaling.current_streak} day streak
- Recent Mood: ${context.mood.avg_7d || 'N/A'}/5 (${context.mood.trend || 'unknown'} trend)
- Top Themes: ${context.patterns.top_themes.slice(0, 3).join(', ') || 'None yet'}
- Active Goals: ${context.goals.active_count}

Create a warm, personalized greeting (2-3 sentences). Reference specific data to show you've been analyzing his progress. Ask one thoughtful question to start the conversation. Be masculine, direct, supportive.`;

        try {
          const greeting = await base44.integrations.Core.InvokeLLM({
            prompt: welcomePrompt,
            add_context_from_internet: false
          });

          setMessages([{
            role: 'assistant',
            content: greeting,
            timestamp: new Date(),
            type: 'text'
          }]);
          setInitialized(true);
        } catch (error) {
          console.error("Failed to generate greeting:", error);
          setMessages([{
            role: 'assistant',
            content: `Hey ${context.profile.name}! I'm your AI Coach. I've been analyzing your ${context.journaling.total_entries} journal entries and I'm ready to help. What's on your mind?`,
            timestamp: new Date(),
            type: 'text'
          }]);
          setInitialized(true);
        }
      };
      initializeCoach();
    }
  }, [user, allEntries.length, messages.length, initialized]);

  useEffect(() => {
    if (activeTab === 'insights' && !proactiveInsights && allEntries.length >= 3) {
      generateProactiveInsights();
    }
  }, [activeTab, proactiveInsights, allEntries.length]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const context = generateUserContext();

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI mental health coach for men. You're supportive, direct, action-oriented, evidence-based, and non-judgmental.

COMPLETE USER DATA:
${JSON.stringify(context, null, 2)}

PREVIOUS COACHING SESSIONS:
${context.previous_coaching.all_suggestions.length > 0 ? `
Previously suggested (reference if relevant, but don't just repeat):
${context.previous_coaching.all_suggestions.slice(-5).map((s, i) => `- ${s}`).join('\n')}

Previously discussed topics:
${context.previous_coaching.all_topics.slice(-10).join(', ')}
` : 'First conversation with user'}

CONVERSATION HISTORY:
${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

USER MESSAGE: ${currentInput}

Provide a supportive, insightful response as his coach. 

GUIDELINES:
- Reference specific data points when relevant (e.g., "I noticed your mood dipped to 2.8 on Oct 28th...")
- Identify patterns across journal entries, moods, and behaviors
- Build on previous conversations if relevant
- If you previously suggested something, ask about progress instead of repeating
- Ask clarifying questions to understand deeper
- Provide NEW actionable advice based on his actual data
- Use masculine psychology principles - focus on growth, action, problem-solving
- Be conversational but concise (3-5 sentences max unless explaining something complex)
- If he mentions crisis/suicidal thoughts, immediately suggest calling 988

Return ONLY your response text, nothing else.`,
        add_context_from_internet: false
      });

      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI response failed:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble processing that. Can you try rephrasing?",
        timestamp: new Date(),
        type: 'text'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Coach
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-gray-800">
          <TabsList className="max-w-6xl mx-auto grid grid-cols-2 bg-transparent h-12">
            <TabsTrigger value="chat" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              Insights
              {!proactiveInsights && allEntries.length >= 3 && (
                <Badge className="ml-2 bg-purple-500 text-white animate-pulse">New</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col m-0">
          <div className="border-b border-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs text-gray-400 mb-3 uppercase font-semibold">Quick Topics</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(qp.prompt)}
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 justify-start"
                  >
                    <qp.icon className="w-4 h-4 mr-2" />
                    {qp.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 && allEntries.length < 3 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Your AI Mental Health Coach</h2>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    I analyze your journal entries, mood patterns, sleep, exercise, and goals to provide personalized coaching. 
                  </p>
                  <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg max-w-lg mx-auto mb-6">
                    <p className="text-yellow-400 text-sm">
                      📝 Write at least 3 journal entries first, then I'll provide personalized insights and coaching.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <p className="text-white font-semibold text-sm mb-1">✅ I can help with:</p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Pattern recognition</li>
                        <li>• Mood analysis</li>
                        <li>• Goal prioritization</li>
                        <li>• Stress management</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <p className="text-white font-semibold text-sm mb-1">🔒 Your privacy:</p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Data stays private</li>
                        <li>• No human sees it</li>
                        <li>• AI analysis only</li>
                        <li>• Fully confidential</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message, idx) => (
                <div key={idx}>
                  {message.role === 'assistant' ? (
                    <div className="flex gap-3 items-end">
                      <Avatar className="w-10 h-10 border-2 border-purple-500">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          <Brain className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-gray-400 mb-1">AI Coach</p>
                        <div className="bg-gray-800 rounded-lg rounded-bl-none p-4">
                          <p className="text-white whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-end justify-end">
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-gray-400 mb-1 text-right">You</p>
                        <div className="bg-blue-500 rounded-lg rounded-br-none p-4">
                          <p className="text-white whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                      <Avatar className="w-10 h-10 border-2 border-blue-500">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                          {user?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-end">
                  <Avatar className="w-10 h-10 border-2 border-purple-500">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      <Brain className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-800 rounded-lg rounded-bl-none p-4">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Input
                placeholder={allEntries.length < 3 ? "Write 3 journal entries to start coaching..." : "Ask me anything about your mental health journey..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={allEntries.length < 3 || loading}
                className="flex-1 bg-gray-800 border-gray-700 text-white"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || loading || allEntries.length < 3}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              AI coaching is for guidance only. Seek professional help for serious concerns. Crisis? Call 988.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="flex-1 overflow-y-auto m-0">
          <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Proactive Analysis</h2>
                <p className="text-gray-400">AI-discovered patterns and fresh recommendations</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateProactiveInsights}
                disabled={loadingInsights || allEntries.length < 3}
                className="bg-purple-500/20 border-purple-500/50 text-white"
              >
                {loadingInsights ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Refresh Analysis
              </Button>
            </div>

            {user?.ai_coach_history && user.ai_coach_history.length > 0 && (
              <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-400 font-semibold">Coaching History</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {user.ai_coach_history.length} previous session{user.ai_coach_history.length !== 1 ? 's' : ''} • 
                        Last: {format(parseISO(user.ai_coach_history[user.ai_coach_history.length - 1].date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge className="bg-blue-500 text-white">
                      {user.ai_coach_history.flatMap(h => h.suggestions_given || []).length} total suggestions given
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingInsights ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
                  <p className="text-gray-400">Analyzing your data...</p>
                </CardContent>
              </Card>
            ) : !proactiveInsights ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">
                    {allEntries.length < 3 
                      ? "Write at least 3 journal entries to get personalized insights"
                      : "Click 'Refresh Analysis' to generate insights"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {proactiveInsights.encouragement && (
                  <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                        <p className="text-lg text-white font-semibold">{proactiveInsights.encouragement}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {proactiveInsights.patterns && proactiveInsights.patterns.length > 0 && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-cyan-500" />
                        Patterns I've Identified
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {proactiveInsights.patterns.map((pattern, idx) => (
                        <div key={idx} className="p-4 bg-gray-800 rounded-lg border-l-4 border-cyan-500">
                          <p className="text-white">{pattern}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {proactiveInsights.insights && proactiveInsights.insights.length > 0 && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {proactiveInsights.insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-4 bg-gray-800 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-yellow-500 font-bold">{idx + 1}</span>
                          </div>
                          <p className="text-gray-300 flex-1">{insight}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {proactiveInsights.recommendations && proactiveInsights.recommendations.length > 0 && (
                  <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/50">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-400" />
                        Fresh Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {proactiveInsights.recommendations.map((rec, idx) => (
                        <Card key={idx} className={`border ${getPriorityColor(rec.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${getPriorityColor(rec.priority)}`}>
                                <Target className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h4 className="font-semibold text-white">{rec.action}</h4>
                                  <Badge className={getPriorityColor(rec.priority)}>
                                    {rec.priority}
                                  </Badge>
                                  {rec.is_new !== false && (
                                    <Badge className="bg-green-500 text-white animate-pulse">
                                      ✨ NEW
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-300 text-sm">{rec.reason}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-500" />
                      Your Data at a Glance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="w-4 h-4 text-pink-500" />
                          <p className="text-sm text-gray-400">Mood Trend</p>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {generateUserContext().mood.avg_7d || '—'}/5
                        </p>
                        <p className="text-xs text-gray-500 mt-1">7-day average</p>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          <p className="text-sm text-gray-400">Streak</p>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {user?.current_streak || 0}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">days active</p>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-green-500" />
                          <p className="text-sm text-gray-400">Active Goals</p>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {activeGoals.length}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">in progress</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}