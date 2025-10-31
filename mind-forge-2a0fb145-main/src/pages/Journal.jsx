import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PenTool, 
  Mic, 
  Search,
  Calendar as CalendarIcon,
  BookOpen,
  Filter,
  Flame,
  Star,
  Target,
  Award,
  Zap
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import JournalEditor from "../components/journal/JournalEditor";
import VoiceJournal from "../components/journal/VoiceJournal";
import EntryList from "../components/journal/EntryList";
import TemplateSelector from "../components/journal/TemplateSelector";
import GuidedJournal from "../components/journal/GuidedJournal";

export default function Journal() {
  const [activeTab, setActiveTab] = useState("write");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterType, setFilterType] = useState("all");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-created_date', 100),
  });

  const filteredEntries = entries.filter(entry => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = (
        entry.title?.toLowerCase().includes(search) ||
        entry.content?.toLowerCase().includes(search) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(search))
      );
      if (!matchesSearch) return false;
    }

    if (filterType !== "all") {
      if (filterType === "favorites" && !entry.is_favorite) return false;
      if (filterType === "voice" && entry.entry_type !== "voice") return false;
      if (filterType === "text" && entry.entry_type !== "text") return false;
    }

    return true;
  });

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEntriesForDay = (day) => {
    return entries.filter(entry => isSameDay(parseISO(entry.created_date), day));
  };

  const getMoodForDay = (day) => {
    const dayEntries = getEntriesForDay(day);
    if (dayEntries.length === 0) return null;
    const moodEntries = dayEntries.filter(e => e.mood_score);
    if (moodEntries.length === 0) return null;
    return moodEntries.reduce((sum, e) => sum + e.mood_score, 0) / moodEntries.length;
  };

  const getMoodColor = (mood) => {
    if (!mood) return "bg-gray-800";
    if (mood >= 4.5) return "bg-green-500";
    if (mood >= 3.5) return "bg-blue-500";
    if (mood >= 2.5) return "bg-yellow-500";
    if (mood >= 1.5) return "bg-orange-500";
    return "bg-red-500";
  };

  const longestStreak = user?.longest_streak || 0;
  const currentStreak = user?.current_streak || 0;
  const totalPoints = user?.total_points || 0;
  const userLevel = user?.level || 1;
  const totalEntries = user?.total_entries || 0;
  const pointsToNextLevel = 500 - (totalPoints % 500);

  const handleEntryCreated = () => {
    const reloadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    reloadUser();
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Journal</h1>
          <p className="text-gray-400">Express yourself, process your thoughts, track your journey</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">{currentStreak}</div>
              <p className="text-xs text-gray-400">Day Streak</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">{totalEntries}</div>
              <p className="text-xs text-gray-400">Total Entries</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-white">{totalPoints}</div>
              <p className="text-xs text-gray-400">Total Points</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">L{userLevel}</div>
              <p className="text-xs text-gray-400">Level</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">{longestStreak}</div>
              <p className="text-xs text-gray-400">Best Streak</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-white font-semibold">Level {userLevel} Progress</span>
              </div>
              <span className="text-sm text-gray-400">{pointsToNextLevel} pts to Level {userLevel + 1}</span>
            </div>
            <Progress value={((totalPoints % 500) / 500) * 100} className="h-2" />
          </CardContent>
        </Card>

        {user?.badges && user.badges.filter(b => ['first_entry', 'first_ai_insight', '10_entries', '50_entries', '100_entries', '7_day_streak', '30_day_streak'].includes(b.badge_id)).length > 0 && (
          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.badges
                  .filter(b => ['first_entry', 'first_ai_insight', '10_entries', '50_entries', '100_entries', '7_day_streak', '30_day_streak'].includes(b.badge_id))
                  .slice(-5)
                  .map((badge, idx) => (
                    <Badge key={idx} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-1.5">
                      <span className="text-lg mr-2">{badge.icon}</span>
                      {badge.name}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTemplate ? (
          <GuidedJournal 
            template={selectedTemplate} 
            onBack={() => setSelectedTemplate(null)} 
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-xl grid-cols-5 bg-gray-900 border border-gray-800">
              <TabsTrigger value="write" className="flex items-center gap-2 data-[state=active]:bg-gray-800">
                <PenTool className="w-4 h-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="guided" className="flex items-center gap-2 data-[state=active]:bg-gray-800">
                <BookOpen className="w-4 h-4" />
                Guided
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-2 data-[state=active]:bg-gray-800">
                <Mic className="w-4 h-4" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2 data-[state=active]:bg-gray-800">
                <CalendarIcon className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="entries" className="flex items-center gap-2 data-[state=active]:bg-gray-800">
                <Filter className="w-4 h-4" />
                All
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write">
              <JournalEditor onEntryCreated={handleEntryCreated} />
            </TabsContent>

            <TabsContent value="guided">
              <TemplateSelector onSelectTemplate={setSelectedTemplate} />
            </TabsContent>

            <TabsContent value="voice">
              <VoiceJournal />
            </TabsContent>

            <TabsContent value="calendar">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">
                      {format(selectedDate, "MMMM yyyy")}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
                        className="bg-gray-800 border-gray-700 text-gray-300"
                      >
                        ←
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(new Date())}
                        className="bg-gray-800 border-gray-700 text-gray-300"
                      >
                        Today
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
                        className="bg-gray-800 border-gray-700 text-gray-300"
                      >
                        →
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-semibold text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, idx) => {
                      const dayEntries = getEntriesForDay(day);
                      const dayMood = getMoodForDay(day);
                      const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                      const isToday = isSameDay(day, new Date());

                      return (
                        <button
                          key={idx}
                          className={`aspect-square p-2 rounded-lg border transition-all relative ${
                            isCurrentMonth ? 'border-gray-700' : 'border-gray-800 opacity-50'
                          } ${isToday ? 'ring-2 ring-blue-500' : ''} ${
                            dayEntries.length > 0 ? 'hover:border-blue-500 cursor-pointer' : ''
                          }`}
                        >
                          <div className="text-sm text-gray-300">{format(day, 'd')}</div>
                          {dayEntries.length > 0 && (
                            <>
                              <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${getMoodColor(dayMood)}`} />
                              <Badge className="absolute top-1 right-1 text-[10px] h-4 px-1 bg-blue-500">
                                {dayEntries.length}
                              </Badge>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Great</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Good</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Okay</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Rough</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entries" className="space-y-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <CardTitle className="text-white">All Entries ({filteredEntries.length})</CardTitle>
                    <div className="flex gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search entries..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                      >
                        <option value="all">All Types</option>
                        <option value="favorites">⭐ Favorites</option>
                        <option value="text">📝 Text</option>
                        <option value="voice">🎤 Voice</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <EntryList entries={filteredEntries} isLoading={isLoading} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Earn Points Through Journaling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">Write entry</span>
                <Badge className="bg-yellow-500 text-black">+10</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">Guided prompt</span>
                <Badge className="bg-yellow-500 text-black">+30</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">Voice entry</span>
                <Badge className="bg-yellow-500 text-black">+20</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">500+ words</span>
                <Badge className="bg-yellow-500 text-black">+15</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">5+ emotions</span>
                <Badge className="bg-yellow-500 text-black">+20</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">Streak milestone</span>
                <Badge className="bg-yellow-500 text-black">+50</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}