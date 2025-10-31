import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen,
  Mic,
  Star,
  Calendar,
  Heart,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format, parseISO } from "date-fns";

const MOOD_EMOJIS = {
  5: "😊",
  4: "🙂",
  3: "😐",
  2: "😕",
  1: "😞"
};

export default function EntryList({ entries, isLoading }) {
  const [expandedEntries, setExpandedEntries] = useState(new Set());

  const toggleExpanded = (entryId) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h3 className="text-xl font-semibold text-white mb-2">No entries found</h3>
        <p className="text-gray-400">Start journaling to see your entries here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const isExpanded = expandedEntries.has(entry.id);
        const isVoice = entry.entry_type === "voice";

        return (
          <Card
            key={entry.id}
            className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {isVoice ? (
                    <Badge className="bg-purple-500 text-white">
                      <Mic className="w-3 h-3 mr-1" />
                      Voice
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500 text-white">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Text
                    </Badge>
                  )}

                  {entry.is_favorite && (
                    <Badge className="bg-yellow-500 text-black">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Favorite
                    </Badge>
                  )}

                  {entry.mood_score && (
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                      {MOOD_EMOJIS[entry.mood_score]} {entry.mood_score}/5
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(entry.created_date), "MMM d, yyyy")}
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">
                {entry.title || "Untitled Entry"}
              </h3>

              {isVoice && entry.voice_recording_url ? (
                <div className="mb-4">
                  <audio controls src={entry.voice_recording_url} className="w-full" />
                  <p className="text-sm text-gray-400 mt-2">{entry.content}</p>
                </div>
              ) : (
                <p className={`text-gray-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                  {entry.content}
                </p>
              )}

              {entry.content && entry.content.length > 200 && !isVoice && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(entry.id)}
                  className="mt-2 text-blue-400 hover:text-blue-300"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Read More
                    </>
                  )}
                </Button>
              )}

              {entry.emotions && entry.emotions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
                  {entry.emotions.slice(0, 6).map((emotion, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-gray-600 text-gray-400 text-xs"
                    >
                      {emotion}
                    </Badge>
                  ))}
                  {entry.emotions.length > 6 && (
                    <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                      +{entry.emotions.length - 6} more
                    </Badge>
                  )}
                </div>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {entry.tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {entry.ai_insights && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">AI Insight</p>
                      <p className="text-sm text-gray-300 italic">{entry.ai_insights}</p>
                    </div>
                  </div>
                </div>
              )}

              {entry.word_count > 0 && (
                <div className="mt-4 text-xs text-gray-500">
                  {entry.word_count} words
                  {entry.ai_sentiment && ` • ${entry.ai_sentiment.replace(/_/g, ' ')}`}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}