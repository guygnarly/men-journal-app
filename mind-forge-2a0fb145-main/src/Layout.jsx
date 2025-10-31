
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ToastProvider } from "@/components/ui/toast";
import { 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Heart, 
  Menu,
  LogOut,
  Target,
  Wind,
  Settings,
  X,
  PenTool,
  Smile,
  Plus,
  ChevronLeft,
  Sparkles, // Added Sparkles icon
  Star // Added Star icon for gamification
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Journal",
    url: createPageUrl("Journal"),
    icon: BookOpen,
  },
  {
    title: "Goals",
    url: createPageUrl("Goals"),
    icon: Target,
  },
  {
    title: "Tools",
    url: createPageUrl("Tools"),
    icon: Wind,
  },
  {
    title: "AI Mentor",
    url: createPageUrl("AIMentor"),
    icon: Sparkles,
  },
  {
    title: "Community",
    url: createPageUrl("Community"),
    icon: Users,
  },
  {
    title: "Insights",
    url: createPageUrl("Insights"),
    icon: BarChart3,
  },
  {
    title: "Resources",
    url: createPageUrl("Resources"),
    icon: Heart,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        console.log("📱 Loaded user from database:", currentUser);
        setUser(currentUser);
        
        // Check if onboarding is completed
        if (currentUser && !currentUser.onboarding_completed && currentPageName !== "Onboarding") {
          console.log("⚠️ Onboarding not completed, redirecting...");
          navigate(createPageUrl("Onboarding"));
        } else if (currentUser && currentUser.onboarding_completed) {
          console.log("✅ User authenticated and onboarding completed");
        }
      } catch (error) {
        console.error("❌ Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [currentPageName, navigate]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    console.log("🚪 Logging out...");
    await base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const quickActions = [
    {
      label: "Quick Entry",
      icon: PenTool,
      action: () => navigate(createPageUrl("Journal")),
      color: "from-blue-500 to-cyan-500"
    },
    {
      label: "Mood Check",
      icon: Smile,
      action: () => navigate(createPageUrl("MoodCheckin")),
      color: "from-purple-500 to-pink-500"
    },
    {
      label: "Goals",
      icon: Target,
      action: () => navigate(createPageUrl("Goals")),
      color: "from-green-500 to-emerald-500"
    }
  ];

  const getCurrentPage = () => {
    const current = navigationItems.find(item => item.url === location.pathname);
    return current?.title || currentPageName;
  };

  const canGoBack = () => {
    return window.history.length > 1 && currentPageName !== "Dashboard";
  };

  const getLevelColor = (level) => {
    if (level >= 20) return "from-purple-500 to-pink-500";
    if (level >= 15) return "from-yellow-500 to-orange-500";
    if (level >= 10) return "from-blue-500 to-cyan-500";
    if (level >= 5) return "from-green-500 to-emerald-500";
    return "from-gray-500 to-gray-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <SidebarProvider>
        <style>{`
          :root {
            --sidebar-bg: #0a0e1a;
            --sidebar-hover: #1a1f2e;
            --primary-blue: #3b82f6;
            --primary-cyan: #06b6d4;
            --bg-dark: #0f1419;
            --bg-darker: #0a0e1a;
          }
          
          body {
            background-color: var(--bg-dark);
          }

          @media (max-width: 1024px) {
            .mobile-nav-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.8);
              z-index: 40;
              backdrop-filter: blur(4px);
            }
            
            .mobile-nav-sidebar {
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              width: 280px;
              z-index: 50;
              transform: translateX(-100%);
              transition: transform 0.3s ease;
            }
            
            .mobile-nav-sidebar.open {
              transform: translateX(0);
            }
          }

          .quick-action-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 30;
          }

          @media (max-width: 640px) {
            .quick-action-fab {
              bottom: 80px;
              right: 16px;
            }
          }

          .sticky-mobile-header {
            position: sticky;
            top: 0;
            z-index: 20;
            backdrop-filter: blur(10px);
            background: rgba(10, 14, 26, 0.95);
            border-bottom: 1px solid rgba(55, 65, 81, 0.5);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          }

          .mobile-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 20;
            backdrop-filter: blur(10px);
            background: rgba(10, 14, 26, 0.95);
            border-top: 1px solid rgba(55, 65, 81, 0.5);
            box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.3);
          }
        `}</style>
        
        <div className="min-h-screen flex w-full bg-gray-950">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar className="border-r border-gray-800 fixed top-0 bottom-0 left-0 z-30" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
              <SidebarHeader className="border-b border-gray-800 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg">MindForge</h2>
                    <p className="text-xs text-gray-400">Your Mental Health Journey</p>
                  </div>
                </div>
              </SidebarHeader>
              
              <SidebarContent className="p-3">
                {user && (
                  <>
                    {/* Gamification Stats */}
                    <div className="mb-4 p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 bg-gradient-to-br ${getLevelColor(user.level || 1)} rounded-full flex items-center justify-center`}>
                            <Star className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">Level {user.level || 1}</p>
                            <p className="text-xs text-gray-400">{user.total_points || 0} points</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                          style={{ width: `${((user.total_points || 0) % 500) / 500 * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{500 - ((user.total_points || 0) % 500)} pts to Level {(user.level || 1) + 1}</p>
                    </div>

                    {/* Streak Stats */}
                    <div className="mb-6 p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Current Streak</span>
                        <Badge className="bg-orange-500 text-white">
                          🔥 {user.current_streak || 0} days
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Total Entries</span>
                        <span className="text-sm font-bold text-white">{user.total_entries || 0}</span>
                      </div>
                    </div>
                  </>
                )}

                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
                    Navigation
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navigationItems.map((item) => {
                        const isActive = location.pathname === item.url;
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                              asChild 
                              className={`transition-all duration-200 rounded-lg mb-1 ${
                                isActive 
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                                  : 'text-gray-300 hover:bg-gray-800'
                              }`}
                            >
                              <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-6">
                  <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
                    Crisis Support
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <div className="px-3 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-gray-300 mb-2">If you're in crisis:</p>
                      <a 
                        href="tel:988" 
                        className="flex items-center gap-2 text-red-400 font-bold hover:text-red-300 transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        Call 988 - Suicide & Crisis Lifeline
                      </a>
                      <p className="text-xs text-gray-400 mt-2">Available 24/7</p>
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>

              <SidebarFooter className="border-t border-gray-800 p-4">
                {user && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-blue-500">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{user.full_name || "User"}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        onClick={() => navigate(createPageUrl("Profile"))}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Settings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </SidebarFooter>
            </Sidebar>
          </div>

          {/* Mobile Navigation Overlay */}
          {mobileMenuOpen && (
            <div 
              className="mobile-nav-overlay lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Mobile Sidebar */}
          <div className={`mobile-nav-sidebar lg:hidden ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="h-full bg-gray-900 border-r border-gray-800 flex flex-col">
              <div className="border-b border-gray-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">MindForge</h2>
                    <p className="text-xs text-gray-400">Your Journey</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {user && (
                  <div className="mb-4 p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Streak</span>
                      <Badge className="bg-orange-500 text-white text-xs">
                        🔥 {user.current_streak || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Entries</span>
                      <span className="text-sm font-bold text-white">{user.total_entries || 0}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-gray-300 mb-2">Crisis Support</p>
                  <a 
                    href="tel:988" 
                    className="flex items-center gap-2 text-red-400 font-bold text-sm"
                  >
                    <Heart className="w-4 h-4" />
                    Call 988
                  </a>
                </div>
              </div>

              <div className="border-t border-gray-800 p-4">
                {user && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 border-2 border-blue-500">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-sm">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{user.full_name || "User"}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-gray-800 border-gray-700 text-gray-300"
                        onClick={() => navigate(createPageUrl("Profile"))}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Settings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-800 border-gray-700 text-gray-300"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <main className="flex-1 flex flex-col min-w-0 lg:ml-[280px]">
            {/* Sticky Mobile Header */}
            <header className="sticky-mobile-header lg:hidden px-4 py-3">
              <div className="flex items-center justify-between">
                {canGoBack() ? (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-300" />
                  </button>
                ) : (
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Menu className="w-6 h-6 text-gray-300" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{getCurrentPage()}</h1>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
              </div>
            </header>

            <div className="flex-1 overflow-auto bg-gray-950 pb-20 lg:pb-0">
              {children}
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav lg:hidden">
              <div className="flex items-center justify-around px-2 py-2">
                {[
                  { icon: LayoutDashboard, url: createPageUrl("Dashboard") },
                  { icon: BookOpen, url: createPageUrl("Journal") },
                  { icon: Target, url: createPageUrl("Goals") },
                  { icon: Users, url: createPageUrl("Community") },
                  { icon: Menu, action: () => setMobileMenuOpen(true) }
                ].map((item, idx) => {
                  const isActive = item.url && location.pathname === item.url;
                  const Icon = item.icon;
                  
                  if (item.action) {
                    return (
                      <button
                        key={idx}
                        onClick={item.action}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Icon className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-400">More</span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={idx}
                      to={item.url}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                        isActive ? 'text-blue-500' : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </Link>
                  );
                })}
              </div>
            </nav>
          </main>

          {/* Quick Action FAB */}
          <div className="quick-action-fab">
            <DropdownMenu open={showQuickActions} onOpenChange={setShowQuickActions}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="lg"
                  className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-2xl"
                >
                  <Plus className="w-6 h-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-gray-900 border-gray-800 w-48 mb-2"
              >
                {quickActions.map((action, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={action.action}
                    className="cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white"
                  >
                    <action.icon className="w-4 h-4 mr-3" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SidebarProvider>
    </ToastProvider>
  );
}
