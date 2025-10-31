
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  MessageCircle,
  ThumbsUp,
  Users,
  Search,
  Send,
  Trophy,
  Flame,
  MessageSquare, // Added for new tab icon
  Star,          // Added for points icon
  Zap,           // Added for points guide icon
  Shield,        // Added for moderation
  AlertTriangle, // Added for moderation
  Eye,           // Added for moderation
  Trash2,        // Added for moderation
  CheckCheck,    // Added for moderation
  Brain          // Added for AI system guide
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const CATEGORIES = [
  { value: "fatherhood", label: "Fatherhood", icon: "👨‍👦" },
  { value: "relationships", label: "Relationships", icon: "❤️" },
  { value: "career", label: "Career", icon: "💼" },
  { value: "mental_health", label: "Mental Health", icon: "🧠" },
  { value: "fitness", label: "Fitness", icon: "💪" },
  { value: "finance", label: "Finance", icon: "💰" },
  { value: "divorce", label: "Divorce & Separation", icon: "💔" },
  { value: "grief", label: "Grief & Loss", icon: "🕊️" },
  { value: "general", label: "General Discussion", icon: "💬" }
];

const CHALLENGE_CATEGORIES = [
  { value: "gratitude", label: "Gratitude", icon: "🙏", color: "bg-yellow-500" },
  { value: "mindfulness", label: "Mindfulness", icon: "🧘", color: "bg-purple-500" },
  { value: "fitness", label: "Fitness", icon: "💪", color: "bg-green-500" },
  { value: "relationships", label: "Relationships", icon: "❤️", color: "bg-red-500" },
  { value: "journaling", label: "Journaling", icon: "📝", color: "bg-blue-500" },
  { value: "stress_relief", label: "Stress Relief", icon: "😌", color: "bg-cyan-500" },
  { value: "sleep", label: "Sleep", icon: "😴", color: "bg-indigo-500" },
  { value: "other", label: "Other", icon: "🎯", color: "bg-gray-500" }
];

// Points definitions for challenges, goals, etc.
const POINTS = {
  CHALLENGE_DAY: 15,
  CHALLENGE_COMPLETED: 200,
  GOAL_COMPLETED: 100,
  MILESTONE_COMPLETED: 25,
  GOAL_CREATED: 10,
  STREAK_MILESTONE: 50,
};

export default function Community() {
  const [activeTab, setActiveTab] = useState("posts");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [moderationWarning, setModerationWarning] = useState(null); // New state for moderation feedback
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission status
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ // Fetches current user for leaderboard checks
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const [newPost, setNewPost] = useState({
    category: "general",
    title: "",
    content: "",
    is_anonymous: true
  });

  const [replyContent, setReplyContent] = useState("");

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['communityPosts', activeCategory],
    queryFn: () => {
      if (activeCategory === "all") {
        return base44.entities.CommunityPost.list('-created_date', 50);
      }
      return base44.entities.CommunityPost.filter({ category: activeCategory }, '-created_date', 50);
    },
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['communityReplies', selectedPost?.id],
    queryFn: () => base44.entities.CommunityReply.filter({ post_id: selectedPost.id }, 'created_date', 100),
    enabled: !!selectedPost
  });

  const { data: challenges = [], isLoading: challengesLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.list('-created_date', 50),
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['myParticipations'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.ChallengeParticipation.filter({ user_email: currentUser.email }, '-created_date', 100);
    },
  });

  const { data: challengeParticipations = [] } = useQuery({
    queryKey: ['challengeParticipations', selectedChallenge?.id],
    queryFn: () => base44.entities.ChallengeParticipation.filter({ challenge_id: selectedChallenge.id }, '-created_date', 100),
    enabled: !!selectedChallenge
  });

  const { data: challengeLeaderboard = [] } = useQuery({
    queryKey: ['challengeLeaderboard'],
    queryFn: async () => {
      const users = await base44.entities.User.list('-challenge_completions', 50); // Assumes challenge_completions exists and is sortable
      return users
        .filter(u => (u.challenge_completions || 0) > 0)
        .map((u, idx) => ({
          rank: idx + 1,
          username: u.username || u.full_name?.split(' ')[0] || 'User',
          completions: u.challenge_completions || 0,
          points: u.total_points || 0,
          level: u.level || 1,
          isCurrentUser: user && u.email === user.email
        }));
    },
    enabled: !!user // Only enable this query if the current user is loaded
  });

  const { data: pendingModeration = [] } = useQuery({
    queryKey: ['pendingModeration'],
    queryFn: () => base44.entities.Moderation.filter({ status: 'pending' }, '-created_date', 100),
    enabled: user?.role === 'admin'
  });

  const moderateContent = async (content, type) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a content moderator for a men's mental health support community. Analyze this ${type} for violations.

CONTENT: "${content}"

Check for:
1. Hate speech (racism, sexism, homophobia, etc.)
2. Harassment or bullying
3. Spam or promotional content
4. Self-harm or suicidal ideation
5. Inappropriate sexual content

Return analysis in JSON format.`,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            is_violation: { type: "boolean" },
            violation_type: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            explanation: { type: "string" },
            suggested_action: { type: "string", enum: ["monitor", "warn_user", "hide_content", "delete_content", "ban_user"] },
            user_message: { type: "string" }
          },
          required: ["is_violation", "confidence"]
        }
      });
      return result;
    } catch (error) {
      console.error("Moderation check failed:", error);
      return { is_violation: false, confidence: 0 }; // Default to no violation on error
    }
  };

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      setIsSubmitting(true);
      setModerationWarning(null); // Clear previous warnings

      // AI Moderation Check
      const modCheck = await moderateContent(
        `${postData.title}\n\n${postData.content}`,
        'post'
      );

      if (modCheck.is_violation && modCheck.confidence > 0.7) {
        if (modCheck.severity === 'critical' || modCheck.severity === 'high') {
          setModerationWarning({
            type: 'error',
            message: modCheck.user_message || "Your post violates our community guidelines and cannot be published.",
            explanation: modCheck.explanation
          });
          setIsSubmitting(false);
          return null; // Block creation
        } else {
          setModerationWarning({
            type: 'warning',
            message: modCheck.user_message || "Your post may contain sensitive content. Please review our community guidelines.",
            explanation: modCheck.explanation
          });
        }
      }

      const currentUser = await base44.auth.me();
      const post = await base44.entities.CommunityPost.create({
        ...postData,
        author_username: postData.is_anonymous ? null : (currentUser.username || currentUser.full_name),
        upvotes: 0,
        reply_count: 0
      });

      // Create moderation record if flagged
      if (modCheck.is_violation && modCheck.confidence > 0.5) {
        await base44.entities.Moderation.create({
          content_type: 'post',
          content_id: post.id,
          flagged_by: 'ai',
          violation_type: modCheck.violation_type || 'inappropriate',
          severity: modCheck.severity || 'low',
          ai_confidence: modCheck.confidence,
          ai_explanation: modCheck.explanation,
          suggested_action: modCheck.suggested_action || 'monitor',
          status: 'pending',
          original_content: `${postData.title}\n\n${postData.content}`,
          author_email: currentUser.email
        });
      }

      setIsSubmitting(false);
      return post;
    },
    onSuccess: (post) => {
      if (post) { // Only invalidate if post was actually created (not blocked by severe moderation)
        queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
        queryClient.invalidateQueries({ queryKey: ['pendingModeration'] }); // Invalidate mod queue
        setShowNewPost(false);
        setNewPost({ category: "general", title: "", content: "", is_anonymous: true });
        setModerationWarning(null); // Clear warning after successful post
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error("Failed to create post:", error);
      setModerationWarning({
        type: 'error',
        message: "Failed to create post due to an unexpected error.",
        explanation: error.message
      });
    }
  });

  const createReplyMutation = useMutation({
    mutationFn: async (replyData) => {
      setIsSubmitting(true);

      // AI Moderation Check
      const modCheck = await moderateContent(replyData.content, 'reply');

      if (modCheck.is_violation && modCheck.confidence > 0.7) {
        if (modCheck.severity === 'critical' || modCheck.severity === 'high') {
          alert(`⚠️ Community Guidelines Violation\n\n${modCheck.user_message || "Your reply violates our community guidelines and cannot be published."}\n\nReason: ${modCheck.explanation}`);
          setIsSubmitting(false);
          return null; // Block creation
        }
      }

      const currentUser = await base44.auth.me();
      const reply = await base44.entities.CommunityReply.create({
        ...replyData,
        author_username: replyData.is_anonymous ? null : (currentUser.username || currentUser.full_name),
        upvotes: 0
      });

      // Update reply count on post
      await base44.entities.CommunityPost.update(selectedPost.id, {
        reply_count: (selectedPost.reply_count || 0) + 1
      });

      // Create moderation record if flagged
      if (modCheck.is_violation && modCheck.confidence > 0.5) {
        await base44.entities.Moderation.create({
          content_type: 'reply',
          content_id: reply.id,
          flagged_by: 'ai',
          violation_type: modCheck.violation_type || 'inappropriate',
          severity: modCheck.severity || 'low',
          ai_confidence: modCheck.confidence,
          ai_explanation: modCheck.explanation,
          suggested_action: modCheck.suggested_action || 'monitor',
          status: 'pending',
          original_content: replyData.content,
          author_email: currentUser.email
        });
      }

      setIsSubmitting(false);
      return reply;
    },
    onSuccess: (reply) => {
      if (reply) { // Only invalidate if reply was actually created
        queryClient.invalidateQueries({ queryKey: ['communityReplies', selectedPost?.id] });
        queryClient.invalidateQueries({ queryKey: ['communityPosts'] }); // Invalidate posts to update reply_count
        queryClient.invalidateQueries({ queryKey: ['pendingModeration'] }); // Invalidate mod queue
        setReplyContent("");
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error("Failed to create reply:", error);
      alert("Failed to post reply due to an unexpected error.");
    }
  });

  const upvotePostMutation = useMutation({
    mutationFn: async (post) => {
      const updatedPost = await base44.entities.CommunityPost.update(post.id, {
        upvotes: (post.upvotes || 0) + 1
      });
      return { ...post, upvotes: (post.upvotes || 0) + 1 }; // Optimistically return updated post data
    },
    onSuccess: (updatedPost) => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      // If the upvoted post is currently selected, update the selectedPost state
      if (selectedPost && selectedPost.id === updatedPost.id) {
        setSelectedPost(prev => ({ ...prev, upvotes: updatedPost.upvotes }));
      }
    },
  });

  const upvoteReplyMutation = useMutation({
    mutationFn: async (reply) => {
      const updatedReply = await base44.entities.CommunityReply.update(reply.id, {
        upvotes: (reply.upvotes || 0) + 1
      });
      return { ...reply, upvotes: (reply.upvotes || 0) + 1 }; // Optimistically return updated reply data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityReplies', selectedPost?.id] });
    },
  });

  const joinChallengeMutation = useMutation({
    mutationFn: async (challenge) => {
      const currentUser = await base44.auth.me();
      const participation = await base44.entities.ChallengeParticipation.create({
        challenge_id: challenge.id,
        user_email: currentUser.email,
        joined_date: new Date().toISOString().split('T')[0],
        current_day: 0, // Day 0 means before starting day 1
        completed_days: [],
        daily_entries: [],
        is_completed: false,
        status: "active"
      });

      await base44.entities.Challenge.update(challenge.id, {
        participant_count: (challenge.participant_count || 0) + 1
      });

      return participation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myParticipations'] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challengeLeaderboard'] }); // Invalidate leaderboard
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

      const challenge = challenges.find(c => c.id === participation.challenge_id);
      if (!challenge) {
        throw new Error("Challenge not found for participation");
      }
      const isFullyCompleted = newCompletedDays.length >= challenge.duration_days;

      let totalPointsEarned = POINTS.CHALLENGE_DAY; // Points for completing a day

      const updates = {
        completed_days: newCompletedDays,
        daily_entries: newDailyEntries,
        current_day: Math.max(...newCompletedDays) + 1 // Next day to complete
      };

      if (isFullyCompleted) {
        updates.is_completed = true;
        updates.completion_date = new Date().toISOString().split('T')[0];
        updates.status = "completed";
        totalPointsEarned += POINTS.CHALLENGE_COMPLETED; // Additional points for completing the whole challenge

        await base44.entities.Challenge.update(challenge.id, {
          completion_count: (challenge.completion_count || 0) + 1
        });
      }

      // Update user's points and challenge completions
      const currentUser = await base44.auth.me();
      await base44.entities.User.update(currentUser.id, {
        total_points: (currentUser.total_points || 0) + totalPointsEarned,
        challenge_completions: isFullyCompleted ? (currentUser.challenge_completions || 0) + 1 : currentUser.challenge_completions
      });

      return base44.entities.ChallengeParticipation.update(participation.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myParticipations'] });
      queryClient.invalidateQueries({ queryKey: ['challengeParticipations'] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challengeLeaderboard'] }); // Invalidate leaderboard as user points/completions change
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Invalidate user's own data to reflect points/completions
      //setDailyReflection(""); // Removed from outline, keep commented if it's meant to be gone
    },
  });

  const reviewModerationMutation = useMutation({
    mutationFn: async ({ moderationId, action, notes }) => {
      const moderation = await base44.entities.Moderation.update(moderationId, {
        status: 'reviewed',
        moderator_action: action,
        moderator_notes: notes,
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString()
      });

      // Execute the action
      if (action === 'delete_content') {
        if (moderation.content_type === 'post') {
          await base44.entities.CommunityPost.delete(moderation.content_id);
        } else if (moderation.content_type === 'reply') {
          await base44.entities.CommunityReply.delete(moderation.content_id);
        }
      } else if (action === 'warn_user') {
        // Send warning email
        await base44.integrations.Core.SendEmail({
          to: moderation.author_email,
          subject: "Community Guidelines Warning - MindForge",
          body: `Hello,

Your recent ${moderation.content_type} has been flagged for potentially violating our community guidelines.

Violation Type: ${moderation.violation_type?.replace(/_/g, ' ')}
Moderator Notes: ${notes || 'Please review our community guidelines.'}

We encourage respectful, supportive discussion. Future violations may result in content removal or account restrictions.

Thank you for helping us maintain a safe community.

- The MindForge Team`
        });
      }

      return moderation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingModeration'] });
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityReplies', selectedPost?.id] });
    },
  });

  const handleCreatePost = () => {
    if (newPost.title.trim() && newPost.content.trim()) {
      createPostMutation.mutate(newPost);
    }
  };

  const handleReply = () => {
    if (replyContent.trim() && selectedPost) {
      createReplyMutation.mutate({
        post_id: selectedPost.id,
        content: replyContent,
        is_anonymous: true
      });
    }
  };

  const handleJoinChallenge = (challenge) => {
    joinChallengeMutation.mutate(challenge);
  };

  // handleCompleteDay is retained but its UI trigger from the main challenges tab was removed by the outline.
  // It could be re-integrated into the challenge detail dialog if desired.
  // const handleCompleteDay = (participation, day) => { // dailyReflection state was removed, so this is unused
  //   if (dailyReflection.trim()) {
  //     completeDayMutation.mutate({ participation, day, reflection: dailyReflection });
  //   }
  // };

  const getMyParticipation = (challengeId) => {
    return myParticipations.find(p => p.challenge_id === challengeId);
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(search) ||
      post.content?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Community</h1>
            <p className="text-gray-400">Connect, share, and grow together</p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && pendingModeration.length > 0 && (
              <Button
                variant="outline"
                className="bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                onClick={() => setActiveTab('moderation')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Moderation ({pendingModeration.length})
              </Button>
            )}
            <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {moderationWarning && (
                    <Alert className={moderationWarning.type === 'error' ? 'bg-red-900/20 border-red-500/50' : 'bg-yellow-900/20 border-yellow-500/50'}>
                      <AlertTriangle className={`h-4 w-4 ${moderationWarning.type === 'error' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <AlertTitle className="text-white">
                        {moderationWarning.type === 'error' ? 'Post Blocked' : 'Content Warning'}
                      </AlertTitle>
                      <AlertDescription className="text-gray-300">
                        {moderationWarning.message}
                        {moderationWarning.explanation && (
                          <p className="text-sm text-gray-400 mt-2">Reason: {moderationWarning.explanation}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newPost.category} onValueChange={(value) => setNewPost({...newPost, category: value})}>
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
                    <Label>Title</Label>
                    <Input
                      placeholder="Give your post a title..."
                      value={newPost.title}
                      onChange={(e) => {
                        setNewPost({...newPost, title: e.target.value});
                        setModerationWarning(null); // Clear warning on input change
                      }}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Share your thoughts..."
                      value={newPost.content}
                      onChange={(e) => {
                        setNewPost({...newPost, content: e.target.value});
                        setModerationWarning(null); // Clear warning on input change
                      }}
                      className="min-h-[200px] bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anonymous"
                      checked={newPost.is_anonymous}
                      onCheckedChange={(checked) => setNewPost({...newPost, is_anonymous: checked})}
                    />
                    <Label htmlFor="anonymous" className="text-sm text-gray-400 cursor-pointer">
                      Post anonymously
                    </Label>
                  </div>

                  <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-gray-300 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span><strong>AI Moderation:</strong> Posts are automatically checked for guideline violations to keep our community safe.</span>
                    </p>
                  </div>

                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.title.trim() || !newPost.content.trim() || isSubmitting || moderationWarning?.type === 'error'}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    {isSubmitting ? "Checking content..." : "Create Post"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-4 bg-gray-900 border border-gray-800">
            <TabsTrigger value="posts" className="data-[state=active]:bg-gray-800">
              <MessageSquare className="w-4 h-4 mr-2" />
              Forum
            </TabsTrigger>
            <TabsTrigger value="challenges" className="data-[state=active]:bg-gray-800">
              <Flame className="w-4 h-4 mr-2" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-gray-800">
              <Trophy className="w-4 h-4 mr-2" />
              Champions
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="moderation" className="data-[state=active]:bg-gray-800">
                <Shield className="w-4 h-4 mr-2" />
                Mod Queue
                {pendingModeration.length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {pendingModeration.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="posts">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Categories Sidebar */}
              <Card className="lg:col-span-1 bg-gray-900 border-gray-800 h-fit">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant={activeCategory === "all" ? "default" : "ghost"}
                    className={`w-full justify-start ${activeCategory === "all" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    onClick={() => setActiveCategory("all")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    All Posts
                  </Button>
                  {CATEGORIES.map(cat => (
                    <Button
                      key={cat.value}
                      variant={activeCategory === cat.value ? "default" : "ghost"}
                      className={`w-full justify-start ${activeCategory === cat.value ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                      onClick={() => setActiveCategory(cat.value)}
                    >
                      <span className="mr-2">{cat.icon}</span>
                      {cat.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Posts List */}
              <div className="lg:col-span-3 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-900 border-gray-800 text-white"
                  />
                </div>

                {postsLoading ? (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-8 text-center text-gray-400">
                      Loading posts...
                    </CardContent>
                  </Card>
                ) : filteredPosts.length === 0 ? (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-8 text-center text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No posts yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPosts.map(post => (
                    <Card
                      key={post.id}
                      className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                upvotePostMutation.mutate(post);
                              }}
                              className="flex flex-col items-center gap-1 px-2 py-1 rounded hover:bg-gray-800"
                            >
                              <ThumbsUp className="w-5 h-5 text-gray-400 hover:text-blue-400" />
                              <span className="text-sm font-bold text-gray-400">{post.upvotes || 0}</span>
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                                {CATEGORIES.find(c => c.value === post.category)?.icon}{" "}
                                {CATEGORIES.find(c => c.value === post.category)?.label}
                              </Badge>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">{post.title}</h3>
                            <p className="text-gray-400 line-clamp-2 mb-3">{post.content}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>By {post.is_anonymous ? "Anonymous" : post.author_username}</span>
                              <span>•</span>
                              <span>{format(parseISO(post.created_date), "MMM d, yyyy")}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" />
                                {post.reply_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="challenges">
            <div className="grid md:grid-cols-2 gap-6">
              {challenges.map(challenge => {
                const isParticipating = myParticipations.some(p => p.challenge_id === challenge.id);
                const participation = myParticipations.find(p => p.challenge_id === challenge.id);

                const completedDaysCount = participation?.completed_days?.length || 0;
                const completionPercentage = challenge.duration_days > 0
                  ? (completedDaysCount / challenge.duration_days) * 100
                  : 0;

                const earnedDayPoints = completedDaysCount * POINTS.CHALLENGE_DAY;
                // Points for remaining days, excluding completion bonus if already completed
                const remainingChallengeDayPoints = (challenge.duration_days - completedDaysCount) * POINTS.CHALLENGE_DAY;
                const completionBonus = isParticipating && !participation?.is_completed ? POINTS.CHALLENGE_COMPLETED : 0;
                const totalRemainingPoints = remainingChallengeDayPoints + completionBonus;


                return (
                  <Card key={challenge.id} className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-orange-500 text-white">
                          {challenge.duration_days} Days
                        </Badge>
                        <Badge className="bg-yellow-500 text-black">
                          <Star className="w-3 h-3 mr-1" />
                          {POINTS.CHALLENGE_DAY * challenge.duration_days + POINTS.CHALLENGE_COMPLETED} pts
                        </Badge>
                      </div>
                      <CardTitle className="text-white">{challenge.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-400">{challenge.description}</p>

                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {challenge.participant_count || 0} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {challenge.completion_count || 0} completed
                        </span>
                      </div>

                      {isParticipating && participation ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white font-semibold">
                              Day {completedDaysCount} / {challenge.duration_days}
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full"
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{earnedDayPoints} pts earned</span>
                            {/* Display remaining points only if not completed */}
                            {!participation.is_completed && (
                              <span>{totalRemainingPoints} pts remaining</span>
                            )}
                          </div>
                          {participation.is_completed ? (
                            <Badge className="w-full justify-center bg-green-500/20 text-green-400 border-green-500/30">
                              ✓ Completed
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => setSelectedChallenge(challenge)}
                              className="w-full bg-green-500/10 border-green-500/30 text-green-400"
                            >
                              View My Progress & Update
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleJoinChallenge(challenge)}
                          disabled={joinChallengeMutation.isPending}
                          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                        >
                          <Flame className="w-4 h-4 mr-2" />
                          Join Challenge
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {challenges.length === 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Flame className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Challenges</h3>
                  <p className="text-gray-400">Check back soon for new challenges!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Challenge Champions
                </CardTitle>
                <p className="text-gray-400 text-sm mt-2">Top performers in community challenges</p>
              </CardHeader>
              <CardContent>
                {challengeLeaderboard.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No challenge completions yet</p>
                    <p className="text-sm mt-1">Be the first to complete a challenge!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {challengeLeaderboard.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          entry.isCurrentUser
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 scale-105'
                            : 'bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                            entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/50' :
                            entry.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/50' :
                            entry.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-lg shadow-orange-600/50' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                          </div>
                          <div>
                            <p className="text-white font-bold text-lg">
                              {entry.username}
                              {entry.isCurrentUser && (
                                <Badge className="ml-2 bg-blue-500 text-white">You</Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-400">Level {entry.level}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <p className="text-2xl font-bold text-yellow-500">{entry.completions}</p>
                          </div>
                          <p className="text-xs text-gray-400">{entry.points} points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Points Guide */}
                <div className="mt-8 p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    How to Earn Points
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-gray-300">Complete challenge day</span>
                      <Badge className="bg-yellow-500 text-black">+{POINTS.CHALLENGE_DAY}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-gray-300">Finish challenge</span>
                      <Badge className="bg-yellow-500 text-black">+{POINTS.CHALLENGE_COMPLETED}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-gray-300">Complete goal</span>
                      <Badge className="bg-yellow-500 text-black">+{POINTS.GOAL_COMPLETED}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-gray-300">Complete milestone</span>
                      <Badge className="bg-yellow-500 text-black">+{POINTS.MILESTONE_COMPLETED}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-gray-300">Create goal</span>
                      <Badge className="bg-yellow-500 text-black">+{POINTS.GOAL_CREATED}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-gray-300">Streak milestone</span>
                      <Badge className="bg-yellow-500 text-black">+{POINTS.STREAK_MILESTONE}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="moderation">
              <Card className="bg-gray-900 border-gray-800 mb-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-red-500" />
                    Moderation Queue
                  </CardTitle>
                  <p className="text-gray-400 text-sm">AI-flagged content requiring human review</p>
                </CardHeader>
                <CardContent>
                  {pendingModeration.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>All clear! No content pending moderation.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingModeration.map((mod, idx) => (
                        <Card key={idx} className={`border-2 ${
                          mod.severity === 'critical' ? 'border-red-500/50 bg-red-900/10' :
                          mod.severity === 'high' ? 'border-orange-500/50 bg-orange-900/10' :
                          mod.severity === 'medium' ? 'border-yellow-500/50 bg-yellow-900/10' :
                          'border-gray-700 bg-gray-800/50'
                        }`}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={`text-white ${
                                  mod.severity === 'critical' ? 'bg-red-500' :
                                  mod.severity === 'high' ? 'bg-orange-500' :
                                  mod.severity === 'medium' ? 'bg-yellow-500 text-black' :
                                  'bg-gray-500'
                                }`}>
                                  {mod.severity} severity
                                </Badge>
                                <Badge variant="outline" className="border-gray-700 text-gray-300">
                                  {mod.violation_type?.replace(/_/g, ' ')}
                                </Badge>
                                <Badge variant="outline" className="border-gray-700 text-gray-300">
                                  {(mod.ai_confidence * 100).toFixed(0)}% confidence
                                </Badge>
                              </div>
                              <Badge className="bg-blue-500 text-white">
                                {mod.content_type}
                              </Badge>
                            </div>

                            <div className="p-3 bg-gray-900 rounded border border-gray-700">
                              <p className="text-xs text-gray-500 mb-1">Flagged Content:</p>
                              <p className="text-white text-sm">{mod.original_content}</p>
                            </div>

                            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                              <p className="text-xs text-blue-400 mb-1">AI Analysis:</p>
                              <p className="text-gray-300 text-sm mb-2">{mod.ai_explanation}</p>
                              <p className="text-xs text-gray-400">
                                Suggested Action: <span className="text-white font-semibold">{mod.suggested_action?.replace(/_/g, ' ')}</span>
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reviewModerationMutation.mutate({
                                  moderationId: mod.id,
                                  action: 'false_positive',
                                  notes: 'No violation found'
                                })}
                                className="flex-1 bg-green-500/20 border-green-500/50 text-green-400"
                                disabled={reviewModerationMutation.isPending}
                              >
                                <CheckCheck className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const notes = prompt("Enter a warning message to the user (will be emailed):");
                                  if (notes !== null) { // Check for null (cancel button)
                                    reviewModerationMutation.mutate({
                                      moderationId: mod.id,
                                      action: 'warn_user',
                                      notes
                                    });
                                  }
                                }}
                                className="flex-1 bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                disabled={reviewModerationMutation.isPending}
                              >
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Warn
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this content permanently? This action cannot be undone.')) {
                                    reviewModerationMutation.mutate({
                                      moderationId: mod.id,
                                      action: 'delete_content',
                                      notes: 'Content removed for guideline violation'
                                    });
                                  }
                                }}
                                className="flex-1 bg-red-500/20 border-red-500/50 text-red-400"
                                disabled={reviewModerationMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>

                            <p className="text-xs text-gray-500">
                              Posted by: {mod.author_email} • {format(parseISO(mod.created_date), "MMM d, h:mm a")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Moderation Guidelines */}
              <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    AI Moderation System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white mb-1">Automatic Detection</p>
                      <p>AI scans all posts and replies for hate speech, harassment, spam, and self-harm content.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white mb-1">Confidence Scoring</p>
                      <p>AI provides confidence levels (0-100%) and severity ratings (low/medium/high/critical).</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white mb-1">Suggested Actions</p>
                      <p>AI recommends: monitor, warn user, hide content, delete content, or ban user based on severity.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white mb-1">Human Review</p>
                      <p>All flagged content requires moderator review before action is taken. No automatic bans.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>

        {/* Post Detail Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedPost && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {CATEGORIES.find(c => c.value === selectedPost.category)?.icon}{" "}
                      {CATEGORIES.find(c => c.value === selectedPost.category)?.label}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl text-white">{selectedPost.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {selectedPost.content}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
                      <span>
                        By {selectedPost.is_anonymous ? "Anonymous" : selectedPost.author_username}
                      </span>
                      <span>•</span>
                      <span>{format(parseISO(selectedPost.created_date), "MMM d, h:mm a")}</span>
                      <span>•</span>
                      <button
                        onClick={() => upvotePostMutation.mutate(selectedPost)}
                        className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {selectedPost.upvotes || 0} helpful
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 pt-6">
                    <h4 className="font-semibold text-white mb-4">
                      Replies ({replies.length})
                    </h4>
                    <div className="space-y-4 mb-6">
                      {replies.map(reply => (
                        <div key={reply.id} className="bg-gray-800 rounded-lg p-4">
                          <p className="text-gray-300 mb-2">{reply.content}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>
                                {reply.is_anonymous ? "Anonymous" : reply.author_username}
                              </span>
                              <span>•</span>
                              <span>{format(parseISO(reply.created_date), "MMM d, h:mm a")}</span>
                            </div>
                            <button
                              onClick={() => upvoteReplyMutation.mutate(reply)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              {reply.upvotes || 0}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <Textarea
                        placeholder="Share your thoughts..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      <Button
                        onClick={handleReply}
                        disabled={!replyContent.trim() || isSubmitting || createReplyMutation.isPending}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSubmitting || createReplyMutation.isPending ? "Checking content..." : "Post Reply"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Challenge Detail Dialog */}
        <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedChallenge && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl text-white flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    {selectedChallenge.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-300 mb-4">{selectedChallenge.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <Badge className={CHALLENGE_CATEGORIES.find(c => c.value === selectedChallenge.category)?.color + " text-white"}>
                        {CHALLENGE_CATEGORIES.find(c => c.value === selectedChallenge.category)?.icon}{" "}
                        {CHALLENGE_CATEGORIES.find(c => c.value === selectedChallenge.category)?.label}
                      </Badge>
                      <span>{selectedChallenge.duration_days} days</span>
                      <span>•</span>
                      <span>{selectedChallenge.participant_count || 0} participants</span>
                    </div>
                  </div>

                  {/* My Progress */}
                  {getMyParticipation(selectedChallenge.id) && (
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">My Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(getMyParticipation(selectedChallenge.id)?.daily_entries || []).length === 0 ? (
                            <p className="text-gray-400 text-sm">No entries yet. Start completing days!</p>
                        ) : (
                            getMyParticipation(selectedChallenge.id)?.daily_entries?.map((entry, idx) => (
                                <div key={idx} className="p-3 bg-gray-700 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-white">Day {entry.day + 1}</span>
                                        <span className="text-xs text-gray-400">
                                            {format(parseISO(entry.completed_at), "MMM d, h:mm a")}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{entry.reflection}</p>
                                </div>
                            ))
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Participant Progress */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Participant Activity</h3>
                    <div className="space-y-2">
                      {challengeParticipations.length === 0 ? (
                          <p className="text-gray-400 text-sm">No other participants yet.</p>
                      ) : (
                        challengeParticipations.slice(0, 10).map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                            <span className="text-gray-400">Participant {idx + 1}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={((p.completed_days?.length || 0) / selectedChallenge.duration_days) * 100} className="w-24 h-2" />
                              <span className="text-sm text-gray-400">{p.completed_days?.length || 0}/{selectedChallenge.duration_days}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
