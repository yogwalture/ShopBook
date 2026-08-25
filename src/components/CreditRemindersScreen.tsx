import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Bell, 
  Search, 
  Filter, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Coins, 
  User, 
  Send, 
  ExternalLink,
  ChevronRight,
  X,
  Share2,
  BookmarkPlus,
  RefreshCw,
  QrCode,
  ArrowUpRight
} from 'lucide-react';
import { Customer, Firm, Page, Transaction, getLocalDateString } from '../App';

export type FollowUpRecord = {
  id: string;
  customerId: string;
  firmId: string;
  followUpDate: string;
  promiseAmount?: number;
  notes: string;
  remindedToday?: boolean;
  lastRemindedDate?: string;
  createdAt: string;
};

interface CreditRemindersScreenProps {
  onBack: () => void;
  onNavigate: (page: Page) => void;
  customers: Customer[];
  transactions: Transaction[];
  currentFirmId: string;
  activeFirm?: Firm;
  currentUser: any;
  onSelectCustomer: (id: string | null) => void;
  workingDate?: string;
}

export function CreditRemindersScreen({
  onBack,
  onNavigate,
  customers,
  transactions,
  currentFirmId,
  activeFirm,
  currentUser,
  onSelectCustomer,
  workingDate = getLocalDateString()
}: CreditRemindersScreenProps) {
  const [filterType, setFilterType] = useState<'all' | 'dueToday' | 'overdue7' | 'overdue30' | 'highBalance' | 'reminded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerForFollowup, setSelectedCustomerForFollowup] = useState<Customer | null>(null);
  
  // Followup modal state
  const [followUpDateInput, setFollowUpDateInput] = useState(workingDate);
  const [promiseAmountInput, setPromiseAmountInput] = useState('');
  const [followUpNotesInput, setFollowUpNotesInput] = useState('');
  
  // Local storage persisted follow-ups and reminded today tracker
  const [followUps, setFollowUps] = useState<Record<string, FollowUpRecord>>(() => {
    try {
      const saved = localStorage.getItem(`shopbooks_followups_${currentFirmId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [remindedPatients, setRemindedPatients] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`shopbooks_reminded_today_${currentFirmId}_${workingDate}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveFollowUps = (updated: Record<string, FollowUpRecord>) => {
    setFollowUps(updated);
    localStorage.setItem(`shopbooks_followups_${currentFirmId}`, JSON.stringify(updated));
  };

  const markAsReminded = (customerId: string) => {
    const updated = { ...remindedPatients, [customerId]: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) };
    setRemindedPatients(updated);
    localStorage.setItem(`shopbooks_reminded_today_${currentFirmId}_${workingDate}`, JSON.stringify(updated));
  };

  // Compute customers with credit dues
  const creditCustomers = useMemo(() => {
    return customers.filter(c => c.firmId === currentFirmId && (c.pendingBalance || 0) > 0);
  }, [customers, currentFirmId]);

  // Compute stats and days aging for each customer
  const customerStats = useMemo(() => {
    const today = new Date(workingDate);
    const map = new Map<string, { daysSinceLastPayment: number; oldestUnpaidBillDate?: string; creditSalesTotal: number }>();

    creditCustomers.forEach(cust => {
      let days = 0;
      if (cust.lastPaymentDate) {
        const lastDate = new Date(cust.lastPaymentDate);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        days = 15; // default if no last payment
      }

      const custTxs = transactions.filter(t => t.firmId === currentFirmId && (t.patientName === cust.name || t.customerPhone === cust.phone));
      const creditTxs = custTxs.filter(t => t.type === 'credit_sale');
      const creditSalesTotal = creditTxs.reduce((sum, t) => sum + t.amount, 0);
      const oldestBill = creditTxs.length > 0 ? creditTxs[0].date : undefined;

      map.set(cust.id, {
        daysSinceLastPayment: isNaN(days) ? 0 : days,
        oldestUnpaidBillDate: oldestBill,
        creditSalesTotal
      });
    });

    return map;
  }, [creditCustomers, transactions, currentFirmId, workingDate]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDues = creditCustomers.reduce((sum, c) => sum + (c.pendingBalance || 0), 0);
    const dueTodayCount = creditCustomers.filter(c => {
      const f = followUps[c.id];
      return f && f.followUpDate === workingDate;
    }).length;

    const overdue7Count = creditCustomers.filter(c => {
      const stat = customerStats.get(c.id);
      return (stat?.daysSinceLastPayment || 0) >= 7;
    }).length;

    const overdue30Count = creditCustomers.filter(c => {
      const stat = customerStats.get(c.id);
      return (stat?.daysSinceLastPayment || 0) >= 30;
    }).length;

    const highBalanceCount = creditCustomers.filter(c => (c.pendingBalance || 0) >= 5000).length;
    const remindedCount = Object.keys(remindedPatients).length;

    return {
      totalCustomersWithDues: creditCustomers.length,
      totalDues,
      dueTodayCount,
      overdue7Count,
      overdue30Count,
      highBalanceCount,
      remindedCount
    };
  }, [creditCustomers, customerStats, followUps, remindedPatients, workingDate]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return creditCustomers.filter(cust => {
      const stat = customerStats.get(cust.id);
      const days = stat?.daysSinceLastPayment || 0;
      const followUp = followUps[cust.id];
      const isRemindedToday = !!remindedPatients[cust.id];

      // Tab filters
      if (filterType === 'dueToday') {
        if (!followUp || followUp.followUpDate !== workingDate) return false;
      } else if (filterType === 'overdue7') {
        if (days < 7) return false;
      } else if (filterType === 'overdue30') {
        if (days < 30) return false;
      } else if (filterType === 'highBalance') {
        if ((cust.pendingBalance || 0) < 5000) return false;
      } else if (filterType === 'reminded') {
        if (!isRemindedToday) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = cust.name.toLowerCase().includes(q);
        const matchesPhone = (cust.phone || '').includes(q);
        if (!matchesName && !matchesPhone) return false;
      }

      return true;
    }).sort((a, b) => (b.pendingBalance || 0) - (a.pendingBalance || 0));
  }, [creditCustomers, customerStats, filterType, followUps, remindedPatients, searchQuery, workingDate]);

  // Generate WhatsApp Message text for 1-click send
  const getWhatsAppMessage = (cust: Customer) => {
    const shopName = activeFirm?.name || 'Our Pharmacy / Medical Store';
    const shopMobile = activeFirm?.mobile || '';
    const balance = (cust.pendingBalance || 0).toLocaleString();

    return `*PAYMENT REMINDER - ${shopName}*\n\nNamaste *${cust.name}* ji,\n\nThis is a gentle payment reminder regarding your pending credit bill balance at *${shopName}*.\n\n` +
      `📌 *Pending Amount Due:* ₹${balance}\n` +
      `🗓 *Bill Date / Last Recorded:* ${cust.lastPaymentDate || workingDate}\n\n` +
      `Kindly settle this balance at your earliest convenience via UPI to *${shopMobile}* or visit our counter.\n\n` +
      `If you have already paid, please ignore this message.\n\nThank you for your valued business!\n*${shopName}*`;
  };

  const handleSendWhatsApp = (cust: Customer) => {
    markAsReminded(cust.id);
    let phoneClean = (cust.phone || '').replace(/[^0-9]/g, '');
    if (phoneClean.length === 10) {
      phoneClean = '91' + phoneClean;
    }
    const message = encodeURIComponent(getWhatsAppMessage(cust));
    const url = `https://wa.me/${phoneClean}?text=${message}`;
    window.open(url, '_blank');
  };

  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForFollowup) return;

    const record: FollowUpRecord = {
      id: `FUP_${selectedCustomerForFollowup.id}`,
      customerId: selectedCustomerForFollowup.id,
      firmId: currentFirmId,
      followUpDate: followUpDateInput,
      promiseAmount: promiseAmountInput ? parseFloat(promiseAmountInput) : undefined,
      notes: followUpNotesInput.trim(),
      createdAt: workingDate
    };

    saveFollowUps({
      ...followUps,
      [selectedCustomerForFollowup.id]: record
    });

    setSelectedCustomerForFollowup(null);
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-24 text-left">
      {/* Header */}
      <header className="bg-surface-container-lowest sticky top-0 z-40 border-b border-outline-variant/30 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-surface-container-high rounded-xl text-on-surface transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Daily Credit Reminders Hub</h1>
            </div>
            <p className="text-xs text-on-surface-variant">
              Track overdue customer credit, schedule follow-ups, and dispatch 1-click WhatsApp payment reminders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onNavigate('receivePayment')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Coins className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-error/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-error/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-error">Total Credit Dues</span>
              <AlertTriangle className="w-4 h-4 text-error" />
            </div>
            <h3 className="text-2xl font-black text-error">₹{metrics.totalDues.toLocaleString()}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{metrics.totalCustomersWithDues} patients with pending balance</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Scheduled Due Today</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-2xl font-black text-amber-800">{metrics.dueTodayCount}</h3>
            <p className="text-xs text-on-surface-variant mt-1">Promise date scheduled for today</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-rose-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Overdue &gt; 7 Days</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-2xl font-black text-rose-800">{metrics.overdue7Count}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{metrics.overdue30Count} aging over 30 days</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Reminded Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-emerald-800">{metrics.remindedCount}</h3>
            <p className="text-xs text-on-surface-variant mt-1">WhatsApp reminders dispatched</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-surface-container-low/70 p-3 rounded-2xl border border-outline-variant/30">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'all' ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              All Dues ({creditCustomers.length})
            </button>
            <button
              onClick={() => setFilterType('dueToday')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'dueToday' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              Due Today ({metrics.dueTodayCount})
            </button>
            <button
              onClick={() => setFilterType('overdue7')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'overdue7' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              Overdue &gt; 7 Days ({metrics.overdue7Count})
            </button>
            <button
              onClick={() => setFilterType('overdue30')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'overdue30' ? 'bg-red-700 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              Overdue &gt; 30 Days ({metrics.overdue30Count})
            </button>
            <button
              onClick={() => setFilterType('highBalance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'highBalance' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              High Dues &ge; ₹5,000 ({metrics.highBalanceCount})
            </button>
            <button
              onClick={() => setFilterType('reminded')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'reminded' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              Reminded Today ({metrics.remindedCount})
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-surface-bright border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((cust) => {
              const stat = customerStats.get(cust.id);
              const days = stat?.daysSinceLastPayment || 0;
              const followUp = followUps[cust.id];
              const remindedTime = remindedPatients[cust.id];

              return (
                <div
                  key={cust.id}
                  className="bg-surface-container-lowest border border-outline-variant/35 hover:border-primary/40 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-on-surface">{cust.name}</h4>
                          <p className="text-xs text-on-surface-variant font-mono">{cust.phone || 'No phone registered'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-error font-mono">
                          ₹{(cust.pendingBalance || 0).toLocaleString()}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase inline-block mt-0.5 ${
                          days >= 30 ? 'bg-red-500/10 text-red-700' : days >= 7 ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'
                        }`}>
                          {days} Days Pending
                        </span>
                      </div>
                    </div>

                    {/* Follow-up Note / Promise Info */}
                    {followUp && (
                      <div className="mt-3 p-2.5 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs text-amber-900 space-y-1">
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-700" />
                            Next Follow-up: {followUp.followUpDate}
                          </span>
                          {followUp.promiseAmount && (
                            <span className="text-emerald-700 font-mono">Promise: ₹{followUp.promiseAmount}</span>
                          )}
                        </div>
                        {followUp.notes && (
                          <p className="text-[11px] text-on-surface-variant italic">"{followUp.notes}"</p>
                        )}
                      </div>
                    )}

                    {remindedTime && (
                      <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>WhatsApp sent today at {remindedTime}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {cust.phone && (
                        <>
                          <button
                            onClick={() => handleSendWhatsApp(cust)}
                            className="px-3 py-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            title="Send WhatsApp Payment Reminder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <a
                            href={`tel:${cust.phone}`}
                            className="p-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded-xl transition-colors"
                            title="Call Patient"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setSelectedCustomerForFollowup(cust);
                          const existing = followUps[cust.id];
                          setFollowUpDateInput(existing?.followUpDate || workingDate);
                          setPromiseAmountInput(existing?.promiseAmount?.toString() || '');
                          setFollowUpNotesInput(existing?.notes || '');
                        }}
                        className="p-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded-xl transition-colors cursor-pointer"
                        title="Schedule Follow-up Date"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onSelectCustomer(cust.id);
                        onNavigate('customerLedger');
                      }}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-on-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>Ledger</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center text-on-surface-variant">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="text-base font-bold text-on-surface">No matching credit reminders found</p>
              <p className="text-xs text-on-surface-variant mt-1">All customers in this category have cleared dues or have no scheduled reminders.</p>
            </div>
          )}
        </div>
      </main>

      {/* Schedule Follow-up Modal */}
      {selectedCustomerForFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="p-5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-on-surface">Schedule Payment Follow-up</h3>
              </div>
              <button 
                onClick={() => setSelectedCustomerForFollowup(null)}
                className="p-1 hover:bg-surface-container-high rounded-full text-on-surface-variant cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="p-6 space-y-4">
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 space-y-1">
                <div className="text-xs text-on-surface-variant">Customer Name</div>
                <div className="font-bold text-sm text-on-surface">{selectedCustomerForFollowup.name}</div>
                <div className="text-xs text-error font-bold font-mono">
                  Pending Balance: ₹{(selectedCustomerForFollowup.pendingBalance || 0).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Next Follow-up / Promise Date *</label>
                <input
                  type="date"
                  required
                  value={followUpDateInput}
                  onChange={(e) => setFollowUpDateInput(e.target.value)}
                  className="px-3.5 py-2.5 bg-surface-bright border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Customer Promised Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. Full or Partial amount"
                  value={promiseAmountInput}
                  onChange={(e) => setPromiseAmountInput(e.target.value)}
                  className="px-3.5 py-2 bg-surface-bright border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Follow-up Notes / Call Summary</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Spoke to customer, promised to visit counter on Saturday"
                  value={followUpNotesInput}
                  onChange={(e) => setFollowUpNotesInput(e.target.value)}
                  className="px-3.5 py-2 bg-surface-bright border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForFollowup(null)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
