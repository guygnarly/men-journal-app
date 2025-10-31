
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp,
  TrendingDown,
  Calendar,
  Brain,
  Heart,
  Target,
  Award,
  Zap,
  BarChart3,
  Activity,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Dumbbell,
  Coffee,
  ArrowRight,
  Loader2,
  Users // Added for getCategoryIcon
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';
import { format, parseISO, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

export default function Insights() {
  const [timeRange, setTimeRange] = useState('30days');
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-created_date', 1000),
  });

  const { data: moodCheckins = [] } = useQuery({
    queryKey: ['moodCheckins'],
    queryFn: () => base44.entities.MoodCheckin.list('-created_date', 1000),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 1000),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('-priority', 100),
  });

  // Calculate date range
  const daysCount = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
  const startDate = subDays(new Date(), daysCount);

  // Filter data by time range
  const filteredEntries = entries.filter(e => new Date(e.created_date) >= startDate);
  const filteredCheckins = moodCheckins.filter(m => new Date(m.created_date) >= startDate);

  // Calculate correlations
  const correlations = useMemo(() => {
    const data = filteredCheckins.filter(c => 
      c.mood_score && c.sleep_hours && c.energy_level && c.stress_level && c.exercise_minutes !== undefined
    );

    if (data.length < 5) return null;

    const calculateCorrelation = (x, y) => {
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

      return denominator === 0 ? 0 : numerator / denominator;
    };

    const moods = data.map(d => d.mood_score);
    const sleep = data.map(d => d.sleep_hours);
    const energy = data.map(d => d.energy_level);
    const stress = data.map(d => 6 - d.stress_level); // Invert stress for correlation (lower stress = higher value)
    const exercise = data.map(d => Math.min(d.exercise_minutes / 30, 5)); // Scale exercise for correlation

    return {
      sleep_mood: calculateCorrelation(sleep, moods),
      exercise_mood: calculateCorrelation(exercise, moods),
      stress_mood: calculateCorrelation(stress, moods),
      energy_mood: calculateCorrelation(energy, moods),
      sleep_energy: calculateCorrelation(sleep, energy)
    };
  }, [filteredCheckins]);

  // Mood Trend Data
  const moodTrendData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: new Date() });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayCheckins = filteredCheckins.filter(m => 
        format(parseISO(m.created_date), 'yyyy-MM-dd') === dayStr
      );
      const dayEntries = filteredEntries.filter(e => 
        format(parseISO(e.created_date), 'yyyy-MM-dd') === dayStr
      );
      
      const moodScores = [
        ...dayCheckins.map(m => m.mood_score),
        ...dayEntries.filter(e => e.mood_score).map(e => e.mood_score)
      ];
      
      return {
        date: format(day, 'MMM d'),
        mood: moodScores.length > 0 ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : null,
        entries: dayEntries.length
      };
    });
  }, [filteredEntries, filteredCheckins, startDate]);

  // Entry Frequency
  const entryFrequency = useMemo(() => {
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = weekDays.map(() => 0);
    
    filteredEntries.forEach(entry => {
      const day = new Date(entry.created_date).getDay();
      counts[day]++;
    });
    
    return weekDays.map((day, idx) => ({
      day: day.slice(0, 3),
      count: counts[idx]
    }));
  }, [filteredEntries]);

  // Emotion Distribution
  const emotionData = useMemo(() => {
    const emotionCounts = {};
    filteredEntries.forEach(entry => {
      entry.emotions?.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });
    
    return Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  // AI Sentiment Distribution
  const sentimentData = useMemo(() => {
    const sentiments = {};
    filteredEntries.forEach(entry => {
      if (entry.ai_sentiment) {
        sentiments[entry.ai_sentiment] = (sentiments[entry.ai_sentiment] || 0) + 1;
      }
    });
    
    return Object.entries(sentiments).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value
    }));
  }, [filteredEntries]);

  // Theme Analysis
  const themeData = useMemo(() => {
    const themes = {};
    filteredEntries.forEach(entry => {
      entry.ai_themes?.forEach(theme => {
        themes[theme] = (themes[theme] || 0) + 1;
      });
    });
    
    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  // Sleep & Energy Analysis
  const wellnessData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: new Date() });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayCheckins = filteredCheckins.filter(m => 
        format(parseISO(m.created_date), 'yyyy-MM-dd') === dayStr
      );
      
      if (dayCheckins.length === 0) return null;
      
      const avgSleep = dayCheckins.reduce((sum, m) => sum + (m.sleep_hours || 0), 0) / dayCheckins.length;
      const avgEnergy = dayCheckins.reduce((sum, m) => sum + (m.energy_level || 0), 0) / dayCheckins.length;
      const avgStress = dayCheckins.reduce((sum, m) => sum + (m.stress_level || 0), 0) / dayCheckins.length;
      
      return {
        date: format(day, 'MMM d'),
        sleep: avgSleep || null,
        energy: avgEnergy || null,
        stress: avgStress || null
      };
    }).filter(d => d && (d.sleep || d.energy || d.stress));
  }, [filteredCheckins, startDate]);

  // Statistics
  const stats = useMemo(() => {
    const avgMood = filteredCheckins.length > 0
      ? filteredCheckins.reduce((sum, m) => sum + m.mood_score, 0) / filteredCheckins.length
      : null;
    
    const avgSleep = filteredCheckins.filter(m => m.sleep_hours).length > 0
      ? filteredCheckins.reduce((sum, m) => sum + (m.sleep_hours || 0), 0) / filteredCheckins.filter(m => m.sleep_hours).length
      : null;

    const avgExercise = filteredCheckins.filter(m => m.exercise_minutes).length > 0
      ? filteredCheckins.reduce((sum, m) => sum + (m.exercise_minutes || 0), 0) / filteredCheckins.filter(m => m.exercise_minutes).length
      : null;

    const avgStress = filteredCheckins.filter(m => m.stress_level).length > 0
      ? filteredCheckins.reduce((sum, m) => sum + (m.stress_level || 0), 0) / filteredCheckins.filter(m => m.stress_level).length
      : null;
    
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const avgGoalProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length
      : 0;
    
    return {
      totalEntries: filteredEntries.length,
      avgMood: avgMood?.toFixed(1),
      avgSleep: avgSleep?.toFixed(1),
      avgExercise: avgExercise?.toFixed(0),
      avgStress: avgStress?.toFixed(1),
      completedGoals,
      avgGoalProgress: avgGoalProgress.toFixed(0),
      currentStreak: user?.current_streak || 0,
      longestStreak: user?.longest_streak || 0
    };
  }, [filteredEntries, filteredCheckins, goals, user]);

  // Mood Correlation Analysis for Radar Chart
  const correlationData = useMemo(() => {
    const data = [];
    
    filteredCheckins.forEach(checkin => {
      if (checkin.mood_score && checkin.sleep_hours && checkin.energy_level && checkin.stress_level && checkin.exercise_minutes !== undefined) {
        data.push({
          mood: checkin.mood_score,
          sleep: checkin.sleep_hours,
          energy: checkin.energy_level,
          stress: 6 - checkin.stress_level, // Invert stress (lower is better, so 1=5, 5=1)
          exercise: Math.min(checkin.exercise_minutes / 10, 5) // Scale to 0-5
        });
      }
    });
    
    if (data.length === 0) return [];
    
    // Average each metric
    const avgData = {
      sleep: data.reduce((s, d) => s + d.sleep, 0) / data.length,
      energy: data.reduce((s, d) => s + d.energy, 0) / data.length,
      stress: data.reduce((s, d) => s + d.stress, 0) / data.length,
      exercise: data.reduce((s, d) => s + d.exercise, 0) / data.length,
      mood: data.reduce((s, d) => s + d.mood, 0) / data.length
    };
    
    return [
      { factor: 'Sleep', value: avgData.sleep, fullMark: 5 },
      { factor: 'Energy', value: avgData.energy, fullMark: 5 },
      { factor: 'Low Stress', value: avgData.stress, fullMark: 5 },
      { factor: 'Exercise', value: avgData.exercise, fullMark: 5 },
      { factor: 'Mood', value: avgData.mood, fullMark: 5 }
    ];
  }, [filteredCheckins]);

  // Scatter plot data for correlations
  const scatterData = useMemo(() => {
    return filteredCheckins
      .filter(c => c.mood_score && c.sleep_hours)
      .map(c => ({
        sleep: c.sleep_hours,
        mood: c.mood_score,
        exercise: c.exercise_minutes || 0
      }));
  }, [filteredCheckins]);

  // Generate AI Recommendations
  const generateAIRecommendations = async () => {
    if (filteredCheckins.length < 5 || filteredEntries.length < 3) {
      setAiRecommendations({
        message: "Not enough data yet. Keep journaling and checking in for personalized recommendations!",
        recommendations: []
      });
      return;
    }

    setLoadingAI(true);
    try {
      const prompt = `You are a mental health AI assistant analyzing a man's wellness data. Generate personalized, actionable recommendations.

DATA SUMMARY:
- Avg Mood: ${stats.avgMood || 'N/A'}/5
- Avg Sleep: ${stats.avgSleep || 'N/A'} hours
- Avg Exercise: ${stats.avgExercise || 'N/A'} minutes/day
- Avg Stress: ${stats.avgStress || 'N/A'}/5
- Current Streak: ${stats.currentStreak} days
- Total Entries: ${stats.totalEntries}

CORRELATIONS:
${correlations ? `
- Sleep → Mood: ${(correlations.sleep_mood * 100).toFixed(0)}% correlation
- Exercise → Mood: ${(correlations.exercise_mood * 100).toFixed(0)}% correlation
- Stress → Mood: ${(correlations.stress_mood * 100).toFixed(0)}% correlation (inverse: higher stress = lower mood)
- Energy → Mood: ${(correlations.energy_mood * 100).toFixed(0)}% correlation
` : 'Not enough data for correlations'}

TOP THEMES: ${themeData.length > 0 ? themeData.slice(0, 5).map(t => t.name).join(', ') : 'None detected'}

TOP EMOTIONS: ${emotionData.length > 0 ? emotionData.slice(0, 5).map(e => e.name).join(', ') : 'None detected'}

SENTIMENT DISTRIBUTION: ${sentimentData.length > 0 ? sentimentData.map(s => `${s.name}: ${s.value}`).join(', ') : 'None detected'}

Provide 3-5 specific, actionable recommendations. For each:
1. What to do (specific action)
2. Why it will help (based on data)
3. Category (sleep, exercise, stress, journaling, therapy, or social)
4. Priority (high, medium, low)
5. Relevant resource type if applicable (crisis, therapy, support_groups, self_help, mindfulness, nutrition, physical_activity, social_support, etc.)

Return JSON array.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  reasoning: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  resource_type: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiRecommendations(result);
    } catch (error) {
      console.error("AI recommendations failed:", error);
      setAiRecommendations({
        recommendations: [],
        message: "Failed to generate recommendations. Try again later."
      });
    } finally {
      setLoadingAI(false);
    }
  };

  // Generate Weekly/Monthly Reports
  const generateReports = async () => {
    if (entries.length < 3) {
      setWeeklyReport({
        achievement: "Not enough data for a weekly report yet.",
        focus_area: "Keep logging your entries and check-ins!",
        trend: "Consistency is key.",
        motivation: "Every day brings new insights."
      });
      setMonthlyReport({
        overall: "Not enough data for a monthly report yet.",
        biggest_win: "Start by logging regularly.",
        growth_area: "Building a data foundation.",
        next_focus: "Log 10 entries and 5 check-ins."
      });
      return;
    }

    setLoadingReports(true);
    try {
      // Weekly Report
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Assuming Sunday is start of week
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
      const weekEntries = entries.filter(e => {
        const date = parseISO(e.created_date);
        return date >= weekStart && date <= weekEnd;
      });
      const weekCheckins = moodCheckins.filter(c => {
        const date = parseISO(c.created_date);
        return date >= weekStart && date <= weekEnd;
      });

      const weeklyPrompt = `Analyze this week's mental health data for a man and create a supportive, motivating summary.

WEEKLY DATA:
- Journal Entries: ${weekEntries.length}
- Mood Check-ins: ${weekCheckins.length}
- Avg Mood: ${weekCheckins.length > 0 ? (weekCheckins.reduce((s, c) => s + c.mood_score, 0) / weekCheckins.length).toFixed(1) : 'N/A'}
- Top Themes: ${weekEntries.flatMap(e => e.ai_themes || []).filter(Boolean).slice(0, 5).join(', ')}
- Top Emotions: ${weekEntries.flatMap(e => e.emotions || []).filter(Boolean).slice(0, 5).join(', ')}
- Current Streak: ${stats.currentStreak}

Provide:
1. Key Achievement (what went well)
2. Area for Focus (what needs attention)
3. Trend Observation (what's changing)
4. Motivational Note (encouragement)

Keep it masculine, direct, and actionable. No fluff. Return JSON.`;

      const weeklyResult = await base44.integrations.Core.InvokeLLM({
        prompt: weeklyPrompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            achievement: { type: "string" },
            focus_area: { type: "string" },
            trend: { type: "string" },
            motivation: { type: "string" }
          }
        }
      });
      setWeeklyReport(weeklyResult);

      // Monthly Report
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      const monthEntries = entries.filter(e => {
        const date = parseISO(e.created_date);
        return date >= monthStart && date <= monthEnd;
      });
      const monthCheckins = moodCheckins.filter(c => {
        const date = parseISO(c.created_date);
        return date >= monthStart && date <= monthEnd;
      });

      const monthlyPrompt = `Analyze this month's mental health data and create a comprehensive progress report.

MONTHLY DATA:
- Journal Entries: ${monthEntries.length}
- Mood Check-ins: ${monthCheckins.length}
- Avg Mood: ${monthCheckins.length > 0 ? (monthCheckins.reduce((s, c) => s + c.mood_score, 0) / monthCheckins.length).toFixed(1) : 'N/A'}
- Goals Completed: ${stats.completedGoals}
- Avg Goal Progress: ${stats.avgGoalProgress}%
- Top Themes: ${monthEntries.flatMap(e => e.ai_themes || []).filter(Boolean).slice(0, 8).join(', ')}
- Consistency: ${stats.currentStreak} day streak

Provide:
1. Overall Progress (holistic assessment)
2. Biggest Win (major achievement)
3. Growth Area (what improved)
4. Next Month Focus (1-2 specific goals)

Be honest, supportive, and forward-looking. Return JSON.`;

      const monthlyResult = await base44.integrations.Core.InvokeLLM({
        prompt: monthlyPrompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            overall: { type: "string" },
            biggest_win: { type: "string" },
            growth_area: { type: "string" },
            next_focus: { type: "string" }
          }
        }
      });
      setMonthlyReport(monthlyResult);

    } catch (error) {
      console.error("Report generation failed:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  // Auto-generate on mount if enough data
  useEffect(() => {
    // Only generate if recommendations haven't been loaded yet and there's enough data
    if (aiRecommendations === null && filteredCheckins.length >= 5 && filteredEntries.length >= 3) {
      generateAIRecommendations();
    }
  }, [filteredCheckins.length, filteredEntries.length, aiRecommendations]);

  useEffect(() => {
    // Only generate if reports haven't been loaded yet and there's enough data
    if (entries.length >= 3 && weeklyReport === null && monthlyReport === null) {
      generateReports();
    }
  }, [entries.length, weeklyReport, monthlyReport]);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'sleep': return <Moon className="w-4 h-4" />;
      case 'exercise': return <Dumbbell className="w-4 h-4" />;
      case 'stress': return <Brain className="w-4 h-4" />;
      case 'journaling': return <BarChart3 className="w-4 h-4" />;
      case 'therapy': return <Heart className="w-4 h-4" />;
      case 'social': return <Users className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getResourcesByType = (resourceType) => {
    if (!resourceType) return [];
    // Ensure resourceType matches categories in your Resource entity (e.g., "Crisis", "Therapy")
    return resources.filter(r => r.category && r.category.toLowerCase().replace(/ /g, '_') === resourceType.toLowerCase().replace(/ /g, '_')).slice(0, 3);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Insights</h1>
            <p className="text-gray-400">Track your progress and discover patterns</p>
          </div>
          <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
            <TabsList className="bg-gray-900 border border-gray-800">
              <TabsTrigger value="7days" className="data-[state=active]:bg-gray-800">7 Days</TabsTrigger>
              <TabsTrigger value="30days" className="data-[state=active]:bg-gray-800">30 Days</TabsTrigger>
              <TabsTrigger value="90days" className="data-[state=active]:bg-gray-800">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <TrendingUp className="w-3 h-3 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.totalEntries}</div>
              <p className="text-xs text-gray-400">Entries</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Heart className="w-4 h-4 text-pink-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.avgMood || '—'}</div>
              <p className="text-xs text-gray-400">Avg Mood</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.currentStreak}</div>
              <p className="text-xs text-gray-400">Day Streak</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.longestStreak}</div>
              <p className="text-xs text-gray-400">Best Streak</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.avgSleep || '—'}h</div>
              <p className="text-xs text-gray-400">Avg Sleep</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.completedGoals}</div>
              <p className="text-xs text-gray-400">Goals Done</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.avgGoalProgress}%</div>
              <p className="text-xs text-gray-400">Goal Progress</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations Section */}
        {aiRecommendations && aiRecommendations.recommendations && aiRecommendations.recommendations.length > 0 ? (
          <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                  AI-Powered Recommendations
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateAIRecommendations}
                  disabled={loadingAI}
                  className="bg-purple-500/20 border-purple-500/50 text-white hover:bg-purple-500/30"
                >
                  {loadingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiRecommendations.recommendations.map((rec, idx) => {
                const matchedResources = rec.resource_type ? getResourcesByType(rec.resource_type) : [];
                return (
                  <Card key={idx} className={`bg-gray-800/50 border ${getPriorityColor(rec.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getPriorityColor(rec.priority)}`}>
                          {getCategoryIcon(rec.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-white">{rec.action}</h4>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority} priority
                            </Badge>
                          </div>
                          <p className="text-gray-300 text-sm mb-3">{rec.reasoning}</p>
                          
                          {matchedResources.length > 0 && (
                            <div className="space-y-2 mt-4 pt-4 border-t border-gray-700">
                              <p className="text-xs font-semibold text-gray-400">Relevant Resources:</p>
                              {matchedResources.map((resource, ridx) => (
                                <div key={ridx} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                                  <span className="text-sm text-gray-300">{resource.title}</span>
                                  <Link to={createPageUrl("Resources")}>
                                    <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                                      <ArrowRight className="w-3 h-3" />
                                    </Button>
                                  </Link>
                                </div>
                              ))}
                              {matchedResources.length < resources.filter(r => r.category && r.category.toLowerCase().replace(/ /g, '_') === rec.resource_type.toLowerCase().replace(/ /g, '_')).length && (
                                <Link to={createPageUrl("Resources")}>
                                  <Button size="sm" variant="outline" className="w-full mt-2 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                                    View All Resources
                                  </Button>
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                AI-Powered Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAI ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400 mr-2" />
                  <p className="text-gray-400">Generating recommendations...</p>
                </div>
              ) : (
                <p className="text-gray-400">{aiRecommendations?.message || "Not enough data yet. Keep journaling and checking in for personalized recommendations!"}</p>
              )}
              {(!aiRecommendations || aiRecommendations.recommendations.length === 0) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateAIRecommendations}
                  disabled={loadingAI || filteredCheckins.length < 5 || filteredEntries.length < 3}
                  className="mt-4 bg-purple-500/20 border-purple-500/50 text-white hover:bg-purple-500/30"
                >
                  {loadingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Generate Recommendations"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly & Monthly Reports */}
        <div className="grid md:grid-cols-2 gap-6">
          {weeklyReport && (
            <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  This Week's Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-400 mb-1">🏆 KEY ACHIEVEMENT</p>
                    <p className="text-white text-sm">{weeklyReport.achievement}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-yellow-400 mb-1">🎯 FOCUS AREA</p>
                    <p className="text-white text-sm">{weeklyReport.focus_area}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-400 mb-1">📈 TREND</p>
                    <p className="text-white text-sm">{weeklyReport.trend}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-gray-300 text-sm italic">{weeklyReport.motivation}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateReports}
                  disabled={loadingReports || entries.length < 3}
                  className="w-full bg-blue-500/20 border-blue-500/50 text-white hover:bg-blue-500/30"
                >
                  {loadingReports ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Refresh Report
                </Button>
              </CardContent>
            </Card>
          )}

          {monthlyReport && (
            <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-400" />
                  This Month's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-green-400 mb-1">📊 OVERALL PROGRESS</p>
                    <p className="text-white text-sm">{monthlyReport.overall}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-yellow-400 mb-1">🌟 BIGGEST WIN</p>
                    <p className="text-white text-sm">{monthlyReport.biggest_win}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-400 mb-1">🌱 GROWTH AREA</p>
                    <p className="text-white text-sm">{monthlyReport.growth_area}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-xs font-semibold text-purple-400 mb-1">🎯 NEXT MONTH</p>
                    <p className="text-white text-sm">{monthlyReport.next_focus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mood Trend */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Mood Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={moodTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis domain={[0, 5]} stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
                <Line type="monotone" dataKey="mood" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Mood (1-5)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Entry Frequency */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Entry Frequency by Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={entryFrequency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" name="Entries" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Wellness Factors */}
          {wellnessData.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Wellness Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={wellnessData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sleep" stroke="#10b981" strokeWidth={2} name="Sleep (hrs)" />
                    <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Energy" />
                    <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} name="Stress" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Emotions */}
          {emotionData.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-pink-500" />
                  Top Emotions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={emotionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" style={{ fontSize: '11px' }} width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Bar dataKey="value" fill="#ec4899" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Theme Analysis */}
          {themeData.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Common Themes (AI-Detected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={themeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" style={{ fontSize: '11px' }} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Bar dataKey="value" fill="#f59e0b" name="Mentions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Wellness Radar */}
        {correlationData.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-500" />
                Wellness Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={correlationData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="factor" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} stroke="#9ca3af" />
                  <Radar name="Your Average" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-300">
                  <strong className="text-white">💡 Insight:</strong> This chart shows how balanced your wellness factors are. 
                  Aim for a relatively even shape - extreme dips or peaks indicate areas that need attention.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Correlation Analysis */}
        {correlations && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-500" />
                Lifestyle Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-400 text-sm">
                Based on your data, here's how different factors correlate with your mood:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { name: 'Sleep', value: correlations.sleep_mood, icon: <Moon className="w-5 h-5" />, color: 'text-purple-400', label: 'mood' },
                  { name: 'Exercise', value: correlations.exercise_mood, icon: <Dumbbell className="w-5 h-5" />, color: 'text-green-400', label: 'mood' },
                  { name: 'Low Stress', value: correlations.stress_mood, icon: <Brain className="w-5 h-5" />, color: 'text-red-400', label: 'mood' },
                  { name: 'Energy', value: correlations.energy_mood, icon: <Zap className="w-5 h-5" />, color: 'text-yellow-400', label: 'mood' }
                ].map((factor, idx) => {
                  const percentage = Math.abs((factor.value * 100).toFixed(0)); // Display absolute percentage
                  const strength = Math.abs(factor.value);
                  const isPositive = factor.value > 0;
                  return (
                    <div key={idx} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={factor.color}>{factor.icon}</div>
                          <span className="font-semibold text-white">{factor.name}</span>
                        </div>
                        <Badge className={strength > 0.5 ? 'bg-green-500/20 text-green-400 border-green-500/30' : strength > 0.3 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
                          {strength > 0.5 ? 'Strong' : strength > 0.3 ? 'Moderate' : 'Weak'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPositive ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                        <span className="text-2xl font-bold text-white">{percentage}%</span>
                        <span className="text-gray-400 text-sm">correlation with {factor.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {scatterData.length > 5 && (
                <div>
                  <p className="text-sm font-semibold text-gray-400 mb-3">Sleep vs Mood Scatter Plot</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" dataKey="sleep" name="Sleep (hours)" unit="h" stroke="#9ca3af" label={{ value: 'Sleep (hours)', position: 'bottom', fill: '#9ca3af', dy: 10 }} />
                      <YAxis type="number" dataKey="mood" name="Mood Score" domain={[1, 5]} stroke="#9ca3af" label={{ value: 'Mood Score (1-5)', angle: -90, position: 'left', fill: '#9ca3af', dx: -10 }} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#f3f4f6' }}
                        formatter={(value, name) => [`${value}${name === 'Sleep (hours)' ? 'h' : ''}`, name]}
                      />
                      <Scatter name="Mood vs Sleep" data={scatterData} fill="#3b82f6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sentiment Distribution */}
        {sentimentData.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Sentiment Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Insights Summary */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.avgMood && parseFloat(stats.avgMood) >= 4 && (
              <div className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Great Mood Trend!</p>
                  <p className="text-sm text-gray-300">Your average mood is {stats.avgMood}/5. You're doing well - keep up the practices that are working.</p>
                </div>
              </div>
            )}
            
            {stats.currentStreak >= 7 && (
              <div className="flex items-start gap-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                <Award className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Consistency Champion!</p>
                  <p className="text-sm text-gray-300">{stats.currentStreak} day streak! Daily practice is building real resilience.</p>
                </div>
              </div>
            )}
            
            {stats.avgSleep && parseFloat(stats.avgSleep) < 7 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <Activity className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Sleep Opportunity</p>
                  <p className="text-sm text-gray-300">You're averaging {stats.avgSleep} hours. Aim for 7-9 hours - sleep deeply impacts mood and mental health.</p>
                </div>
              </div>
            )}
            
            {stats.totalEntries >= 10 && stats.avgGoalProgress < 50 && (
              <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <Target className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Goal Focus Needed</p>
                  <p className="text-sm text-gray-300">You're journaling consistently, but goal progress is {stats.avgGoalProgress}%. Time to turn insights into action?</p>
                </div>
              </div>
            )}
            
            {filteredEntries.length === 0 && (
              <div className="flex items-start gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                <BarChart3 className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Start Building Data</p>
                  <p className="text-sm text-gray-300">Keep journaling and checking in to see trends and patterns emerge. Insights get better with more data!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
