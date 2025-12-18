
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  Droplet, 
  Moon, 
  Baby, 
  ChevronRight, 
  Clock, 
  TrendingUp, 
  Settings, 
  Plus, 
  Trash2, 
  BrainCircuit, 
  Zap, 
  Coffee, 
  Mic, 
  Minus, 
  Check, 
  Edit2,
  CalendarDays,
  X,
  Bell,
  BellOff,
  Camera,
  Upload
} from 'lucide-react';
import { LogEntry, EntryType, AIInsight } from './types';
import QuickLogButton from './components/QuickLogButton';
import { getSmartInsights } from './services/geminiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const getTypeLabel = (type: EntryType): string => {
  const labels: Record<EntryType, string> = {
    breast_left: 'Left Breast',
    breast_right: 'Right Breast',
    bottle: 'Bottle',
    diaper_wet: 'Wet Diaper',
    diaper_dirty: 'Dirty Diaper',
    diaper_both: 'Both Diaper',
    sleep: 'Sleep'
  };
  return labels[type] || type;
};

const App: React.FC = () => {
  // Persistence
  const [entries, setEntries] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('nurture_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [babyPhoto, setBabyPhoto] = useState<string | null>(() => {
    return localStorage.getItem('nurture_baby_photo');
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'insights'>('dashboard');
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{ type: EntryType, startTime: number } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const [manualNextFeedingTime, setManualNextFeedingTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('nurture_next_feed');
    return saved ? parseInt(saved, 10) : null;
  });

  // Modals
  const [isBottlePickerOpen, setIsBottlePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [tempAmount, setTempAmount] = useState(4);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  
  const lastNotifiedRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Time Picker Temp State
  const [pickerTime, setPickerTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 3);
    return d.toTimeString().slice(0, 5);
  });

  // Effect to sync logs
  useEffect(() => {
    localStorage.setItem('nurture_logs', JSON.stringify(entries));
  }, [entries]);

  // Effect to sync next feeding
  useEffect(() => {
    if (manualNextFeedingTime) {
      localStorage.setItem('nurture_next_feed', manualNextFeedingTime.toString());
    } else {
      localStorage.removeItem('nurture_next_feed');
    }
  }, [manualNextFeedingTime]);

  // Effect to sync photo
  useEffect(() => {
    if (babyPhoto) {
      localStorage.setItem('nurture_baby_photo', babyPhoto);
    }
  }, [babyPhoto]);

  // Notification Monitor Logic
  useEffect(() => {
    const checkSchedule = () => {
      if (!manualNextFeedingTime) return;
      
      const now = Date.now();
      // Trigger when scheduled time passes
      if (now >= manualNextFeedingTime && lastNotifiedRef.current !== manualNextFeedingTime) {
        triggerFeedingAlert();
        lastNotifiedRef.current = manualNextFeedingTime;
      }
    };

    const interval = setInterval(checkSchedule, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [manualNextFeedingTime, notificationPermission]);

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        new Notification("Soleice's Tracker", {
          body: "Alerts are now enabled for feedings.",
          icon: babyPhoto || "https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?auto=format&fit=crop&q=80&w=200&h=200"
        });
      }
    }
  };

  const triggerFeedingAlert = () => {
    setIsAlertVisible(true);
    if (notificationPermission === 'granted') {
      try {
        new Notification("Time to Feed Soleice!", {
          body: "The scheduled feeding session is due now.",
          icon: babyPhoto || "https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?auto=format&fit=crop&q=80&w=200&h=200",
          tag: 'feeding-reminder'
        });
      } catch (e) {
        console.error("Native notification failed:", e);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBabyPhoto(reader.result as string);
        setIsPhotoPickerOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addEntry = useCallback((type: EntryType, amount?: number, duration?: number) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      amount,
      duration
    };
    setEntries(prev => [newEntry, ...prev]);
    
    // Auto-schedule next feed if it's a feeding entry
    if (type.includes('breast') || type === 'bottle') {
      setManualNextFeedingTime(null);
      setIsAlertVisible(false);
      lastNotifiedRef.current = null;
      
      // Default to 3 hours later
      const autoNext = Date.now() + (3 * 60 * 60 * 1000);
      setManualNextFeedingTime(autoNext);
    }
  }, []);

  const updateEntryAmount = (id: string, newAmount: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, amount: newAmount } : e));
    setEditingId(null);
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const toggleTimer = (type: EntryType) => {
    if (activeTimer && activeTimer.type === type) {
      const duration = Math.round((Date.now() - activeTimer.startTime) / 60000);
      addEntry(type, undefined, duration);
      setActiveTimer(null);
    } else {
      setActiveTimer({ type, startTime: Date.now() });
    }
  };

  const adjustNextFeed = (minutes: number) => {
    const base = manualNextFeedingTime || Date.now() + (3 * 60 * 60 * 1000);
    const newTime = base + (minutes * 60 * 1000);
    setManualNextFeedingTime(newTime);
    setIsAlertVisible(false);
  };

  const saveManualTime = () => {
    const [hours, minutes] = pickerTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    // If time selected is in the past, assume it's for tomorrow
    if (date.getTime() < Date.now() - (1000 * 60 * 30)) {
       date.setDate(date.getDate() + 1);
    }
    setManualNextFeedingTime(date.getTime());
    setIsTimePickerOpen(false);
    setIsAlertVisible(false);
  };

  const fetchInsights = async () => {
    if (entries.length < 3) return;
    setIsLoadingInsights(true);
    const result = await getSmartInsights(entries, "Soleice");
    setInsights(result);
    setIsLoadingInsights(false);
  };

  const getNextFeedingTime = () => {
    if (manualNextFeedingTime) {
      return new Date(manualNextFeedingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const lastFeed = entries.find(e => e.type.includes('breast') || e.type === 'bottle');
    if (!lastFeed) return "--:--";
    const nextTime = new Date(lastFeed.timestamp + (3 * 60 * 60 * 1000));
    return nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChartData = () => {
    const dailyData: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dailyData[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
    }
    entries.forEach(e => {
      const day = new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyData[day] !== undefined && (e.type.includes('breast') || e.type === 'bottle')) {
        dailyData[day] += 1;
      }
    });
    return Object.entries(dailyData).reverse().map(([name, feeds]) => ({ name, feeds }));
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 text-slate-800 shadow-xl overflow-hidden relative">
      
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000">
        {babyPhoto ? (
          <img src={babyPhoto} className="w-full h-full object-cover blur-[80px] scale-125 opacity-40" alt="" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-50 via-rose-50 to-amber-50 opacity-60" />
        )}
      </div>

      {/* Feed Alert Modal Overlay */}
      {isAlertVisible && (
        <div className="absolute inset-x-0 top-0 z-[100] bg-rose-600 text-white p-8 pt-16 text-center shadow-2xl animate-in slide-in-from-top duration-500 ring-8 ring-rose-200/30">
           <div className="flex flex-col items-center gap-4">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-rose-600 shadow-2xl animate-bounce">
                <Coffee size={48} />
             </div>
             <div>
               <h2 className="text-3xl font-black uppercase tracking-tight">Time to Feed!</h2>
               <p className="text-sm font-bold opacity-80 mt-1">Soleice's feeding schedule reached its mark.</p>
             </div>
             <button 
               onClick={() => setIsAlertVisible(false)}
               className="mt-6 px-12 py-4 bg-white text-rose-600 rounded-full font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
             >
               Start Log
             </button>
           </div>
        </div>
      )}

      {/* Header Section */}
      <header className="px-6 pt-12 pb-4 bg-white/40 backdrop-blur-2xl sticky top-0 z-10 border-b border-white/20">
        <div className="flex justify-between items-end">
          <div className="z-20">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Soleice</h1>
              <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm ${manualNextFeedingTime ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                <Clock size={10} className={manualNextFeedingTime ? 'text-amber-600' : 'text-emerald-600'} />
                <span className={`text-[10px] font-black uppercase tracking-tighter ${manualNextFeedingTime ? 'text-amber-700' : 'text-emerald-700'}`}>
                  Next: {getNextFeedingTime()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500 font-bold">
                {entries.length > 0 ? `Last: ${getTypeLabel(entries[0].type).toLowerCase()}` : 'Welcome, Parent!'}
              </p>
              {notificationPermission !== 'granted' ? (
                <button onClick={requestNotificationPermission} className="text-rose-500 bg-rose-100/50 px-2 py-0.5 rounded-full flex items-center gap-1 active:scale-90 transition-transform">
                   <BellOff size={10} strokeWidth={3} />
                   <span className="text-[10px] font-black uppercase tracking-tighter">Enable Alarm</span>
                </button>
              ) : (
                <div className="text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                   <Bell size={10} strokeWidth={3} />
                   <span className="text-[10px] font-black uppercase tracking-tighter">Armed</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 z-20">
            <button onClick={fetchInsights} className="p-3 bg-indigo-600 text-white rounded-2xl active:scale-90 transition-transform shadow-xl shadow-indigo-100">
              <BrainCircuit size={24} />
            </button>
            <button 
              onClick={() => setIsPhotoPickerOpen(true)}
              className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden border-2 border-white shadow-xl active:scale-90 transition-transform group relative"
            >
               {babyPhoto ? (
                 <img src={babyPhoto} alt="Baby Profile" className="object-cover w-full h-full" />
               ) : (
                 <div className="bg-slate-50 w-full h-full flex items-center justify-center text-slate-300">
                    <Camera size={20} />
                 </div>
               )}
               <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Edit2 size={16} className="text-white" />
               </div>
            </button>
          </div>
        </div>
      </header>

      {/* Primary Dashboard View */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 pb-32 z-10 relative">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* AI Insights Card */}
            {insights && (
              <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200/50 animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={18} className="text-yellow-300 fill-yellow-300" />
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Parenting Insight</span>
                </div>
                <p className="text-sm font-bold leading-relaxed">{insights.summary}</p>
                <div className="mt-5 pt-5 border-t border-indigo-500/50 flex justify-between items-center text-xs">
                  <span className="font-black">PREDICTED FEED: {insights.prediction}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            )}

            {/* Feeding Scheduler Card */}
            <section className="bg-white/80 backdrop-blur-md p-6 rounded-[3rem] border border-white shadow-xl shadow-slate-200/20 relative">
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => setIsTimePickerOpen(true)}
                  className="flex items-center gap-4 text-left active:scale-95 transition-transform"
                >
                  <div className={`p-4 rounded-[1.5rem] shadow-sm ${manualNextFeedingTime ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    <CalendarDays size={28} />
                  </div>
                  <div>
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Upcoming Feed</h2>
                    <p className="text-3xl font-black text-slate-800 flex items-center gap-2">
                      {getNextFeedingTime()}
                      <Edit2 size={18} className="text-slate-200" />
                    </p>
                  </div>
                </button>
                {manualNextFeedingTime && (
                  <button onClick={() => { setManualNextFeedingTime(null); setIsAlertVisible(false); }} className="text-[10px] font-black text-slate-400 bg-white/50 px-4 py-2 rounded-full uppercase tracking-widest shadow-sm hover:text-slate-600 active:scale-90 transition-all">
                    Reset
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {[ -60, -15, 15, 60 ].map(mins => (
                  <button 
                    key={mins}
                    onClick={() => adjustNextFeed(mins)} 
                    className="py-4 bg-white border border-slate-50 rounded-2xl flex flex-col items-center active:scale-90 transition-transform shadow-md hover:shadow-lg"
                  >
                     <span className="text-xs font-black text-slate-700">
                       {mins > 0 ? `+${mins >= 60 ? '1h' : mins + 'm'}` : `${mins <= -60 ? '-1h' : mins + 'm'}`}
                     </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Logging Quick Actions */}
            <section className="space-y-4">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                <Coffee size={14} strokeWidth={3} /> Quick Logger
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <QuickLogButton 
                  type="breast_left" 
                  label="Left Breast" 
                  color="bg-rose-500" 
                  icon={<Droplet size={36} />} 
                  onClick={() => toggleTimer('breast_left')} 
                  active={activeTimer?.type === 'breast_left'}
                />
                <QuickLogButton 
                  type="breast_right" 
                  label="Right Breast" 
                  color="bg-rose-500" 
                  icon={<Droplet size={36} />} 
                  onClick={() => toggleTimer('breast_right')} 
                  active={activeTimer?.type === 'breast_right'}
                />
                <QuickLogButton 
                  type="bottle" 
                  label="Bottle Feed" 
                  color="bg-orange-500" 
                  icon={<Plus size={36} />} 
                  onClick={() => setIsBottlePickerOpen(true)} 
                />
                <QuickLogButton 
                  type="sleep" 
                  label="Napping" 
                  color="bg-slate-800" 
                  icon={<Moon size={36} />} 
                  onClick={() => toggleTimer('sleep')} 
                  active={activeTimer?.type === 'sleep'}
                />
              </div>
            </section>

            {/* Diaper Tracking Shortcuts */}
            <section className="flex gap-4">
              {['WET', 'DIRTY', 'BOTH'].map(type => (
                <button 
                  key={type}
                  onClick={() => addEntry(`diaper_${type.toLowerCase()}` as EntryType)}
                  className={`flex-1 py-6 rounded-[2.5rem] flex flex-col items-center gap-1 active:scale-90 transition-transform shadow-lg border-2 border-white ${
                    type === 'WET' ? 'bg-sky-100 text-sky-700' : type === 'DIRTY' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <span className="font-black text-sm uppercase">{type}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Diaper</span>
                </button>
              ))}
            </section>
          </div>
        )}

        {/* List Views for Logs */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-900 mb-2 px-2">Daily History</h2>
            {entries.length === 0 ? (
              <div className="text-center py-24 bg-white/50 backdrop-blur-md rounded-[3rem] border-4 border-dashed border-slate-200">
                <Baby size={64} className="mx-auto text-slate-200 mb-6" />
                <p className="text-slate-400 font-bold tracking-tight">Your baby's day starts here!</p>
              </div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/10 flex items-center justify-between group animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-5">
                     <div className="text-[10px] font-black text-slate-500 w-14 text-center bg-slate-50 p-3 rounded-2xl shadow-inner tabular-nums">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </div>
                     <div>
                        <p className="font-black text-slate-900 text-base">{getTypeLabel(entry.type)}</p>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">{new Date(entry.timestamp).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {entry.type === 'bottle' ? (
                      <div className="flex items-center gap-1">
                        {editingId === entry.id ? (
                          <div className="flex items-center bg-slate-100 rounded-2xl p-2 shadow-inner">
                            <input 
                              type="number" 
                              className="w-12 bg-transparent text-sm font-black text-center outline-none"
                              value={tempAmount}
                              onChange={(e) => setTempAmount(Number(e.target.value))}
                              autoFocus
                            />
                            <button onClick={() => updateEntryAmount(entry.id, tempAmount)} className="text-emerald-500 hover:scale-125 transition-transform p-1">
                              <Check size={20} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingId(entry.id); setTempAmount(entry.amount || 0); }} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm active:scale-90 transition-all">
                            <span className="text-sm font-black text-slate-800 tabular-nums">{entry.amount}oz</span>
                            <Edit2 size={14} className="text-slate-300" />
                          </button>
                        )}
                      </div>
                    ) : (
                       entry.duration && <span className="text-xs font-black text-slate-600 bg-slate-50 px-3 py-2 rounded-xl shadow-sm">{entry.duration}m duration</span>
                    )}
                    <button onClick={() => deleteEntry(entry.id)} className="text-slate-200 hover:text-rose-500 active:scale-75 transition-all p-2">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Insight & Trends View */}
        {activeTab === 'insights' && (
           <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 mb-2 px-2">Growth Analysis</h2>
            <div className="h-72 bg-white/90 backdrop-blur-md p-6 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()}>
                  <defs>
                    <linearGradient id="colorFeeds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="feeds" stroke="#4f46e5" strokeWidth={5} fillOpacity={1} fill="url(#colorFeeds)" />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-6">Feeding Session Distribution</p>
            </div>
            <div className="bg-amber-100/40 backdrop-blur-md p-8 rounded-[3rem] border-2 border-amber-200/30">
               <h4 className="font-black text-amber-900 text-base mb-3">AI Pattern Matching</h4>
               <p className="text-sm text-amber-800 font-bold leading-relaxed opacity-90">
                 We've noticed Soleice responds well to 3-hour clusters. Maintaining this rhythm helps stabilize sleep cycles!
               </p>
            </div>
          </div>
        )}
      </main>

      {/* PHOTO CAPTURE MODAL */}
      {isPhotoPickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-xs rounded-[4rem] p-10 shadow-3xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-slate-900 text-xl font-black tracking-tight">Baby Profile</h3>
                <button onClick={() => setIsPhotoPickerOpen(false)} className="text-slate-300 hover:text-slate-900 active:scale-75 transition-all"><X size={32} /></button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex flex-col items-center justify-center aspect-square bg-indigo-50 border-2 border-indigo-100 rounded-[2.5rem] text-indigo-600 active:scale-90 transition-all shadow-lg shadow-indigo-100/50"
                 >
                   <Upload size={36} strokeWidth={3} />
                   <span className="text-[11px] font-black uppercase mt-3">Upload</span>
                 </button>
                 <button 
                   onClick={() => {
                     if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'user');
                        fileInputRef.current.click();
                     }
                   }}
                   className="flex flex-col items-center justify-center aspect-square bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] text-rose-600 active:scale-90 transition-all shadow-lg shadow-rose-100/50"
                 >
                   <Camera size={36} strokeWidth={3} />
                   <span className="text-[11px] font-black uppercase mt-3">Camera</span>
                 </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
              />
           </div>
        </div>
      )}

      {/* ALARM TIME PICKER MODAL */}
      {isTimePickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-[4rem] p-12 shadow-3xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Set Reminder</h3>
              <button onClick={() => setIsTimePickerOpen(false)} className="text-slate-300 hover:text-slate-900 active:scale-75 transition-all">
                <X size={32} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-10">
               <input 
                 type="time" 
                 value={pickerTime}
                 onChange={(e) => setPickerTime(e.target.value)}
                 className="text-6xl font-black text-slate-900 bg-slate-50 p-8 rounded-[3rem] border-none outline-none focus:ring-8 focus:ring-indigo-100 w-full text-center tabular-nums shadow-inner"
               />
               <button 
                 onClick={saveManualTime}
                 className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest"
               >
                 Set Alarm
               </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTLE VOLUME PICKER MODAL */}
      {isBottlePickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/50 backdrop-blur-lg animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-[4rem] p-12 shadow-3xl animate-in zoom-in-95">
            <h3 className="text-center text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-12">Session Volume</h3>
            <div className="flex flex-col items-center gap-12">
              <div className="flex items-center gap-10">
                <button onClick={() => setTempAmount(Math.max(1, tempAmount - 0.5))} className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 active:scale-75 transition-all shadow-md"><Minus size={40} strokeWidth={3} /></button>
                <div className="flex flex-col items-center">
                  <span className="text-7xl font-black text-slate-900 tabular-nums">{tempAmount}</span>
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Ounces</span>
                </div>
                <button onClick={() => setTempAmount(Math.min(12, tempAmount + 0.5))} className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 active:scale-75 transition-all shadow-md"><Plus size={40} strokeWidth={3} /></button>
              </div>
              <button onClick={() => { addEntry('bottle', tempAmount); setIsBottlePickerOpen(false); }} className="w-full py-7 bg-orange-500 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-orange-200 active:scale-95 transition-all uppercase tracking-widest">Confirm Log</button>
            </div>
          </div>
        </div>
      )}

      {/* App Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-3xl border-t border-white/20 px-8 pt-4 pb-12 flex justify-between items-center z-20 max-w-md mx-auto">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <Activity size={28} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Home</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <Clock size={28} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Feed</span>
        </button>
        
        {/* Floating Voice/Action Center */}
        <div className="relative -mt-20">
          <button className="w-22 h-22 bg-indigo-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center text-white active:scale-90 transition-all ring-8 ring-white/50 backdrop-blur-md">
            <Mic size={36} strokeWidth={3} />
          </button>
        </div>
        
        <button onClick={() => setActiveTab('insights')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'insights' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <TrendingUp size={28} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Data</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-300 active:text-slate-900 transition-colors">
          <Settings size={28} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">More</span>
        </button>
      </nav>

      {/* Active Session Timer Component */}
      {activeTimer && (
        <div className="fixed bottom-32 left-6 right-6 bg-slate-900/90 backdrop-blur-2xl p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-12 max-w-sm mx-auto z-30 ring-4 ring-indigo-500/50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-500 rounded-3xl flex items-center justify-center animate-pulse shadow-xl shadow-indigo-500/30">
              <Clock size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Active Session</p>
              <p className="font-black text-base">{getTypeLabel(activeTimer.type)}</p>
            </div>
          </div>
          <button onClick={() => toggleTimer(activeTimer.type)} className="px-10 py-4 bg-rose-500 text-white rounded-[1.5rem] font-black text-xs active:scale-90 transition-all shadow-xl shadow-rose-500/20 uppercase tracking-widest">Done</button>
        </div>
      )}
    </div>
  );
};

export default App;
