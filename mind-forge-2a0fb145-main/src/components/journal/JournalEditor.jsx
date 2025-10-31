
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import { 
  Save,
  Sparkles,
  Heart,
  X,
  Tag,
  Star,
  Zap,
  Trophy
} from "lucide-react";

const COMMON_EMOTIONS = [
  "Happy", "Sad", "Anxious", "Calm", "Angry", "Grateful", 
  "Stressed", "Peaceful", "Frustrated", "Content", "Worried", "Hopeful",
  "Overwhelmed", "Energized", "Tired", "Confident", "Lonely", "Connected",
  "Proud", "Ashamed", "Excited", "Bored", "Loved", "Hurt"
];

const MOOD_EMOJIS = {
  5: "😊",
  4: "🙂",
  3: "😐",
  2: "😕",
  1: "😞"
};

const POINTS = {
  ENTRY_WRITTEN: 10,
  FIRST_AI_INSIGHT: 25,
  LONG_ENTRY: 15, // 500+ words
  DEEP_REFLECTION: 20, // 5+ emotions tagged
  GUIDED_PROMPT: 30,
  VOICE_ENTRY: 20,
  STREAK_MILESTONE: 50
};

export default function JournalEditor({ onEntryCreated }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [entry, setEntry] = useState({
    title: "",
    content: "",
    mood_score: 3,
    emotions: [],
    tags: [],
    is_favorite: false
  });
  const [newTag, setNewTag] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const words = entry.content.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [entry.content]);

  const showPointsAnimation = (points, reason) => {
    setPointsAnimation({ points, reason });
    setTimeout(() => setPointsAnimation(null), 3000);
  };

  const checkAndAwardBadges = async (user, totalEntries, hasAIInsight) => {
    const userBadges = user?.badges || [];
    const newBadges = [];

    // First Entry Badge
    if (totalEntries === 1 && !userBadges.some(b => b.badge_id === 'first_entry')) {
      newBadges.push({
        badge_id: 'first_entry',
        name: 'First Entry',
        earned_date: new Date().toISOString().split('T')[0],
        icon: '📝'
      });
    }

    // First AI Insight Badge
    if (hasAIInsight && !userBadges.some(b => b.badge_id === 'first_ai_insight')) {
      newBadges.push({
        badge_id: 'first_ai_insight',
        name: 'First AI Insight',
        earned_date: new Date().toISOString().split('T')[0],
        icon: '✨'
      });
    }

    // 10 Entries Badge
    if (totalEntries === 10 && !userBadges.some(b => b.badge_id === '10_entries')) {
      newBadges.push({
        badge_id: '10_entries',
        name: '10 Entries',
        earned_date: new Date().toISOString().split('T')[0],
        icon: '📚'
      });
    }

    // 50 Entries Badge
    if (totalEntries === 50 && !userBadges.some(b => b.badge_id === '50_entries')) {
      newBadges.push({
        badge_id: '50_entries',
        name: 'Prolific Writer',
        earned_date: new Date().toISOString().split('T')[0],
        icon: '📖'
      });
    }

    // 100 Entries Badge
    if (totalEntries === 100 && !userBadges.some(b => b.badge_id === '100_entries')) {
      newBadges.push({
        badge_id: '100_entries',
        name: 'Century Club',
        earned_date: new Date().toISOString().split('T')[0],
        icon: '💯'
      });
    }

    if (newBadges.length > 0) {
      await base44.auth.updateMe({
        badges: [...userBadges, ...newBadges]
      });
      
      newBadges.forEach(badge => {
        addToast({
          title: "🎉 New Badge Unlocked!",
          description: `${badge.icon} ${badge.name}`,
          type: "success",
          duration: 5000
        });
      });
    }
  };

  const awardPoints = async (points, reason) => {
    if (!user) return;
    
    const newTotal = (user.total_points || 0) + points;
    const oldLevel = user.level || 1;
    const newLevel = Math.floor(newTotal / 500) + 1;
    
    await base44.auth.updateMe({
      total_points: newTotal,
      level: newLevel
    });
    
    showPointsAnimation(points, reason);

    if (newLevel > oldLevel) {
      addToast({
        title: "🎉 Level Up!",
        description: `You've reached Level ${newLevel}!`,
        type: "success",
        duration: 5000
      });
    }
    
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
  };

  const saveEntryMutation = useMutation({
    mutationFn: async (entryData) => {
      setAnalyzing(true);
      
      // Calculate points
      let pointsEarned = POINTS.ENTRY_WRITTEN;
      let pointReasons = ["Journal entry"];

      if (wordCount >= 500) {
        pointsEarned += POINTS.LONG_ENTRY;
        pointReasons.push("500+ words");
      }

      if (entryData.emotions.length >= 5) {
        pointsEarned += POINTS.DEEP_REFLECTION;
        pointReasons.push("Deep reflection");
      }

      // AI Analysis
      let aiSentiment = null;
      let aiThemes = [];
      let aiInsights = null;
      let crisisDetected = false;

      try {
        const analysisPrompt = `Analyze this journal entry for mental health insights:
        
        Title: ${entryData.title}
        Content: ${entryData.content}
        Mood Score: ${entryData.mood_score}/5
        Emotions: ${entryData.emotions.join(', ')}
        
        Provide:
        1. Sentiment (very_positive, positive, neutral, negative, very_negative)
        2. 3-5 key themes (single words like "work", "family", "anxiety", etc.)
        3. A brief supportive insight (2-3 sentences)
        4. Crisis detection (true if suicidal ideation, self-harm, or severe distress)
        
        Return JSON format.`;

        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: analysisPrompt,
          add_context_from_internet: false,
          response_json_schema: {
            type: "object",
            properties: {
              sentiment: { type: "string" },
              themes: { type: "array", items: { type: "string" } },
              insight: { type: "string" },
              crisis_detected: { type: "boolean" }
            }
          }
        });

        aiSentiment = aiResult.sentiment;
        aiThemes = aiResult.themes || [];
        aiInsights = aiResult.insight;
        crisisDetected = aiResult.crisis_detected || false;

        // Award points for first AI insight
        const isFirstInsight = user && (user.total_entries || 0) === 0;
        if (isFirstInsight) {
          pointsEarned += POINTS.FIRST_AI_INSIGHT;
          pointReasons.push("First AI insight");
        }
      } catch (error) {
        console.error("AI analysis failed:", error);
      }

      // Create journal entry
      const savedEntry = await base44.entities.JournalEntry.create({
        ...entryData,
        entry_type: "text",
        word_count: wordCount,
        ai_sentiment: aiSentiment,
        ai_themes: aiThemes,
        ai_insights: aiInsights,
        crisis_detected: crisisDetected
      });

      // Update user stats
      const today = new Date().toISOString().split('T')[0];
      const lastJournal = user.last_journal_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let newStreak = 1;
      let streakMilestoneReached = false;

      if (lastJournal === today) {
        newStreak = user.current_streak || 1;
      } else if (lastJournal === yesterday) {
        newStreak = (user.current_streak || 0) + 1;
        // Check for streak milestones
        if ([7, 14, 30, 60, 100].includes(newStreak)) {
          pointsEarned += POINTS.STREAK_MILESTONE;
          pointReasons.push(`${newStreak}-day streak`);
          streakMilestoneReached = true;
        }
      }
      
      const newTotalEntries = (user.total_entries || 0) + 1;

      await base44.auth.updateMe({
        total_entries: newTotalEntries,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, user.longest_streak || 0),
        last_journal_date: today
      });

      // Award points
      await awardPoints(pointsEarned, pointReasons.join(', '));

      // Check badges
      await checkAndAwardBadges(user, newTotalEntries, !!aiInsights);

      setAnalyzing(false);
      return { savedEntry, crisisDetected, aiInsights, pointsEarned, streakMilestoneReached };
    },
    onSuccess: ({ savedEntry, crisisDetected, aiInsights, pointsEarned, streakMilestoneReached }) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['recentEntries'] });
      queryClient.invalidateQueries({ queryKey: ['allEntries'] });
      
      // Show insights
      if (aiInsights) {
        addToast({
          title: "✨ AI Insight",
          description: `${aiInsights}\n\n🎉 You earned ${pointsEarned} points!${streakMilestoneReached ? '\n🔥 Streak milestone bonus!' : ''}`,
          type: "success",
          duration: 6000
        });
      } else {
        addToast({
          title: "🎉 Entry Saved!",
          description: `You earned ${pointsEarned} points!`,
          type: "success"
        });
      }
      
      // Crisis detection
      if (crisisDetected) {
        addToast({
          title: "⚠️ Crisis Support Available",
          description: "It seems like you might be going through a tough time. The 988 Suicide & Crisis Lifeline is available 24/7.",
          type: "warning",
          duration: 8000
        });
      }

      // Reset form
      setEntry({
        title: "",
        content: "",
        mood_score: 3,
        emotions: [],
        tags: [],
        is_favorite: false
      });
      setNewTag("");
      setWordCount(0);

      // Notify parent component
      if (onEntryCreated) {
        onEntryCreated();
      }
    },
    onError: (error) => {
      console.error("Failed to save entry:", error);
      addToast({
        title: "❌ Save Failed",
        description: "Failed to save your entry. Please try again.",
        type: "error"
      });
    }
  });

  const handleEmotionToggle = (emotion) => {
    setEntry(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter(e => e !== emotion)
        : [...prev.emotions, emotion]
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !entry.tags.includes(newTag.trim())) {
      setEntry(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag) => {
    setEntry(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSave = () => {
    if (entry.content.trim()) {
      saveEntryMutation.mutate(entry);
    }
  };

  // Calculate potential points
  const calculatePotentialPoints = () => {
    let points = POINTS.ENTRY_WRITTEN;
    if (wordCount >= 500) points += POINTS.LONG_ENTRY;
    if (entry.emotions.length >= 5) points += POINTS.DEEP_REFLECTION;
    return points;
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Write Journal Entry
          </CardTitle>
          <Badge className="bg-yellow-500 text-black flex items-center gap-1">
            <Star className="w-3 h-3" />
            {calculatePotentialPoints()} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Points Animation */}
        {pointsAnimation && (
          <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 text-yellow-500">
              <Trophy className="w-6 h-6" />
              <div>
                <p className="font-bold text-lg">+{pointsAnimation.points} Points!</p>
                <p className="text-sm text-yellow-400">{pointsAnimation.reason}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-white">Title (optional)</Label>
          <Input
            placeholder="Give your entry a title..."
            value={entry.title}
            onChange={(e) => setEntry({...entry, title: e.target.value})}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-white">Your Thoughts</Label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{wordCount} words</span>
              {wordCount >= 500 && (
                <Badge className="bg-green-500 text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  +{POINTS.LONG_ENTRY} bonus
                </Badge>
              )}
              <button
                onClick={() => setEntry({...entry, is_favorite: !entry.is_favorite})}
                className={`p-1 rounded ${entry.is_favorite ? 'text-yellow-500' : 'text-gray-500'}`}
              >
                <Star className={`w-5 h-5 ${entry.is_favorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
          <Textarea
            placeholder="Write freely... What's on your mind? What happened today? How are you feeling?"
            value={entry.content}
            onChange={(e) => setEntry({...entry, content: e.target.value})}
            className="min-h-[300px] bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-white">How are you feeling?</Label>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{MOOD_EMOJIS[entry.mood_score]}</span>
              <span className="text-white font-semibold">{entry.mood_score}/5</span>
            </div>
          </div>
          <Slider
            value={[entry.mood_score]}
            onValueChange={(value) => setEntry({...entry, mood_score: value[0]})}
            min={1}
            max={5}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Struggling</span>
            <span>Not Great</span>
            <span>Okay</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-white">Select Emotions (optional)</Label>
            {entry.emotions.length >= 5 && (
              <Badge className="bg-purple-500 text-white">
                <Zap className="w-3 h-3 mr-1" />
                +{POINTS.DEEP_REFLECTION} bonus
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {COMMON_EMOTIONS.map(emotion => (
              <button
                key={emotion}
                onClick={() => handleEmotionToggle(emotion)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  entry.emotions.includes(emotion)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-white">Tags (optional)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button onClick={handleAddTag} variant="outline" className="bg-gray-800 border-gray-700">
              <Tag className="w-4 h-4" />
            </Button>
          </div>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map(tag => (
                <Badge key={tag} className="bg-purple-500 text-white flex items-center gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-800">
          <Button
            onClick={handleSave}
            disabled={!entry.content.trim() || saveEntryMutation.isPending || analyzing}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            {analyzing ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : saveEntryMutation.isPending ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Entry (+{calculatePotentialPoints()} pts)
              </>
            )}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-400 font-semibold mb-1">💡 Earn Bonus Points:</p>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Write 500+ words: +{POINTS.LONG_ENTRY} pts</li>
              <li>• Tag 5+ emotions: +{POINTS.DEEP_REFLECTION} pts</li>
              <li>• Maintain streaks: +{POINTS.STREAK_MILESTONE} pts</li>
            </ul>
          </div>
          <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-400 font-semibold mb-1">✨ AI Analysis:</p>
            <p className="text-xs text-gray-300">
              Your entry will be analyzed for sentiment, themes, and insights. All analysis is private.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
