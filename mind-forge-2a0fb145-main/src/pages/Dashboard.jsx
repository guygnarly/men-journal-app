
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress"; // Added Progress import
import { 
  BookOpen, 
  TrendingUp, 
  Calendar, 
  Target,
  PenTool,
  Heart,
  Users,
  Sparkles,
  ArrowRight,
  Flame,
  Search,
  Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [dailyPrompt, setDailyPrompt] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const { data: recentEntries = [] } = useQuery({
    queryKey: ['recentEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-created_date', 3),
  });

  const { data: moodData = [] } = useQuery({
    queryKey: ['recentMoods'],
    queryFn: () => base44.entities.MoodCheckin.list('-created_date', 7),
  });

  const { data: todayCheckin } = useQuery({
    queryKey: ['todayCheckin'],
    queryFn: async () => {
      const checkins = await base44.entities.MoodCheckin.list('-created_date', 1);
      if (checkins.length > 0) {
        const checkinDate = new Date(checkins[0].created_date).toDateString();
        const today = new Date().toDateString();
        return checkinDate === today ? checkins[0] : null;
      }
      return null;
    },
  });

  const { data: activeGoals = [] } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'in_progress' }, '-created_date', 3),
  });

  const { data: activeChallenges = [] } = useQuery({
    queryKey: ['activeChallenges'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.ChallengeParticipation.filter({ 
        user_email: user.email, 
        status: 'active' 
      }, '-created_date', 3);
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const generatePrompt = async () => {
      if (!user) return;
      
      setLoadingPrompt(true);
      try {
        const profile = {
          relationship_status: user.relationship_status,
          parenthood: user.parenthood,
          employment: user.employment,
          life_stage: user.life_stage,
          primary_goals: user.primary_goals
        };

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate ONE thoughtful, masculine-psychology-informed journaling prompt for a man with this profile: ${JSON.stringify(profile)}. 
          
          The prompt should:
          - Be specific to his life situation
          - Encourage emotional awareness without being too "touchy-feely"
          - Focus on action and growth
          - Be 1-2 sentences max
          - Not use phrases like "tap into" or overly soft language
          
          Return ONLY the prompt text, nothing else.`,
          add_context_from_internet: false
        });
        
        setDailyPrompt(result);
      } catch (error) {
        console.error("Error generating prompt:", error);
        setDailyPrompt("What's one thing you're working on improving right now, and what's your next step?");
      } finally {
        setLoadingPrompt(false);
      }
    };

    if (user) {
      generatePrompt();
    }
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const entries = await base44.entities.JournalEntry.list('-created_date', 50);
      const filtered = entries.filter(entry => 
        entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(filtered.slice(0, 5));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const averageMood = moodData.length > 0 
    ? (moodData.reduce((sum, m) => sum + m.mood_score, 0) / moodData.length).toFixed(1)
    : null;

  const getMoodEmoji = (score) => {
    if (!score) return null;
    if (score >= 4.5) return "😊";
    if (score >= 3.5) return "🙂";
    if (score >= 2.5) return "😐";
    if (score >= 1.5) return "😕";
    return "😞";
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Next streak milestone
  const nextStreakMilestone = () => {
    const current = user?.current_streak || 0;
    const milestones = [7, 14, 30, 60, 100];
    return milestones.find(m => m > current) || null;
  };

  const streakMilestone = nextStreakMilestone();

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              {getTimeOfDay()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-gray-400 mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Link to={createPageUrl("Journal")} className="flex-1 md:flex-none">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg">
                <PenTool className="w-4 h-4 mr-2" />
                New Entry
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Search */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search your journal entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={searching}
                variant="outline"
                className="bg-gray-800 border-gray-700 text-gray-300"
              >
                {searching ? "..." : "Search"}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map(entry => (
                  <Link
                    key={entry.id}
                    to={createPageUrl("Journal")}
                    className="block p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
                  >
                    <p className="text-white font-medium">{entry.title || "Untitled"}</p>
                    <p className="text-sm text-gray-400 line-clamp-1">{entry.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(parseISO(entry.created_date), "MMM d, yyyy")}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gamification Progress */}
        {streakMilestone && (
          <Card className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-white font-semibold">
                    {streakMilestone - (user?.current_streak || 0)} days to {streakMilestone}-day streak bonus
                  </span>
                </div>
                <Badge className="bg-yellow-500 text-black">
                  +50 pts
                </Badge>
              </div>
              <Progress value={((user?.current_streak || 0) / streakMilestone) * 100} className="h-2 bg-white/20 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full" indicatorClassName="bg-gradient-to-r from-orange-500 to-yellow-500"/>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                {user?.current_streak || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Best: {user?.longest_streak || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">
                {user?.total_entries || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total written
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                7-Day Mood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">
                {averageMood ? `${getMoodEmoji(averageMood)} ${averageMood}` : "—"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Out of 5.0
              </p>
            </CardContent>
          </Card>

          <Card className={`border-gray-800 ${todayCheckin ? 'bg-green-900/20 border-green-500/30' : 'bg-gray-900'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayCheckin ? (
                <div>
                  <div className="text-3xl font-bold text-green-500 mb-1">
                    ✓
                  </div>
                  <p className="text-xs text-gray-500">
                    Checked in
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-bold text-orange-500 mb-1">
                    ⏰
                  </div>
                  <Link to={createPageUrl("MoodCheckin")}>
                    <Button size="sm" variant="outline" className="text-xs mt-1 bg-gray-800 border-gray-700 h-7">
                      Check In
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily Prompt */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                Today's Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPrompt ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-white/30 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-white/30 rounded w-full"></div>
                </div>
              ) : (
                <p className="text-lg text-white/95 leading-relaxed">
                  {dailyPrompt}
                </p>
              )}
              <Link to={createPageUrl("Journal")}>
                <Button className="bg-white text-blue-600 hover:bg-gray-100">
                  Start Writing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl("Journal")} className="block">
                <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Write Entry
                </Button>
              </Link>
              <Link to={createPageUrl("MoodCheckin")} className="block">
                <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                  <Heart className="w-4 h-4 mr-2" />
                  Mood Check-in
                </Button>
              </Link>
              <Link to={createPageUrl("Insights")} className="block">
                <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Insights
                </Button>
              </Link>
              <Link to={createPageUrl("Goals")} className="block">
                <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                  <Target className="w-4 h-4 mr-2" />
                  My Goals
                </Button>
              </Link>
              <Link to={createPageUrl("Community")} className="block">
                <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                  <Users className="w-4 h-4 mr-2" />
                  Community
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Active Goals & Challenges */}
        {(activeGoals.length > 0 || activeChallenges.length > 0) && (
          <div className="grid lg:grid-cols-2 gap-6">
            {activeGoals.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-500" />
                      Active Goals
                    </CardTitle>
                    <Link to={createPageUrl("Goals")}>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeGoals.map(goal => (
                    <div key={goal.id} className="p-3 bg-gray-800 rounded-lg">
                      <p className="text-white font-medium mb-2">{goal.title}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                            style={{ width: `${goal.progress_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">{goal.progress_percentage || 0}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeChallenges.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      Active Challenges
                    </CardTitle>
                    <Link to={createPageUrl("Community") + "?tab=challenges"}>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeChallenges.map(participation => (
                    <div key={participation.id} className="p-3 bg-gray-800 rounded-lg">
                      <p className="text-white font-medium mb-2">Challenge Day {(participation.completed_days?.length || 0) + 1}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full"
                            style={{ width: `${participation.completion_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">{participation.completion_percentage || 0}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Check-in Widget */}
        {!todayCheckin && (
          <Card className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border-pink-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                Quick Mood Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-300">How are you feeling right now?</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { score: 5, emoji: "😊", label: "Great" },
                  { score: 4, emoji: "🙂", label: "Good" },
                  { score: 3, emoji: "😐", label: "Okay" },
                  { score: 2, emoji: "😕", label: "Low" },
                  { score: 1, emoji: "😞", label: "Rough" }
                ].map((mood) => (
                  <Link key={mood.score} to={createPageUrl("MoodCheckin")} className="block">
                    <Button
                      variant="outline"
                      className="w-full bg-gray-800 border-gray-700 hover:bg-gray-700 flex flex-col items-center py-3 h-auto"
                    >
                      <span className="text-2xl mb-1">{mood.emoji}</span>
                      <span className="text-xs">{mood.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Entries */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Recent Entries</CardTitle>
              <Link to={createPageUrl("Journal")}>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No journal entries yet</p>
                <p className="text-sm mt-1">Start your journey by writing your first entry</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentEntries.map((entry) => (
                  <Link 
                    key={entry.id}
                    to={createPageUrl("Journal")}
                    className="block border border-gray-800 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-white">{entry.title || "Untitled"}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(entry.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      {entry.mood_score && (
                        <Badge variant="secondary" className="ml-2 bg-gray-800 text-gray-300">
                          {getMoodEmoji(entry.mood_score)} {entry.mood_score}/5
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 line-clamp-2">
                      {entry.content}
                    </p>
                    {entry.emotions && entry.emotions.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {entry.emotions.slice(0, 3).map((emotion, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-gray-700 text-gray-400">
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
