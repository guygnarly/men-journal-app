import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart,
  Phone,
  ExternalLink,
  Search,
  Clock,
  MapPin,
  AlertTriangle,
  Users,
  Briefcase,
  Scale,
  DollarSign,
  Dumbbell,
  BookOpen,
  Video,
  MessageCircle
} from "lucide-react";

const CATEGORY_INFO = {
  crisis: { label: "Crisis Support", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
  therapy: { label: "Therapy & Counseling", icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  support_groups: { label: "Support Groups", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  fatherhood: { label: "Fatherhood Resources", icon: Heart, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  career: { label: "Career Support", icon: Briefcase, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  relationships: { label: "Relationship Help", icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  legal: { label: "Legal Aid", icon: Scale, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  financial: { label: "Financial Assistance", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30" },
  fitness: { label: "Fitness & Wellness", icon: Dumbbell, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" }
};

const CRISIS_RESOURCES = [
  {
    title: "988 Suicide & Crisis Lifeline",
    description: "24/7 free and confidential support for people in distress, prevention and crisis resources.",
    phone: "988",
    url: "https://988lifeline.org",
    availability: "24/7",
    is_crisis: true
  },
  {
    title: "Crisis Text Line",
    description: "Free 24/7 support via text message. Text HOME to 741741.",
    phone: "741741",
    url: "https://www.crisistextline.org",
    availability: "24/7",
    is_crisis: true
  },
  {
    title: "Veterans Crisis Line",
    description: "24/7 confidential support for Veterans, service members, National Guard, Reserve and their families.",
    phone: "988 (Press 1)",
    url: "https://www.veteranscrisisline.net",
    availability: "24/7",
    is_crisis: true
  },
  {
    title: "SAMHSA National Helpline",
    description: "Treatment referral and information service for individuals facing mental and/or substance use disorders.",
    phone: "1-800-662-4357",
    url: "https://www.samhsa.gov/find-help/national-helpline",
    availability: "24/7",
    is_crisis: true
  }
];

const ONLINE_THERAPY = [
  {
    title: "BetterHelp",
    description: "Online therapy with licensed therapists. Video, phone, and messaging sessions.",
    url: "https://www.betterhelp.com",
    category: "therapy",
    features: ["Video sessions", "Messaging", "Affordable pricing"]
  },
  {
    title: "Talkspace",
    description: "Online therapy and psychiatry services. Unlimited messaging and live sessions.",
    url: "https://www.talkspace.com",
    category: "therapy",
    features: ["Psychiatry available", "Insurance accepted", "24/7 messaging"]
  },
  {
    title: "Psychology Today Therapist Finder",
    description: "Find therapists, psychiatrists, treatment centers, and support groups near you.",
    url: "https://www.psychologytoday.com/us/therapists",
    category: "therapy",
    features: ["Filter by specialty", "Insurance search", "Read profiles"]
  },
  {
    title: "Open Path Collective",
    description: "Affordable therapy ($30-$80 per session) for those without insurance.",
    url: "https://openpathcollective.org",
    category: "therapy",
    features: ["Low cost", "No insurance needed", "Nationwide network"]
  }
];

const SUPPORT_COMMUNITIES = [
  {
    title: "Men's Mental Health Support (Reddit)",
    description: "Online community for men to discuss mental health, share experiences, and support each other.",
    url: "https://www.reddit.com/r/mensmentalhealth",
    category: "support_groups"
  },
  {
    title: "Fatherhood Support Groups",
    description: "Local and online support groups for fathers dealing with mental health challenges.",
    url: "https://www.fatherhood.gov/for-dads/support-groups",
    category: "fatherhood"
  },
  {
    title: "Divorce Support for Men",
    description: "Resources and support groups for men going through divorce and separation.",
    url: "https://www.mensdivorcesupport.com",
    category: "relationships"
  },
  {
    title: "Smart Recovery",
    description: "Science-based addiction recovery support groups (in-person and online).",
    url: "https://www.smartrecovery.org",
    category: "support_groups"
  }
];

const EDUCATIONAL_RESOURCES = [
  {
    title: "The Masculine Psychology Podcast",
    description: "Explores modern masculinity, mental health, and personal development for men.",
    url: "https://masculinepsychology.com",
    category: "education",
    type: "Podcast"
  },
  {
    title: "The Man Rules Podcast",
    description: "Mental health, relationships, and life advice for men navigating modern challenges.",
    url: "https://www.themanrules.com",
    category: "education",
    type: "Podcast"
  },
  {
    title: "Heads Up Guys",
    description: "Mental health resource specifically for men, focusing on depression.",
    url: "https://headsupguys.org",
    category: "education",
    type: "Website"
  },
  {
    title: "The Good Men Project",
    description: "Articles, videos, and conversations about masculinity and mental health.",
    url: "https://goodmenproject.com",
    category: "education",
    type: "Website"
  }
];

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: customResources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('-priority', 100),
  });

  const allResources = [
    ...CRISIS_RESOURCES.map(r => ({ ...r, category: 'crisis', source: 'built-in' })),
    ...ONLINE_THERAPY.map(r => ({ ...r, source: 'built-in' })),
    ...SUPPORT_COMMUNITIES.map(r => ({ ...r, source: 'built-in' })),
    ...EDUCATIONAL_RESOURCES.map(r => ({ ...r, source: 'built-in' })),
    ...customResources.map(r => ({ ...r, source: 'custom' }))
  ];

  const filteredResources = allResources.filter(resource => {
    if (selectedCategory !== 'all' && resource.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        resource.title?.toLowerCase().includes(search) ||
        resource.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getCategoryIcon = (category) => {
    const Icon = CATEGORY_INFO[category]?.icon || Heart;
    return Icon;
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Resources</h1>
          <p className="text-gray-400">Support, guidance, and help when you need it</p>
        </div>

        {/* Emergency Alert */}
        <Card className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">In Crisis? Get Help Now</h3>
                <p className="text-gray-300 mb-4">
                  If you're thinking about suicide, are worried about a friend or loved one, 
                  or need emotional support, help is available 24/7.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="tel:988">
                    <Button className="bg-red-500 hover:bg-red-600 text-white">
                      <Phone className="w-4 h-4 mr-2" />
                      Call 988
                    </Button>
                  </a>
                  <a href="sms:741741">
                    <Button variant="outline" className="bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/30">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Text HOME to 741741
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full md:w-auto">
                <TabsList className="bg-gray-800 border border-gray-700 grid grid-cols-3 md:grid-cols-5">
                  <TabsTrigger value="all" className="data-[state=active]:bg-gray-700">All</TabsTrigger>
                  <TabsTrigger value="crisis" className="data-[state=active]:bg-gray-700">Crisis</TabsTrigger>
                  <TabsTrigger value="therapy" className="data-[state=active]:bg-gray-700">Therapy</TabsTrigger>
                  <TabsTrigger value="support_groups" className="data-[state=active]:bg-gray-700">Groups</TabsTrigger>
                  <TabsTrigger value="fatherhood" className="data-[state=active]:bg-gray-700">Dads</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Crisis Resources (Always Visible) */}
        {selectedCategory === 'all' || selectedCategory === 'crisis' ? (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              24/7 Crisis Support
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {CRISIS_RESOURCES.map((resource, idx) => (
                <Card key={idx} className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30 hover:border-red-500/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>{resource.title}</span>
                      <Badge className="bg-red-500 text-white">
                        <Clock className="w-3 h-3 mr-1" />
                        {resource.availability}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">{resource.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {resource.phone && (
                        <a href={`tel:${resource.phone.replace(/[^0-9]/g, '')}`}>
                          <Button className="bg-red-500 hover:bg-red-600 text-white">
                            <Phone className="w-4 h-4 mr-2" />
                            {resource.phone}
                          </Button>
                        </a>
                      )}
                      {resource.url && (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/30">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Visit Website
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {/* Other Resources */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {selectedCategory === 'all' ? 'All Resources' : CATEGORY_INFO[selectedCategory]?.label || 'Resources'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources
              .filter(r => !r.is_crisis)
              .map((resource, idx) => {
                const Icon = getCategoryIcon(resource.category);
                const categoryInfo = CATEGORY_INFO[resource.category] || {};

                return (
                  <Card key={idx} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${categoryInfo.bg} ${categoryInfo.border} border`}>
                          <Icon className={`w-5 h-5 ${categoryInfo.color}`} />
                        </div>
                        {resource.type && (
                          <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                            {resource.type}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-white text-lg">{resource.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-400 text-sm">{resource.description}</p>
                      
                      {resource.features && (
                        <div className="space-y-1">
                          {resource.features.map((feature, fidx) => (
                            <div key={fidx} className="flex items-center gap-2 text-sm text-gray-400">
                              <span className="text-green-500">✓</span>
                              {feature}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {resource.phone && (
                          <a href={`tel:${resource.phone.replace(/[^0-9]/g, '')}`}>
                            <Button size="sm" variant="outline" className="bg-gray-800 border-gray-700 text-gray-300">
                              <Phone className="w-3 h-3 mr-1" />
                              Call
                            </Button>
                          </a>
                        )}
                        {resource.url && (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Visit
                            </Button>
                          </a>
                        )}
                      </div>

                      {resource.location && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-800">
                          <MapPin className="w-3 h-3" />
                          {resource.location}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {filteredResources.filter(r => !r.is_crisis).length === 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No Resources Found</h3>
                <p className="text-gray-400">Try adjusting your search or filter</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Information Card */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-blue-400" />
              You're Not Alone
            </h3>
            <p className="text-gray-300 mb-4">
              These resources are here to support you. Whether you're in crisis, looking for therapy, 
              or just want to learn more about men's mental health, there's help available.
            </p>
            <p className="text-gray-400 text-sm">
              <strong className="text-white">Note:</strong> MindForge is not a substitute for professional medical advice, 
              diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider 
              with any questions you may have regarding a medical condition.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}