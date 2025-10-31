
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { format, parseISO } from 'date-fns'; // Added for date formatting in export
import {
  User,
  Mail,
  Shield,
  Download,
  Award,
  Bell,
  LogOut,
  Loader2 // Added for loading spinner
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GOALS_OPTIONS = [
  "Improve mental health",
  "Process emotions better",
  "Build better relationships",
  "Manage stress",
  "Personal growth",
  "Career development",
  "Fitness & health",
  "Financial wellness"
];

const PARENTHOOD_OPTIONS = [
  { value: "no_kids", label: "No kids" },
  { value: "expecting", label: "Expecting" },
  { value: "new_father", label: "New father" },
  { value: "young_kids", label: "Young kids" },
  { value: "teens", label: "Teenagers" },
  { value: "adult_kids", label: "Adult children" }
];

const ACHIEVEMENTS = [
  { id: "first_entry", name: "First Step", description: "Write your first journal entry", icon: "📝", threshold: 1, key: "total_entries" },
  { id: "week_streak", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "🔥", threshold: 7, key: "longest_streak" },
  { id: "month_streak", name: "Month Master", description: "Maintain a 30-day streak", icon: "💪", threshold: 30, key: "longest_streak" },
  { id: "50_entries", name: "Prolific Writer", description: "Write 50 journal entries", icon: "📚", threshold: 50, key: "total_entries" },
  { id: "100_entries", name: "Centurion", description: "Write 100 journal entries", icon: "🏆", threshold: 100, key: "total_entries" },
  { id: "community_post", name: "Community Member", description: "Make your first community post", icon: "🤝", threshold: 1, key: "community_posts" },
  { id: "helpful_reply", name: "Helping Hand", description: "Reply to 10 community posts", icon: "💬", threshold: 10, key: "community_replies" },
  { id: "mood_tracker", name: "Mood Master", description: "Complete 30 mood check-ins", icon: "😊", threshold: 30, key: "mood_checkins" }
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false); // New state for export loading
  const [formData, setFormData] = useState({
    username: "",
    relationship_status: "",
    parenthood: [],
    employment: "",
    life_stage: "",
    living_situation: "",
    primary_goals: [],
    mental_health_experience: "",
    privacy_settings: {
      show_username_in_community: false,
      allow_ai_analysis: true,
      email_notifications: true,
      daily_reminder: false,
      reminder_time: "09:00"
    }
  });

  const { data: communityPosts = [] } = useQuery({
    queryKey: ['userCommunityPosts'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CommunityPost.filter({ created_by: user.email }, '-created_date', 100);
    },
  });

  const { data: communityReplies = [] } = useQuery({
    queryKey: ['userCommunityReplies'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CommunityReply.filter({ created_by: user.email }, '-created_date', 100);
    },
  });

  const { data: moodCheckins = [] } = useQuery({
    queryKey: ['userMoodCheckins'],
    queryFn: () => base44.entities.MoodCheckin.list('-created_date', 100),
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFormData({
        username: currentUser.username || "",
        relationship_status: currentUser.relationship_status || "",
        parenthood: currentUser.parenthood || [],
        employment: currentUser.employment || "",
        life_stage: currentUser.life_stage || "",
        living_situation: currentUser.living_situation || "",
        primary_goals: currentUser.primary_goals || [],
        mental_health_experience: currentUser.mental_health_experience || "",
        privacy_settings: currentUser.privacy_settings || {
          show_username_in_community: false,
          allow_ai_analysis: true,
          email_notifications: true,
          daily_reminder: false,
          reminder_time: "09:00"
        }
      });
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(formData);
      await loadUser();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      primary_goals: prev.primary_goals.includes(goal)
        ? prev.primary_goals.filter(g => g !== goal)
        : [...prev.primary_goals, goal]
    }));
  };

  const handleParenthoodToggle = (value) => {
    setFormData(prev => ({
      ...prev,
      parenthood: prev.parenthood.includes(value)
        ? prev.parenthood.filter(p => p !== value)
        : [...prev.parenthood, value]
    }));
  };

  const exportData = async (formatType) => {
    setExporting(true);
    try {
      const allEntries = await base44.entities.JournalEntry.list('-created_date', 1000);
      
      if (formatType === 'txt') {
        let content = `MindForge Journal Export\nExported: ${new Date().toLocaleString()}\n\n`;
        content += `==================================================\n\n`;
        
        allEntries.forEach(entry => {
          content += `Date: ${format(parseISO(entry.created_date), 'PPpp')}\n`;
          content += `Title: ${entry.title || 'Untitled'}\n`;
          if (entry.mood_score) content += `Mood: ${entry.mood_score}/5\n`;
          if (entry.emotions?.length) content += `Emotions: ${entry.emotions.join(', ')}\n`;
          content += `\n${entry.content}\n`;
          content += `\n${'-'.repeat(50)}\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindforge-journal-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
      } else if (formatType === 'json') {
        const exportData = {
          exported_at: new Date().toISOString(),
          user: {
            email: user?.email,
            full_name: user?.full_name,
            total_entries: user?.total_entries,
            current_streak: user?.current_streak
          },
          entries: allEntries
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindforge-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }

      alert(`✅ Successfully exported ${allEntries.length} entries!`);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const achievementProgress = {
    total_entries: user?.total_entries || 0,
    longest_streak: user?.longest_streak || 0,
    community_posts: communityPosts.length,
    community_replies: communityReplies.length,
    mood_checkins: moodCheckins.length
  };

  const unlockedAchievements = ACHIEVEMENTS.filter(a =>
    achievementProgress[a.key] >= a.threshold
  );

  const lockedAchievements = ACHIEVEMENTS.filter(a =>
    achievementProgress[a.key] < a.threshold
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6"> {/* Changed max-w-5xl to max-w-4xl */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        {/* Account Info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-blue-500" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Full Name</Label>
                <Input
                  value={user?.full_name || ""}
                  disabled
                  className="bg-gray-800 border-gray-700 text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-gray-800 border-gray-700 text-gray-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Username (for community)</Label>
              <Input
                placeholder="Choose a username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-300">Relationship Status</Label>
              <Select value={formData.relationship_status} onValueChange={(value) => setFormData({...formData, relationship_status: value})}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {["single", "dating", "married", "divorced", "separated"].map(status => (
                    <SelectItem key={status} value={status} className="text-white capitalize">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Parenthood Status</Label>
              <div className="space-y-2">
                {PARENTHOOD_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={formData.parenthood.includes(option.value)}
                      onCheckedChange={() => handleParenthoodToggle(option.value)}
                    />
                    <Label htmlFor={option.value} className="text-gray-400 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Primary Goals</Label>
              <div className="flex flex-wrap gap-2">
                {GOALS_OPTIONS.map(goal => (
                  <Badge
                    key={goal}
                    variant={formData.primary_goals.includes(goal) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      formData.primary_goals.includes(goal)
                        ? "bg-blue-500 text-white"
                        : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                    onClick={() => handleGoalToggle(goal)}
                  >
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-green-500" />
              Privacy & Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Show username in community</Label>
                <p className="text-sm text-gray-500">Display your username instead of "Anonymous"</p>
              </div>
              <Switch
                checked={formData.privacy_settings.show_username_in_community}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  privacy_settings: { ...formData.privacy_settings, show_username_in_community: checked }
                })}
              />
            </div>

            <Separator className="bg-gray-800" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">AI Analysis</Label>
                <p className="text-sm text-gray-500">Allow AI to analyze your entries for insights</p>
              </div>
              <Switch
                checked={formData.privacy_settings.allow_ai_analysis}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  privacy_settings: { ...formData.privacy_settings, allow_ai_analysis: checked }
                })}
              />
            </div>

            <Separator className="bg-gray-800" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-gray-500">Receive updates and reminders via email</p>
              </div>
              <Switch
                checked={formData.privacy_settings.email_notifications}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  privacy_settings: { ...formData.privacy_settings, email_notifications: checked }
                })}
              />
            </div>

            <Separator className="bg-gray-800" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Daily Check-in Reminder</Label>
                  <p className="text-sm text-gray-500">Get a daily reminder to journal</p>
                </div>
                <Switch
                  checked={formData.privacy_settings.daily_reminder}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    privacy_settings: { ...formData.privacy_settings, daily_reminder: checked }
                  })}
                />
              </div>
              {formData.privacy_settings.daily_reminder && (
                <div className="space-y-2 pl-6">
                  <Label className="text-gray-400">Reminder Time</Label>
                  <Input
                    type="time"
                    value={formData.privacy_settings.reminder_time}
                    onChange={(e) => setFormData({
                      ...formData,
                      privacy_settings: { ...formData.privacy_settings, reminder_time: e.target.value }
                    })}
                    className="bg-gray-800 border-gray-700 text-white w-40"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-yellow-500" />
              Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {unlockedAchievements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-3">Unlocked</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {unlockedAchievements.map(achievement => (
                      <div key={achievement.id} className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <span className="text-3xl">{achievement.icon}</span>
                        <div>
                          <div className="font-semibold text-white">{achievement.name}</div>
                          <div className="text-sm text-gray-400">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lockedAchievements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-3">In Progress</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {lockedAchievements.map(achievement => {
                      const progress = achievementProgress[achievement.key] || 0;
                      const percentage = (progress / achievement.threshold) * 100;
                      return (
                        <div key={achievement.id} className="p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl grayscale opacity-50">{achievement.icon}</span>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-400">{achievement.name}</div>
                              <div className="text-sm text-gray-500">{achievement.description}</div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{progress} / {achievement.threshold}</span>
                              <span>{Math.round(percentage)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy Section (NEW) */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Data & Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">EXPORT ENTRIES</h3>
              <div className="space-y-2">
                <button
                  onClick={() => exportData('txt')}
                  disabled={exporting}
                  className="w-full flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-yellow-500/20 rounded-lg">
                    <span className="text-2xl">📄</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">Export all entries</p>
                    <p className="text-sm text-gray-400">Export your entries as a TXT file</p>
                  </div>
                  {exporting ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <span className="text-gray-400">→</span>
                  )}
                </button>

                <button
                  onClick={() => exportData('json')}
                  disabled={exporting}
                  className="w-full flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">Export data (JSON)</p>
                    <p className="text-sm text-gray-400">Download all your data in JSON format</p>
                  </div>
                  {exporting ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <span className="text-gray-400">→</span>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-white font-medium">Auto Cloud Backup</p>
                  <p className="text-sm text-gray-400">Sync with cloud automatically</p>
                </div>
                <div className="text-green-500 text-sm">✓ Enabled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
