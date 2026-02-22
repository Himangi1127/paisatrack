/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  Utensils, 
  Bus, 
  Music, 
  BookOpen, 
  ArrowUpRight,
  ArrowDownRight,
  History,
  Settings,
  LayoutDashboard,
  PieChart as PieChartIcon,
  Bell,
  QrCode,
  Smartphone,
  Users,
  Copy,
  Check,
  Coffee,
  Wifi,
  Home,
  FileText,
  AlertTriangle,
  Scan
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  differenceInDays,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILITIES ---

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats numbers into the Indian numbering system (Lakhs/Crores)
 */
const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

// --- DOMAIN MODELS (Object-Oriented Approach) ---

type Category = 'Mess/Food' | 'Metro/Auto' | 'Mobile/WiFi' | 'PG/Rent' | 'Photocopy/Stationery' | 'Social' | 'Misc';
type PaymentMethod = 'UPI' | 'Cash' | 'Card';

class Transaction {
  id: string;
  amount: number;
  category: Category;
  method: PaymentMethod;
  date: Date;
  note: string;

  constructor(amount: number, category: Category, method: PaymentMethod, note: string = '', date: Date = new Date()) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.amount = amount;
    this.category = category;
    this.method = method;
    this.date = date;
    this.note = note;
  }

  toJSON() {
    return {
      id: this.id,
      amount: this.amount,
      category: this.category,
      method: this.method,
      date: this.date.toISOString(),
      note: this.note
    };
  }

  static fromJSON(json: any): Transaction {
    const t = new Transaction(json.amount, json.category, json.method, json.note, new Date(json.date));
    t.id = json.id;
    return t;
  }
}

class Budget {
  monthlyLimit: number;
  weeklyAllowance: number;

  constructor(monthlyLimit: number = 25000, weeklyAllowance: number = 4000) {
    this.monthlyLimit = monthlyLimit;
    this.weeklyAllowance = weeklyAllowance;
  }

  getDailyLimit(weeklySpent: number, daysLeft: number): number {
    const remaining = Math.max(0, this.weeklyAllowance - weeklySpent);
    return remaining / Math.max(1, daysLeft);
  }
}

// --- COMPONENTS ---

export default function App() {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState(new Budget());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'split' | 'settings'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('Mess/Food');
  const [newMethod, setNewMethod] = useState<PaymentMethod>('UPI');
  const [newNote, setNewNote] = useState('');

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem('paisatrack_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setTransactions(parsed.transactions.map((t: any) => Transaction.fromJSON(t)));
      setBudget(new Budget(parsed.budget.monthlyLimit, parsed.budget.weeklyAllowance));
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('paisatrack_data', JSON.stringify({
      transactions: transactions.map(t => t.toJSON()),
      budget: {
        monthlyLimit: budget.monthlyLimit,
        weeklyAllowance: budget.weeklyAllowance
      }
    }));
  }, [transactions, budget]);

  // Calculations
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const daysLeftInWeek = differenceInDays(weekEnd, today) + 1;

  const weeklyTransactions = useMemo(() => 
    transactions.filter(t => t.date >= weekStart && t.date <= weekEnd),
  [transactions, weekStart, weekEnd]);

  const weeklySpent = useMemo(() => 
    weeklyTransactions.reduce((acc, t) => acc + t.amount, 0),
  [weeklyTransactions]);

  const dailyLimit = budget.getDailyLimit(weeklySpent, daysLeftInWeek);

  const todaySpent = useMemo(() => 
    transactions.filter(t => isSameDay(t.date, today)).reduce((acc, t) => acc + t.amount, 0),
  [transactions, today]);

  const dailyRemaining = dailyLimit - todaySpent;

  // Chai-Index Logic
  const miscSpent = useMemo(() => 
    weeklyTransactions.filter(t => t.category === 'Misc').reduce((acc, t) => acc + t.amount, 0),
  [weeklyTransactions]);
  const chaiIndexExceeded = miscSpent > (budget.weeklyAllowance * 0.15);

  // Chart Data: Donut
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    weeklyTransactions.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [weeklyTransactions]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  // Handlers
  const handleAddTransaction = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newAmount || isNaN(parseFloat(newAmount))) return;

    const t = new Transaction(parseFloat(newAmount), newCategory, newMethod, newNote);
    setTransactions([t, ...transactions]);
    setNewAmount('');
    setNewNote('');
    setIsAddModalOpen(false);
  };

  const simulateSMS = () => {
    const amount = Math.floor(Math.random() * 200) + 20;
    setNewAmount(amount.toString());
    setNewNote('Simulated from SMS');
    setNewCategory('Mess/Food');
    setIsAddModalOpen(true);
  };

  const copyUPI = () => {
    navigator.clipboard.writeText('student@okaxis');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (cat: Category) => {
    switch (cat) {
      case 'Mess/Food': return <Utensils className="w-4 h-4" />;
      case 'Metro/Auto': return <Bus className="w-4 h-4" />;
      case 'Mobile/WiFi': return <Wifi className="w-4 h-4" />;
      case 'PG/Rent': return <Home className="w-4 h-4" />;
      case 'Photocopy/Stationery': return <FileText className="w-4 h-4" />;
      case 'Social': return <Music className="w-4 h-4" />;
      case 'Misc': return <Coffee className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0C10]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Smartphone className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PaisaTrack</h1>
            <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Smart Student Budget</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={simulateSMS} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400" title="Simulate Bank SMS">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10"></div>
        </div>
      </header>

      <main className="pb-28 px-6 pt-6 max-w-lg mx-auto space-y-6">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <>
            {/* Safe to Spend Card */}
            <section className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              <div className="relative bg-[#141820] rounded-3xl p-8 border border-white/5 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <TrendingUp className="w-32 h-32" />
                </div>
                
                <div className="space-y-1 mb-6">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Today's Safe Limit</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className={cn(
                      "text-5xl font-bold tracking-tighter transition-colors",
                      dailyRemaining < 0 ? "text-rose-500" : "text-emerald-400"
                    )}>
                      {formatINR(Math.abs(dailyRemaining))}
                    </h2>
                    {dailyRemaining < 0 && <span className="text-rose-500 text-sm font-bold">OVER</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Weekly Left</p>
                    <p className="text-zinc-200 font-mono font-medium">{formatINR(budget.weeklyAllowance - weeklySpent)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Days to Sunday</p>
                    <p className="text-zinc-200 font-mono font-medium">{daysLeftInWeek} Days</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Chai-Index Warning */}
            {chaiIndexExceeded && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Chai-Index Alert</p>
                  <p className="text-sm text-zinc-300">Your Misc/Chai spending has crossed 15% of your weekly budget. Control those cravings!</p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsScanModalOpen(true)}
                className="bg-[#141820] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Scan className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold uppercase text-zinc-500">Scan</p>
                  <p className="text-sm font-bold">UPI Pay</p>
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('split')}
                className="bg-[#141820] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold uppercase text-zinc-500">Split</p>
                  <p className="text-sm font-bold">Roommates</p>
                </div>
              </button>
            </div>

            {/* Recent Transactions */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-widest">Recent Spends</h3>
                <button className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest hover:underline">History</button>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-[#141820] rounded-2xl border border-white/5 group hover:border-emerald-500/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-emerald-400 transition-colors">
                        {getCategoryIcon(t.category)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.category}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">{format(t.date, 'MMM d')} • {t.method}</p>
                      </div>
                    </div>
                    <p className="text-sm font-mono font-bold text-rose-400">-{formatINR(t.amount)}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Analytics View */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-[#141820] rounded-3xl p-6 border border-white/5">
              <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-widest mb-6">Where did my ₹ go?</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141820', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{item.name}</span>
                    <span className="text-[10px] text-zinc-500 ml-auto">{formatINR(item.value)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#141820] rounded-3xl p-6 border border-white/5">
              <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-widest mb-6">Monthly Outlook</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Total Monthly Spend</p>
                    <p className="text-2xl font-bold">{formatINR(transactions.filter(t => t.date >= startOfMonth(today)).reduce((acc, t) => acc + t.amount, 0))}</p>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold">Limit: {formatINR(budget.monthlyLimit)}</p>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${Math.min(100, (transactions.filter(t => t.date >= startOfMonth(today)).reduce((acc, t) => acc + t.amount, 0) / budget.monthlyLimit) * 100)}%` }}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Split View */}
        {activeTab === 'split' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="bg-[#141820] rounded-3xl p-8 border border-white/5 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bill Splitter</h2>
                <p className="text-sm text-zinc-500 mt-1">Split mess bills or movie tickets instantly.</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Your UPI ID</span>
                  <button 
                    onClick={copyUPI}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest hover:bg-emerald-400/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-lg font-mono font-bold text-zinc-200">student@okaxis</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input type="number" placeholder="Total Amount" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50" />
                  <input type="number" placeholder="People" className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50" />
                </div>
                <button className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                  Calculate Split
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-28 right-6 w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-transform z-50"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0C10]/80 backdrop-blur-2xl border-t border-white/5 px-8 py-4 flex items-center justify-between z-40">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn("p-2 rounded-xl transition-all", activeTab === 'dashboard' ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-500 hover:text-zinc-300")}
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={cn("p-2 rounded-xl transition-all", activeTab === 'analytics' ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-500 hover:text-zinc-300")}
        >
          <PieChartIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveTab('split')}
          className={cn("p-2 rounded-xl transition-all", activeTab === 'split' ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-500 hover:text-zinc-300")}
        >
          <Users className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn("p-2 rounded-xl transition-all", activeTab === 'settings' ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-500 hover:text-zinc-300")}
        >
          <Settings className="w-6 h-6" />
        </button>
      </nav>

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#141820] rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl border border-white/10 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden"></div>
            <h2 className="text-2xl font-bold mb-6">Add Expense</h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-2xl font-bold">₹</span>
                  <input 
                    autoFocus
                    type="number" 
                    step="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-3xl font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mess/Food', 'Metro/Auto', 'Mobile/WiFi', 'PG/Rent', 'Photocopy/Stationery', 'Social', 'Misc'] as Category[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                        newCategory === cat 
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                          : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
                      )}
                    >
                      {getCategoryIcon(cat)}
                      <span className="text-[10px] font-bold uppercase truncate">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Method</label>
                  <select 
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold focus:outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div className="flex-[2] space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Note</label>
                  <input 
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="What was this for?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-medium focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scan Simulation Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsScanModalOpen(false)}></div>
          <div className="relative w-full max-w-sm aspect-[9/16] bg-zinc-900 rounded-[40px] border-4 border-zinc-800 overflow-hidden flex flex-col items-center justify-center p-8 text-center space-y-8">
            <div className="absolute top-8 w-16 h-1.5 bg-zinc-800 rounded-full"></div>
            
            <div className="w-full aspect-square border-2 border-emerald-500/50 rounded-3xl relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent animate-scan"></div>
              <QrCode className="w-32 h-32 text-emerald-500/20" />
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-emerald-500"></div>
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-emerald-500"></div>
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-emerald-500"></div>
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-emerald-500"></div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Scanning UPI QR</h3>
              <p className="text-sm text-zinc-500">Point your camera at any merchant QR code to pay instantly.</p>
            </div>

            <button 
              onClick={() => {
                setIsScanModalOpen(false);
                simulateSMS();
              }}
              className="bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              Simulate Scan
            </button>

            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest absolute bottom-12">Powered by PaisaTrack Secure</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
