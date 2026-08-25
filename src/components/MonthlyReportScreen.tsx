import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  CreditCard, 
  ShieldPlus, 
  Building2, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Customer, Firm, Page, Transaction, getLocalDateString } from '../App';
import { CashlessClaim } from './CashlessPatientScreen';

interface MonthlyReportScreenProps {
  onBack: () => void;
  onNavigate: (page: Page) => void;
  currentFirmId: string;
  activeFirm?: Firm;
  currentUser: any;
  transactions: Transaction[];
  customers: Customer[];
  cashlessClaims: CashlessClaim[];
  dailyRegisters?: Record<string, any>;
  workingDate?: string;
}

export function MonthlyReportScreen({
  onBack,
  onNavigate,
  currentFirmId,
  activeFirm,
  currentUser,
  transactions,
  customers,
  cashlessClaims,
  dailyRegisters = {},
  workingDate = getLocalDateString()
}: MonthlyReportScreenProps) {
  // Default to current month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date(workingDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'dailyLedger' | 'creditDebtors' | 'cashlessAudit'>('overview');

  // Month parsing
  const { year, month, daysInMonth, monthName } = useMemo(() => {
    const parts = selectedMonth.split('-');
    const y = parseInt(parts[0], 10) || 2026;
    const m = parseInt(parts[1], 10) || 8;
    const dateObj = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0).getDate();
    const mName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { year: y, month: m, daysInMonth: lastDay, monthName: mName };
  }, [selectedMonth]);

  // Filter transactions for this firm & selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.firmId !== currentFirmId) return false;
      return (t.date || '').startsWith(selectedMonth);
    });
  }, [transactions, currentFirmId, selectedMonth]);

  // Filter cashless claims for this firm & selected month
  const monthCashlessClaims = useMemo(() => {
    return cashlessClaims.filter(c => {
      if (c.firmId !== currentFirmId) return false;
      return (c.date || '').startsWith(selectedMonth);
    });
  }, [cashlessClaims, currentFirmId, selectedMonth]);

  // Compute month-wide aggregates
  const aggregates = useMemo(() => {
    let creditSales = 0;
    let paymentCollections = 0;
    let supplierPayments = 0;
    let staffCredit = 0;
    let staffAdvance = 0;
    let expenses = 0;

    monthTransactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'credit_sale') creditSales += amt;
      else if (t.type === 'receive_payment') paymentCollections += amt;
      else if (t.type === 'supplier_payment') supplierPayments += amt;
      else if (t.type === 'staff_credit') staffCredit += amt;
      else if (t.type === 'staff_advance') staffAdvance += amt;
      else if (t.type === 'scheme_bill') expenses += amt;
    });

    // Cashless metrics
    let mjpjayBilled = 0;
    let mjpjaySettled = 0;
    let insuranceBilled = 0;
    let insuranceSettled = 0;

    monthCashlessClaims.forEach(c => {
      if (c.type === 'MJPJAY') {
        mjpjayBilled += c.billAmount || 0;
        mjpjaySettled += c.settledAmount || 0;
      } else {
        insuranceBilled += c.billAmount || 0;
        insuranceSettled += c.settledAmount || 0;
      }
    });

    const totalCashlessBilled = mjpjayBilled + insuranceBilled;
    const totalCashlessSettled = mjpjaySettled + insuranceSettled;
    const cashlessOutstanding = totalCashlessBilled - totalCashlessSettled;
    const netCreditGrowth = creditSales - paymentCollections;
    const collectionRecoveryRate = creditSales > 0 ? Math.min(100, Math.round((paymentCollections / creditSales) * 100)) : 100;

    return {
      creditSales,
      paymentCollections,
      supplierPayments,
      staffCredit,
      staffAdvance,
      expenses,
      mjpjayBilled,
      mjpjaySettled,
      insuranceBilled,
      insuranceSettled,
      totalCashlessBilled,
      totalCashlessSettled,
      cashlessOutstanding,
      netCreditGrowth,
      collectionRecoveryRate
    };
  }, [monthTransactions, monthCashlessClaims]);

  // Day-by-day table and chart data
  const dayWiseData = useMemo(() => {
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayTxs = monthTransactions.filter(t => t.date === dayStr);
      const dayClaims = monthCashlessClaims.filter(c => c.date === dayStr);

      let dayCreditSales = 0;
      let dayCollections = 0;
      let daySupplier = 0;
      let dayExpenses = 0;

      dayTxs.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'credit_sale') dayCreditSales += amt;
        else if (t.type === 'receive_payment') dayCollections += amt;
        else if (t.type === 'supplier_payment') daySupplier += amt;
      });

      let dayCashless = 0;
      dayClaims.forEach(c => {
        dayCashless += c.billAmount || 0;
      });

      // Daily closing cash if saved in dailyRegisters
      const registerKey = `${currentFirmId}_${dayStr}`;
      const reg = dailyRegisters[registerKey];
      const closingCash = reg ? reg.actualCashHandover || reg.closingBalance : null;

      days.push({
        date: dayStr,
        dayNumber: day,
        displayDate: `${day} ${monthName.split(' ')[0]}`,
        creditSales: dayCreditSales,
        collections: dayCollections,
        cashless: dayCashless,
        supplier: daySupplier,
        netCashFlow: dayCollections - daySupplier,
        closingCash
      });
    }
    return days;
  }, [daysInMonth, selectedMonth, monthTransactions, monthCashlessClaims, dailyRegisters, currentFirmId, monthName]);

  // Chart data for payment modes / schemes
  const pieData = [
    { name: 'Credit Collections', value: aggregates.paymentCollections || 1, color: '#10B981' },
    { name: 'MJPJAY Claims', value: aggregates.mjpjayBilled || 1, color: '#F59E0B' },
    { name: 'Insurance Claims', value: aggregates.insuranceBilled || 1, color: '#3B82F6' },
    { name: 'Supplier Outflow', value: aggregates.supplierPayments || 1, color: '#EF4444' }
  ];

  // Top Customer Outstanding List
  const topDebtors = useMemo(() => {
    return customers
      .filter(c => c.firmId === currentFirmId && (c.pendingBalance || 0) > 0)
      .sort((a, b) => (b.pendingBalance || 0) - (a.pendingBalance || 0))
      .slice(0, 15);
  }, [customers, currentFirmId]);

  const handleExportMonthlyCSV = () => {
    const headers = [
      'Date',
      'Credit Sales (INR)',
      'Payment Collections (INR)',
      'Cashless Claims (INR)',
      'Supplier Outflow (INR)',
      'Day Closing Cash'
    ];

    const rows = dayWiseData.map(d => [
      `"${d.date}"`,
      d.creditSales,
      d.collections,
      d.cashless,
      d.supplier,
      d.closingCash !== null ? d.closingCash : 'N/A'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeFirm?.name || 'Shop'}_Monthly_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-24 text-left print:bg-white print:p-0">
      {/* Header */}
      <header className="bg-surface-container-lowest sticky top-0 z-40 border-b border-outline-variant/30 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md print:hidden">
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
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Monthly Financial Reports & Audit</h1>
            </div>
            <p className="text-xs text-on-surface-variant">
              Complete credit sales ledger, recovery rates, cashless scheme audits, and daily cash flow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/40">
            <Calendar className="w-4 h-4 text-primary" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportMonthlyCSV}
            className="px-3.5 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </header>

      {/* Print Header only visible during printing */}
      <div className="hidden print:block p-6 border-b border-gray-300">
        <h1 className="text-2xl font-black">{activeFirm?.name || 'Yogwalture Pharmacy'}</h1>
        <p className="text-sm text-gray-600">Monthly Accounting & Credit Audit Statement - {monthName}</p>
        <p className="text-xs text-gray-500">Firm ID: {currentFirmId} | Generated on: {new Date().toLocaleString()}</p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Executive Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Credit Sales */}
          <div className="bg-gradient-to-br from-primary/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-primary/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Credit Sales ({monthName.split(' ')[0]})</span>
              <Coins className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-2xl font-black text-on-surface">₹{aggregates.creditSales.toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant mt-1">
              <span>Recovery Rate:</span>
              <strong className="text-emerald-700 font-bold">{aggregates.collectionRecoveryRate}%</strong>
            </div>
          </div>

          {/* Payment Collections Against Credit */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Payment Collected</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-emerald-800">₹{aggregates.paymentCollections.toLocaleString()}</h3>
            <p className="text-xs text-on-surface-variant mt-1">Inflow from customer credit settlements</p>
          </div>

          {/* Cashless Volume (MJPJAY + Insurance) */}
          <div className="bg-gradient-to-br from-blue-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-blue-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Cashless Claims Volume</span>
              <ShieldPlus className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black text-blue-800">₹{aggregates.totalCashlessBilled.toLocaleString()}</h3>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Settled: ₹{aggregates.totalCashlessSettled.toLocaleString()}</span>
              <span className="font-bold text-blue-700">Due: ₹{aggregates.cashlessOutstanding.toLocaleString()}</span>
            </div>
          </div>

          {/* Supplier Outflow */}
          <div className="bg-gradient-to-br from-rose-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-rose-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Supplier Outflow</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-2xl font-black text-rose-800">₹{aggregates.supplierPayments.toLocaleString()}</h3>
            <p className="text-xs text-on-surface-variant mt-1">Paid to medicine distributors & stockists</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-outline-variant/30 pb-2 print:hidden">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
          >
            Monthly Overview & Charts
          </button>
          <button
            onClick={() => setActiveTab('dailyLedger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dailyLedger' ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
          >
            Day-by-Day Audit ({daysInMonth} Days)
          </button>
          <button
            onClick={() => setActiveTab('creditDebtors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'creditDebtors' ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
          >
            Top Customer Outstanding ({topDebtors.length})
          </button>
          <button
            onClick={() => setActiveTab('cashlessAudit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'cashlessAudit' ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
          >
            MJPJAY & Insurance Breakdown
          </button>
        </div>

        {/* Tab 1: Overview & Visual Charts */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Daily Sales vs Collections Trend */}
              <div className="lg:col-span-2 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/35 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Daily Credit Sales vs Collections</h3>
                    <p className="text-xs text-on-surface-variant">Comparative flow for {monthName}</p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-on-surface-variant" />
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="dayNumber" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="creditSales" name="Credit Sales (₹)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collections" name="Collections (₹)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Volume Distribution Pie */}
              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/35 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-on-surface">Revenue & Claims Mix</h3>
                    <PieChartIcon className="w-4 h-4 text-on-surface-variant" />
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4">Distribution by scheme and channel</p>
                </div>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-outline-variant/20">
                  {pieData.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-on-surface">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Insights Banner */}
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 grid sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-on-surface-variant uppercase font-bold text-[10px]">Net Credit Growth</span>
                <p className={`text-lg font-black ${aggregates.netCreditGrowth > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  ₹{Math.abs(aggregates.netCreditGrowth).toLocaleString()} {aggregates.netCreditGrowth > 0 ? '(Accumulated)' : '(Recovered)'}
                </p>
                <p className="text-on-surface-variant text-[11px]">Difference between new credit given vs payment received</p>
              </div>

              <div className="space-y-1">
                <span className="text-on-surface-variant uppercase font-bold text-[10px]">Total Cashless Claims</span>
                <p className="text-lg font-black text-blue-700">₹{aggregates.totalCashlessBilled.toLocaleString()}</p>
                <p className="text-on-surface-variant text-[11px]">MJPJAY: ₹{aggregates.mjpjayBilled.toLocaleString()} | Insurance: ₹{aggregates.insuranceBilled.toLocaleString()}</p>
              </div>

              <div className="space-y-1">
                <span className="text-on-surface-variant uppercase font-bold text-[10px]">Active Debtors with Dues</span>
                <p className="text-lg font-black text-error">{topDebtors.length} Customers</p>
                <p className="text-on-surface-variant text-[11px]">Total outstanding ₹{topDebtors.reduce((s, c) => s + (c.pendingBalance || 0), 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Day by Day Audit Table */}
        {activeTab === 'dailyLedger' && (
          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Daily Financial Records for {monthName}</h3>
                <p className="text-xs text-on-surface-variant">Audit of credit sales, collections, cashless claims, and cash in hand</p>
              </div>
              <button
                onClick={handleExportMonthlyCSV}
                className="px-3 py-1.5 bg-surface-bright hover:bg-surface-container-high text-on-surface border border-outline-variant/40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 border-b border-outline-variant/40 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Credit Sales</th>
                    <th className="py-3 px-4 text-right">Collections Received</th>
                    <th className="py-3 px-4 text-right">Cashless Claims</th>
                    <th className="py-3 px-4 text-right">Supplier Payments</th>
                    <th className="py-3 px-4 text-right">Net Flow</th>
                    <th className="py-3 px-4 text-right">Closing Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {dayWiseData.map((d) => (
                    <tr key={d.date} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-on-surface">
                        {d.date}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-primary">
                        {d.creditSales > 0 ? `₹${d.creditSales.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {d.collections > 0 ? `₹${d.collections.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                        {d.cashless > 0 ? `₹${d.cashless.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                        {d.supplier > 0 ? `₹${d.supplier.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        <span className={d.netCashFlow >= 0 ? 'text-emerald-700' : 'text-error'}>
                          {d.netCashFlow !== 0 ? `₹${d.netCashFlow.toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-on-surface">
                        {d.closingCash !== null ? `₹${d.closingCash.toLocaleString()}` : <span className="text-on-surface-variant/40">Not Closed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container-low font-bold text-xs border-t-2 border-outline-variant">
                    <td className="py-3 px-4 uppercase">Total ({monthName})</td>
                    <td className="py-3 px-4 text-right text-primary font-mono font-black">₹{aggregates.creditSales.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-mono font-black">₹{aggregates.paymentCollections.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-blue-700 font-mono font-black">₹{aggregates.totalCashlessBilled.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-rose-700 font-mono font-black">₹{aggregates.supplierPayments.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-on-surface">
                      ₹{(aggregates.paymentCollections - aggregates.supplierPayments).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-on-surface-variant">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Customer Outstanding List */}
        {activeTab === 'creditDebtors' && (
          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Top Outstanding Customer Balances</h3>
                <p className="text-xs text-on-surface-variant">Patients and clients with active credit balance in the shop</p>
              </div>
              <button
                onClick={() => onNavigate('creditReminders')}
                className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-on-primary rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <span>Open Reminders Hub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 border-b border-outline-variant/40 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Last Payment Date</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {topDebtors.map((cust) => (
                    <tr key={cust.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-on-surface text-sm">
                        {cust.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-on-surface-variant">
                        {cust.phone || 'No phone'}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-mono">
                        {cust.lastPaymentDate || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-error text-sm">
                        ₹{(cust.pendingBalance || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            onNavigate('receivePayment');
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Cashless Scheme Breakdown */}
        {activeTab === 'cashlessAudit' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* MJPJAY Box */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/25 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div>
                  <h3 className="font-bold text-base text-amber-900">MJPJAY Scheme Summary</h3>
                  <p className="text-xs text-on-surface-variant">Mahatma Jyotirao Phule Jan Arogya Yojana claims</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/15 text-amber-800 rounded-full font-bold text-xs uppercase">
                  Govt. Scheme
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-amber-500/5 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Total Billed</span>
                  <p className="text-xl font-black text-on-surface font-mono">₹{aggregates.mjpjayBilled.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Total Settled</span>
                  <p className="text-xl font-black text-emerald-700 font-mono">₹{aggregates.mjpjaySettled.toLocaleString()}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-amber-500/20 flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">Outstanding Govt. Recovery:</span>
                  <span className="text-lg font-black text-error font-mono">₹{(aggregates.mjpjayBilled - aggregates.mjpjaySettled).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('cashlessPatient')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View MJPJAY Claims Register</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Insurance Box */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-blue-500/25 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                <div>
                  <h3 className="font-bold text-base text-blue-900">Insurance & TPA Mediclaim</h3>
                  <p className="text-xs text-on-surface-variant">Private health insurance and corporate cashless claims</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-500/15 text-blue-800 rounded-full font-bold text-xs uppercase">
                  Private TPA
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-500/5 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Total Billed</span>
                  <p className="text-xl font-black text-on-surface font-mono">₹{aggregates.insuranceBilled.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Total Settled</span>
                  <p className="text-xl font-black text-emerald-700 font-mono">₹{aggregates.insuranceSettled.toLocaleString()}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-blue-500/20 flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900">Outstanding TPA Recovery:</span>
                  <span className="text-lg font-black text-error font-mono">₹{(aggregates.insuranceBilled - aggregates.insuranceSettled).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('cashlessPatient')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View Insurance Claims Register</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
