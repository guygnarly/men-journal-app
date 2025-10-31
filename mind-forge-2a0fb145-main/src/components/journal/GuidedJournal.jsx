import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save,
  CheckCircle2,
  Sparkles,
  Star
} from "lucide-react";
import { format } from "date-fns";

const POINTS = {
  GUIDED_PROMPT: 30,
  STREAK_MILESTONE: 50
};

export default function GuidedJournal({ template, onBack }) {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [responses, setResponses] = useState(
    template.prompts.map(() => "")
  );
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const progress = ((currentPrompt + 1) / template.prompts.length) * 100;

  const saveEntryMutation = useMutation({
    mutationFn: async () => {
      const content = template.prompts
        .map((prompt, idx) => `${prompt.question}\n\n${responses[idx] || "(No response)"}\n\n---\n`)
        .join("\n");

      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
      const user = await base44.auth.me();
      
      const entry = await base44.entities.JournalEntry.create({
        title: `${template.name} - ${format(new Date(), "MMM d, yyyy")}`,
        content,
        entry_type: "text",
        tags: [template.category],
        word_count: wordCount
      });

      await base44.entities.JournalTemplate.update(template.id, {
        usage_count: (template.usage_count || 0) + 1
      });

      const today = new Date().toISOString().split('T')[0];
      const lastJournal = user.last_journal_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let newStreak = 1;
      let pointsEarned = POINTS.GUIDED_PROMPT;

      if (lastJournal === today) {
        newStreak = user.current_streak || 1;
      } else if (lastJournal === yesterday) {
        newStreak = (user.current_streak || 0) + 1;
        if ([7, 14, 30, 60, 100].includes(newStreak)) {
          pointsEarned += POINTS.STREAK_MILESTONE;
        }
      }
      
      const newTotalEntries = (user.total_entries || 0) + 1;
      const newTotalPoints = (user.total_points || 0) + pointsEarned;
      const newLevel = Math.floor(newTotalPoints / 500) + 1;

      await base44.auth.updateMe({
        total_entries: newTotalEntries,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, user.longest_streak || 0),
        last_journal_date: today,
        total_points: newTotalPoints,
        level: newLevel
      });

      return { entry, pointsEarned };
    },
    onSuccess: ({ pointsEarned }) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['recentEntries'] });
      queryClient.invalidateQueries({ queryKey: ['allEntries'] });
      
      addToast({
        title: "🎉 Guided Journal Completed!",
        description: `You earned ${pointsEarned} points!`,
        type: "success"
      });
      
      onBack();
    },
    onError: (error) => {
      console.error("Failed to save guided journal:", error);
      addToast({
        title: "❌ Save Failed",
        description: "Failed to save entry. Please try again.",
        type: "error"
      });
    }
  });

  const handleResponseChange = (value) => {
    const newResponses = [...responses];
    newResponses[currentPrompt] = value;
    setResponses(newResponses);
  };

  const handleNext = () => {
    if (currentPrompt < template.prompts.length - 1) {
      setCurrentPrompt(currentPrompt + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPrompt > 0) {
      setCurrentPrompt(currentPrompt - 1);
    }
  };

  const handleSave = () => {
    const hasResponses = responses.some(r => r.trim());
    if (!hasResponses) {
      addToast({
        title: "⚠️ No Responses",
        description: "Please answer at least one prompt before saving.",
        type: "warning"
      });
      return;
    }
    saveEntryMutation.mutate();
  };

  const hasResponses = responses.some(r => r.trim());
  const isLastPrompt = currentPrompt === template.prompts.length - 1;

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>
            <Badge className="bg-blue-500 text-white">
              Prompt {currentPrompt + 1} of {template.prompts.length}
            </Badge>
          </div>

          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-2">{template.name}</h2>
            <p className="text-gray-400 text-sm">{template.description}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-xl">
              {template.prompts[currentPrompt].question}
            </CardTitle>
            <Badge className="bg-yellow-500 text-black">
              <Star className="w-3 h-3 mr-1" />
              +{POINTS.GUIDED_PROMPT} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-400 text-sm mb-2">Your Response</Label>
            <Textarea
              placeholder={template.prompts[currentPrompt].placeholder || "Write your thoughts here..."}
              value={responses[currentPrompt]}
              onChange={(e) => handleResponseChange(e.target.value)}
              className="min-h-[300px] text-base leading-relaxed bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentPrompt === 0}
              className="bg-gray-800 border-gray-700 text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!hasResponses || saveEntryMutation.isPending}
                className="bg-gray-800 border-gray-700 text-gray-300"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Progress
              </Button>

              {!isLastPrompt ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={!hasResponses || saveEntryMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {saveEntryMutation.isPending ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {template.prompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPrompt(idx)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  idx === currentPrompt
                    ? 'border-blue-500 bg-blue-500/20'
                    : responses[idx].trim()
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Prompt {idx + 1}</span>
                  {responses[idx].trim() && (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-300 truncate text-left">
                  {prompt.question}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}