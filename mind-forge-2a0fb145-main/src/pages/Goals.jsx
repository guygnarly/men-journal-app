
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  TrendingUp,
  Award,
  Flame,
  Edit,
  Trash2,
  MoreVertical,
  Trophy,
  Star,
  Zap,
  Crown
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = [
  { value: "mental_health", label: "Mental Health", icon: "🧠", color: "from-purple-500 to-pink-500" },
  { value: "relationships", label: "Relationships", icon: "❤️", color: "from-red-500 to-pink-500" },
  { value: "career", label: "Career", icon: "💼", color: "from-blue-500 to-cyan-500" },
  { value: "fitness", label: "Fitness", icon: "💪", color: "from-green-500 to-emerald-500" },
  { value: "financial", label: "Financial", icon: "💰", color: "from-yellow-500 to-orange-500" },
  { value: "personal_growth", label: "Personal Growth", icon: "🌱", color: "from-green-500 to-teal-500" },
  { value: "fatherhood", label: "Fatherhood", icon: "👨‍👦", color: "from-indigo-500 to-purple-500" },
  { value: "other", label: "Other", icon: "🎯", color: "from-gray-500 to-gray-600" }
];

const POINTS = {
  GOAL_CREATED: 10,
  MILESTONE_COMPLETED: 25,
  GOAL_COMPLETED: 100,
  CHALLENGE_DAY: 15,
  CHALLENGE_COMPLETED: 200,
  STREAK_MILESTONE: 50 // Not used in this current implementation, but good to have.
};

const BADGES = [
  { id: "goal_starter", name: "Goal Starter", description: "Created your first goal", icon: "🎯", requirement: "goals_created", threshold: 1 },
  { id: "milestone_master", name: "Milestone Master", description: "Completed 10 milestones", icon: "🏁", requirement: "milestones_completed", threshold: 10 },
  { id: "goal_achiever", name: "Goal Achiever", description: "Completed 5 goals", icon: "🏆", requirement: "goals_completed", threshold: 5 },
  { id: "challenge_rookie", name: "Challenge Rookie", description: "Completed your first challenge", icon: "🔥", requirement: "challenge_completions", threshold: 1 },
  { id: "challenge_veteran", name: "Challenge Veteran", description: "Completed 5 challenges", icon: "⚡", requirement: "challenge_completions", threshold: 5 },
  { id: "streak_warrior", name: "Streak Warrior", description: "30-day challenge streak", icon: "💪", requirement: "current_streak", threshold: 30 }, // Using current_streak from User
  { id: "points_collector", name: "Points Collector", description: "Earned 1000 points", icon: "💎", requirement: "total_points", threshold: 1000 },
  { id: "level_10", name: "Rising Star", description: "Reached Level 10", icon: "⭐", requirement: "level", threshold: 10 }
];

export default function Goals() {
  const [user, setUser] = useState(null);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [activeTab, setActiveTab] = useState("active");
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const queryClient = useQueryClient();

  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "mental_health",
    target_date: "",
    milestones: [],
    notes: ""
  });

  const [newMilestone, setNewMilestone] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 100),
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['myChallenges'],
    queryFn: async () => {
      if (!user) return [];
      const participations = await base44.entities.ChallengeParticipation.filter({ 
        user_email: user.email 
      }, '-created_date', 50);
      
      const challengePromises = participations.map(async (p) => {
        const challenge = await base44.entities.Challenge.filter({ id: p.challenge_id });
        return { ...p, challenge: challenge[0] };
      });
      
      return Promise.all(challengePromises);
    },
    enabled: !!user
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const users = await base44.entities.User.list('-total_points', 50);
      return users.map((u, idx) => ({
        rank: idx + 1,
        username: u.username || u.full_name?.split(' ')[0] || 'User',
        points: u.total_points || 0,
        level: u.level || 1,
        streak: u.current_streak || 0,
        challenges: u.challenge_completions || 0,
        isCurrentUser: u.email === user?.email
      }));
    },
    enabled: !!user
  });

  const awardPoints = async (points, reason) => {
    if (!user) return;
    
    const newTotal = (user.total_points || 0) + points;
    const newLevel = Math.floor(newTotal / 500) + 1;
    
    const updatedUserData = {
      total_points: newTotal,
      level: newLevel
    };
    
    await base44.auth.updateMe(updatedUserData);
    
    setPointsEarned(points);
    setShowPointsAnimation(true);
    setTimeout(() => setShowPointsAnimation(false), 3000);
    
    queryClient.invalidateQueries({ queryKey: ['currentUser'] }); // Assuming a currentUser query exists
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    
    // Refresh local user state
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const checkAndAwardBadges = async (type, newValue) => {
    if (!user) return;
    const userBadges = user?.badges || [];
    
    const badgesToAward = BADGES.filter(badge => {
      const alreadyHas = userBadges.some(ub => ub.badge_id === badge.id);
      if (alreadyHas) return false;
      
      if (badge.requirement === type && newValue >= badge.threshold) {
        return true;
      }
      return false;
    });

    if (badgesToAward.length > 0) {
      const newBadges = badgesToAward.map(b => ({
        badge_id: b.id,
        name: b.name,
        earned_date: new Date().toISOString().split('T')[0],
        icon: b.icon
      }));

      await base44.auth.updateMe({
        badges: [...userBadges, ...newBadges]
      });

      alert(`🎉 New Badge${newBadges.length > 1 ? 's' : ''} Unlocked!\n\n${newBadges.map(b => `${b.icon} ${b.name}`).join('\n')}`);
      
      // Refresh local user state after badge update
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    }
  };

  const createGoalMutation = useMutation({
    mutationFn: (goalData) => base44.entities.Goal.create({
      ...goalData,
      status: "not_started",
      progress_percentage: 0,
      is_archived: false,
      milestones: goalData.milestones.map(m => ({
        title: m,
        completed: false,
        completed_date: null
      }))
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      await awardPoints(POINTS.GOAL_CREATED, "Created a goal");
      
      const newGoalsCreated = (user?.goals_created || 0) + 1;
      await base44.auth.updateMe({ goals_created: newGoalsCreated });
      await checkAndAwardBadges('goals_created', newGoalsCreated);
      
      setShowNewGoal(false);
      setNewGoal({
        title: "",
        description: "",
        category: "mental_health",
        target_date: "",
        milestones: [],
        notes: ""
      });
      setNewMilestone("");
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      // Check if status changed to completed (and was not completed before)
      if (variables.data.status === 'completed' && variables.data.old_status !== 'completed') {
        await awardPoints(POINTS.GOAL_COMPLETED, "Completed a goal");
        const newGoalsCompleted = (user?.goals_completed || 0) + 1;
        await base44.auth.updateMe({ goals_completed: newGoalsCompleted });
        await checkAndAwardBadges('goals_completed', newGoalsCompleted);
      }
      
      setEditingGoal(null);
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const completeDayMutation = useMutation({
    mutationFn: async ({ participation, day, reflection }) => {
      const newCompletedDays = [...(participation.completed_days || []), day];
      const newDailyEntries = [
        ...(participation.daily_entries || []),
        {
          day,
          reflection,
          completed_at: new Date().toISOString()
        }
      ];

      const isFullyCompleted = newCompletedDays.length >= participation.challenge.duration_days;
      const completionPercentage = (newCompletedDays.length / participation.challenge.duration_days) * 100;

      const updates = {
        completed_days: newCompletedDays,
        daily_entries: newDailyEntries,
        current_day: Math.max(...newCompletedDays, 0) + 1,
        completion_percentage: completionPercentage
      };

      if (isFullyCompleted) {
        updates.is_completed = true;
        updates.completion_date = new Date().toISOString().split('T')[0];
        updates.status = "completed";
      }

      await base44.entities.ChallengeParticipation.update(participation.id, updates);
      
      // Award points for completing day
      await awardPoints(POINTS.CHALLENGE_DAY, `Challenge day ${day + 1} completed`);
      
      // If fully completed, award completion bonus and check for badges
      if (isFullyCompleted) {
        await awardPoints(POINTS.CHALLENGE_COMPLETED, `Challenge completed!`);
        const newChallengeCount = (user?.challenge_completions || 0) + 1;
        await base44.auth.updateMe({ challenge_completions: newChallengeCount });
        await checkAndAwardBadges('challenge_completions', newChallengeCount);
      }

      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myChallenges'] });
    },
  });

  const handleAddMilestone = () => {
    if (newMilestone.trim()) {
      setNewGoal({
        ...newGoal,
        milestones: [...newGoal.milestones, newMilestone]
      });
      setNewMilestone("");
    }
  };

  const handleRemoveMilestone = (index) => {
    setNewGoal({
      ...newGoal,
      milestones: newGoal.milestones.filter((_, i) => i !== index)
    });
  };

  const handleCreateGoal = () => {
    if (newGoal.title.trim()) {
      createGoalMutation.mutate(newGoal);
    }
  };

  const handleToggleMilestone = async (goal, milestoneIndex) => {
    const updatedMilestones = [...goal.milestones];
    const wasCompleted = updatedMilestones[milestoneIndex].completed;
    
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: !updatedMilestones[milestoneIndex].completed,
      completed_date: !updatedMilestones[milestoneIndex].completed ? new Date().toISOString().split('T')[0] : null
    };

    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = updatedMilestones.length > 0 ? (completedCount / updatedMilestones.length) * 100 : 0;

    await updateGoalMutation.mutateAsync({
      id: goal.id,
      data: {
        milestones: updatedMilestones,
        progress_percentage: Math.round(progress),
        status: progress === 100 ? "completed" : progress > 0 ? "in_progress" : "not_started"
      }
    });

    if (!wasCompleted && updatedMilestones[milestoneIndex].completed) { // only award points and check for badges if milestone was newly completed
      await awardPoints(POINTS.MILESTONE_COMPLETED, "Milestone completed");
      const newMilestonesCompleted = (user?.milestones_completed || 0) + 1;
      await base44.auth.updateMe({ milestones_completed: newMilestonesCompleted });
      await checkAndAwardBadges('milestones_completed', newMilestonesCompleted);
    }
  };

  const handleStatusChange = (goal, newStatus) => {
    updateGoalMutation.mutate({
      id: goal.id,
      data: { status: newStatus, old_status: goal.status }
    });
  };

  const handleArchiveGoal = (goal) => {
    updateGoalMutation.mutate({
      id: goal.id,
      data: { is_archived: !goal.is_archived }
    });
  };

  const activeGoals = goals.filter(g => !g.is_archived && g.status !== "completed");
  const completedGoals = goals.filter(g => g.status === "completed" && !g.is_archived);
  const archivedGoals = goals.filter(g => g.is_archived);
  const activeChallenges = challenges.filter(c => c.status === "active");
  const completedChallenges = challenges.filter(c => c.status === "completed");

  const getCategoryInfo = (value) => CATEGORIES.find(c => c.value === value);

  const getDaysUntilTarget = (targetDate) => {
    if (!targetDate) return null;
    const days = differenceInDays(parseISO(targetDate), new Date());
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today!";
    if (days === 1) return "Due tomorrow";
    return `${days} days left`;
  };

  const getLevelInfo = (level) => {
    if (level >= 20) return { title: "Master", color: "text-purple-500", icon: Crown };
    if (level >= 15) return { title: "Expert", color: "text-yellow-500", icon: Trophy };
    if (level >= 10) return { title: "Champion", color: "text-blue-500", icon: Award };
    if (level >= 5) return { title: "Warrior", color: "text-green-500", icon: Zap };
    return { title: "Beginner", color: "text-gray-400", icon: Star };
  };

  const userLevelInfo = getLevelInfo(user?.level || 1);
  const LevelIcon = userLevelInfo.icon;
  const pointsToNextLevel = 500 - ((user?.total_points || 0) % 500);
  const progressToNextLevel = ((user?.total_points || 0) % 500) / 500 * 100;

  const GoalCard = ({ goal }) => {
    const category = getCategoryInfo(goal.category);
    const daysUntil = getDaysUntilTarget(goal.target_date);

    return (
      <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{category?.icon}</span>
                <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                  {category?.label}
                </Badge>
                {goal.status === "completed" && (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    +{POINTS.GOAL_COMPLETED} pts
                  </Badge>
                )}
              </div>
              <CardTitle className="text-white text-xl mb-2">{goal.title}</CardTitle>
              {goal.description && (
                <p className="text-gray-400 text-sm">{goal.description}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem 
                  onClick={() => setEditingGoal(goal)}
                  className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleArchiveGoal(goal)}
                  className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {goal.is_archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => deleteGoalMutation.mutate(goal.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goal.target_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Target: {format(parseISO(goal.target_date), "MMM d, yyyy")}
              </span>
              <span className={`font-semibold ${daysUntil?.includes('overdue') ? 'text-red-400' : 'text-blue-400'}`}>
                {daysUntil}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-semibold">{goal.progress_percentage || 0}%</span>
            </div>
            <Progress value={goal.progress_percentage || 0} className="h-2" />
          </div>

          {goal.milestones && goal.milestones.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-400">Milestones:</p>
              {goal.milestones.map((milestone, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Checkbox
                    checked={milestone.completed}
                    onCheckedChange={() => handleToggleMilestone(goal, idx)}
                    className="mt-1"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm ${milestone.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {milestone.title}
                    </span>
                    {milestone.completed && (
                      <Badge className="bg-cyan-500 text-white text-xs">
                        +{POINTS.MILESTONE_COMPLETED}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {goal.status !== "completed" && (
            <div className="flex gap-2 pt-2">
              <Select value={goal.status} onValueChange={(value) => handleStatusChange(goal, value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="not_started" className="text-white">Not Started</SelectItem>
                  <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                  <SelectItem value="on_hold" className="text-white">On Hold</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ChallengeCard = ({ participation }) => {
    const challenge = participation.challenge;
    if (!challenge) return null;

    const completedDays = participation.completed_days?.length || 0;
    const currentDay = completedDays;
    const todayPrompt = challenge.daily_prompts?.[currentDay];
    const [reflection, setReflection] = useState("");

    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-orange-500 text-white">
              <Flame className="w-3 h-3 mr-1" />
              Day {completedDays + 1} of {challenge.duration_days}
            </Badge>
            {participation.is_completed && (
              <Badge className="bg-green-500 text-white">
                <Award className="w-3 h-3 mr-1" />
                +{POINTS.CHALLENGE_COMPLETED} pts
              </Badge>
            )}
          </div>
          <CardTitle className="text-white">{challenge.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-400 text-sm">{challenge.description}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-semibold">{participation.completion_percentage || 0}%</span>
            </div>
            <Progress value={participation.completion_percentage || 0} className="h-2" />
          </div>

          {!participation.is_completed && todayPrompt && (
            <div className="p-4 bg-gray-800 rounded-lg space-y-3">
              <div>
                <p className="font-semibold text-white mb-1">Today's Task:</p>
                <p className="text-sm text-gray-300">{todayPrompt.task}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 italic">{todayPrompt.prompt}</p>
              </div>
              <Textarea
                placeholder="Write your reflection..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Button
                onClick={() => {
                  if (reflection.trim()) {
                    completeDayMutation.mutate({ 
                      participation, 
                      day: currentDay, 
                      reflection 
                    });
                    setReflection("");
                  }
                }}
                disabled={!reflection.trim() || completeDayMutation.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Day {completedDays + 1} (+{POINTS.CHALLENGE_DAY} pts)
              </Button>
            </div>
          )}

          {participation.is_completed && (
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
              <Award className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="text-green-400 font-semibold">Challenge Completed!</p>
              <p className="text-gray-400 text-sm mt-1">
                Completed on {format(parseISO(participation.completion_date), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Points Animation */}
        {showPointsAnimation && (
          <div className="fixed top-20 right-8 z-50 animate-bounce">
            <Badge className="bg-yellow-500 text-black text-lg px-4 py-2 shadow-2xl">
              <Star className="w-5 h-5 mr-2" />
              +{pointsEarned} Points!
            </Badge>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Goals & Challenges</h1>
            <p className="text-gray-400">Track your progress and build momentum</p>
          </div>
          <Dialog open={showNewGoal} onOpenChange={setShowNewGoal}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                New Goal (+{POINTS.GOAL_CREATED} pts)
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Goal Title</Label>
                  <Input
                    placeholder="What do you want to achieve?"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newGoal.category} onValueChange={(value) => setNewGoal({...newGoal, category: value})}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value} className="text-white">
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Why is this goal important to you?"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Date (optional)</Label>
                  <Input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Milestones (+{POINTS.MILESTONE_COMPLETED} pts each)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a milestone..."
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMilestone()}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Button onClick={handleAddMilestone} variant="outline" className="bg-gray-800 border-gray-700">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {newGoal.milestones.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {newGoal.milestones.map((milestone, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <span className="text-gray-300 text-sm">{milestone}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveMilestone(idx)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCreateGoal}
                  disabled={!newGoal.title.trim() || createGoalMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Gamification Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-white">{user?.total_points || 0}</div>
              <p className="text-xs text-gray-400">Total Points</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <LevelIcon className={`w-4 h-4 ${userLevelInfo.color}`} />
              </div>
              <div className="text-2xl font-bold text-white">Level {user?.level || 1}</div>
              <p className={`text-xs ${userLevelInfo.color}`}>{userLevelInfo.title}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">{activeGoals.length}</div>
              <p className="text-xs text-gray-400">Active Goals</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">{user?.goals_completed || 0}</div>
              <p className="text-xs text-gray-400">Goals Done</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">{user?.challenge_completions || 0}</div>
              <p className="text-xs text-gray-400">Challenges</p>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress Card */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <LevelIcon className={`w-8 h-8 ${userLevelInfo.color}`} />
                <div>
                  <p className="text-white font-bold text-lg">Level {user?.level || 1} - {userLevelInfo.title}</p>
                  <p className="text-gray-400 text-sm">{pointsToNextLevel} points to next level</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-500">{user?.total_points || 0}</p>
                <p className="text-xs text-gray-400">Total Points</p>
              </div>
            </div>
            <Progress value={progressToNextLevel} className="h-3" />
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5 bg-gray-900 border border-gray-800">
            <TabsTrigger value="active" className="data-[state=active]:bg-gray-800">
              Active ({activeGoals.length})
            </TabsTrigger>
            <TabsTrigger value="challenges" className="data-[state=active]:bg-gray-800">
              Challenges ({activeChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-gray-800">
              <Trophy className="w-4 h-4 mr-1" />
              Ranks
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-gray-800">
              Done ({completedGoals.length + completedChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="badges" className="data-[state=active]:bg-gray-800">
              <Award className="w-4 h-4 mr-1" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeGoals.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Target className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Goals</h3>
                  <p className="text-gray-400 mb-4">Set your first goal and start earning points!</p>
                  <Button onClick={() => setShowNewGoal(true)} className="bg-gradient-to-r from-green-500 to-emerald-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {activeGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="challenges">
            {activeChallenges.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Flame className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Challenges</h3>
                  <p className="text-gray-400 mb-4">Join a challenge to earn points and badges!</p>
                  <Button onClick={() => window.location.href = "/Community?tab=challenges"} className="bg-gradient-to-r from-orange-500 to-yellow-500">
                    <Flame className="w-4 h-4 mr-2" />
                    Browse Challenges
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {activeChallenges.map(participation => (
                  <ChallengeCard key={participation.id} participation={participation} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Points Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          entry.isCurrentUser ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            entry.rank === 1 ? 'bg-yellow-500 text-black' :
                            entry.rank === 2 ? 'bg-gray-400 text-black' :
                            entry.rank === 3 ? 'bg-orange-600 text-white' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                          </div>
                          <div>
                            <p className="text-white font-semibold">
                              {entry.username} {entry.isCurrentUser && '(You)'}
                            </p>
                            <p className="text-xs text-gray-400">Level {entry.level}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-500 font-bold">{entry.points}</p>
                          <p className="text-xs text-gray-400">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Streak Champions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard
                      .sort((a, b) => b.streak - a.streak)
                      .slice(0, 10)
                      .map((entry, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            entry.isCurrentUser ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold text-sm">
                              #{idx + 1}
                            </div>
                            <div>
                              <p className="text-white font-semibold">
                                {entry.username} {entry.isCurrentUser && '(You)'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <p className="text-orange-500 font-bold">{entry.streak} days</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-500" />
                    Challenge Champions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard
                      .filter(e => e.challenges > 0)
                      .sort((a, b) => b.challenges - a.challenges)
                      .slice(0, 10)
                      .map((entry, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            entry.isCurrentUser ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold text-sm">
                              #{idx + 1}
                            </div>
                            <p className="text-white font-semibold">
                              {entry.username} {entry.isCurrentUser && '(You)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-green-500" />
                            <p className="text-green-500 font-bold">{entry.challenges}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <div className="space-y-6">
              {/* Earned Badges */}
              {user?.badges && user.badges.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Award className="w-6 h-6 text-yellow-500" />
                    Earned Badges ({user.badges.length})
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {user.badges.map((badge, idx) => (
                      <Card key={idx} className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
                        <CardContent className="p-6 text-center">
                          <div className="text-6xl mb-3">{badge.icon}</div>
                          <h4 className="text-white font-bold mb-1">{badge.name}</h4>
                          <p className="text-gray-400 text-sm mb-2">
                            Earned {format(parseISO(badge.earned_date), "MMM d, yyyy")}
                          </p>
                          <Badge className="bg-yellow-500 text-black">
                            <Star className="w-3 h-3 mr-1" />
                            Unlocked
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Badges */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-gray-500" />
                  Available Badges
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {BADGES.filter(badge => !user?.badges?.some(ub => ub.badge_id === badge.id)).map((badge, idx) => {
                    const userValue = user?.[badge.requirement] || 0;
                    const progress = (userValue / badge.threshold) * 100;
                    
                    return (
                      <Card key={idx} className="bg-gray-900 border-gray-800">
                        <CardContent className="p-6 text-center">
                          <div className="text-6xl mb-3 grayscale opacity-50">{badge.icon}</div>
                          <h4 className="text-white font-bold mb-1">{badge.name}</h4>
                          <p className="text-gray-400 text-sm mb-3">{badge.description}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{userValue} / {badge.threshold}</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={Math.min(progress, 100)} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-6">
              {completedGoals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Completed Goals ({completedGoals.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {completedGoals.map(goal => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </div>
              )}

              {completedChallenges.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Completed Challenges ({completedChallenges.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {completedChallenges.map(participation => (
                      <ChallengeCard key={participation.id} participation={participation} />
                    ))}
                  </div>
                </div>
              )}

              {completedGoals.length === 0 && completedChallenges.length === 0 && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-12 text-center">
                    <Award className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Completed Items Yet</h3>
                    <p className="text-gray-400">Keep working on your goals and challenges!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="archived">
            {archivedGoals.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Target className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Archived Goals</h3>
                  <p className="text-gray-400">Goals you archive will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {archivedGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
