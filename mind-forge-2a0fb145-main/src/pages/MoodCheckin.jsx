import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Heart,
  Zap,
  Moon,
  Dumbbell,
  Brain,
  CheckCircle2,
  TrendingUp,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

const MOOD_OPTIONS = [
  { value: 5, emoji: "😊", label: "Excellent", color: "from-green-500 to-emerald-500" },
  { value: 4, emoji: "🙂", label: "Good", color: "from-blue-500 to-cyan-500" },
  { value: 3, emoji: "😐", label: "Okay", color: "from-yellow-500 to-orange-500" },
  { value: 2, emoji: "😕", label: "Not Great", color: "from-orange-500 to-red-500" },
  { value: 1, emoji: "😞", label: "Struggling", color: "from-red-500 to-pink-500" }
];

const TIME_OF_DAY = [
  { value: "morning", label: "Morning", icon: "🌅" },
  { value: "afternoon", label: "Afternoon", icon: "☀️" },
  { value: "evening", label: "Evening", icon: "🌆" },
  { value: "night", label: "Night", icon: "🌙" }
];

const COMMON_EMOTIONS = [
  "Happy", "Sad", "Anxious", "Calm", "Angry", "Grateful", 
  "Stressed", "Peaceful", "Frustrated", "Content", "Worried", "Hopeful",
  "Overwhelmed", "Energized", "Tired", "Confident", "Lonely", "Connected"
];

export default function MoodCheckin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    mood_score: 3,
    primary_emotion: "",
    energy_level: 3,
    stress_level: 3,
    sleep_hours: 7,
    exercise_minutes: 0,
    notes: "",
    checkin_time: "morning"
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

  const { data: recentCheckins = [] } = useQuery({
    queryKey: ['recentCheckins'],
    queryFn: () => base44.entities.MoodCheckin.list('-created_date', 7),
  });

  useEffect(() => {
    const hour = new Date().getHours();
    let timeOfDay = "morning";
    if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
    else if (hour >= 17 && hour < 21) timeOfDay = "evening";
    else if (hour >= 21 || hour < 6) timeOfDay = "night";
    
    setFormData(prev => ({ ...prev, checkin_time: timeOfDay }));
  }, []);

  const createCheckinMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.MoodCheckin.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayCheckin'] });
      queryClient.invalidateQueries({ queryKey: ['recentCheckins'] });
      queryClient.invalidateQueries({ queryKey: ['moodCheckins'] });
      navigate(createPageUrl("Dashboard"));
    },
  });

  const handleSubmit = () => {
    createCheckinMutation.mutate(formData);
  };

  const getMoodOption = (value) => MOOD_OPTIONS.find(o => o.value === value);

  if (todayCheckin) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Already Checked In Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-gray-800 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Mood:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{getMoodOption(todayCheckin.mood_score)?.emoji}</span>
                    <span className="text-white font-semibold">{todayCheckin.mood_score}/5</span>
                  </div>
                </div>
                {todayCheckin.primary_emotion && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Primary Emotion:</span>
                    <Badge className="bg-blue-500 text-white">{todayCheckin.primary_emotion}</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Energy Level:</span>
                  <span className="text-white">{todayCheckin.energy_level}/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Stress Level:</span>
                  <span className="text-white">{todayCheckin.stress_level}/5</span>
                </div>
                {todayCheckin.sleep_hours && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Sleep:</span>
                    <span className="text-white">{todayCheckin.sleep_hours} hours</span>
                  </div>
                )}
                {todayCheckin.exercise_minutes > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Exercise:</span>
                    <span className="text-white">{todayCheckin.exercise_minutes} minutes</span>
                  </div>
                )}
                {todayCheckin.notes && (
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-2">Notes:</p>
                    <p className="text-gray-300">{todayCheckin.notes}</p>
                  </div>
                )}
              </div>

              <p className="text-gray-400 text-center">
                You can check in again tomorrow. Keep up the consistency! 🔥
              </p>

              <Button
                onClick={() => navigate(createPageUrl("Dashboard"))}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>

          {recentCheckins.length > 1 && (
            <Card className="bg-gray-900 border-gray-800 mt-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Recent Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCheckins.slice(0, 7).map((checkin, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getMoodOption(checkin.mood_score)?.emoji}</span>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {format(new Date(checkin.created_date), "MMM d, yyyy")}
                          </p>
                          <p className="text-gray-400 text-xs">{checkin.primary_emotion || "No emotion noted"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-gray-700 text-gray-400">
                        {checkin.mood_score}/5
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Daily Check-In</h1>
          <p className="text-gray-400">Take a moment to assess how you're doing</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 1 && "How are you feeling?"}
              {step === 2 && "Your energy and stress"}
              {step === 3 && "Sleep and activity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-4">
                  <Label className="text-white text-lg">Overall Mood</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {MOOD_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({...formData, mood_score: option.value})}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.mood_score === option.value
                            ? `border-blue-500 bg-gradient-to-br ${option.color} shadow-lg`
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-4xl mb-2">{option.emoji}</div>
                        <div className="text-white text-sm font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white">Primary Emotion (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_EMOTIONS.map(emotion => (
                      <button
                        key={emotion}
                        onClick={() => setFormData({...formData, primary_emotion: emotion})}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          formData.primary_emotion === emotion
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
                  <Label className="text-white">Time of Day</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TIME_OF_DAY.map(time => (
                      <button
                        key={time.value}
                        onClick={() => setFormData({...formData, checkin_time: time.value})}
                        className={`p-3 rounded-lg border transition-colors ${
                          formData.checkin_time === time.value
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-2xl mb-1">{time.icon}</div>
                        <div className="text-sm">{time.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Energy Level
                    </Label>
                    <span className="text-2xl font-bold text-white">{formData.energy_level}/5</span>
                  </div>
                  <Slider
                    value={[formData.energy_level]}
                    onValueChange={(value) => setFormData({...formData, energy_level: value[0]})}
                    min={1}
                    max={5}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Exhausted</span>
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>Good</span>
                    <span>Energized</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-red-500" />
                      Stress Level
                    </Label>
                    <span className="text-2xl font-bold text-white">{formData.stress_level}/5</span>
                  </div>
                  <Slider
                    value={[formData.stress_level]}
                    onValueChange={(value) => setFormData({...formData, stress_level: value[0]})}
                    min={1}
                    max={5}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Very Calm</span>
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                    <span>Overwhelmed</span>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label className="text-white flex items-center gap-2">
                    <Moon className="w-5 h-5 text-purple-500" />
                    Sleep Last Night (hours)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.sleep_hours}
                    onChange={(e) => setFormData({...formData, sleep_hours: parseFloat(e.target.value) || 0})}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-green-500" />
                    Exercise Today (minutes)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="500"
                    step="5"
                    value={formData.exercise_minutes}
                    onChange={(e) => setFormData({...formData, exercise_minutes: parseInt(e.target.value) || 0})}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0 if none yet"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white">Additional Notes (optional)</Label>
                  <Textarea
                    placeholder="Anything else on your mind? What's affecting your mood today?"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="min-h-[120px] bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 bg-gray-800 border-gray-700 text-gray-300"
                >
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createCheckinMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {createCheckinMutation.isPending ? "Saving..." : "Complete Check-In"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-gray-300 text-sm text-center">
            <strong className="text-white">💡 Tip:</strong> Regular check-ins help you spot patterns, 
            track progress, and understand what affects your mood. Try checking in at the same time each day!
          </p>
        </div>
      </div>
    </div>
  );
}