import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Heart, ArrowRight, Check, Loader2 } from "lucide-react";

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

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    relationship_status: "",
    parenthood: [],
    employment: "",
    life_stage: "",
    living_situation: "",
    primary_goals: [],
    mental_health_experience: ""
  });

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const user = await base44.auth.me();
        if (user && user.onboarding_completed) {
          // User already completed onboarding, redirect to dashboard
          navigate(createPageUrl("Dashboard"));
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setCheckingUser(false);
      }
    };
    checkOnboarding();
  }, [navigate]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save all onboarding data to user profile
      await base44.auth.updateMe({
        username: formData.username || "user",
        relationship_status: formData.relationship_status,
        parenthood: formData.parenthood,
        employment: formData.employment,
        life_stage: formData.life_stage,
        living_situation: formData.living_situation,
        primary_goals: formData.primary_goals,
        mental_health_experience: formData.mental_health_experience,
        onboarding_completed: true,
        current_streak: 0,
        longest_streak: 0,
        total_entries: 0,
        achievements: [],
        last_journal_date: null,
        privacy_settings: {
          show_username_in_community: false,
          allow_ai_analysis: true,
          email_notifications: true,
          daily_reminder: false,
          reminder_time: "09:00"
        }
      });

      // Verify the save worked
      const updatedUser = await base44.auth.me();
      console.log("✅ Onboarding completed and saved:", updatedUser);

      // Navigate to dashboard
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("❌ Error completing onboarding:", error);
      alert("Failed to save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) {
      return formData.relationship_status && formData.parenthood.length > 0;
    }
    if (step === 2) {
      return formData.employment && formData.life_stage && formData.living_situation;
    }
    if (step === 3) {
      return formData.primary_goals.length > 0 && formData.mental_health_experience;
    }
    return false;
  };

  if (checkingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-2xl animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-2xl">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to MindForge</h1>
          <p className="text-gray-300 text-lg">Let's personalize your journey</p>
        </div>

        <div className="mb-6">
          <Progress value={(step / 3) * 100} className="h-2" />
          <p className="text-center text-gray-300 mt-2 text-sm">Step {step} of 3</p>
        </div>

        <Card className="bg-white/95 backdrop-blur shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === 1 && "Tell us about yourself"}
              {step === 2 && "Your current situation"}
              {step === 3 && "Your goals & experience"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "This helps us provide personalized support"}
              {step === 2 && "We'll tailor resources to your needs"}
              {step === 3 && "Set your intentions for this journey"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username (optional - for community)</Label>
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Relationship Status</Label>
                  <RadioGroup value={formData.relationship_status} onValueChange={(value) => setFormData({...formData, relationship_status: value})}>
                    {["single", "dating", "married", "divorced", "separated"].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <RadioGroupItem value={status} id={`rel-${status}`} />
                        <Label htmlFor={`rel-${status}`} className="cursor-pointer capitalize">{status}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Parenthood Status (select all that apply)</Label>
                  <div className="space-y-2">
                    {PARENTHOOD_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`parent-${option.value}`}
                          checked={formData.parenthood.includes(option.value)}
                          onCheckedChange={() => handleParenthoodToggle(option.value)}
                        />
                        <Label htmlFor={`parent-${option.value}`} className="cursor-pointer">{option.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-3">
                  <Label>Employment Status</Label>
                  <RadioGroup value={formData.employment} onValueChange={(value) => setFormData({...formData, employment: value})}>
                    {[
                      { value: "employed_full_time", label: "Employed full-time" },
                      { value: "employed_part_time", label: "Employed part-time" },
                      { value: "self_employed", label: "Self-employed" },
                      { value: "unemployed", label: "Unemployed" },
                      { value: "retired", label: "Retired" },
                      { value: "student", label: "Student" }
                    ].map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`emp-${option.value}`} />
                        <Label htmlFor={`emp-${option.value}`} className="cursor-pointer">{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Life Stage</Label>
                  <RadioGroup value={formData.life_stage} onValueChange={(value) => setFormData({...formData, life_stage: value})}>
                    {[
                      { value: "young_adult", label: "Young adult (18-29)" },
                      { value: "established_professional", label: "Established professional (30-44)" },
                      { value: "mid_life", label: "Mid-life (45-59)" },
                      { value: "mature_adult", label: "Mature adult (60+)" }
                    ].map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`life-${option.value}`} />
                        <Label htmlFor={`life-${option.value}`} className="cursor-pointer">{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Living Situation</Label>
                  <RadioGroup value={formData.living_situation} onValueChange={(value) => setFormData({...formData, living_situation: value})}>
                    {["alone", "with_roommates", "with_partner", "with_family"].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <RadioGroupItem value={status} id={`living-${status}`} />
                        <Label htmlFor={`living-${status}`} className="cursor-pointer capitalize">{status.replace(/_/g, ' ')}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label>Primary Goals (select all that apply)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {GOALS_OPTIONS.map(goal => (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox
                          id={`goal-${goal}`}
                          checked={formData.primary_goals.includes(goal)}
                          onCheckedChange={() => handleGoalToggle(goal)}
                        />
                        <Label htmlFor={`goal-${goal}`} className="cursor-pointer">{goal}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Mental Health Experience</Label>
                  <RadioGroup value={formData.mental_health_experience} onValueChange={(value) => setFormData({...formData, mental_health_experience: value})}>
                    {[
                      { value: "first_time", label: "First time exploring mental health" },
                      { value: "some_experience", label: "Some experience with therapy/journaling" },
                      { value: "experienced", label: "Experienced with mental health work" }
                    ].map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`exp-${option.value}`} />
                        <Label htmlFor={`exp-${option.value}`} className="cursor-pointer">{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button 
                  onClick={handleNext} 
                  disabled={!isStepValid()}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleComplete} 
                  disabled={!isStepValid() || loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-white/10 backdrop-blur rounded-lg">
          <p className="text-center text-gray-300 text-sm">
            <strong className="text-white">🔒 Your data is secure:</strong> All information is encrypted and stored securely. 
            You're already logged in via Base44 authentication.
          </p>
        </div>
      </div>
    </div>
  );
}