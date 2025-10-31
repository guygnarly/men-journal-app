import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { 
  Mic,
  Square,
  Play,
  Trash2,
  Save,
  Loader2,
  Star
} from "lucide-react";
import { format } from "date-fns";

const POINTS = {
  VOICE_ENTRY: 20,
  STREAK_MILESTONE: 50
};

export default function VoiceJournal() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioURL(url);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      addToast({
        title: "❌ Microphone Access Denied",
        description: "Could not access microphone. Please grant permission and try again.",
        type: "error"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resetRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const saveVoiceEntryMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) {
        throw new Error("No audio recording found");
      }

      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });

      const user = await base44.auth.me();
      const entry = await base44.entities.JournalEntry.create({
        title: `Voice Entry - ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`,
        content: `Voice recording (${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, '0')})`,
        entry_type: "voice",
        voice_recording_url: file_url,
        word_count: 0
      });

      const today = new Date().toISOString().split('T')[0];
      const lastJournal = user.last_journal_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let newStreak = 1;
      let pointsEarned = POINTS.VOICE_ENTRY;

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
      resetRecording();
      
      addToast({
        title: "🎉 Voice Entry Saved!",
        description: `You earned ${pointsEarned} points!`,
        type: "success"
      });
    },
    onError: (error) => {
      console.error("Failed to save voice entry:", error);
      addToast({
        title: "❌ Save Failed",
        description: "Failed to save voice entry. Please try again.",
        type: "error"
      });
    }
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-red-500" />
            Voice Journal
          </CardTitle>
          <Badge className="bg-yellow-500 text-black flex items-center gap-1">
            <Star className="w-3 h-3 mr-1" />
            +{POINTS.VOICE_ENTRY} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8">
          {!isRecording && !audioBlob && (
            <div>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <Mic className="w-12 h-12 text-white" />
              </div>
              <p className="text-gray-400 mb-6">
                Record your thoughts using voice
              </p>
              <Button
                onClick={startRecording}
                size="lg"
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {isRecording && (
            <div>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <Mic className="w-12 h-12 text-white animate-pulse" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">
                {formatTime(recordingTime)}
              </div>
              <p className="text-gray-400 mb-6">Recording in progress...</p>
              <Button
                onClick={stopRecording}
                size="lg"
                variant="outline"
                className="bg-gray-800 border-gray-700 text-white"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            </div>
          )}

          {!isRecording && audioBlob && (
            <div>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Play className="w-12 h-12 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                Recording Complete
              </div>
              <p className="text-gray-400 mb-6">
                Duration: {formatTime(recordingTime)}
              </p>
              
              {audioURL && (
                <div className="mb-6">
                  <audio controls src={audioURL} className="w-full max-w-md mx-auto" />
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={resetRecording}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard
                </Button>
                <Button
                  onClick={() => saveVoiceEntryMutation.mutate()}
                  disabled={saveVoiceEntryMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {saveVoiceEntryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Entry (+{POINTS.VOICE_ENTRY} pts)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-6">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-white font-semibold mb-2">💡 Voice Journaling Tips:</p>
              <ul className="text-gray-400 space-y-1 text-xs">
                <li>• Find a quiet space</li>
                <li>• Speak naturally and honestly</li>
                <li>• Don't worry about perfection</li>
                <li>• Express your emotions freely</li>
              </ul>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-white font-semibold mb-2">🎯 Benefits:</p>
              <ul className="text-gray-400 space-y-1 text-xs">
                <li>• Faster than typing</li>
                <li>• More emotional expression</li>
                <li>• Natural flow of thoughts</li>
                <li>• Great for reflection</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}