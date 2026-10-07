import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, CheckSquare, Settings, Calendar, FolderKanban, BarChart3, Briefcase } from "lucide-react";

const navigationItems = [
  {
    name: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    name: "Management",
    url: createPageUrl("Management"),
    icon: Briefcase,
  },
  {
    name: "Projects",
    url: createPageUrl("ProjectManagement"),
    icon: FolderKanban,
  },
  {
    name: "Daily Tasks",
    url: createPageUrl("DailyTasks"),
    icon: Calendar,
  },
  {
    name: "Analytics",
    url: createPageUrl("Analytics"),
    icon: BarChart3,
  },
  {
    name: "Integration",
    url: createPageUrl("SheetsSetup"),
    icon: Settings,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <div className="min-h-screen animated-gradient-bg-enhanced">
      <style>
        {`
          :root {
            --bg-primary: #0a0a0a; 
            --bg-secondary: #1f1f1f; 
            --bg-tertiary: #2d2d2d; 
            --text-primary: #f8fafc; 
            --text-secondary: #cbd5e1; 
            --accent-blue: #3b82f6; 
            --accent-green: #10b981; 
            --accent-purple: #8b5cf6; 
            --accent-pink: #ec4899; 
            --border-color: #3f3f46; 
          }
          
          .glass-effect-enhanced {
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(18px) saturate(180%);
            border: 1px solid rgba(16, 185, 129, 0.3); /* Greenish border */
            border-radius: 0.75rem; 
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 15px rgba(16, 185, 129, 0.1);
          }
          
          .glow-effect {
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.3), 0 0 25px rgba(16, 185, 129, 0.2);
          }

          .animated-gradient-bg-enhanced {
            background: linear-gradient(135deg, #000000, #050507, #0a0a0e, #0f0f15, #0a0a0e, #050507, #000000);
            background-size: 400% 400%; 
            animation: animatedBackgroundEnhanced 18s ease infinite; 
            color: var(--text-primary);
            position: relative; 
            overflow-x: hidden; 
          }

          /* Horizontal Lines Animation ::before */
          .animated-gradient-bg-enhanced::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 30vh;
            background:
              /* Green lines - more lines and thicker */
              linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.8) 30%, rgba(16, 185, 129, 0.8) 70%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.6) 25%, rgba(16, 185, 129, 0.6) 75%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.7) 20%, rgba(16, 185, 129, 0.7) 80%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.5) 30%, rgba(16, 185, 129, 0.5) 70%, transparent 100%),
              /* Blue lines - more lines and thicker */
              linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.7) 25%, rgba(59, 130, 246, 0.7) 75%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.5) 30%, rgba(59, 130, 246, 0.5) 70%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.6) 20%, rgba(59, 130, 246, 0.6) 80%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.4) 35%, rgba(59, 130, 246, 0.4) 65%, transparent 100%);
            background-size:
              /* Shorter lines - reduced from 300% to 150% etc. */
              150% 3px,  /* Green, 3px thick */
              180% 2px,  /* Green, 2px thick */
              160% 4px,  /* Green, 4px thick */
              170% 2px,  /* Green, 2px thick */
              140% 3px,  /* Blue, 3px thick */
              190% 2px,  /* Blue, 2px thick */
              155% 3px,  /* Blue, 3px thick */
              175% 2px;  /* Blue, 2px thick */
            background-position:
              /* More Y positions for more lines */
              -150% 10%, /* Top lines */
              -180% 18%,
              -160% 26%,
              -170% 34%,
              -140% 42%, /* Middle lines */
              -190% 50%,
              -155% 58%,
              -175% 66%; /* Bottom lines */
            background-repeat: no-repeat;
            filter: blur(0.5px); /* Very minimal blur */
            animation: horizontalLinesLTR 15s linear infinite; /* Slightly faster */
            pointer-events: none;
            z-index: 1;
          }

          /* Second layer for even more lines ::after adjusted */
          .animated-gradient-bg-enhanced::after { 
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 30vh;
            background:
              /* Additional green lines */
              linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.4) 35%, rgba(16, 185, 129, 0.4) 65%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.5) 25%, rgba(16, 185, 129, 0.5) 75%, transparent 100%),
              /* Additional blue lines */
              linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.4) 30%, rgba(59, 130, 246, 0.4) 70%, transparent 100%),
              linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.3) 20%, rgba(59, 130, 246, 0.3) 80%, transparent 100%);
            background-size:
              165% 2px,
              145% 3px,
              175% 2px,
              155% 2px;
            background-position:
              -165% 74%,
              -145% 82%,
              -175% 90%,
              -155% 98%;
            background-repeat: no-repeat;
            filter: blur(0.5px);
            animation: horizontalLinesLTR 12s linear infinite; /* Different timing for variety */
            pointer-events: none;
            z-index: 2;
          }

          @keyframes animatedBackgroundEnhanced {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes horizontalLinesLTR {
            0% {
              /* Start from far left - adjusted for shorter lines */
              background-position: 
                -150% 10%, -180% 18%, -160% 26%, -170% 34%,
                -140% 42%, -190% 50%, -155% 58%, -175% 66%;
              opacity: 0.3;
            }
            20% {
              opacity: 0.7;
            }
            50% {
              opacity: 1;
            }
            80% {
              opacity: 0.7;
            }
            100% {
              /* End at far right */
              background-position: 
                120% 10%, 120% 18%, 120% 26%, 120% 34%,
                120% 42%, 120% 50%, 120% 58%, 120% 66%;
              opacity: 0.3;
            }
          }
          
          /* Navigation Pill Styles */
          .nav-pill {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
            transform-origin: center;
            position: relative;
          }

          .nav-pill.active {
            background: linear-gradient(to right, var(--accent-green), var(--accent-blue));
            color: white;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.5), 
                        0 0 25px rgba(16, 185, 129, 0.3),
                        inset 0 1px 2px rgba(255,255,255,0.15);
            animation: activePillPulse 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .nav-pill:not(.active):hover {
            background-color: var(--bg-tertiary);
            color: white;
            transform: translateY(-2px) scale(1.03); 
            box-shadow: 0 6px 12px rgba(0,0,0,0.4);
          }
          
          .nav-pill:not(.active)::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 0.375rem;
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .nav-pill:not(.active):hover::before {
            opacity: 1;
          }

          @keyframes activePillPulse {
            0% { transform: scale(1); box-shadow: 0 0 15px rgba(16, 185, 129, 0.5), 0 0 25px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.15); }
            50% { transform: scale(1.03); box-shadow: 0 0 20px rgba(16, 185, 129, 0.6), 0 0 35px rgba(16, 185, 129, 0.4), inset 0 1px 2px rgba(255,255,255,0.15); }
            100% { transform: scale(1); box-shadow: 0 0 15px rgba(16, 185, 129, 0.5), 0 0 25px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.15); }
          }
        `}
      </style>
      
      {/* Top Navigation */}
      <nav className="bg-black/80 backdrop-blur-xl border-b border-slate-700/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-accent-green via-accent-blue to-accent-purple rounded-xl flex items-center justify-center shadow-lg shadow-accent-green/30">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">TaskFlow</h1>
            </div>

            {/* Navigation Pills */}
            <div className="flex items-center bg-slate-800/70 p-1 rounded-xl border border-slate-700/60 shadow-md">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.name}
                    to={item.url}
                    className={`nav-pill flex items-center gap-2 px-4 py-2 rounded-lg ${
                      isActive
                        ? "active" 
                        : "text-slate-300" 
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Settings Button removed to simplify nav, can be re-added if needed */}
            <div className="w-10 h-10"></div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-4rem)] relative z-30">
        {children}
      </main>
    </div>
  );
}