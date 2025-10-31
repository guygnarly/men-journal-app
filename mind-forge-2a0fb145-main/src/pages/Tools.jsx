import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wind,
  Play,
  Pause,
  RotateCcw,
  Heart,
  Brain,
  Moon,
  Sunrise,
  Headphones,
  Video,
  Clock
} from "lucide-react";

const BREATHING_EXERCISES = [
  {
    name: "Box Breathing",
    description: "Navy SEAL technique for instant calm",
    duration: 4,
    pattern: [4, 4, 4, 4],
    labels: ["Inhale", "Hold", "Exhale", "Hold"],
    difficulty: "Beginner"
  },
  {
    name: "4-7-8 Breathing",
    description: "Dr. Weil's method for sleep and anxiety",
    duration: 4,
    pattern: [4, 7, 8, 0],
    labels: ["Inhale", "Hold", "Exhale", ""],
    difficulty: "Beginner"
  },
  {
    name: "Tactical Breathing",
    description: "Combat stress in high-pressure situations",
    duration: 6,
    pattern: [4, 4, 4, 4],
    labels: ["Inhale", "Hold", "Exhale", "Hold"],
    difficulty: "Intermediate"
  }
];

const MEDITATIONS = [
  {
    title: "10-Minute Morning Meditation",
    description: "Start your day with clarity and intention",
    duration: "10 min",
    type: "audio",
    category: "Morning",
    difficulty: "Beginner"
  },
  {
    title: "Body Scan for Sleep",
    description: "Progressive relaxation for deep rest",
    duration: "25 min",
    type: "audio",
    category: "Sleep",
    difficulty: "Beginner"
  },
  {
    title: "Anger Processing Meditation",
    description: "Channel anger into productive energy",
    duration: "15 min",
    type: "audio",
    category: "Emotions",
    difficulty: "Intermediate"
  },
  {
    title: "Grounding Technique",
    description: "Return to the present moment",
    duration: "5 min",
    type: "video",
    category: "Anxiety",
    difficulty: "Beginner"
  },
  {
    title: "Focus & Concentration",
    description: "Sharpen your mental edge",
    duration: "12 min",
    type: "audio",
    category: "Productivity",
    difficulty: "Intermediate"
  },
  {
    title: "Evening Reflection",
    description: "Process the day and release tension",
    duration: "20 min",
    type: "audio",
    category: "Evening",
    difficulty: "Beginner"
  }
];

export default function Tools() {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (!isActive || !selectedExercise) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          const nextPhase = (currentPhase + 1) % selectedExercise.pattern.length;
          if (nextPhase === 0) {
            setCompletedRounds(r => r + 1);
          }
          setCurrentPhase(nextPhase);
          return selectedExercise.pattern[nextPhase];
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, selectedExercise, currentPhase]);

  const startExercise = (exercise) => {
    setSelectedExercise(exercise);
    setCurrentPhase(0);
    setSecondsRemaining(exercise.pattern[0]);
    setCompletedRounds(0);
    setIsActive(true);
  };

  const togglePause = () => {
    setIsActive(!isActive);
  };

  const resetExercise = () => {
    setIsActive(false);
    setCurrentPhase(0);
    setSecondsRemaining(selectedExercise?.pattern[0] || 0);
    setCompletedRounds(0);
  };

  const filteredMeditations = selectedCategory === "all" 
    ? MEDITATIONS 
    : MEDITATIONS.filter(m => m.category.toLowerCase() === selectedCategory.toLowerCase());

  const categories = ["all", "morning", "sleep", "anxiety", "emotions", "evening"];

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Wellness Tools</h1>
          <p className="text-gray-400">Breathing exercises and guided meditations</p>
        </div>

        <Tabs defaultValue="breathing" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-900 border border-gray-800">
            <TabsTrigger value="breathing" className="data-[state=active]:bg-gray-800">
              <Wind className="w-4 h-4 mr-2" />
              Breathing
            </TabsTrigger>
            <TabsTrigger value="meditation" className="data-[state=active]:bg-gray-800">
              <Headphones className="w-4 h-4 mr-2" />
              Meditation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="breathing">
            {!selectedExercise ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BREATHING_EXERCISES.map((exercise, idx) => (
                  <Card key={idx} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-cyan-500 text-white">
                          {exercise.difficulty}
                        </Badge>
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                      <CardTitle className="text-white">{exercise.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-400 text-sm">{exercise.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Wind className="w-4 h-4" />
                        <span>{exercise.pattern.join('-')} pattern</span>
                      </div>
                      <Button
                        onClick={() => startExercise(exercise)}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Exercise
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{selectedExercise.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedExercise(null)}
                      className="text-gray-400"
                    >
                      Exit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Breathing Circle */}
                  <div className="flex flex-col items-center py-12">
                    <div className="relative">
                      <div 
                        className={`w-48 h-48 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center transition-all duration-1000 ${
                          isActive && currentPhase % 2 === 0 ? 'scale-110' : 'scale-90'
                        }`}
                      >
                        <div className="text-center">
                          <p className="text-6xl font-bold text-white">{secondsRemaining}</p>
                          <p className="text-white font-semibold mt-2">
                            {selectedExercise.labels[currentPhase]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-white">{completedRounds}</p>
                      <p className="text-sm text-gray-400">Rounds Completed</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{selectedExercise.duration}</p>
                      <p className="text-sm text-gray-400">Minutes</p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex gap-3 justify-center">
                    <Button
                      size="lg"
                      onClick={togglePause}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500"
                    >
                      {isActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                      {isActive ? 'Pause' : 'Start'}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={resetExercise}
                      className="bg-gray-800 border-gray-700 text-gray-300"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="meditation">
            <div className="space-y-6">
              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>

              {/* Meditation Library */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMeditations.map((meditation, idx) => (
                  <Card key={idx} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <div className="relative h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-t-lg flex items-end p-3">
                      <Badge className={`${meditation.type === 'audio' ? 'bg-blue-500' : 'bg-purple-500'} text-white`}>
                        {meditation.type === 'audio' ? <Headphones className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
                        {meditation.type}
                      </Badge>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-400">{meditation.category}</p>
                          <Badge variant="outline" className="border-gray-700 text-gray-400">
                            {meditation.difficulty}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">{meditation.title}</h3>
                        <p className="text-sm text-gray-400">{meditation.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meditation.duration}
                        </span>
                        <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500">
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredMeditations.length === 0 && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-12 text-center">
                    <Headphones className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No meditations in this category yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Tips */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              When to Use These Tools
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="flex gap-3">
                <Sunrise className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Morning</p>
                  <p className="text-gray-400">Morning meditation or box breathing to set intentions</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Brain className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Stress/Anxiety</p>
                  <p className="text-gray-400">4-7-8 breathing or grounding technique</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Heart className="w-5 h-5 text-pink-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Anger</p>
                  <p className="text-gray-400">Anger processing meditation or tactical breathing</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Moon className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Sleep</p>
                  <p className="text-gray-400">Body scan or evening reflection</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}