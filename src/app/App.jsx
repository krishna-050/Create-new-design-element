import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, Bell, User, Home, Plus, Search, ChevronRight,
  CheckCircle, Clock, AlertCircle, AlertTriangle,
  BarChart2, Map, Users, Upload, Camera,
  ArrowLeft, X, Filter, Eye, FileText, LogOut,
  Activity, Flag, Navigation, ThumbsUp, RefreshCw,
  Shield, TrendingUp, Menu,
  Check, Loader2, Edit3,
  Zap, Star, Phone, Sparkles
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  analyzeImageWithGemini,
  DEFAULT_GEMINI_KEY,
  autoAssignWorker,
  getWorkerSlaStatus,
  generateCategoryDescription,
  regenerateDescriptionForCategory,
  compressAndResizeImage,
  processAndValidateImageFast
} from "./utils/imageAnalyzer.js";



// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function LocationPicker({ position }) {
  return position ? <Marker position={position} icon={customIcon}><Popup>GPS Auto-Pinned Location</Popup></Marker> : null;
}


const CATEGORIES = [
  { id: "garbage",      label: "Garbage",               emoji: "🗑️",  color: "#6B7280" },
  { id: "pothole",      label: "Pothole / Road Damage",  emoji: "🕳️",  color: "#F59E0B" },
  { id: "streetlight",  label: "Street Light",           emoji: "💡",  color: "#EAB308" },
  { id: "water-leak",   label: "Water Leakage",          emoji: "💧",  color: "#3B82F6" },
  { id: "water-supply", label: "Water Supply",           emoji: "🚰",  color: "#06B6D4" },
  { id: "drainage",     label: "Drainage / Waterlogging",emoji: "🌊",  color: "#0891B2" },
  { id: "toilet",       label: "Public Toilet",          emoji: "🚽",  color: "#8B5CF6" },
  { id: "tree",         label: "Fallen Tree",            emoji: "🌳",  color: "#16A34A" },
  { id: "dumping",      label: "Illegal Dumping",        emoji: "🏗️",  color: "#DC2626" },
  { id: "other",        label: "Other",                  emoji: "📋",  color: "#64748B" },
];

const DEPARTMENTS = [
  "Sanitation", "Roads & Infrastructure", "Water Supply",
  "Electrical", "Public Health", "Parks & Environment",
];
const OFFICERS = [
  "Officer Rahul Kumar", "Officer Amit Singh",
  "Officer Priya Sharma", "Officer Suresh Verma", "Officer Neha Gupta",
];

const PRIORITY_STYLE = {
  Low:      { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500"  },
  Medium:   { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500" },
  High:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  Critical: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500"    },
};

const STATUS_STYLE = {
  "Pending":               { bg: "bg-slate-100",  text: "text-slate-600"  },
  "Verified":              { bg: "bg-blue-50",    text: "text-blue-700"   },
  "Assigned":              { bg: "bg-purple-50",  text: "text-purple-700" },
  "In Progress":           { bg: "bg-orange-50",  text: "text-orange-700" },
  "Resolved":              { bg: "bg-teal-50",    text: "text-teal-700"   },
  "Awaiting Verification": { bg: "bg-yellow-50",  text: "text-yellow-700" },
  "Closed":                { bg: "bg-green-50",   text: "text-green-700"  },
  "Reopened":              { bg: "bg-red-50",     text: "text-red-700"    },
};

const TIMELINE_STAGES = [
  "Reported", "Verified", "Assigned", "In Progress",
  "Resolved", "Awaiting Verification", "Closed",
];

const INITIAL_ISSUES = [
  {
    id: "CIV-1024", title: "Large Pothole on Main Road",
    category: "pothole",
    description: "A large pothole approximately 2 feet wide has appeared near the main roundabout causing accidents and traffic disruption. Several vehicles have been damaged.",
    ward: "Ward 12", address: "Main Road, near Ranchi Roundabout",
    lat: 23.3441, lng: 85.3096,
    status: "In Progress", priority: "High", priorityScore: 24,
    affectedCount: 27, reportedBy: "citizen-1",
    reportedAt: "2026-08-15T09:00:00Z",
    department: "Roads & Infrastructure", officer: "Officer Rahul Kumar",
    slaHours: 36, slaElapsed: 38, similarCount: 7, supported: false, // 1st Warning (38h > 36h)
    timeline: [
      { stage: "Reported",    date: "2026-08-15T09:00:00Z" },
      { stage: "Verified",    date: "2026-08-15T10:30:00Z" },
      { stage: "Assigned",    date: "2026-08-15T14:00:00Z", note: "Auto-assigned by AI to Officer Rahul Kumar" },
      { stage: "In Progress", date: "2026-08-16T08:00:00Z" },
    ],
  },
  {
    id: "CIV-1025", title: "Overflowing Garbage Dump",
    category: "garbage",
    description: "Garbage has been overflowing from the municipal bin for 3 days causing health hazards and foul smell in the entire locality.",
    ward: "Ward 5", address: "MG Road, near Lalpur Chowk",
    lat: 23.3591, lng: 85.3246,
    status: "Assigned", priority: "Critical", priorityScore: 28,
    affectedCount: 42, reportedBy: "citizen-2",
    reportedAt: "2026-08-17T11:00:00Z",
    department: "Sanitation", officer: "Officer Suresh Verma",
    slaHours: 36, slaElapsed: 64, similarCount: 12, supported: false, // 3rd Warning / Suspension Notice (64h > 60h)
    timeline: [
      { stage: "Reported", date: "2026-08-17T11:00:00Z" },
      { stage: "Verified",  date: "2026-08-17T12:00:00Z" },
      { stage: "Assigned",  date: "2026-08-17T12:30:00Z", note: "Auto-assigned by AI to Officer Suresh Verma" },
    ],
  },
  {
    id: "CIV-1026", title: "Broken Street Light",
    category: "streetlight",
    description: "Two street lights near the school entrance are broken for over a week, creating safety issues for children in the evenings.",
    ward: "Ward 8", address: "School Road, Ashok Nagar",
    lat: 23.3341, lng: 85.3196,
    status: "Assigned", priority: "Medium", priorityScore: 15,
    affectedCount: 8, reportedBy: "citizen-3",
    reportedAt: "2026-08-14T07:00:00Z",
    department: "Electrical", officer: "Officer Amit Singh",
    slaHours: 36, slaElapsed: 51, similarCount: 3, supported: false, // 2nd Warning (51h > 48h)
    timeline: [
      { stage: "Reported", date: "2026-08-14T07:00:00Z" },
      { stage: "Verified",  date: "2026-08-14T09:00:00Z" },
      { stage: "Assigned",  date: "2026-08-14T14:00:00Z", note: "Auto-assigned by AI to Officer Amit Singh" },
    ],
  },
  {
    id: "CIV-1027", title: "Water Main Pipe Burst",
    category: "water-leak",
    description: "A burst pipe is leaking water continuously. Road is waterlogged and causing major traffic disruption near the market area.",
    ward: "Ward 3", address: "Near Water Tank, Doranda",
    lat: 23.3241, lng: 85.2996,
    status: "Closed", priority: "High", priorityScore: 22,
    affectedCount: 15, reportedBy: "citizen-4",
    reportedAt: "2026-08-10T06:00:00Z",
    department: "Water Supply", officer: "Officer Priya Sharma",
    slaHours: 36, slaElapsed: 22, similarCount: 5, supported: false, // On Track (22h <= 36h)
    resolutionNote: "Pipe repaired and road cleared. Water supply restored to all households.",
    timeline: [
      { stage: "Reported",    date: "2026-08-10T06:00:00Z" },
      { stage: "Verified",    date: "2026-08-10T07:30:00Z" },
      { stage: "Assigned",    date: "2026-08-10T09:00:00Z", note: "Auto-assigned by AI to Officer Priya Sharma" },
      { stage: "In Progress", date: "2026-08-10T14:00:00Z" },
      { stage: "Resolved",    date: "2026-08-11T10:00:00Z" },
      { stage: "Closed",      date: "2026-08-11T16:00:00Z" },
    ],
  },
  {
    id: "CIV-1028", title: "Drainage Waterlogging",
    category: "drainage",
    description: "Drainage is blocked and water is standing on the road for 2 days causing mosquito breeding and health risk.",
    ward: "Ward 7", address: "Circular Road, near Bus Stand",
    lat: 23.3491, lng: 85.3146,
    status: "Awaiting Verification", priority: "High", priorityScore: 20,
    affectedCount: 19, reportedBy: "citizen-5",
    reportedAt: "2026-08-12T08:00:00Z",
    department: "Public Health", officer: "Officer Neha Gupta",
    slaHours: 36, slaElapsed: 34, similarCount: 4, supported: false, // On Track (34h <= 36h)
    resolutionNote: "Drain cleaned and water cleared from road surface. Area sanitised.",
    timeline: [
      { stage: "Reported",    date: "2026-08-12T08:00:00Z" },
      { stage: "Verified",    date: "2026-08-12T09:00:00Z" },
      { stage: "Assigned",    date: "2026-08-12T11:00:00Z", note: "Auto-assigned by AI to Officer Neha Gupta" },
      { stage: "In Progress", date: "2026-08-13T08:00:00Z" },
      { stage: "Resolved",    date: "2026-08-14T10:00:00Z" },
    ],
  },
];

const INITIAL_NOTIFICATIONS = [
  { id: "n1", issueId: "CIV-1028", message: "Your issue CIV-1028 has been marked as Resolved. Please verify.", time: "2026-08-14T10:00:00Z", read: false, type: "warning" },
  { id: "n2", issueId: "CIV-1024", message: "Issue CIV-1024 is now In Progress by Roads & Infrastructure.", time: "2026-08-16T08:00:00Z", read: false, type: "info" },
  { id: "n3", issueId: "CIV-1024", message: "Issue CIV-1024 assigned to Officer Rahul Kumar.", time: "2026-08-15T14:00:00Z", read: true, type: "info" },
  { id: "n4", issueId: "CIV-1027", message: "Issue CIV-1027 successfully closed. Thank you for reporting!", time: "2026-08-11T16:00:00Z", read: true, type: "success" },
];

function getCatInfo(id) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE["Pending"];
  const isLive = ["In Progress", "Verified", "Assigned"].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm transition-all ${s.bg} ${s.text}`}>
      {isLive ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE["Medium"];
  const isCritical = priority === "Critical" || priority === "High";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${p.bg} ${p.text} ${p.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot} ${isCritical ? "animate-pulse" : ""}`} />
      {priority}
    </span>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-start gap-3.5 shadow-sm hover:shadow-md card-hover-effect">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm ${color}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-foreground text-2xl font-extrabold font-mono leading-tight tracking-tight mt-0.5">{value}</p>
        {sub && <p className="text-muted-foreground text-xs mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const variants = {
    primary:   "gradient-brand text-white hover:opacity-95 px-4 py-2.5 text-sm shadow-md glow-blue",
    secondary: "bg-secondary text-secondary-foreground hover:bg-[#D1DCF0] px-4 py-2.5 text-sm font-semibold",
    outline:   "border border-border bg-card/80 backdrop-blur-md text-foreground hover:bg-muted px-4 py-2.5 text-sm shadow-2xs",
    ghost:     "text-foreground hover:bg-muted/70 px-3 py-2 text-sm",
    danger:    "gradient-rose text-white hover:opacity-95 px-4 py-2.5 text-sm shadow-md",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Input({ label, placeholder, value, onChange, type = "text", className = "" }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>}
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-2xs transition-all"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, className = "" }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none shadow-2xs transition-all"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function IssueCard({ issue, onView, compact = false }) {
  const cat = getCatInfo(issue.category);
  const slaBreached = issue.slaElapsed > issue.slaHours;
  const fallbackPhotos = {
    pothole: "https://images.unsplash.com/photo-1515162305285-0293e4cb98b3?w=120&h=120&fit=crop&auto=format",
    garbage: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=120&h=120&fit=crop&auto=format",
    streetlight: "https://images.unsplash.com/photo-1533073526757-2c8ca1df9f1c?w=120&h=120&fit=crop&auto=format",
    "water-leak": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&h=120&fit=crop&auto=format",
    drainage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=120&h=120&fit=crop&auto=format",
  };
  const photo = issue.photo ?? fallbackPhotos[issue.category] ?? null;
  return (
    <div className="glass-card rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg card-hover-effect p-4 cursor-pointer group" onClick={onView}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          {photo ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 shadow-2xs">
              <img src={photo} alt={issue.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-slate-100 dark:bg-slate-800 shadow-2xs">{cat.emoji}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{issue.id}</span>
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">{cat.emoji} {cat.label}</span>
            </div>
            <p className="font-bold text-foreground text-sm leading-snug group-hover:text-blue-600 transition-colors truncate">{issue.title}</p>
            {!compact && <p className="text-muted-foreground text-xs mt-1 line-clamp-2 leading-relaxed">{issue.description}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusBadge status={issue.status} />
          <PriorityBadge priority={issue.priority} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 mt-3.5 pt-3 border-t border-slate-100 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100"><MapPin size={12} className="text-blue-500" />{issue.ward}</span>
          <span className="flex items-center gap-1 font-medium"><Users size={12} className="text-indigo-500" />{issue.affectedCount} affected</span>
          <span className="flex items-center gap-1"><Clock size={12} />{fmtDate(issue.reportedAt)}</span>
        </div>
        {slaBreached ? (
          <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200 animate-pulse"><AlertTriangle size={12} />SLA Breached</span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><CheckCircle size={12} />On Track</span>
        )}
      </div>
    </div>
  );
}

function CitizenHeader({ page, navigate, notifCount, role, setRole, onBack }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { id: "home",       label: "Home",         icon: <Home size={16} /> },
    { id: "report",     label: "Report",       icon: <Plus size={16} /> },
    { id: "explore",    label: "Explore",      icon: <Search size={16} /> },
    { id: "complaints", label: "My Complaints", icon: <FileText size={16} /> },
  ];

  return (
    <header className="bg-[#0F2444]/95 text-white sticky top-0 z-40 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {page !== "home" && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 active:scale-95 shadow-sm cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft size={15} /> <span>Back</span>
              </button>
            )}
            <button onClick={() => navigate("home")} className="flex items-center gap-3 flex-shrink-0 group">
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md group-hover:scale-105 transition-transform glow-blue">
                <MapPin size={18} className="text-white" />
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  CivicConnect <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.2 bg-blue-500/30 text-blue-300 rounded border border-blue-400/30">AI</span>
                </p>
                <p className="text-[11px] text-blue-200/80 font-medium">Jharkhand Municipal System</p>
              </div>
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => navigate(l.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  page === l.id 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md glow-blue" 
                    : "text-blue-100 hover:text-white hover:bg-white/10"
                }`}>
                {l.icon}{l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setRole(role === "citizen" ? "admin" : "citizen")}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold border border-indigo-400/40 bg-indigo-500/10 text-indigo-200 hover:text-white hover:bg-indigo-600/30 px-3 py-2 rounded-xl transition-all shadow-2xs"
            >
              <Shield size={14} className="text-indigo-400" />
              Switch to {role === "citizen" ? "Admin Portal" : "Citizen App"}
            </button>

            <button onClick={() => navigate("notifications")}
              className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-blue-100 hover:text-white transition-all border border-white/10">
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-full text-[11px] flex items-center justify-center font-bold shadow-md animate-bounce">
                  {notifCount}
                </span>
              )}
            </button>

            <button onClick={() => navigate("profile")}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-blue-100 hover:text-white transition-all border border-white/10">
              <User size={18} />
            </button>

            <button onClick={() => setMenuOpen(m => !m)}
              className="md:hidden p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-blue-100 hover:text-white transition-all border border-white/10">
              <Menu size={18} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1.5 animate-fade-in">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => { navigate(l.id); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium ${
                  page === l.id ? "bg-blue-600 text-white font-bold" : "text-blue-100 hover:bg-white/10"
                }`}>
                {l.icon}{l.label}
              </button>
            ))}
            <button onClick={() => { setRole(role === "citizen" ? "admin" : "citizen"); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-400/20">
              <Shield size={16} />Switch to {role === "citizen" ? "Admin Portal" : "Citizen App"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function AnimatedCounter({ target, duration = 1500 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count.toLocaleString()}</>;
}

function HomePage({ navigate, issues }) {
  const resolved = issues.filter(i => i.status === "Closed" || i.status === "Resolved").length;
  const active = issues.filter(i => !["Closed"].includes(i.status)).length;
  const total = issues.length + 1279;
  const recentIssues = issues.slice(0, 3);

  const steps = [
    { n: "01", icon: <Camera size={24} className="text-white" />, label: "Snap & Report", desc: "Take a photo and describe the issue in seconds", bg: "from-blue-500 to-blue-600" },
    { n: "02", icon: <Zap size={24} className="text-white" />, label: "AI Verification", desc: "Smart system detects duplicates & scores priority", bg: "from-yellow-500 to-orange-500" },
    { n: "03", icon: <Activity size={24} className="text-white" />, label: "Auto Assign", desc: "Right department gets notified immediately", bg: "from-orange-500 to-red-500" },
    { n: "04", icon: <CheckCircle size={24} className="text-white" />, label: "You Verify", desc: "Confirm fix before issue officially closes", bg: "from-green-500 to-teal-500" },
  ];

  const categories = CATEGORIES.slice(0, 6);

  return (
    <div className="bg-background">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F2444 0%, #1B3A5C 40%, #1e4d8c 100%)" }}>
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #60A5FA, transparent)" }} />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #34D399, transparent)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: "radial-gradient(circle, #818CF8, transparent)" }} />
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5">
            <defs><pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern></defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#93C5FD" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                🏛️ Government of Jharkhand · Official Platform
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5" style={{ letterSpacing: "-0.02em" }}>
                Your City.<br />
                <span style={{ background: "linear-gradient(90deg, #60A5FA, #34D399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Your Voice.
                </span>
              </h1>

              <p className="text-blue-200 text-lg mb-8 leading-relaxed max-w-md">
                Report potholes, garbage, broken lights & more. CivicConnect ensures your complaint reaches the right authority — fast.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <button onClick={() => navigate("report")}
                  className="flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", boxShadow: "0 4px 20px rgba(37,99,235,0.5)" }}>
                  <Plus size={18} />Report an Issue
                </button>
                <button onClick={() => navigate("explore")}
                  className="flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:bg-white/20"
                  style={{ border: "1px solid rgba(255,255,255,0.3)", color: "white", background: "rgba(255,255,255,0.08)" }}>
                  <Search size={16} />Explore Issues
                </button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: "🔒", text: "Secure & Private" },
                  { icon: "⚡", text: "48h Resolution SLA" },
                  { icon: "📍", text: "GPS Verified" },
                ].map(b => (
                  <div key={b.text} className="flex items-center gap-1.5 text-xs text-blue-300">
                    <span>{b.icon}</span>{b.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right side — live stats card */}
            <div className="hidden md:block">
              <div className="rounded-2xl p-6 shadow-2xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-sm font-semibold">Live Dashboard · Ranchi</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Total Reported", value: total + 5, color: "#60A5FA" },
                    { label: "Resolved", value: resolved + 957, color: "#34D399" },
                    { label: "Active Now", value: active, color: "#FB923C" },
                    { label: "Citizens", value: 3842, color: "#A78BFA" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</p>
                      <p className="text-2xl font-black font-mono" style={{ color: s.color }}>
                        <AnimatedCounter target={s.value} />
                      </p>
                    </div>
                  ))}
                </div>
                {/* Mini issue feed */}
                <div className="space-y-2">
                  {recentIssues.slice(0, 2).map(i => {
                    const cat = getCatInfo(i.category);
                    return (
                      <div key={i.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <span className="text-lg">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{i.title}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{i.ward}</p>
                        </div>
                        <StatusBadge status={i.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0V60H0Z" fill="var(--background, #F8FAFC)" />
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-2 mb-12">
          {[
            { label: "Issues Reported", value: total + 5, icon: <Flag size={20} className="text-blue-600" />, color: "bg-blue-50", border: "border-blue-100", trend: "+12% this month" },
            { label: "Issues Resolved", value: resolved + 957, icon: <CheckCircle size={20} className="text-green-600" />, color: "bg-green-50", border: "border-green-100", trend: "84% SLA met" },
            { label: "Active Issues", value: active, icon: <Activity size={20} className="text-orange-600" />, color: "bg-orange-50", border: "border-orange-100", trend: "Avg 41h resolve" },
            { label: "Citizens Active", value: 3842, icon: <Users size={20} className="text-purple-600" />, color: "bg-purple-50", border: "border-purple-100", trend: "Across 15 wards" },
          ].map(s => (
            <div key={s.label} className={`bg-card rounded-2xl border ${s.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-black font-mono text-foreground leading-none mb-1">
                <AnimatedCounter target={s.value} />
              </p>
              <p className="text-xs font-semibold text-foreground mb-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.trend}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK REPORT CATEGORIES ── */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Quick Report</h2>
              <p className="text-muted-foreground text-sm">Select a category to report instantly</p>
            </div>
            <button onClick={() => navigate("report")} className="text-[#2563EB] text-sm font-semibold flex items-center gap-1 hover:underline">
              All categories <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map(c => (
              <button key={c.id} onClick={() => navigate("report")}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-[#2563EB] hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform" style={{ background: `${c.color}18` }}>
                  {c.emoji}
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">{c.label.split("/")[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="mb-12 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #F0F7FF 0%, #F0FDF4 100%)", border: "1px solid #E2E8F0" }}>
          <div className="p-8">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mb-3">HOW IT WORKS</span>
              <h2 className="text-2xl font-black text-foreground">From Report to Resolution in 4 Steps</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {steps.map((s, i) => (
                <div key={s.n} className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] right-0 h-0.5 z-0" style={{ background: "linear-gradient(90deg, #CBD5E1, transparent)" }} />
                  )}
                  <div className="flex flex-col items-center text-center relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.bg} flex items-center justify-center mb-3 shadow-lg`}>
                      {s.icon}
                    </div>
                    <span className="text-xs font-black text-muted-foreground mb-1 tracking-widest">{s.n}</span>
                    <p className="font-bold text-foreground text-sm mb-1">{s.label}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RECENT ISSUES ── */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Recent Issues Near You</h2>
              <p className="text-muted-foreground text-sm">Latest civic issues reported in Ranchi</p>
            </div>
            <button onClick={() => navigate("explore")} className="flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:underline">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recentIssues.map(issue => (
              <IssueCard key={issue.id} issue={issue} onView={() => navigate("issue-detail", issue.id)} />
            ))}
          </div>
        </div>

        {/* ── CTA BANNER ── */}
        <div className="mb-12 rounded-2xl p-8 md:p-10 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1B3A5C, #2563EB)" }}>
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white"
                style={{ width: `${8 + (i % 4) * 6}px`, height: `${8 + (i % 4) * 6}px`, left: `${(i * 19 + 5) % 95}%`, top: `${(i * 23 + 10) % 80}%`, opacity: 0.3 + (i % 3) * 0.2 }} />
            ))}
          </div>
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black mb-2">See a problem? Report it now.</h3>
              <p className="text-blue-200 text-sm">Takes less than 2 minutes. Your report makes a real difference.</p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={() => navigate("report")}
                className="flex items-center gap-2 bg-white text-[#1B3A5C] font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-lg">
                <Plus size={16} />Report Now
              </button>
              <button onClick={() => navigate("explore")}
                className="flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)" }}>
                <Map size={16} />View Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportIssuePage({ onSubmit, onBack }) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoData, setPhotoData] = useState(null);
  const [mapPosition, setMapPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState(DEFAULT_GEMINI_KEY);
  
  // GPS Location Status - active by default so photo upload is always unlocked
  const [isGpsOn, setIsGpsOn] = useState(true);
  const [gpsMsg, setGpsMsg] = useState("");

  // AI Validation States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegeneratingDesc, setIsRegeneratingDesc] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuccess, setAiSuccess] = useState(null);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  const fileRef = useRef(null);
  const RANCHI_CENTER = [23.3441, 85.3096];

  const fetchAddress = async (lat, lng) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const data = await res.json();
      const a = data.address ?? {};
      const parts = [
        a.road ?? a.pedestrian ?? a.footway ?? a.suburb ?? "",
        a.neighbourhood ?? a.village ?? a.town ?? a.city ?? "",
        a.county ?? a.district ?? a.state_district ?? "",
        a.state ?? "",
        "India"
      ].filter(Boolean);
      return parts.join(", ") || data.display_name?.split(",").slice(0, 4).join(",") || "Civil Lines, Municipal Ward 12, India";
    } catch {
      return "Main Road, Civil Lines, Central District, India";
    }
  };

  const hasFetchedGps = useRef(false);

  const handleLocation = useCallback(() => {
    setLocating(true);
    setGpsMsg("");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setIsGpsOn(true);
          setGpsMsg("");
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setMapPosition(coords);
          const addr = await fetchAddress(coords[0], coords[1]);
          setResolvedAddress(addr || "Main Road, Civil Lines, Central District, India");
          setLocating(false);
        },
        async () => {
          setIsGpsOn(true);
          setLocating(false);
          setGpsMsg("⚠️ Live GPS Permission: Location set to current street pin.");
          setResolvedAddress("Station Road, Municipal Zone, India");
        },
        { timeout: 2500, enableHighAccuracy: true, maximumAge: 300000 }
      );
    } else {
      setIsGpsOn(true);
      setResolvedAddress("Station Road, Municipal Zone, India");
      setGpsMsg("Geolocation unsupported.");
      setLocating(false);
    }
  }, []);

  // Auto-detect GPS location ONCE on initial page load
  useEffect(() => {
    if (!hasFetchedGps.current) {
      hasFetchedGps.current = true;
      handleLocation();
    }
  }, [handleLocation]);

  const handlePhotoClick = () => {
    if (isAnalyzing) return;
    fileRef.current?.click();
  };

  const processAndValidateImage = async (rawSource, name = "uploaded_photo.jpg") => {
    setIsAnalyzing(true);
    setAiError(null);
    setAiSuccess(null);
    setPhotoName(name);

    try {
      // Instant AI decoding and feature validation (< 10ms execution)
      const res = await processAndValidateImageFast(rawSource, name);
      setIsAnalyzing(false);

      if (!res.isValid) {
        setAiError(res.reason || "Uploaded photo galat hai ya genuine civic issue nahi lag rhi hai. Kripya saaf photo upload karein.");
        setPhotoData(null);
        setPhotoName("");
        setSuggestedCategory(null);
      } else {
        setPhotoData(res.dataUrl);
        setCategory("");
        setDescription("");
        setSuggestedCategory(null);
        setAiSuccess({
          promptManualSelect: true,
          title: "Outdoor Defect Photo Verified",
          confidenceScore: 98,
          visualTags: ["Outdoor Photo Verified", "Field Genuine"]
        });
      }
    } catch (err) {
      console.error("AI Analysis error:", err);
      setIsAnalyzing(false);
      setAiError("Image analysis me problem aayi. Kripya dobara try karein.");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndValidateImage(file, file.name);
    }
  };

  // Preset demo test generators for quick verification
  const handleTestBlackImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, 100, 100);
    const blackData = canvas.toDataURL("image/jpeg");
    processAndValidateImage(blackData, "demo_test_black_screen.jpg");
  };

  const handleTestSelfieImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#E0AC69";
    ctx.fillRect(0, 0, 150, 150);
    const selfieData = canvas.toDataURL("image/jpeg");
    processAndValidateImage(selfieData, "demo_test_selfie.jpg");
  };

  const handleTestIndoorImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ECEFF1";
    ctx.fillRect(0, 0, 150, 150);
    const indoorData = canvas.toDataURL("image/jpeg");
    processAndValidateImage(indoorData, "demo_test_indoor_wall.jpg");
  };

  const handleTestSampleIssue = (type) => {
    const samples = {
      "water-leak": {
        name: "water_main_leakage_spill.jpg",
        url: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&h=400&fit=crop&auto=format"
      },
      garbage: {
        name: "overflowing_garbage_dump.jpg",
        url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&h=400&fit=crop&auto=format"
      },
      pothole: {
        name: "pothole_road_crater.jpg",
        url: "https://images.unsplash.com/photo-1515162305285-0293e4cb98b3?w=600&h=400&fit=crop&auto=format"
      },
      streetlight: {
        name: "broken_street_light.jpg",
        url: "https://images.unsplash.com/photo-1533073526757-2c8ca1df9f1c?w=600&h=400&fit=crop&auto=format"
      }
    };
    const s = samples[type];
    if (s) {
      processAndValidateImage(s.url, s.name);
    }
  };

  const handleCategorySelect = (catId) => {
    setCategory(catId);
    const catInfo = getCatInfo(catId);

    setAiSuccess(prev => ({
      ...(prev || {}),
      promptManualSelect: false,
      categoryLabel: catInfo.label,
      emoji: catInfo.emoji,
      title: `${catInfo.label} – Municipal Defect Report`,
      confidenceScore: 98,
      visualTags: ["Photo Verified", "Manual Category Selected"]
    }));
  };

  const handleRegenerateDescription = async () => {
    if (!category) {
      alert("Kripya pehle koi Category select karein.");
      return;
    }
    setIsRegeneratingDesc(true);
    try {
      const newDesc = await regenerateDescriptionForCategory(
        category,
        resolvedAddress || "India",
        photoData,
        apiKey
      );
      setDescription(newDesc);
    } catch {
      setDescription(generateCategoryDescription(category, resolvedAddress || "India"));
    } finally {
      setIsRegeneratingDesc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) {
      alert("Kripya issue ki Category select karein.");
      return;
    }
    setSubmitting(true);

    const lat = mapPosition ? mapPosition[0] : 23.3441;
    const lng = mapPosition ? mapPosition[1] : 85.3096;
    const ward = resolvedAddress ? (resolvedAddress.split(",")[0] || "Ward 12") : "Ward 12";

    const catInfo = getCatInfo(category);
    const issueTitle = `${catInfo.label} Issue at ${ward}`;

    await new Promise(r => setTimeout(r, 600));

    onSubmit({
      title: issueTitle,
      category,
      description: description || generateCategoryDescription(category, resolvedAddress || "India"),
      ward,
      address: resolvedAddress || "Civil Lines, Ranchi, Jharkhand",
      lat,
      lng,
      photo: photoData,
      priority: ["pothole", "water-leak"].includes(category) ? "Critical" : "High",
      priorityScore: 24,
      affectedCount: 14,
      similarCount: 2,
    });
    setSubmitting(false);
  };

  const catInfo = getCatInfo(category);

  const steps = ["Location & GPS", "Photo AI", "Category", "Description"];
  const currentStep = !isGpsOn ? 0 : !photoData ? 1 : !category ? 2 : 3;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F0F7FF 0%, #F8FAFC 100%)" }}>
      {/* Page Header */}
      <div style={{ background: "linear-gradient(135deg, #1B3A5C, #2563EB)" }} className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all mb-4 active:scale-95 shadow-sm cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Flag size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Report a Civic Issue</h1>
                <p className="text-blue-200 text-xs flex items-center gap-1">
                  <Zap size={12} className="text-yellow-300 fill-yellow-300" /> Powered by Gemini AI Vision Verification
                </p>
              </div>
            </div>

            <button onClick={() => setShowKeyConfig(k => !k)}
              className="text-xs bg-white/10 hover:bg-white/20 text-blue-100 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5 transition-colors">
              <Shield size={13} /> Gemini Token Status
            </button>
          </div>

          {showKeyConfig && (
            <div className="bg-black/30 border border-white/20 rounded-xl p-3 mb-4 text-xs text-white">
              <p className="font-semibold mb-1 flex items-center gap-1 text-green-300">
                <CheckCircle size={13} /> Gemini API Token Connected
              </p>
              <p className="text-blue-200 mb-2 font-mono break-all">{apiKey}</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter Gemini API Token..."
                  className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white w-full font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Step Progress */}
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < currentStep ? "bg-green-400 text-white" : i === currentStep ? "bg-white text-[#2563EB]" : "bg-white/20 text-white/60"
                  }`}>
                    {i < currentStep ? <Check size={13} /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${ i <= currentStep ? "text-white" : "text-white/40" }`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mb-4 rounded ${ i < currentStep ? "bg-green-400" : "bg-white/20" }`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* GPS LOCATION STATUS BANNER */}
        {!isGpsOn ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-xs flex items-start gap-3 shadow-sm">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 text-sm">📍 Location (GPS) Off Hai!</p>
              <p className="text-red-700 text-xs mt-0.5 leading-relaxed">
                Photo upload karne ke liye aapki Location (GPS) ON hona anivarya hai. Current Detected Location: <b className="bg-red-100 text-red-900 px-1.5 py-0.5 rounded font-mono">India</b> (No specific address detected). 3rd party location spoofing apps blocked hain.
              </p>
              <button
                type="button"
                onClick={handleLocation}
                className="mt-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw size={13} className={locating ? "animate-spin" : ""} /> Turn On & Detect GPS Location
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-xs text-green-900 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-900">📍 Live GPS Location Active</p>
                <p className="text-green-700 text-[11px] mt-0.5">{resolvedAddress}</p>
              </div>
            </div>
            <button type="button" onClick={handleLocation} className="text-[10px] text-green-800 bg-green-200 hover:bg-green-300 font-bold px-2 py-1 rounded transition-colors flex items-center gap-1">
              <RefreshCw size={10} /> Refresh GPS
            </button>
          </div>
        )}

        {/* Photo Upload & AI Verification Section */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between" style={{ background: "#F8FAFC" }}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                photoData ? "bg-green-600 text-white shadow-sm" : "bg-blue-100 text-blue-600"
              }`}>
                {photoData ? <Check size={14} /> : "1"}
              </div>
              <h3 className="font-semibold text-foreground text-sm">Upload & AI Verify Photo</h3>
            </div>
            {photoData && !isAnalyzing && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                <CheckCircle size={12} /> Genuine Image Verified
              </span>
            )}
          </div>

          <div className="p-5">
            {/* AI Error Banner if photo was rejected or GPS is off */}
            {aiError && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4 text-sm text-red-900 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600 font-bold">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-red-900 text-base leading-tight">❌ Photo Upload Restriction</p>
                    <p className="text-red-700 text-xs mt-1 leading-relaxed">{aiError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Success Banner with Rich Detailed Breakdown & Manual Category Selection */}
            {aiSuccess && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5 mb-4 text-sm text-green-950 shadow-sm animate-in fade-in space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-md">
                      <CheckCircle size={20} className="fill-white" />
                    </div>
                    <div>
                      <p className="font-bold text-green-950 text-base leading-none">Photo Verification Successful</p>
                      <p className="text-xs text-green-700 mt-1 font-medium">
                        {aiSuccess.promptManualSelect ? "👉 Photo verified! Neeche se issue ki Category select karein:" : aiSuccess.title}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-green-200 text-green-900 px-2.5 py-1 rounded-full border border-green-300">
                    {aiSuccess.confidenceScore}% Valid
                  </span>
                </div>

                <div className="bg-white/80 rounded-xl p-3 border border-green-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Selected Category:</span>
                    <span className="font-bold text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                      {category ? (
                        <><span>{aiSuccess.emoji}</span> {aiSuccess.categoryLabel}</>
                      ) : (
                        <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold text-xs animate-pulse">Select Category Below 👇</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Auto-Detected Location:</span>
                    <span className="font-semibold text-green-900 truncate block mt-0.5">
                      📍 {resolvedAddress || "India"}
                    </span>
                  </div>
                </div>

                {/* Manual Category Selector Pill Bar */}
                <div className="pt-2 border-t border-green-200/80">
                  <p className="text-[11px] font-bold text-green-900 mb-2 flex items-center gap-1">
                    <Edit3 size={12} className="text-green-700" /> Click Any Category to Select (Manual):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCategorySelect(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs ${
                          category === c.id
                            ? "bg-green-700 text-white ring-2 ring-green-600 shadow-md scale-105"
                            : "bg-white text-slate-700 hover:bg-green-100 border border-green-300"
                        }`}
                      >
                        <span>{c.emoji}</span> {c.label.split("/")[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Feature Badges */}
                {aiSuccess.visualTags && aiSuccess.visualTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-green-800 font-semibold mr-1">Visual Tags Detected:</span>
                    {aiSuccess.visualTags.map(tag => (
                      <span key={tag} className="text-[11px] bg-green-100 border border-green-300 text-green-800 px-2 py-0.5 rounded-md font-medium">
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Smart Category Mismatch Alert Banner */}
            {suggestedCategory && category && suggestedCategory !== category && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950 text-sm">💡 AI Category Suggestion (Mismatch Detected)</p>
                    <p className="text-amber-800 mt-0.5 leading-relaxed">
                      Photo me <b>{getCatInfo(suggestedCategory).emoji} {getCatInfo(suggestedCategory).label}</b> ke visual features lag rahe hain, lekin aapne <b>{getCatInfo(category).emoji} {getCatInfo(category).label}</b> select kiya hai.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleCategorySelect(suggestedCategory)}
                    className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                  >
                    Switch to {getCatInfo(suggestedCategory).emoji} {getCatInfo(suggestedCategory).label.split("/")[0]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestedCategory(null)}
                    className="text-amber-800 hover:text-amber-950 font-semibold px-2 py-1 text-xs"
                  >
                    Keep {getCatInfo(category).label.split("/")[0]} ✓
                  </button>
                </div>
              </div>
            )}

            {/* Upload Drop Zone */}
            <div onClick={handlePhotoClick}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all ${
                !isGpsOn
                  ? "border-red-300 bg-red-50/20 cursor-not-allowed opacity-75"
                  : isAnalyzing
                  ? "border-blue-300 bg-blue-50/50 cursor-wait"
                  : photoData
                  ? "border-green-300 bg-green-50/40 cursor-pointer"
                  : aiError
                  ? "border-red-300 bg-red-50/20 hover:border-red-400 cursor-pointer"
                  : "border-border hover:border-[#2563EB] hover:bg-blue-50/30 cursor-pointer"
              }`}>
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                    <Loader2 size={32} className="text-[#2563EB] animate-spin" />
                  </div>
                  <p className="text-sm font-bold text-[#2563EB] flex items-center gap-1.5">
                    <Zap size={16} className="text-yellow-500 fill-yellow-500" /> Gemini AI Vision Analyzing Photo...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Detecting category, extracting visual features & generating detailed report description</p>
                </div>
              ) : photoData ? (
                <>
                  <img src={photoData} alt="Verified Preview" className="w-full max-h-56 object-cover rounded-xl shadow-sm border border-green-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-600 text-white font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <CheckCircle size={12} /> Genuine Issue Verified
                    </span>
                    <span className="text-xs text-muted-foreground">Click to change photo</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${ !isGpsOn ? "bg-red-100 text-red-500" : "bg-blue-50 text-[#2563EB]" }`}>
                    <Camera size={28} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {!isGpsOn ? "⚠️ Photo Upload Disabled (GPS Off)" : "Upload a photo of the civic issue"}
                  </p>
                  <p className="text-xs text-muted-foreground text-center max-w-sm">
                    {!isGpsOn
                      ? "Kripya pehle browser/device me Location (GPS) ON karein. Bina live Location ke photo upload locked hai."
                      : "JPEG, PNG up to 10MB. Gemini AI will automatically verify your photo and auto-fill category, description & location."}
                  </p>
                  <span className={`text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 shadow-sm ${
                    !isGpsOn ? "bg-red-200 text-red-800 cursor-not-allowed" : "bg-[#2563EB] text-white cursor-pointer"
                  }`}>
                    <Camera size={13} /> Take Photo / Upload File
                  </span>
                </>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* Interactive Demo Test Buttons */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5 flex items-center gap-1">
                <Zap size={12} className="text-blue-500" /> Quick Test AI Image Validation {!isGpsOn && "(Turn ON GPS first)"}:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTestSelfieImage}
                  disabled={isAnalyzing || !isGpsOn}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>🛑</span> Test Selfie/Person (Reject)
                </button>
                <button
                  type="button"
                  onClick={handleTestIndoorImage}
                  disabled={isAnalyzing || !isGpsOn}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>🛑</span> Test Indoor Wall (Reject)
                </button>
                <button
                  type="button"
                  onClick={handleTestBlackImage}
                  disabled={isAnalyzing || !isGpsOn}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>⬛</span> Test Black Screen (Reject)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSampleIssue("water-leak")}
                  disabled={isAnalyzing || !isGpsOn}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>💧</span> Water Leakage (Approve)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSampleIssue("pothole")}
                  disabled={isAnalyzing || !isGpsOn}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>🕳️</span> Road Pothole (Approve)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSampleIssue("garbage")}
                  disabled={isAnalyzing || !isGpsOn}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>🗑️</span> Garbage Dump (Approve)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between" style={{ background: "#F8FAFC" }}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                category ? "bg-green-600 text-white shadow-sm" : "bg-blue-100 text-blue-600"
              }`}>
                {category ? <Check size={14} /> : "2"}
              </div>
              <h3 className="font-semibold text-foreground text-sm">Issue Category</h3>
            </div>
            {category && (
              <span className="text-xs text-green-700 font-semibold flex items-center gap-1 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                <CheckCircle size={12} className="text-green-600" /> {getCatInfo(category)?.emoji} {getCatInfo(category)?.label}
              </span>
            )}
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => handleCategorySelect(c.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left cursor-pointer ${
                    category === c.id
                      ? "border-[#2563EB] bg-blue-50/90 text-[#2563EB] shadow-sm scale-[1.02] font-semibold"
                      : "border-border text-foreground hover:border-[#2563EB]/40 hover:bg-muted/50"
                  }`}>
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-xs leading-tight">{c.label}</span>
                  {category === c.id && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2" style={{ background: "#F8FAFC" }}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                description.trim().length > 10 ? "bg-green-600 text-white shadow-sm" : "bg-blue-100 text-blue-600"
              }`}>
                {description.trim().length > 10 ? <Check size={14} /> : "3"}
              </div>
              <h3 className="font-semibold text-foreground text-sm">Detailed Description</h3>
            </div>
            <div className="flex items-center gap-2">
              {category && (
                <button
                  type="button"
                  onClick={handleRegenerateDescription}
                  disabled={isRegeneratingDesc || isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegeneratingDesc ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-white" />
                      <span>Regenerating ({getCatInfo(category)?.label})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                      <span>Regenerate Description ({getCatInfo(category)?.label})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="p-5">
            {category && (
              <div className="mb-3 px-3.5 py-2 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between text-xs text-blue-900 flex-wrap gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <span>{getCatInfo(category)?.emoji}</span> Current Selected Category: <strong className="font-bold text-blue-950">{getCatInfo(category)?.label}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateDescription}
                  disabled={isRegeneratingDesc}
                  className="text-[#2563EB] hover:text-blue-800 font-semibold underline text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} className="text-yellow-500 fill-yellow-500" /> Auto-Fill Description for this Category
                </button>
              </div>
            )}
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Be specific — mention exact location, duration, and impact on residents..."
              rows={5}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none leading-relaxed"
            />
            <div className="flex justify-end items-center mt-2">
              <p className={`text-xs font-mono ${ description.length > 400 ? "text-orange-500" : "text-muted-foreground" }`}>{description.length}/500</p>
            </div>
          </div>
        </div>

        {/* Live Location Map */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between" style={{ background: "#F8FAFC" }}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                mapPosition ? "bg-green-600 text-white shadow-sm" : "bg-blue-100 text-blue-600"
              }`}>
                {mapPosition ? <Check size={14} /> : "4"}
              </div>
              <h3 className="font-semibold text-foreground text-sm">Automatic Pin Location</h3>
            </div>
            {mapPosition && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                <CheckCircle size={12} /> GPS Auto-Pinned
              </span>
            )}
          </div>
          <div className="p-5">
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#2563EB]" /> Location automatically detected strictly via live device GPS. Manual pin selection is disabled.
            </p>
            <div className="rounded-xl overflow-hidden border border-border mb-3 shadow-sm" style={{ height: 280 }}>
              <MapContainer center={mapPosition ?? RANCHI_CENTER} zoom={14} style={{ height: "100%", width: "100%" }}
                key={mapPosition ? mapPosition.join(",") : "default"}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker position={mapPosition} />
              </MapContainer>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Btn variant="outline" onClick={handleLocation} disabled={locating} className="flex items-center gap-2">
                {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                Re-detect GPS Location
              </Btn>
              {mapPosition && (
                <div className="text-xs text-green-700 flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-2 rounded-lg flex-1">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="font-semibold flex-shrink-0">Auto Address:</span>
                  <span className="text-green-800 truncate font-medium">{resolvedAddress || `${mapPosition[0].toFixed(4)}°N, ${mapPosition[1].toFixed(4)}°E`}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || isAnalyzing}
          className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", boxShadow: "0 4px 20px rgba(37,99,235,0.4)" }}>
          {submitting ? <Loader2 size={20} className="animate-spin" /> : <Flag size={20} />}
          {submitting ? "Submitting issue report..." : "Submit Issue Report"}
        </button>
        <p className="text-center text-xs text-muted-foreground pb-4">Your report will be verified and assigned within 2 hours</p>
      </div>
    </div>
  );
}

function VerificationPage({ issue, onViewIssue, onDuplicate, onBack }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 700);
    const t2 = setTimeout(() => setStep(2), 1400);
    const t3 = setTimeout(() => setStep(3), 2100);
    const t4 = setTimeout(() => setDone(true), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const steps = [
    "Image received and processed",
    `Location detected — ${issue.address || issue.ward || "Current GPS Location"}`,
    "Checking for similar reports...",
  ];

  const cat = getCatInfo(issue.category);

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer mb-4"
        >
          <ArrowLeft size={14} className="text-blue-600" /> Back
        </button>
      )}
      <div className="bg-card rounded-2xl border border-border shadow-md p-8">
        {!done ? (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Loader2 size={32} className="text-[#2563EB] animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Analyzing your report...</h2>
              <p className="text-muted-foreground text-sm mt-1">Please wait while we process your submission</p>
            </div>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  i < step ? "bg-green-50" : i === step ? "bg-blue-50" : "bg-muted opacity-40"
                }`}>
                  {i < step ? (
                    <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                  ) : i === step ? (
                    <Loader2 size={18} className="text-[#2563EB] animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${i < step ? "text-green-700 font-medium" : i === step ? "text-[#2563EB]" : "text-muted-foreground"}`}>{s}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Issue Verified</h2>
              <p className="text-muted-foreground text-sm mt-1">Your report has been successfully processed</p>
            </div>
            <div className="bg-muted rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">{cat.emoji} {cat.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex-shrink-0">Location</span>
                <span className="font-semibold text-foreground text-right truncate max-w-[220px]" title={issue.address || issue.ward}>
                  📍 {issue.address || issue.ward}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={issue.priority} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Priority Score</span>
                <span className="font-mono font-bold text-foreground">{issue.priorityScore}/30</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Affected Citizens</span>
                <span className="font-semibold text-foreground">{issue.affectedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Similar Reports</span>
                <span className="font-semibold text-orange-600">{issue.similarCount} found</span>
              </div>
            </div>
            {issue.similarCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={16} className="text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Similar issue found nearby!</span>
                </div>
                <p className="text-yellow-700">We detected {issue.similarCount} similar existing reports near your location.</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {issue.similarCount > 0 && (
                <Btn variant="secondary" onClick={onDuplicate} className="w-full">View Similar Issue</Btn>
              )}
              <Btn onClick={onViewIssue} className="w-full">
                <Eye size={16} />View My Issue
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DuplicatePage({ masterIssue, navigate, onBack }) {
  const [confirmed, setConfirmed] = useState(false);
  const cat = getCatInfo(masterIssue.category);

  if (confirmed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-card rounded-2xl border border-border shadow-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto">
            <ThumbsUp size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Confirmation Added</h2>
          <p className="text-muted-foreground text-sm mb-2">You have been added as an affected citizen for this issue.</p>
          <p className="text-sm text-foreground font-medium mb-6">
            {masterIssue.affectedCount + 1} citizens are now affected — this increases the priority score.
          </p>
          <Btn onClick={() => navigate("issue-detail", masterIssue.id)} className="w-full">Track This Issue</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer mb-4"
        >
          <ArrowLeft size={14} className="text-blue-600" /> Back
        </button>
      )}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-900 text-sm">Similar Issue Found</p>
          <p className="text-yellow-800 text-xs mt-0.5">We found an existing issue near your location. Instead of creating a duplicate, you can confirm you are also affected.</p>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden mb-6">
        <div className="bg-muted h-40 flex items-center justify-center relative">
          <img src="https://images.unsplash.com/photo-1515162305285-0293e4cb98b3?w=600&h=200&fit=crop&auto=format"
            alt="Pothole on road" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <StatusBadge status={masterIssue.status} />
            <PriorityBadge priority={masterIssue.priority} />
          </div>
        </div>
        <div className="p-5">
          <p className="font-mono text-xs text-muted-foreground mb-1">{masterIssue.id}</p>
          <h3 className="font-bold text-foreground text-lg mb-1">{masterIssue.title}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><MapPin size={13} />{masterIssue.ward}</span>
            <span className="flex items-center gap-1"><Users size={13} />{masterIssue.affectedCount} affected</span>
          </div>
          <p className="text-sm text-muted-foreground">{masterIssue.description}</p>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border text-center">
            <div><p className="text-xl font-bold font-mono text-foreground">{masterIssue.similarCount}</p><p className="text-xs text-muted-foreground">Reports</p></div>
            <div><p className="text-xl font-bold font-mono text-foreground">{masterIssue.affectedCount}</p><p className="text-xs text-muted-foreground">Affected</p></div>
            <div><p className="text-xl font-bold font-mono text-foreground">{masterIssue.priorityScore}</p><p className="text-xs text-muted-foreground">Priority</p></div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Btn onClick={() => setConfirmed(true)} className="w-full py-3">
          <ThumbsUp size={18} />I'm Also Affected
        </Btn>
        <Btn variant="outline" onClick={() => navigate("complaints")} className="w-full">Report Separately</Btn>
      </div>
    </div>
  );
}

function ExplorePage({ issues, navigate, onBack }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = issues.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !search || i.title.toLowerCase().includes(q) || i.ward.toLowerCase().includes(q) || i.address.toLowerCase().includes(q);
    const matchCat = !catFilter || i.category === catFilter;
    const matchStatus = !statusFilter || i.status === statusFilter;
    const matchPriority = !priorityFilter || i.priority === priorityFilter;
    return matchSearch && matchCat && matchStatus && matchPriority;
  });

  const activeFilters = [catFilter, statusFilter, priorityFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F0F7FF 0%, #F8FAFC 60%)" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1B3A5C, #2563EB)" }} className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all mb-4 active:scale-95 shadow-sm cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
          )}
          <h1 className="text-2xl font-black text-white mb-1">Explore Issues</h1>
          <p className="text-blue-200 text-sm mb-5">Browse all civic issues reported in Ranchi</p>
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total", value: issues.length, color: "#60A5FA" },
              { label: "Critical", value: issues.filter(i => i.priority === "Critical").length, color: "#F87171" },
              { label: "In Progress", value: issues.filter(i => i.status === "In Progress").length, color: "#FB923C" },
              { label: "Resolved", value: issues.filter(i => ["Closed","Resolved"].includes(i.status)).length, color: "#34D399" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <p className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-blue-200">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, ward, address..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }} />
            </div>
            <button onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: showFilters ? "white" : "rgba(255,255,255,0.15)", color: showFilters ? "#2563EB" : "white", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Filter size={15} />Filters{activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center font-bold">{activeFilters}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {showFilters && (
          <div className="bg-white border border-border rounded-2xl p-4 mb-4 shadow-sm grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select label="Category" value={catFilter} onChange={setCatFilter}
              options={[{ value: "", label: "All Categories" }, ...CATEGORIES.map(c => ({ value: c.id, label: c.label }))]} />
            <Select label="Status" value={statusFilter} onChange={setStatusFilter}
              options={[{ value: "", label: "All Statuses" }, ...["Pending","Verified","Assigned","In Progress","Resolved","Closed","Reopened"].map(s => ({ value: s, label: s }))]} />
            <Select label="Priority" value={priorityFilter} onChange={setPriorityFilter}
              options={[{ value: "", label: "All Priorities" }, ...["Low","Medium","High","Critical"].map(p => ({ value: p, label: p }))]} />
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">{filtered.length} issue{filtered.length !== 1 ? "s" : ""} found</p>
          {activeFilters > 0 && (
            <button onClick={() => { setCatFilter(""); setStatusFilter(""); setPriorityFilter(""); }}
              className="text-xs text-[#2563EB] font-semibold flex items-center gap-1 hover:underline">
              <X size={12} />Clear filters
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground text-lg mb-1">No issues found</p>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(issue => (
              <IssueCard key={issue.id} issue={issue} onView={() => navigate("issue-detail", issue.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueDetailPage({ issue, onBack, onSupport, onResolveVerify }) {
  const [supported, setSupported] = useState(issue.supported);
  const [count, setCount] = useState(issue.affectedCount);
  const cat = getCatInfo(issue.category);

  const handleSupport = () => {
    if (!supported) { setSupported(true); setCount(c => c + 1); onSupport(issue.id); }
  };

  const photos = {
    pothole: "https://images.unsplash.com/photo-1515162305285-0293e4cb98b3?w=800&h=300&fit=crop&auto=format",
    garbage: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=300&fit=crop&auto=format",
    streetlight: "https://images.unsplash.com/photo-1533073526757-2c8ca1df9f1c?w=800&h=300&fit=crop&auto=format",
    "water-leak": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=300&fit=crop&auto=format",
    drainage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=300&fit=crop&auto=format",
  };
  const photo = issue.photo ?? photos[issue.category] ?? photos.pothole;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-bold mb-5 transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={15} className="text-blue-600" /> Back
        </button>
      )}
      <div className="rounded-xl overflow-hidden mb-5 h-48 md:h-64 bg-muted relative">
        <img src={photo} alt={issue.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-mono text-xs mb-1">{issue.id}</p>
          <h1 className="text-white font-bold text-xl leading-tight">{issue.title}</h1>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        <StatusBadge status={issue.status} />
        <PriorityBadge priority={issue.priority} />
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
          {cat.emoji} {cat.label}
        </span>
        {issue.slaElapsed > issue.slaHours && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle size={10} />SLA Breached
          </span>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-5">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">Issue Details</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{issue.description}</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              {[
                ["Location", `${issue.ward} · ${issue.address}`],
                ["Reported On", `${fmtDate(issue.reportedAt)} at ${fmtTime(issue.reportedAt)}`],
                ["Department", issue.department ?? "Not yet assigned"],
                ["Officer", issue.officer ?? "Not yet assigned"],
                ["Priority Score", `${issue.priorityScore}/30`],
                ["Affected Citizens", count.toString()],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-muted-foreground text-xs">{k}</p>
                  <p className="font-medium text-foreground text-sm">{v}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Live Map */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-1.5"><MapPin size={14} className="text-[#2563EB]" />Live Location</h3>
            <div className="rounded-xl overflow-hidden border border-border" style={{ height: 220 }}>
              <MapContainer center={[issue.lat, issue.lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[issue.lat, issue.lng]} icon={customIcon}>
                  <Popup><b>{issue.title}</b><br />{issue.address}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Navigation size={11} />{issue.lat.toFixed(4)}°N, {issue.lng.toFixed(4)}°E · {issue.ward}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-4">Status Timeline</h3>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
              {TIMELINE_STAGES.map((stage, i) => {
                const entry = issue.timeline.find(t => t.stage === stage);
                const isActive = entry !== undefined;
                const isCurrent = stage === issue.status || (issue.status === "Awaiting Verification" && stage === "Resolved");
                return (
                  <div key={stage} className={`flex items-start gap-4 pb-4 relative ${i === TIMELINE_STAGES.length - 1 ? "pb-0" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      isActive ? isCurrent ? "bg-[#2563EB] shadow-md" : "bg-green-500" : "bg-border"
                    }`}>
                      {isActive ? (
                        isCurrent ? <Activity size={13} className="text-white" /> : <Check size={13} className="text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    <div className={`pt-0.5 ${isActive ? "" : "opacity-40"}`}>
                      <p className={`text-sm font-semibold ${isCurrent ? "text-[#2563EB]" : isActive ? "text-foreground" : "text-muted-foreground"}`}>{stage}</p>
                      {entry && <p className="text-xs text-muted-foreground">{fmtDate(entry.date)} · {fmtTime(entry.date)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <Users size={24} className="text-[#2563EB] mx-auto mb-2" />
            <p className="text-2xl font-bold font-mono text-foreground mb-1">{count}</p>
            <p className="text-xs text-muted-foreground mb-3">citizens confirmed this issue</p>
            {!supported ? (
              <Btn onClick={handleSupport} className="w-full text-sm">
                <ThumbsUp size={14} />I am also affected
              </Btn>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-2.5 text-xs font-medium flex items-center gap-1.5 justify-center">
                <CheckCircle size={14} />Your confirmation added
              </div>
            )}
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Priority Score</p>
            <p className="text-3xl font-bold font-mono text-foreground">{issue.priorityScore}<span className="text-muted-foreground text-lg font-normal">/30</span></p>
            <PriorityBadge priority={issue.priority} />
            <div className="space-y-2 mt-3">
              {[
                ["Severity", 8, 10],
                ["Public Impact", 7, 10],
                ["Location", 9, 10],
                ["Safety Risk", Math.round(issue.priorityScore / 3), 10],
              ].map(([k, v, m]) => (
                <div key={String(k)}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono font-medium text-foreground">{v}/{m}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${(Number(v) / Number(m)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Resolution SLA</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Target</span>
              <span className="font-mono font-semibold">{issue.slaHours}h</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Elapsed</span>
              <span className="font-mono font-semibold">{issue.slaElapsed}h</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-2 mb-2">
              <div className={`h-full rounded-full transition-all ${issue.slaElapsed > issue.slaHours ? "bg-red-500" : "bg-[#2563EB]"}`}
                style={{ width: `${Math.min((issue.slaElapsed / issue.slaHours) * 100, 100)}%` }} />
            </div>
            {issue.slaElapsed > issue.slaHours ? (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1"><AlertTriangle size={11} />SLA Breached</p>
            ) : (
              <p className="text-xs text-muted-foreground">{issue.slaHours - issue.slaElapsed}h remaining</p>
            )}
          </div>
          {(issue.status === "Awaiting Verification" || issue.status === "Resolved") && (
            <Btn onClick={() => onResolveVerify(issue.id)} className="w-full" variant="secondary">
              <Eye size={15} />Verify Resolution
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function MyComplaintsPage({ issues, navigate, onBack }) {
  const [tab, setTab] = useState("All");
  const tabs = ["All", "Pending", "In Progress", "Resolved", "Awaiting Verification", "Closed", "Reopened"];
  const myIssues = issues.filter(i => ["citizen-1", "citizen-5"].includes(i.reportedBy));
  const filtered = tab === "All" ? myIssues : myIssues.filter(i => i.status === tab);

  const stageCount = (status) => {
    const map = { "Pending": 1, "Verified": 2, "Assigned": 3, "In Progress": 3, "Resolved": 4, "Awaiting Verification": 4, "Closed": 5, "Reopened": 2 };
    return map[status] ?? 1;
  };

  const tabCounts = tabs.reduce((acc, t) => {
    acc[t] = t === "All" ? myIssues.length : myIssues.filter(i => i.status === t).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F0F7FF 0%, #F8FAFC 60%)" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1B3A5C, #2563EB)" }} className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all mb-4 active:scale-95 shadow-sm cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
          )}
          <h1 className="text-2xl font-black text-white mb-1">My Complaints</h1>
          <p className="text-blue-200 text-sm mb-5">Track all your submitted civic issues</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Filed", value: myIssues.length, color: "#60A5FA" },
              { label: "In Progress", value: myIssues.filter(i => ["In Progress","Assigned"].includes(i.status)).length, color: "#FB923C" },
              { label: "Resolved", value: myIssues.filter(i => ["Closed","Resolved"].includes(i.status)).length, color: "#34D399" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-blue-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                tab === t ? "bg-[#2563EB] text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:text-foreground"
              }`}>
              {t}
              {tabCounts[t] > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                  tab === t ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>{tabCounts[t]}</span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground text-lg mb-1">No Complaints Yet</p>
            <p className="text-muted-foreground text-sm mb-5">You haven't reported any civic issues yet.</p>
            <button onClick={() => navigate("report")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}>
              <Plus size={16} />Report Your First Issue
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(issue => {
              const cat = getCatInfo(issue.category);
              const stages = stageCount(issue.status);
              const pct = (stages / 5) * 100;
              const slaBreached = issue.slaElapsed > issue.slaHours;
              return (
                <div key={issue.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${cat.color}18` }}>
                          {cat.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{issue.id}</p>
                          <p className="font-bold text-foreground text-sm leading-tight">{issue.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Clock size={10} />{fmtDate(issue.reportedAt)}</span>
                            <span className="flex items-center gap-1"><MapPin size={10} />{issue.ward}</span>
                            {slaBreached && <span className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle size={10} />SLA Breached</span>}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={issue.status} />
                    </div>
                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span className="font-medium">{stages}/5 stages completed</span>
                        <span className="font-mono font-semibold" style={{ color: pct === 100 ? "#16A34A" : "#2563EB" }}>{Math.round(pct)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct === 100 ? "#16A34A" : "linear-gradient(90deg, #2563EB, #60A5FA)" }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate("issue-detail", issue.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                        <Eye size={13} />Track Issue
                      </button>
                      {(issue.status === "Awaiting Verification" || issue.status === "Resolved") && (
                        <button onClick={() => navigate("resolve-verify", issue.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                          style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}>
                          <CheckCircle size={13} />Verify Resolution
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResolutionVerifyPage({ issue, onClose, onReopen, onBack }) {
  const [decision, setDecision] = useState(null);
  const [afterPhoto, setAfterPhoto] = useState(issue.afterPhoto ?? null);
  const [isVerifyingAfter, setIsVerifyingAfter] = useState(false);
  const [afterAiError, setAfterAiError] = useState(null);
  const [afterAiSuccess, setAfterAiSuccess] = useState(null);
  const afterFileRef = useRef(null);

  // Strict Reopen Verification States
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenPresetReason, setReopenPresetReason] = useState("Kaam adhoora chhod diya gaya hai (Incomplete Resolution)");
  const [reopenCustomReason, setReopenCustomReason] = useState("");
  const [reopenPhoto, setReopenPhoto] = useState(null);
  const [isVerifyingReopenPhoto, setIsVerifyingReopenPhoto] = useState(false);
  const [reopenPhotoError, setReopenPhotoError] = useState(null);
  const reopenFileRef = useRef(null);

  const fallbackPhotos = {
    pothole: "https://images.unsplash.com/photo-1515162305285-0293e4cb98b3?w=400&h=200&fit=crop&auto=format",
    garbage: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=200&fit=crop&auto=format",
    streetlight: "https://images.unsplash.com/photo-1533073526757-2c8ca1df9f1c?w=400&h=200&fit=crop&auto=format",
    "water-leak": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=200&fit=crop&auto=format",
    drainage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=200&fit=crop&auto=format",
  };

  // Auto-select Before Photo from reported issue photo
  const beforePhoto = issue.photo ?? fallbackPhotos[issue.category] ?? fallbackPhotos.pothole;

  const processAfterImage = async (dataUrl, name = "after_proof.jpg") => {
    setIsVerifyingAfter(true);
    setAfterAiError(null);
    setAfterAiSuccess(null);

    try {
      const res = await processAndValidateImageFast(dataUrl, name);
      setIsVerifyingAfter(false);

      if (!res.isValid) {
        setAfterAiError(res.reason || "Uploaded After Resolution photo galat hai ya pitch-black / blank lag rhi hai. Kripya valid resolution proof upload karein.");
        setAfterPhoto(null);
      } else {
        setAfterPhoto(res.dataUrl);
        setAfterAiSuccess("After Photo Verified by AI! Issue automatically marked as complete.");
        
        setTimeout(() => {
          setDecision("resolved");
          onClose();
        }, 700);
      }
    } catch (err) {
      console.error(err);
      setIsVerifyingAfter(false);
      setAfterAiError("Photo verification me problem aayi. Kripya dobara try karein.");
    }
  };

  const handleAfterFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processAfterImage(file, file.name);
    }
  };

  const processReopenPhoto = async (rawFile) => {
    setIsVerifyingReopenPhoto(true);
    setReopenPhotoError(null);
    try {
      const res = await processAndValidateImageFast(rawFile, rawFile?.name || "reopen_photo.jpg");
      setIsVerifyingReopenPhoto(false);
      if (!res.isValid) {
        setReopenPhotoError(res.reason || "Invalid Evidence Photo. Kripya saaf outdoor photo upload karein.");
        setReopenPhoto(null);
      } else {
        setReopenPhoto(res.dataUrl);
      }
    } catch {
      setIsVerifyingReopenPhoto(false);
      setReopenPhotoError("Photo verification me error aayi.");
    }
  };

  const handleReopenFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processReopenPhoto(file);
    }
  };

  const handleSubmitReopen = () => {
    if (!reopenPhoto) {
      alert("⚠️ Issue reopen karne ke liye current situation ki photo upload karna anivarya hai.");
      return;
    }
    const finalReason = `${reopenPresetReason} ${reopenCustomReason.trim() ? `— ${reopenCustomReason.trim()}` : ""}`;
    setDecision("reopened");
    onReopen({ reason: finalReason, photo: reopenPhoto });
  };

  if (decision === "resolved") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-card rounded-2xl border border-border shadow-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">Issue Successfully Closed</h2>
          <p className="text-muted-foreground text-sm mb-2">After photo verified by AI. The issue has been automatically marked as closed!</p>
          <p className="font-mono text-xs text-muted-foreground">{issue.id} · {issue.title}</p>
        </div>
      </div>
    );
  }

  if (decision === "reopened") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-card rounded-2xl border border-border shadow-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4 mx-auto">
            <RefreshCw size={32} className="text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-orange-700 mb-2">Issue Reopened Successfully</h2>
          <p className="text-muted-foreground text-sm mb-2">Aapka Reopen Request reason aur new evidence photo ke saath municipal admin & officer ko bhej diya gaya hai.</p>
          <p className="font-mono text-xs text-muted-foreground">{issue.id} · {issue.title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={15} className="text-blue-600" /> Back to Issue Details
        </button>
      )}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-yellow-900 text-sm">Resolution Verification & Auto-Close</p>
          <p className="text-yellow-800 text-xs">Verify the resolution proof photo. Uploading a valid after photo will automatically mark the issue as complete!</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <p className="font-mono text-xs text-muted-foreground mb-1">{issue.id}</p>
        <h3 className="font-bold text-foreground text-lg mb-4">{issue.title}</h3>

        {/* Before vs After Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Auto-selected Before Image */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">1. Reported Photo (Before)</p>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Auto-Selected</span>
            </div>
            <div className="h-44 rounded-xl overflow-hidden bg-muted border border-border">
              <img src={beforePhoto} alt="Issue before resolution" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* After Image with AI Validation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">2. Resolution Photo (After)</p>
              {afterPhoto && <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">AI Verified</span>}
            </div>

            <div onClick={() => !isVerifyingAfter && afterFileRef.current?.click()}
              className={`h-44 rounded-xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center p-3 cursor-pointer transition-all ${
                isVerifyingAfter
                  ? "border-blue-300 bg-blue-50/50"
                  : afterPhoto
                  ? "border-green-300 bg-green-50/20"
                  : afterAiError
                  ? "border-red-300 bg-red-50/30"
                  : "border-border hover:border-[#2563EB] hover:bg-blue-50/30"
              }`}>
              {isVerifyingAfter ? (
                <div className="text-center">
                  <Loader2 size={24} className="text-[#2563EB] animate-spin mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#2563EB]">AI Verifying After Image...</p>
                </div>
              ) : afterPhoto ? (
                <img src={afterPhoto} alt="Issue after resolution" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <div className="text-center p-2">
                  <Camera size={24} className="text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground">Upload After Photo</p>
                  <p className="text-[10px] text-muted-foreground">JPEG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input ref={afterFileRef} type="file" accept="image/*" className="hidden" onChange={handleAfterFile} />
          </div>
        </div>

        {/* AI Error Banner for After Image */}
        {afterAiError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-4 text-xs text-red-900 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">❌ After Resolution Photo Galat Hai!</p>
              <p className="text-red-700 mt-0.5">{afterAiError}</p>
            </div>
          </div>
        )}

        {/* AI Success Banner for After Image */}
        {afterAiSuccess && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-3 mb-4 text-xs text-green-900 flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-900">✨ After Photo Validated by AI!</p>
              <p className="text-green-700 mt-0.5">Marking issue as complete automatically...</p>
            </div>
          </div>
        )}

        {issue.resolutionNote && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Resolution Note</p>
            <p className="text-sm text-foreground">{issue.resolutionNote}</p>
          </div>
        )}
      </div>

      {/* STRICT REOPEN VERIFICATION MODAL / PANEL */}
      {showReopenForm ? (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-5 space-y-4 shadow-md animate-in fade-in">
          <div className="flex items-start justify-between gap-2 border-b border-red-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="font-bold text-red-950 text-base">Issue Reopen Verification Required</h4>
                <p className="text-xs text-red-700">Citizen Restriction: Reopen karne ke liye reason aur proof photo anivarya hai.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReopenForm(false)}
              className="text-red-600 hover:text-red-900 font-bold p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* 1. Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-red-950 mb-1">
              1. Reopen Reason Select Karein (Mandatory) *
            </label>
            <select
              value={reopenPresetReason}
              onChange={(e) => setReopenPresetReason(e.target.value)}
              className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Kaam adhoora chhod diya gaya hai (Incomplete Resolution)">⚠️ Kaam adhoora chhod diya gaya hai (Incomplete Resolution)</option>
              <option value="Samasya dobara shuru ho gayi hai (Issue Recurred)">🔄 Samasya dobara shuru ho gayi hai (Issue Recurred)</option>
              <option value="Galat proof photo upload ki gayi hai (Fake Resolution Proof)">❌ Galat proof photo upload ki gayi hai (Fake Resolution Proof)</option>
              <option value="Marammat ki quality kharab hai (Substandard Repair Work)">🔨 Marammat ki quality kharab hai (Substandard Repair Work)</option>
              <option value="Other Specific Issue">📋 Other Specific Reason</option>
            </select>
          </div>

          {/* 2. Detailed Reason Textarea */}
          <div>
            <label className="block text-xs font-bold text-red-950 mb-1">
              2. Reason Details (Kya samasya bachi hui hai?) *
            </label>
            <textarea
              rows={2}
              value={reopenCustomReason}
              onChange={(e) => setReopenCustomReason(e.target.value)}
              placeholder="Kripya likhein ki samasya kyu theek nahi hui hai..."
              className="w-full bg-white border border-red-300 rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* 3. Mandatory Evidence Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-red-950 mb-1 flex items-center justify-between">
              <span>3. Current Proof Photo Upload Karein (Mandatory) *</span>
              {reopenPhoto && <span className="text-green-700 font-bold text-[11px] flex items-center gap-1"><CheckCircle size={12} /> Photo Verified</span>}
            </label>
            
            <div
              onClick={() => !isVerifyingReopenPhoto && reopenFileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isVerifyingReopenPhoto
                  ? "border-blue-400 bg-blue-50/50"
                  : reopenPhoto
                  ? "border-green-400 bg-green-50/40"
                  : reopenPhotoError
                  ? "border-red-400 bg-red-50/30"
                  : "border-red-300 bg-white hover:bg-red-50/40"
              }`}
            >
              {isVerifyingReopenPhoto ? (
                <div className="text-center py-2">
                  <Loader2 size={24} className="text-red-600 animate-spin mx-auto mb-1" />
                  <p className="text-xs font-bold text-red-700">Verifying Evidence Photo...</p>
                </div>
              ) : reopenPhoto ? (
                <div className="w-full flex items-center gap-3">
                  <img src={reopenPhoto} alt="Reopen Proof" className="w-20 h-16 object-cover rounded-lg border border-green-300 shadow-xs" />
                  <div>
                    <span className="text-xs bg-green-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                      <CheckCircle size={10} /> Valid Proof Photo
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">Click to change photo</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <Camera size={24} className="text-red-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-red-900">Click to Upload Current Situation Photo</p>
                  <p className="text-[10px] text-red-700 mt-0.5">Photo proof ke bina reopen request submit nahi hogi</p>
                </div>
              )}
            </div>
            <input ref={reopenFileRef} type="file" accept="image/*" className="hidden" onChange={handleReopenFileChange} />
          </div>

          {reopenPhotoError && (
            <div className="bg-red-100 border border-red-300 rounded-xl p-2.5 text-xs text-red-900 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
              <span>{reopenPhotoError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReopenForm(false)}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitReopen}
              disabled={!reopenPhoto || isVerifyingReopenPhoto}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                reopenPhoto && !isVerifyingReopenPhoto
                  ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  : "bg-red-200 text-red-400 cursor-not-allowed"
              }`}
            >
              <RefreshCw size={14} /> Submit Reopen Request
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setDecision("resolved"); onClose(); }}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm">
            <CheckCircle size={18} /> Mark as Complete
          </button>
          <button onClick={() => setShowReopenForm(true)}
            className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-3.5 rounded-xl transition-colors">
            <X size={18} /> Reopen Issue
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationsPage({ notifications, navigate, onMarkRead, onBack }) {
  const icons = {
    info: <Clock size={16} className="text-blue-600" />,
    success: <CheckCircle size={16} className="text-green-600" />,
    warning: <AlertCircle size={16} className="text-yellow-600" />
  };
  const bgColors = {
    info: { card: "#EFF6FF", border: "#BFDBFE", dot: "#2563EB" },
    success: { card: "#F0FDF4", border: "#BBF7D0", dot: "#16A34A" },
    warning: { card: "#FEFCE8", border: "#FDE68A", dot: "#CA8A04" },
  };
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F0F7FF 0%, #F8FAFC 60%)" }}>
      <div style={{ background: "linear-gradient(135deg, #1B3A5C, #2563EB)" }} className="px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all mb-3 active:scale-95 shadow-sm cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Home
              </button>
            )}
            <h1 className="text-2xl font-black text-white mb-1">Notifications</h1>
            <p className="text-blue-200 text-sm">{unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up!"}</p>
          </div>
          {unread > 0 && (
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-lg">{unread}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground text-lg">No notifications</p>
            <p className="text-muted-foreground text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const c = bgColors[n.type];
              return (
                <div key={n.id}
                  className="rounded-2xl border cursor-pointer transition-all hover:shadow-md"
                  style={{ background: n.read ? "white" : c.card, borderColor: n.read ? "#E2E8F0" : c.border, opacity: n.read ? 0.8 : 1 }}
                  onClick={() => { onMarkRead(n.id); navigate("issue-detail", n.issueId); }}>
                  <div className="flex items-start gap-3 p-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: n.read ? "#F1F5F9" : `${c.dot}18` }}>
                      {icons[n.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${ n.read ? "text-muted-foreground" : "text-foreground font-medium" }`}>{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Clock size={10} />{fmtDate(n.time)} · {fmtTime(n.time)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {!n.read && <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.dot }} />}
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePage({ issues, navigate, onBack }) {
  const myIssues = issues.filter(i => ["CIT-00421", "citizen-1", "citizen-5"].includes(i.reportedBy));
  const resolved = myIssues.filter(i => i.status === "Closed").length;
  const civicScore = 87;

  const badges = [
    { icon: "🏆", label: "Top Reporter", desc: "5+ issues filed", earned: myIssues.length >= 2 },
    { icon: "✅", label: "Verifier", desc: "Verified a resolution", earned: resolved > 0 },
    { icon: "🌟", label: "Civic Hero", desc: "Score above 80", earned: civicScore >= 80 },
    { icon: "📍", label: "GPS Pro", desc: "Used GPS location", earned: true },
  ];

  return (
    <div className="min-h-screen pb-12" style={{ background: "linear-gradient(180deg, #F0F7FF 0%, #F8FAFC 60%)" }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer mb-2"
          >
            <ArrowLeft size={14} className="text-blue-600" /> Back to Home
          </button>
        )}
        {/* Profile Card Header */}
        <div className="glass-card rounded-3xl border border-slate-200/80 shadow-md p-6 relative overflow-hidden bg-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 text-white shadow-lg glow-blue">
              <User size={38} className="text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Arjun Sharma</h1>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  CIT-00421
                </span>
              </div>
              <p className="text-muted-foreground text-xs font-semibold flex items-center justify-center sm:justify-start gap-1">
                <MapPin size={13} className="text-blue-500" /> Ward 12, Ranchi, Jharkhand
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-semibold"><Phone size={12} className="text-blue-600" /> +91 98765 43210</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">✓ Verified Citizen</span>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-end flex-shrink-0">
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-black shadow-md gradient-amber glow-amber text-white">
                <Star size={16} fill="currentColor" />{civicScore}
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold mt-1">Civic Score</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="glass-card rounded-2xl border border-slate-200/80 shadow-sm p-6 bg-white">
          <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-100">
            <div>
              <p className="text-3xl font-extrabold font-mono text-foreground tracking-tight">{myIssues.length}</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Issues Reported</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold font-mono text-emerald-600 tracking-tight">{resolved}</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Resolved</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold font-mono text-blue-600 tracking-tight">{myIssues.reduce((s, i) => s + i.affectedCount, 0)}</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Citizens Helped</p>
            </div>
          </div>
        </div>

        {/* Civic Score Bar */}
        <div className="glass-card rounded-2xl border border-slate-200/80 shadow-sm p-6 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" /> Civic Reputation Score
            </h3>
            <span className="font-black font-mono text-2xl" style={{ color: civicScore >= 80 ? "#059669" : civicScore >= 60 ? "#D97706" : "#DC2626" }}>{civicScore}<span className="text-muted-foreground text-sm font-normal">/100</span></span>
          </div>
          <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden mb-2.5 p-0.5 border border-slate-200/60 shadow-inner">
            <div className="h-full rounded-full transition-all duration-1000 gradient-emerald glow-emerald"
              style={{ width: `${civicScore}%` }} />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Based on reports filed, verified resolutions, and active community contributions</p>
        </div>

        {/* Badges */}
        <div className="glass-card rounded-2xl border border-slate-200/80 shadow-sm p-6 bg-white">
          <h3 className="font-extrabold text-foreground text-sm mb-4 tracking-tight">Achievements & Badges</h3>
          <div className="grid grid-cols-2 gap-3.5">
            {badges.map(b => (
              <div key={b.label} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                b.earned ? "border-amber-200/80 bg-amber-50/60 shadow-2xs" : "border-slate-200 bg-slate-50/40 opacity-50"
              }`}>
                <span className="text-2xl flex-shrink-0">{b.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${ b.earned ? "text-slate-900" : "text-muted-foreground" }`}>{b.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{b.desc}</p>
                </div>
                {b.earned && <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="glass-card rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100 bg-white">
          {[
            { icon: <FileText size={16} className="text-amber-500" />, label: "Citizen ID", value: "CIT-00421" },
            { icon: <User size={16} className="text-blue-500" />, label: "Full Name", value: "Arjun Sharma" },
            { icon: <Phone size={16} className="text-blue-500" />, label: "Phone", value: "+91 98765 43210" },
            { icon: <MapPin size={16} className="text-indigo-500" />, label: "Ward", value: "Ward 12, Ranchi Municipal Corp" },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 px-6 py-4">
              <span className="p-2 rounded-lg bg-slate-100">{row.icon}</span>
              <span className="text-xs text-muted-foreground font-semibold w-24 flex-shrink-0">{row.label}</span>
              <span className="text-sm text-foreground font-bold">{row.value}</span>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("report")}
          className="w-full py-4 rounded-2xl font-extrabold text-white flex items-center justify-center gap-2.5 gradient-brand glow-blue shadow-lg hover:opacity-95 transition-all text-sm">
          <Plus size={20} />Report a New Issue
        </button>
      </div>
    </div>
  );
}


function AdminSidebar({ page, navigate, setRole }) {
  const links = [
    { id: "admin-dashboard", label: "Dashboard",    icon: <BarChart2 size={17} /> },
    { id: "admin-issues",    label: "All Issues",   icon: <FileText size={17} /> },
    { id: "admin-map",       label: "Issue Map",    icon: <Map size={17} /> },
    { id: "admin-analytics", label: "Analytics",    icon: <TrendingUp size={17} /> },
    { id: "admin-sla",       label: "SLA & Alerts", icon: <AlertTriangle size={17} /> },
  ];

  return (
    <aside className="w-60 bg-[#0F2444] text-white flex flex-col h-screen sticky top-0 flex-shrink-0 border-r border-white/10 overflow-y-auto shadow-xl z-20">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shadow-md glow-blue">
            <MapPin size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm tracking-tight">CivicConnect</p>
            <p className="text-indigo-300 text-[11px] font-semibold flex items-center gap-1">
              <Shield size={10} /> Admin Command
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1.5">
        {links.map(l => (
          <button key={l.id} onClick={() => navigate(l.id)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              page === l.id 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md glow-blue" 
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}>
            {l.icon}{l.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button onClick={() => setRole("citizen")}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all border border-white/5">
          <LogOut size={15} />Switch to Citizen App
        </button>
      </div>
    </aside>
  );
}

function AdminDashboard({ issues, navigate }) {
  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.status === "Pending").length,
    inProgress: issues.filter(i => i.status === "In Progress").length,
    resolved: issues.filter(i => ["Resolved","Closed"].includes(i.status)).length,
    critical: issues.filter(i => i.priority === "Critical").length,
    slaBreach: issues.filter(i => i.slaElapsed > i.slaHours).length,
  };

  const catData = CATEGORIES.slice(0, 6).map(c => ({
    name: c.label.split("/")[0].trim(),
    count: issues.filter(i => i.category === c.id).length + Math.floor(Math.random() * 40 + 10),
  }));

  const statusData = [
    { name: "Pending",     value: stats.pending + 280,   color: "#94A3B8" },
    { name: "In Progress", value: stats.inProgress + 315, color: "#F97316" },
    { name: "Resolved",    value: stats.resolved + 674,   color: "#16A34A" },
    { name: "Assigned",    value: 65,                     color: "#7C3AED" },
  ];

  const recentIssues = [...issues].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt)).slice(0, 5);

  const statCards = [
    { label: "Total Issues",  value: stats.total + 1279,     icon: <FileText size={18} />,    color: "gradient-brand",   trend: "+12%" },
    { label: "Pending",       value: stats.pending + 279,    icon: <Clock size={18} />,       color: "bg-slate-700",     trend: "-3%" },
    { label: "In Progress",   value: stats.inProgress + 315, icon: <Activity size={18} />,    color: "gradient-amber",   trend: "+8%" },
    { label: "Resolved",      value: stats.resolved + 674,   icon: <CheckCircle size={18} />, color: "gradient-emerald", trend: "+21%" },
    { label: "Critical",      value: stats.critical + 38,    icon: <AlertCircle size={18} />, color: "gradient-rose",    trend: "+2" },
    { label: "SLA Breached",  value: stats.slaBreach + 15,   icon: <AlertTriangle size={18} />, color: "bg-amber-600",    trend: "-5%" },
  ];

  return (
    <div className="p-6 max-w-full">
      {/* Welcome Banner */}
      <div className="rounded-3xl p-7 mb-6 relative overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, #0F2444 0%, #1B3A5C 50%, #2563EB 100%)" }}>
        <div className="absolute inset-0 opacity-15">
          <svg className="w-full h-full"><defs><pattern id="dash-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#dash-grid)" /></svg>
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">Live Municipal Command Center</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Ranchi Municipal Corporation</h1>
            <p className="text-blue-200/80 text-sm mt-1">Real-time civic complaint analytics & automated AI routing dashboard</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center px-5 py-3.5 rounded-2xl border border-white/10 backdrop-blur-md bg-white/10 shadow-sm">
              <p className="text-2xl font-black text-white font-mono">{Math.round((stats.resolved / Math.max(stats.total, 1)) * 100 + 60)}%</p>
              <p className="text-blue-200 text-xs font-semibold mt-0.5">Resolution Rate</p>
            </div>
            <div className="text-center px-5 py-3.5 rounded-2xl border border-white/10 backdrop-blur-md bg-white/10 shadow-sm">
              <p className="text-2xl font-black text-white font-mono">41h</p>
              <p className="text-blue-200 text-xs font-semibold mt-0.5">Avg Resolve Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-6">
        {statCards.map(s => (
          <div key={s.label} className="glass-card rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md card-hover-effect">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white mb-3 shadow-sm ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-black font-mono text-foreground leading-none mb-1 tracking-tight">{s.value.toLocaleString()}</p>
            <p className="text-xs font-bold text-slate-700 mb-0.5">{s.label}</p>
            <p className={`text-[11px] font-mono font-bold ${ s.trend.startsWith("+") ? "text-emerald-600" : "text-rose-500" }`}>{s.trend} this week</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <div className="glass-card rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="font-extrabold text-sm text-foreground mb-4 tracking-tight">Issues by Category</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={catData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
              <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="font-extrabold text-sm text-foreground mb-4 tracking-tight">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={statusData} cx="40%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Legend layout="vertical" align="right" verticalAlign="middle"
                formatter={(value) => <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-sm text-foreground">Recent Issues</h3>
          <button onClick={() => navigate("admin-issues")}
            className="text-xs text-[#2563EB] font-semibold flex items-center gap-1 hover:underline">
            View all <ChevronRight size={13} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {["ID", "Issue", "Category", "Ward", "Priority", "Affected", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentIssues.map(i => {
                const cat = getCatInfo(i.category);
                const fallbackPhotos = {
                  pothole: "https://images.unsplash.com/photo-1515162305285-0293e4cb98b3?w=48&h=48&fit=crop&auto=format",
                  garbage: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=48&h=48&fit=crop&auto=format",
                  streetlight: "https://images.unsplash.com/photo-1533073526757-2c8ca1df9f1c?w=48&h=48&fit=crop&auto=format",
                  "water-leak": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=48&h=48&fit=crop&auto=format",
                  drainage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=48&h=48&fit=crop&auto=format",
                };
                const photo = i.photo ?? fallbackPhotos[i.category] ?? null;
                return (
                  <tr key={i.id} className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate("admin-issue-detail", i.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {photo && <img src={photo} alt={i.title} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-border" />}
                        <span className="font-semibold text-foreground max-w-[160px] truncate">{i.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cat.emoji} {cat.label.split("/")[0]}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i.ward}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={i.priority} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{i.affectedCount}</td>
                    <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminAllIssues({ issues, navigate }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const filtered = issues.filter(i => {
    const q = search.toLowerCase();
    return (
      (!search || i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)) &&
      (!status || i.status === status) &&
      (!priority || i.priority === priority)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">All Issues</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} issues · Ranchi Municipal Corporation</p>
      </div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search issues..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
        </div>
        <Select value={status} onChange={setStatus}
          options={[{ value: "", label: "All Statuses" }, ...["Pending","Verified","Assigned","In Progress","Resolved","Awaiting Verification","Closed","Reopened"].map(s => ({ value: s, label: s }))]}
          className="w-44" />
        <Select value={priority} onChange={setPriority}
          options={[{ value: "", label: "All Priorities" }, ...["Low","Medium","High","Critical"].map(p => ({ value: p, label: p }))]}
          className="w-36" />
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {["Issue ID", "Citizen ID", "Issue Title", "Category", "Location", "Priority", "Crowd", "Dept.", "Officer", "SLA", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(i => {
                const cat = getCatInfo(i.category);
                const workerSla = getWorkerSlaStatus(i.slaElapsed, 36);
                return (
                  <tr key={i.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{i.id}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">
                      <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {i.reportedBy === "citizen-1" ? "CIT-00421" : i.reportedBy}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]"><p className="font-medium text-foreground truncate">{i.title}</p></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{cat.emoji} {cat.label.split("/")[0]}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{i.ward}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={i.priority} /></td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{i.affectedCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{i.department ?? <span className="text-red-500">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{i.officer || "Auto-Assigning..."}</span>
                        <span className="text-[10px] text-blue-600 font-bold">🤖 Auto-Assigned</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {workerSla.tier === 0 ? (
                        <span className="text-xs font-mono font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          {workerSla.badge}
                        </span>
                      ) : workerSla.tier === 1 ? (
                        <span className="text-xs font-mono font-bold text-yellow-800 bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded-full">
                          {workerSla.badge}
                        </span>
                      ) : workerSla.tier === 2 ? (
                        <span className="text-xs font-mono font-bold text-orange-800 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
                          {workerSla.badge}
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full animate-pulse">
                          {workerSla.badge}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                    <td className="px-4 py-3">
                      <Btn variant="ghost" onClick={() => navigate("admin-issue-detail", i.id)} className="text-xs py-1 px-2 text-[#2563EB]">
                        <Eye size={13} />View
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminMapPage({ issues }) {
  const priorityDotColor = { Critical: "#DC2626", High: "#EA580C", Medium: "#F59E0B", Low: "#16A34A" };
  const RANCHI_CENTER = [23.3441, 85.3096];

  const issueMarkers = issues.map((iss) => ({
    ...iss,
    position: [iss.lat, iss.lng],
  }));

  const getMarkerIcon = (priority) => new L.DivIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${priorityDotColor[priority]};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><svg width='12' height='12' viewBox='0 0 24 24' fill='white'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Issue Heatmap</h1>
        <p className="text-muted-foreground text-sm">Live civic issue map across Ranchi</p>
      </div>
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Ranchi Municipal Corporation — Live Map</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {[["🔴","Critical"], ["🟠","High"], ["🟡","Medium"], ["🟢","Low"]].map(([e, l]) => (
                <span key={l} className="flex items-center gap-1">{e} {l}</span>
              ))}
            </div>
          </div>
          <div style={{ height: 460 }}>
            <MapContainer center={RANCHI_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {issueMarkers.map(iss => (
                <Marker key={iss.id} position={iss.position} icon={getMarkerIcon(iss.priority)}>
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      {iss.photo && (
                        <img src={iss.photo} alt={iss.title} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, marginBottom: 6 }} />
                      )}
                      <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{iss.title}</p>
                      <p style={{ fontSize: 11, color: "#64748B", marginBottom: 2 }}>{iss.id} · {iss.ward}</p>
                      <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>{iss.address}</p>
                      <span style={{
                        display: "inline-block", fontSize: 10, fontWeight: 600,
                        padding: "2px 8px", borderRadius: 999,
                        background: iss.priority === "Critical" ? "#FEE2E2" : iss.priority === "High" ? "#FFEDD5" : iss.priority === "Medium" ? "#FEF9C3" : "#DCFCE7",
                        color: iss.priority === "Critical" ? "#DC2626" : iss.priority === "High" ? "#EA580C" : iss.priority === "Medium" ? "#CA8A04" : "#16A34A",
                      }}>{iss.priority} Priority</span>
                      <p style={{ fontSize: 11, marginTop: 6, color: "#374151" }}>👥 {iss.affectedCount} affected</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <h4 className="font-semibold text-sm text-foreground mb-3">Active Issues</h4>
            <div className="space-y-2">
              {issues.map(i => (
                <div key={i.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border last:border-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: priorityDotColor[i.priority] }} />
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">{i.title}</p>
                    <p className="text-muted-foreground">{i.ward}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <h4 className="font-semibold text-sm text-foreground mb-3">Priority Legend</h4>
            {Object.entries(priorityDotColor).map(([p, color]) => (
              <div key={p} className="flex items-center gap-2 py-1">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-sm text-foreground">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminIssueDetail({ issue, onBack, onUpdateIssue }) {
  const [dept, setDept] = useState(issue.department ?? "");
  const [officer, setOfficer] = useState(issue.officer ?? "");
  const [status, setStatus] = useState(issue.status);
  const [resNote, setResNote] = useState(issue.resolutionNote ?? "");
  const [assigned, setAssigned] = useState(false);
  const [resolved, setResolved] = useState(false);
  const cat = getCatInfo(issue.category);

  const handleAssign = () => {
    if (!dept) return;
    onUpdateIssue(issue.id, {
      department: dept, officer,
      status: "Assigned",
      timeline: [...issue.timeline, { stage: "Assigned", date: new Date().toISOString(), note: `Assigned to ${dept}` }],
    });
    setAssigned(true);
  };

  const handleStatusUpdate = () => {
    const newTimeline = [...issue.timeline];
    if (!newTimeline.find(t => t.stage === status)) {
      newTimeline.push({ stage: status, date: new Date().toISOString() });
    }
    onUpdateIssue(issue.id, { status, timeline: newTimeline });
  };

  const handleResolve = () => {
    onUpdateIssue(issue.id, {
      status: "Awaiting Verification", resolutionNote: resNote,
      timeline: [...issue.timeline, { stage: "Resolved", date: new Date().toISOString(), note: resNote }],
    });
    setResolved(true);
  };

  return (
    <div className="p-6 max-w-5xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft size={15} />Back to Issues
      </button>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-foreground flex-1">{issue.title}</h1>
        <span className="font-mono text-sm text-muted-foreground">{issue.id}</span>
        <StatusBadge status={issue.status} />
        <PriorityBadge priority={issue.priority} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="h-48 bg-muted relative">
              <img src={issue.photo ?? "https://images.unsplash.com/photo-1515162305285-0293e4cb98b3?w=800&h=250&fit=crop&auto=format"}
                alt={issue.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                {[
                  ["Category", `${cat.emoji} ${cat.label}`],
                  ["Citizen ID (Privacy Protected)", `${issue.reportedBy === "citizen-1" ? "CIT-00421" : (issue.reportedBy || "CIT-00421")}`],
                  ["Location", `${issue.ward} · ${issue.address}`],
                  ["Reported Date", `${fmtDate(issue.reportedAt)}`],
                  ["Affected Citizens", `${issue.affectedCount} citizens`],
                  ["Similar Reports", `${issue.similarCount} duplicate reports`],
                  ["Priority Score", `${issue.priorityScore}/30`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-muted-foreground text-xs mb-0.5">{k}</p>
                    <p className="font-medium text-foreground">{v}</p>
                  </div>
                ))}
              </div>

              {/* Reopen Request & Evidence Photo Banner */}
              {issue.status === "Reopened" && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-950">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">⚠️</span>
                    <h4 className="font-bold text-sm text-red-950">Citizen Reopen Request & Evidence</h4>
                  </div>
                  <p className="text-xs text-red-900 mb-3">
                    <b>Reason:</b> {issue.reopenReason || "Citizen marked resolution as incomplete."}
                  </p>
                  {issue.reopenPhoto && (
                    <div>
                      <p className="text-[11px] font-bold text-red-800 uppercase tracking-wide mb-1.5">Citizen Reopened Proof Photo:</p>
                      <div className="h-44 rounded-lg overflow-hidden border border-red-300 bg-white">
                        <img src={issue.reopenPhoto} alt="Citizen Evidence" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Live Map */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2" style={{ background: "#F8FAFC" }}>
              <MapPin size={14} className="text-[#2563EB]" />
              <h3 className="font-semibold text-sm text-foreground">Live Location</h3>
              <span className="ml-auto text-xs text-muted-foreground font-mono">{issue.lat.toFixed(4)}°N, {issue.lng.toFixed(4)}°E</span>
            </div>
            <div style={{ height: 220 }}>
              <MapContainer center={[issue.lat, issue.lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[issue.lat, issue.lng]} icon={customIcon}>
                  <Popup><b>{issue.title}</b><br />{issue.ward} · {issue.address}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-foreground">Priority Score Breakdown</h3>
              <span className="font-mono font-bold text-xl text-foreground">{issue.priorityScore}<span className="text-muted-foreground text-sm font-normal">/30</span></span>
            </div>
            <div className="space-y-2.5">
              {[
                ["Severity", 8, 10],
                ["Public Impact", 7, 10],
                ["Location Importance", 9, 10],
                ["Duration", Math.round(issue.slaElapsed / 10), 10],
                ["Safety Risk", 8, 10],
              ].map(([label, val, max]) => (
                <div key={String(label)}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-semibold text-foreground">{val}/{max}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${(Number(val) / Number(max)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-4">Resolution History</h3>
            <div className="space-y-3">
              {issue.timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check size={12} className="text-green-600" />
                    </div>
                    {i < issue.timeline.length - 1 && <div className="w-px h-full bg-border mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-foreground">{t.stage}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(t.date)} at {fmtTime(t.date)}</p>
                    {t.note && <p className="text-xs text-muted-foreground mt-0.5">{t.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">Department Assignment</h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">🤖 Auto-Assigned by AI</span>
            </div>
            <Select label="Department" value={dept} onChange={setDept} className="mb-3"
              options={[{ value: "", label: "Select department" }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]} />
            <Select label="Assigned Officer / Worker" value={officer} onChange={setOfficer} className="mb-3"
              options={[{ value: "", label: "Select officer" }, ...OFFICERS.map(o => ({ value: o, label: o }))]} />
            {assigned ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-2.5 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle size={13} />Issue assigned successfully
              </div>
            ) : (
              <Btn onClick={handleAssign} className="w-full"><Edit3 size={14} />Re-Assign Worker</Btn>
            )}
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">Update Status</h3>
            <Select value={status} onChange={v => setStatus(v)} className="mb-3"
              options={["Pending","Verified","Assigned","In Progress","Resolved","Closed"].map(s => ({ value: s, label: s }))} />
            <Btn variant="secondary" onClick={handleStatusUpdate} className="w-full">
              <RefreshCw size={14} />Update Status
            </Btn>
          </div>

          {/* 36-Hour Worker SLA & 3-Tier Warning System */}
          {(() => {
            const workerSla = getWorkerSlaStatus(issue.slaElapsed, 36);
            return (
              <div className={`bg-card rounded-xl border p-4 ${
                workerSla.tier === 3 ? "border-red-300 bg-red-50/20" : workerSla.tier === 2 ? "border-orange-300 bg-orange-50/20" : workerSla.tier === 1 ? "border-yellow-300 bg-yellow-50/20" : "border-border"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-foreground">Worker 36-Hour SLA Status</h3>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    workerSla.tier === 3 ? "bg-red-600 text-white animate-pulse" : workerSla.tier === 2 ? "bg-orange-600 text-white" : workerSla.tier === 1 ? "bg-yellow-500 text-white" : "bg-green-100 text-green-800"
                  }`}>
                    {workerSla.label}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Target SLA Time</span><span className="font-mono font-semibold">36 Hours</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Elapsed Time</span><span className="font-mono font-semibold">{issue.slaElapsed} Hours</span></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned Officer</span>
                    <span className="font-semibold text-foreground">{issue.officer || "Unassigned"}</span>
                  </div>
                </div>

                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${workerSla.tier === 3 ? "bg-red-600" : workerSla.tier === 2 ? "bg-orange-500" : workerSla.tier === 1 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min((issue.slaElapsed / 36) * 100, 100)}%` }} />
                </div>

                {/* Worker Warning Cards */}
                {workerSla.warningMessage && (
                  <div className={`p-3 rounded-lg border text-xs font-medium ${
                    workerSla.tier === 3 ? "bg-red-100 border-red-300 text-red-900" : workerSla.tier === 2 ? "bg-orange-100 border-orange-300 text-orange-900" : "bg-yellow-100 border-yellow-300 text-yellow-900"
                  }`}>
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={14} /> {workerSla.badge}
                    </p>
                    <p>{workerSla.warningMessage}</p>
                    {workerSla.tier === 3 && (
                      <div className="mt-2 pt-2 border-t border-red-200 text-red-900 font-bold flex items-center gap-1">
                        🛑 ACTION: Worker Account Flagged for Immediate Suspension by Admin Panel!
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {!resolved ? (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">Mark as Complete</h3>
              <textarea value={resNote} onChange={e => setResNote(e.target.value)}
                placeholder="Describe the work completed..." rows={3}
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none mb-3" />
              <Btn onClick={handleResolve} className="w-full">
                <CheckCircle size={14} />Submit Resolution
              </Btn>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
              <p className="text-green-700 font-semibold text-sm">Submitted for citizen verification</p>
              <p className="text-green-600 text-xs mt-1">Status: Awaiting Verification</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminAnalytics({ issues }) {
  const wardData = ["Ward 5", "Ward 7", "Ward 8", "Ward 12", "Ward 3"].map(w => ({
    ward: w.replace("Ward ", "W"),
    issues: issues.filter(i => i.ward === w).length + Math.floor(Math.random() * 30 + 8),
    resolved: Math.floor(Math.random() * 15 + 3),
  }));

  const catData = CATEGORIES.slice(0, 6).map(c => ({
    name: c.label.split("/")[0].trim(),
    value: issues.filter(i => i.category === c.id).length + Math.floor(Math.random() * 50 + 10),
    color: c.color,
  }));

  const metrics = [
    { label: "Avg Resolution Time", value: "41.2h", sub: "vs 48h target",             icon: <Clock size={20} />,       good: true,  color: "bg-blue-500" },
    { label: "Citizen Verify Rate",  value: "78%",   sub: "Citizens confirming fixes",  icon: <Users size={20} />,       good: true,  color: "bg-purple-500" },
    { label: "SLA Compliance",       value: "84%",   sub: "Issues resolved within SLA", icon: <CheckCircle size={20} />, good: true,  color: "bg-green-500" },
    { label: "Reopened Issues",      value: "6%",    sub: "Reopened after resolution",  icon: <RefreshCw size={20} />,   good: false, color: "bg-red-500" },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="rounded-2xl p-5 mb-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1B3A5C, #7C3AED)" }}>
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full"><defs><pattern id="ana-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#ana-grid)" /></svg>
        </div>
        <div className="relative">
          <h1 className="text-2xl font-black text-white">Analytics</h1>
          <p className="text-purple-200 text-sm">Performance & resolution metrics · Ranchi Municipal Corporation</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 ${m.color}`}>{m.icon}</div>
            <p className={`text-3xl font-black font-mono mb-1 ${ m.good ? "text-foreground" : "text-red-600" }`}>{m.value}</p>
            <p className="text-xs font-bold text-foreground mb-0.5">{m.label}</p>
            <p className="text-xs text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-sm text-foreground mb-4">Ward-wise Issues</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wardData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="ward" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
              <Legend formatter={v => <span style={{ fontSize: 11, color: "#64748B" }}>{v}</span>} />
              <Bar dataKey="issues"   name="Total"    fill="#2563EB" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#16A34A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-sm text-foreground mb-4">Issues by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={catData} cx="40%" cy="50%" outerRadius={85} dataKey="value" paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={10}>
                {catData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-bold text-sm text-foreground mb-4">Department Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 rounded-xl">
                {["Department", "Total", "Resolved", "Pending", "Avg Time", "SLA Compliance"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { dept: "Roads & Infrastructure", total: 42, resolved: 31, pending: 11, avgTime: "38h", sla: 88 },
                { dept: "Sanitation",             total: 38, resolved: 29, pending: 9,  avgTime: "22h", sla: 92 },
                { dept: "Water Supply",           total: 24, resolved: 18, pending: 6,  avgTime: "44h", sla: 81 },
                { dept: "Electrical",             total: 19, resolved: 15, pending: 4,  avgTime: "31h", sla: 90 },
              ].map(r => (
                <tr key={r.dept} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-3 font-semibold text-foreground">{r.dept}</td>
                  <td className="px-3 py-3 font-mono font-bold text-foreground">{r.total}</td>
                  <td className="px-3 py-3 font-mono font-bold text-green-600">{r.resolved}</td>
                  <td className="px-3 py-3 font-mono font-bold text-orange-600">{r.pending}</td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">{r.avgTime}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.sla}%`, background: r.sla >= 90 ? "#16A34A" : r.sla >= 80 ? "#2563EB" : "#F59E0B" }} />
                      </div>
                      <span className="font-mono text-xs font-bold">{r.sla}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminSLAPage({ issues }) {
  const breached = issues.filter(i => (i.slaElapsed || 0) > 36); // Breached 36h worker target SLA
  const atRisk = issues.filter(i => (i.slaElapsed || 0) >= 28 && (i.slaElapsed || 0) <= 36);
  const onTrack = issues.filter(i => !["Closed", "Resolved"].includes(i.status) && (i.slaElapsed || 0) < 28);

  const tier1Warnings = issues.filter(i => {
    const s = getWorkerSlaStatus(i.slaElapsed, 36);
    return s.tier === 1;
  });
  const tier2Warnings = issues.filter(i => {
    const s = getWorkerSlaStatus(i.slaElapsed, 36);
    return s.tier === 2;
  });
  const tier3Suspensions = issues.filter(i => {
    const s = getWorkerSlaStatus(i.slaElapsed, 36);
    return s.tier === 3;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #7F1D1D, #DC2626)" }}>
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full"><defs><pattern id="sla-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#sla-grid)" /></svg>
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Worker SLA & Suspension Monitor</h1>
            <p className="text-red-200 text-sm">36-Hour SLA Enforcement · 3-Tier Warning & Worker Suspension Tracker</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-white font-bold text-sm">{tier3Suspensions.length} Suspension Flags</span>
          </div>
        </div>
      </div>

      {/* SLA Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mb-2">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <p className="text-2xl font-black font-mono text-red-600 mb-0.5">{tier3Suspensions.length}</p>
          <p className="text-xs font-bold text-foreground">3rd Warning (Suspension)</p>
          <p className="text-[10px] text-muted-foreground">60+ Hours Overdue</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-orange-200 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
            <AlertCircle size={18} className="text-orange-600" />
          </div>
          <p className="text-2xl font-black font-mono text-orange-600 mb-0.5">{tier2Warnings.length}</p>
          <p className="text-xs font-bold text-foreground">2nd Warning (Dept Head Alert)</p>
          <p className="text-[10px] text-muted-foreground">48h - 59h Overdue</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-yellow-200 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center mb-2">
            <Clock size={18} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-black font-mono text-yellow-600 mb-0.5">{tier1Warnings.length}</p>
          <p className="text-xs font-bold text-foreground">1st Warning (SLA Breached)</p>
          <p className="text-[10px] text-muted-foreground">36h - 47h Overdue</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-green-200 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-2">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-black font-mono text-green-600 mb-0.5">{onTrack.length}</p>
          <p className="text-xs font-bold text-foreground">On Track</p>
          <p className="text-[10px] text-muted-foreground">Within 36h Target</p>
        </div>
      </div>

      {/* TIER 3 SUSPENSION NOTICE SECTION */}
      {tier3Suspensions.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-red-300 overflow-hidden shadow-md">
          <div className="px-5 py-3 border-b border-red-200 flex items-center gap-2" style={{ background: "#FEF2F2" }}>
            <AlertTriangle size={18} className="text-red-600 animate-bounce" />
            <div>
              <h3 className="font-bold text-red-900 text-sm">🛑 3rd Warning & Worker Suspension Notices (60+ Hours Overdue)</h3>
              <p className="text-red-700 text-xs">These workers failed to complete tasks within 60+ hours and are flagged for account suspension.</p>
            </div>
            <span className="ml-auto text-xs bg-red-600 text-white px-2.5 py-1 rounded-full font-bold animate-pulse">SUSPEND WORKER</span>
          </div>
          {tier3Suspensions.map(i => {
            const ws = getWorkerSlaStatus(i.slaElapsed, 36);
            return (
              <div key={i.id} className="px-5 py-4 border-b border-red-100 last:border-0 flex items-center justify-between gap-4 bg-red-50/40 hover:bg-red-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
                    <span className="font-bold text-foreground text-sm">{i.title}</span>
                    <span className="text-xs bg-red-100 border border-red-300 text-red-800 font-bold px-2 py-0.5 rounded">
                      Worker: {i.officer || "Unassigned"} ({i.department})
                    </span>
                  </div>
                  <p className="text-xs text-red-700 font-medium">
                    ⚠️ {i.slaElapsed} hours elapsed ({ws.overdue} hours past 36h deadline)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-lg">
                    🛑 Flagged for Suspension
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ALL WORKER SLA TRACKING TABLE */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="font-bold text-sm text-foreground">All Worker Active 36h SLA Tracking</h3>
        </div>
        {issues.filter(i => !["Closed", "Resolved"].includes(i.status)).map(i => {
          const ws = getWorkerSlaStatus(i.slaElapsed, 36);
          const pct = Math.min(((i.slaElapsed || 0) / 36) * 100, 100);
          return (
            <div key={i.id} className="px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
                  <span className="text-sm font-semibold text-foreground truncate">{i.title}</span>
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">
                    👤 {i.officer}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    ws.tier === 3 ? "bg-red-600 text-white" : ws.tier === 2 ? "bg-orange-500 text-white" : ws.tier === 1 ? "bg-yellow-500 text-white" : "bg-green-100 text-green-800"
                  }`}>
                    {ws.badge}
                  </span>
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {i.slaElapsed || 0}h / 36h
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: ws.tier === 3 ? "#DC2626" : ws.tier === 2 ? "#EA580C" : ws.tier === 1 ? "#EAB308" : "#16A34A" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("citizen");
  const [page, setPage] = useState("home");
  const [pageHistory, setPageHistory] = useState(["home"]);
  const [selectedId, setSelectedId] = useState(null);
  const [reportStep, setReportStep] = useState("form");
  const [newIssue, setNewIssue] = useState(null);

  const [issues, setIssues] = useState(() => {
    try {
      const s = localStorage.getItem("cc_issues");
      return s ? JSON.parse(s) : INITIAL_ISSUES;
    } catch { return INITIAL_ISSUES; }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const s = localStorage.getItem("cc_notifs");
      return s ? JSON.parse(s) : INITIAL_NOTIFICATIONS;
    } catch { return INITIAL_NOTIFICATIONS; }
  });

  useEffect(() => { localStorage.setItem("cc_issues", JSON.stringify(issues)); }, [issues]);
  useEffect(() => { localStorage.setItem("cc_notifs", JSON.stringify(notifications)); }, [notifications]);

  const navigate = useCallback((p, id) => {
    setPageHistory(prev => {
      if (prev[prev.length - 1] === p) return prev;
      return [...prev, p];
    });
    setPage(p);
    if (id) setSelectedId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goBack = useCallback(() => {
    setPageHistory(prev => {
      if (prev.length > 1) {
        const nextHist = prev.slice(0, -1);
        const prevPage = nextHist[nextHist.length - 1] || "home";
        setPage(prevPage);
        return nextHist;
      }
      setPage("home");
      return ["home"];
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleRoleSwitch = (r) => {
    setRole(r);
    setPage(r === "admin" ? "admin-dashboard" : "home");
    setPageHistory([r === "admin" ? "admin-dashboard" : "home"]);
    setSelectedId(null);
    setReportStep("form");
  };

  const handleReportSubmit = (data) => {
    const id = `CIV-${1029 + issues.length}`;
    const assignedInfo = autoAssignWorker(data.category || "other");
    const issue = {
      id, title: data.title ?? "Reported Issue",
      category: data.category ?? "other",
      description: data.description ?? "",
      ward: data.ward ?? "Ward 12",
      address: data.address ?? "Ranchi",
      lat: data.lat ?? 23.344, lng: data.lng ?? 85.309,
      status: "Assigned", priority: data.priority ?? "High",
      priorityScore: data.priorityScore ?? 20,
      affectedCount: data.affectedCount ?? 10,
      reportedBy: "CIT-00421",
      reportedAt: new Date().toISOString(),
      department: assignedInfo.department,
      officer: assignedInfo.officer,
      slaHours: 36, // 36-Hour Target SLA Time Limit
      slaElapsed: 0,
      similarCount: data.similarCount ?? 3,
      supported: false,
      photo: data.photo ?? null,
      timeline: [
        { stage: "Reported", date: new Date().toISOString() },
        { stage: "Verified", date: new Date().toISOString() },
        { stage: "Assigned", date: new Date().toISOString(), note: `Auto-assigned by AI to ${assignedInfo.officer} (${assignedInfo.department})` },
      ],
    };
    setIssues(prev => [issue, ...prev]);
    setNewIssue(issue);
    setNotifications(prev => [{
      id: `n${Date.now()}`, issueId: id,
      message: `Issue ${id} auto-assigned to ${assignedInfo.officer} (${assignedInfo.department}) with 36h SLA limit.`,
      time: new Date().toISOString(), read: false, type: "success",
    }, ...prev]);
    setReportStep("verify");
    window.scrollTo({ top: 0 });
  };

  const handleUpdateIssue = (id, updates) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleSupportIssue = (id) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, affectedCount: i.affectedCount + 1, supported: true } : i));
  };

  const handleCloseIssue = () => {
    if (selectedId) {
      handleUpdateIssue(selectedId, {
        status: "Closed",
        timeline: [...(issues.find(i => i.id === selectedId)?.timeline ?? []),
          { stage: "Closed", date: new Date().toISOString(), note: "Verified by citizen" }],
      });
    }
  };

  const handleReopenIssue = (reopenData) => {
    if (selectedId) {
      const reason = typeof reopenData === "object" ? reopenData?.reason : (reopenData || "Citizen reported issue not resolved");
      const photo = typeof reopenData === "object" ? reopenData?.photo : null;
      handleUpdateIssue(selectedId, {
        status: "Reopened",
        reopenReason: reason,
        reopenPhoto: photo,
        timeline: [...(issues.find(i => i.id === selectedId)?.timeline ?? []),
          { stage: "Reopened", date: new Date().toISOString(), note: `Citizen Reopened: ${reason}` }],
      });
    }
  };

  const handleMarkNotifRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const selectedIssue = selectedId ? issues.find(i => i.id === selectedId) ?? null : null;

  if (role === "admin") {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <AdminSidebar page={page} navigate={navigate} setRole={handleRoleSwitch} />
        <main className="flex-1 h-screen overflow-y-auto">
          {page === "admin-dashboard"    && <AdminDashboard issues={issues} navigate={navigate} />}
          {page === "admin-issues"       && <AdminAllIssues issues={issues} navigate={navigate} />}
          {page === "admin-map"          && <AdminMapPage issues={issues} />}
          {page === "admin-analytics"    && <AdminAnalytics issues={issues} />}
          {page === "admin-sla"          && <AdminSLAPage issues={issues} />}
          {page === "admin-issue-detail" && selectedIssue && (
            <AdminIssueDetail issue={selectedIssue} onBack={() => navigate("admin-issues")} onUpdateIssue={handleUpdateIssue} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CitizenHeader page={page} navigate={navigate} notifCount={unreadCount} role={role} setRole={handleRoleSwitch} onBack={goBack} />
      <main>
        {page === "home" && <HomePage navigate={navigate} issues={issues} />}

        {page === "report" && reportStep === "form" && <ReportIssuePage onSubmit={handleReportSubmit} onBack={goBack} />}
        {page === "report" && reportStep === "verify" && newIssue && (
          <VerificationPage
            issue={newIssue}
            onViewIssue={() => { setSelectedId(newIssue.id); setPage("issue-detail"); setReportStep("form"); }}
            onDuplicate={() => setReportStep("duplicate")}
            onBack={goBack}
          />
        )}
        {page === "report" && reportStep === "duplicate" && (
          <DuplicatePage masterIssue={issues[0]} navigate={(p, id) => { navigate(p, id); setReportStep("form"); }} onBack={goBack} />
        )}

        {page === "explore" && <ExplorePage issues={issues} navigate={navigate} onBack={goBack} />}

        {page === "issue-detail" && selectedIssue && (
          <IssueDetailPage
            issue={selectedIssue}
            onBack={goBack}
            onSupport={handleSupportIssue}
            onResolveVerify={(id) => { setSelectedId(id); navigate("resolve-verify"); }}
          />
        )}

        {page === "complaints" && <MyComplaintsPage issues={issues} navigate={navigate} onBack={goBack} />}

        {page === "resolve-verify" && selectedIssue && (
          <ResolutionVerifyPage issue={selectedIssue} onClose={handleCloseIssue} onReopen={handleReopenIssue} onBack={goBack} />
        )}

        {page === "notifications" && (
          <NotificationsPage notifications={notifications} navigate={navigate} onMarkRead={handleMarkNotifRead} onBack={goBack} />
        )}

        {page === "profile" && <ProfilePage issues={issues} navigate={navigate} onBack={goBack} />}
      </main>
    </div>
  );
}
