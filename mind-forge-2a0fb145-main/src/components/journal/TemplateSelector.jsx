import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen,
  Sparkles,
  Target,
  Heart,
  Frown,
  TrendingUp,
  Zap,
  Star
} from "lucide-react";

const CATEGORY_ICONS = {
  gratitude: Heart,
  reflection: Sparkles,
  problem_solving: Target,
  goal_setting: TrendingUp,
  therapy_prep: BookOpen,
  anger_management: Frown,
  stress_relief: Zap,
  general: BookOpen
};

const CATEGORY_COLORS = {
  gratitude: "from-pink-500 to-rose-500",
  reflection: "from-purple-500 to-indigo-500",
  problem_solving: "from-blue-500 to-cyan-500",
  goal_setting: "from-green-500 to-emerald-500",
  therapy_prep: "from-yellow-500 to-orange-500",
  anger_management: "from-red-500 to-orange-500",
  stress_relief: "from-cyan-500 to-blue-500",
  general: "from-gray-500 to-gray-600"
};

export default function TemplateSelector({ onSelectTemplate }) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['journalTemplates'],
    queryFn: () => base44.entities.JournalTemplate.list('-usage_count', 50),
  });

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Guided Journaling</h3>
              <p className="text-gray-300 text-sm mb-3">
                Structured prompts to help you explore specific topics and deepen your self-reflection.
              </p>
              <Badge className="bg-yellow-500 text-black">
                <Star className="w-3 h-3 mr-1" />
                +30 points per completed template
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-12 text-center">
            <p className="text-gray-400">Loading templates...</p>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No templates available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {templates.map((template) => {
            const Icon = CATEGORY_ICONS[template.category] || BookOpen;
            const colorClass = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general;

            return (
              <Card
                key={template.id}
                className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all hover:shadow-lg cursor-pointer"
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {template.prompts?.length || 0} prompts
                    </Badge>
                  </div>
                  <CardTitle className="text-white">{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-400 text-sm">{template.description}</p>
                  
                  {template.prompts && template.prompts.length > 0 && (
                    <div className="border-t border-gray-800 pt-4">
                      <p className="text-xs text-gray-500 mb-2">First prompt:</p>
                      <p className="text-sm text-gray-300 italic">
                        "{template.prompts[0].question}"
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {template.usage_count > 0 && (
                      <span className="text-xs text-gray-500">
                        Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    <Button
                      size="sm"
                      className={`ml-auto bg-gradient-to-r ${colorClass}`}
                    >
                      Start Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}