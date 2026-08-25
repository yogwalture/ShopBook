import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  ShieldPlus, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  Printer, 
  Coins, 
  Building2, 
  UserCheck, 
  ExternalLink,
  ChevronDown,
  X,
  Calendar,
  Save,
  Check,
  CreditCard,
  HeartHandshake
} from 'lucide-react';
import { Firm, Page, Transaction, Customer, getLocalDateString } from '../App';

export type CashlessType = 'MJPJAY' | 'Insurance';

export type CashlessClaim = {
  id: string;
  firmId: string;
  type: CashlessType;
  patientName: string;
  patientPhone: string;
  billNumber?: string;
  claimNumber?: string;
  preAuthNumber?: string;
  hospitalName?: string;
  ipdNumber?: string;
  doctorName?: string;
  diagnosis?: string;
  admissionDate?: string;
  dischargeDate?: string;
  
  // Specific to MJPJAY
  rationCardNumber?: string;
  ayushmanCardNumber?: string;
  packageCode?: string;
  packageName?: string;
  
  // Specific to Insurance
  insuranceCompany?: string;
  tpaName?: string;
  policyNumber?: string;
  coPayAmount?: number;
  
  // Financials
  billAmount: number;
  approvedAmount: number;
  settledAmount: number;
  deductionAmount?: number;
  outstandingAmount: number;
  status: 'Submitted' | 'Approved' | 'Settled' | 'Partially_Settled' | 'Rejected' | 'Query';
  date: string;
  settlementDate?: string;
  settlementRef?: string;
  recordedByUserId: string;
  recordedByUserName: string;
  remarks?: string;
};

const COMMON_INSURANCES = [
  'Star Health and Allied Insurance',
  'HDFC ERGO Health Insurance',
  'Care Health Insurance',
  'ICICI Lombard Health Care',
  'Niva Bupa Health Insurance',
  'Bajaj Allianz Health',
  'MediBuddy / Medi Assist TPA',
  'Vidal Health TPA',
  'Paramount Health TPA',
  'Heritage Health TPA',
  'Raksha Health TPA',
  'Family Health Plan (FHPL)',
  'MDIndia Health Insurance TPA',
  'Other Private / Corporate TPA'
];

interface CashlessPatientScreenProps {
  onBack: () => void;
  onNavigate: (page: Page) => void;
  currentFirmId: string;
  activeFirm?: Firm;
  currentUser: any;
  cashlessClaims: CashlessClaim[];
  onSaveClaim: (claim: CashlessClaim) => void;
  onUpdateClaim: (claim: CashlessClaim) => void;
  onDeleteClaim?: (claimId: string) => void;
  customers: Customer[];
  workingDate?: string;
}

export function CashlessPatientScreen({
  onBack,
  onNavigate,
  currentFirmId,
  activeFirm,
  currentUser,
  cashlessClaims,
  onSaveClaim,
  onUpdateClaim,
  onDeleteClaim,
  customers,
  workingDate = getLocalDateString()
}: CashlessPatientScreenProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'mjpjay' | 'insurance' | 'pending' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [selectedClaimForSettlement, setSelectedClaimForSettlement] = useState<CashlessClaim | null>(null);
  const [viewDetailClaim, setViewDetailClaim] = useState<CashlessClaim | null>(null);

  // Form State
  const [formType, setFormType] = useState<CashlessType>('MJPJAY');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [billNumber, setBillNumber] = useState(`BILL-${Math.floor(100000 + Math.random() * 900000)}`);
  const [claimNumber, setClaimNumber] = useState('');
  const [preAuthNumber, setPreAuthNumber] = useState('');
  const [hospitalName, setHospitalName] = useState(activeFirm?.name || 'Main Hospital / Ward');
  const [ipdNumber, setIpdNumber] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [admissionDate, setAdmissionDate] = useState(workingDate);
  const [dischargeDate, setDischargeDate] = useState(workingDate);
  
  // MJPJAY fields
  const [rationCardNumber, setRationCardNumber] = useState('');
  const [ayushmanCardNumber, setAyushmanCardNumber] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [packageName, setPackageName] = useState('');

  // Insurance fields
  const [insuranceCompany, setInsuranceCompany] = useState(COMMON_INSURANCES[0]);
  const [customInsurance, setCustomInsurance] = useState('');
  const [tpaName, setTpaName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [coPayAmount, setCoPayAmount] = useState('');

  // Financials
  const [billAmount, setBillAmount] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [formStatus, setFormStatus] = useState<CashlessClaim['status']>('Submitted');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  // Settlement Dialog State
  const [settledAmountInput, setSettledAmountInput] = useState('');
  const [deductionAmountInput, setDeductionAmountInput] = useState('0');
  const [settlementDateInput, setSettlementDateInput] = useState(workingDate);
  const [settlementRefInput, setSettlementRefInput] = useState('');
  const [settlementRemarksInput, setSettlementRemarksInput] = useState('');

  const activeClaims = useMemo(() => {
    return cashlessClaims.filter(c => c.firmId === currentFirmId);
  }, [cashlessClaims, currentFirmId]);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return activeClaims.filter(claim => {
      // Tab filter
      if (activeTab === 'mjpjay' && claim.type !== 'MJPJAY') return false;
      if (activeTab === 'insurance' && claim.type !== 'Insurance') return false;
      if (activeTab === 'pending' && claim.status === 'Settled') return false;
      if (activeTab === 'settled' && claim.status !== 'Settled') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = claim.patientName.toLowerCase().includes(q);
        const matchesPhone = claim.patientPhone.toLowerCase().includes(q);
        const matchesClaimNo = (claim.claimNumber || '').toLowerCase().includes(q);
        const matchesPreAuth = (claim.preAuthNumber || '').toLowerCase().includes(q);
        const matchesInsurance = (claim.insuranceCompany || '').toLowerCase().includes(q);
        const matchesPackage = (claim.packageName || '').toLowerCase().includes(q);
        const matchesRation = (claim.rationCardNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesClaimNo && !matchesPreAuth && !matchesInsurance && !matchesPackage && !matchesRation) {
          return false;
        }
      }
      return true;
    });
  }, [activeClaims, activeTab, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalBillAmount = 0;
    let totalApproved = 0;
    let totalSettled = 0;
    let totalOutstanding = 0;
    let mjpjayCount = 0;
    let mjpjayAmount = 0;
    let mjpjaySettled = 0;
    let insuranceCount = 0;
    let insuranceAmount = 0;
    let insuranceSettled = 0;

    activeClaims.forEach(c => {
      totalBillAmount += c.billAmount || 0;
      totalApproved += c.approvedAmount || c.billAmount || 0;
      totalSettled += c.settledAmount || 0;
      totalOutstanding += c.outstandingAmount || 0;

      if (c.type === 'MJPJAY') {
        mjpjayCount++;
        mjpjayAmount += c.billAmount || 0;
        mjpjaySettled += c.settledAmount || 0;
      } else {
        insuranceCount++;
        insuranceAmount += c.billAmount || 0;
        insuranceSettled += c.settledAmount || 0;
      }
    });

    return {
      totalBillAmount,
      totalApproved,
      totalSettled,
      totalOutstanding,
      mjpjayCount,
      mjpjayAmount,
      mjpjaySettled,
      mjpjayPending: mjpjayAmount - mjpjaySettled,
      insuranceCount,
      insuranceAmount,
      insuranceSettled,
      insurancePending: insuranceAmount - insuranceSettled
    };
  }, [activeClaims]);

  const handleResetForm = () => {
    setPatientName('');
    setPatientPhone('');
    setBillNumber(`BILL-${Math.floor(100000 + Math.random() * 900000)}`);
    setClaimNumber('');
    setPreAuthNumber('');
    setIpdNumber('');
    setDoctorName('');
    setDiagnosis('');
    setAdmissionDate(workingDate);
    setDischargeDate(workingDate);
    setRationCardNumber('');
    setAyushmanCardNumber('');
    setPackageCode('');
    setPackageName('');
    setInsuranceCompany(COMMON_INSURANCES[0]);
    setCustomInsurance('');
    setTpaName('');
    setPolicyNumber('');
    setCoPayAmount('');
    setBillAmount('');
    setApprovedAmount('');
    setFormStatus('Submitted');
    setRemarks('');
    setFormError('');
  };

  const handleSaveClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!patientName.trim()) {
      setFormError('Patient name is required.');
      return;
    }
    const parsedBillAmount = parseFloat(billAmount);
    if (isNaN(parsedBillAmount) || parsedBillAmount <= 0) {
      setFormError('Please enter a valid bill amount greater than 0.');
      return;
    }

    const parsedApproved = approvedAmount ? parseFloat(approvedAmount) : parsedBillAmount;
    const parsedCoPay = parseFloat(coPayAmount) || 0;
    const outstanding = Math.max(0, parsedApproved - parsedCoPay);

    const newClaim: CashlessClaim = {
      id: `CLAIM_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      firmId: currentFirmId,
      type: formType,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      billNumber: billNumber.trim() || undefined,
      claimNumber: claimNumber.trim() || undefined,
      preAuthNumber: preAuthNumber.trim() || undefined,
      hospitalName: hospitalName.trim() || undefined,
      ipdNumber: ipdNumber.trim() || undefined,
      doctorName: doctorName.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      admissionDate: admissionDate || undefined,
      dischargeDate: dischargeDate || undefined,
      
      // Type specific
      rationCardNumber: formType === 'MJPJAY' ? rationCardNumber.trim() || undefined : undefined,
      ayushmanCardNumber: formType === 'MJPJAY' ? ayushmanCardNumber.trim() || undefined : undefined,
      packageCode: formType === 'MJPJAY' ? packageCode.trim() || undefined : undefined,
      packageName: formType === 'MJPJAY' ? packageName.trim() || undefined : undefined,

      insuranceCompany: formType === 'Insurance' 
        ? (insuranceCompany === 'Other Private / Corporate TPA' && customInsurance ? customInsurance.trim() : insuranceCompany) 
        : undefined,
      tpaName: formType === 'Insurance' ? tpaName.trim() || undefined : undefined,
      policyNumber: formType === 'Insurance' ? policyNumber.trim() || undefined : undefined,
      coPayAmount: formType === 'Insurance' && parsedCoPay > 0 ? parsedCoPay : undefined,

      billAmount: parsedBillAmount,
      approvedAmount: parsedApproved,
      settledAmount: 0,
      outstandingAmount: outstanding,
      status: formStatus,
      date: workingDate,
      recordedByUserId: currentUser?.id || 'admin',
      recordedByUserName: currentUser?.name || 'Staff',
      remarks: remarks.trim() || undefined
    };

    onSaveClaim(newClaim);
    handleResetForm();
    setIsNewEntryOpen(false);
  };

  const handleOpenSettlement = (claim: CashlessClaim) => {
    setSelectedClaimForSettlement(claim);
    setSettledAmountInput(claim.outstandingAmount.toString());
    setDeductionAmountInput('0');
    setSettlementDateInput(workingDate);
    setSettlementRefInput(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setSettlementRemarksInput('');
  };

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForSettlement) return;

    const parsedSettled = parseFloat(settledAmountInput);
    if (isNaN(parsedSettled) || parsedSettled <= 0) {
      alert('Please enter a valid settled amount received (> 0).');
      return;
    }
    const parsedDeduction = parseFloat(deductionAmountInput) || 0;
    const newTotalSettled = (selectedClaimForSettlement.settledAmount || 0) + parsedSettled;
    const targetApproved = selectedClaimForSettlement.approvedAmount || selectedClaimForSettlement.billAmount;
    const coPay = selectedClaimForSettlement.coPayAmount || 0;
    const remainingOutstanding = Math.max(0, targetApproved - coPay - newTotalSettled - parsedDeduction);

    const updatedStatus = remainingOutstanding <= 0 ? 'Settled' : 'Partially_Settled';

    const updatedClaim: CashlessClaim = {
      ...selectedClaimForSettlement,
      settledAmount: newTotalSettled,
      deductionAmount: (selectedClaimForSettlement.deductionAmount || 0) + parsedDeduction,
      outstandingAmount: remainingOutstanding,
      status: updatedStatus,
      settlementDate: settlementDateInput,
      settlementRef: settlementRefInput.trim() || undefined,
      remarks: settlementRemarksInput.trim() 
        ? `${selectedClaimForSettlement.remarks ? selectedClaimForSettlement.remarks + ' | ' : ''}Settlement Note: ${settlementRemarksInput.trim()}`
        : selectedClaimForSettlement.remarks
    };

    onUpdateClaim(updatedClaim);
    setSelectedClaimForSettlement(null);
  };

  const handleExportCSV = () => {
    if (filteredClaims.length === 0) {
      alert('No cashless claims to export.');
      return;
    }

    const headers = [
      'Claim ID',
      'Scheme Type',
      'Patient Name',
      'Phone',
      'Bill No',
      'Claim/PreAuth No',
      'Insurance/Package',
      'Hospital/IPD',
      'Bill Amount',
      'Approved Amount',
      'Settled Amount',
      'Outstanding Amount',
      'Status',
      'Date',
      'Settlement Date',
      'Settlement Ref'
    ];

    const rows = filteredClaims.map(c => [
      `"${c.id}"`,
      `"${c.type}"`,
      `"${c.patientName}"`,
      `"${c.patientPhone || ''}"`,
      `"${c.billNumber || ''}"`,
      `"${c.claimNumber || c.preAuthNumber || ''}"`,
      `"${c.type === 'MJPJAY' ? (c.packageName || c.packageCode || 'MJPJAY') : (c.insuranceCompany || '')}"`,
      `"${c.hospitalName || ''}"`,
      c.billAmount,
      c.approvedAmount,
      c.settledAmount,
      c.outstandingAmount,
      `"${c.status}"`,
      `"${c.date}"`,
      `"${c.settlementDate || ''}"`,
      `"${c.settlementRef || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cashless_Claims_Register_${activeFirm?.name || 'Shop'}_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-24 text-left">
      {/* Top App Header */}
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
              <ShieldPlus className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Cashless Patient Management</h1>
            </div>
            <p className="text-xs text-on-surface-variant">
              Centralized register for <span className="font-bold text-primary">MJPJAY Scheme</span> & <span className="font-bold text-secondary">Private Insurance / Mediclaim</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-on-surface-variant" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              handleResetForm();
              setIsNewEntryOpen(true);
            }}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Cashless Entry</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Cashless Sales */}
          <div className="bg-gradient-to-br from-primary/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-primary/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Total Cashless Volume</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-2xl font-black text-on-surface">₹{metrics.totalBillAmount.toLocaleString()}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{activeClaims.length} recorded patient claims</p>
          </div>

          {/* MJPJAY Scheme Total */}
          <div className="bg-gradient-to-br from-amber-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">MJPJAY Scheme</span>
              <HeartHandshake className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-2xl font-black text-amber-800">₹{metrics.mjpjayAmount.toLocaleString()}</h3>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Settled: ₹{metrics.mjpjaySettled.toLocaleString()}</span>
              <span className="font-bold text-amber-700">Due: ₹{metrics.mjpjayPending.toLocaleString()}</span>
            </div>
          </div>

          {/* Insurance / TPA Total */}
          <div className="bg-gradient-to-br from-blue-500/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-blue-500/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Insurance / Mediclaim</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black text-blue-800">₹{metrics.insuranceAmount.toLocaleString()}</h3>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Settled: ₹{metrics.insuranceSettled.toLocaleString()}</span>
              <span className="font-bold text-blue-700">Due: ₹{metrics.insurancePending.toLocaleString()}</span>
            </div>
          </div>

          {/* Outstanding Claims Recovery */}
          <div className="bg-gradient-to-br from-error/10 via-surface-container-lowest to-surface-container-lowest p-5 rounded-2xl border border-error/20 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-error">Claims Outstanding</span>
              <AlertCircle className="w-4 h-4 text-error" />
            </div>
            <h3 className="text-2xl font-black text-error">₹{metrics.totalOutstanding.toLocaleString()}</h3>
            <p className="text-xs text-on-surface-variant mt-1">Awaiting Govt/TPA reimbursement</p>
          </div>
        </div>

        {/* Filters and Navigation Tab Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-surface-container-low/70 p-3 rounded-2xl border border-outline-variant/30">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'all' ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              All Claims ({activeClaims.length})
            </button>
            <button
              onClick={() => setActiveTab('mjpjay')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'mjpjay' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              MJPJAY ({metrics.mjpjayCount})
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'insurance' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              Insurance / TPA ({metrics.insuranceCount})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'pending' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              Pending Settlement
            </button>
            <button
              onClick={() => setActiveTab('settled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'settled' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
            >
              Settled
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, claim #, TPA..."
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

        {/* Claims Table / List View */}
        <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/40 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Patient & Contact</th>
                  <th className="py-3.5 px-4">Scheme / Policy / Pre-Auth</th>
                  <th className="py-3.5 px-4">Hospital / Ward</th>
                  <th className="py-3.5 px-4 text-right">Bill / Approved</th>
                  <th className="py-3.5 px-4 text-right">Settled</th>
                  <th className="py-3.5 px-4 text-right">Outstanding</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredClaims.length > 0 ? (
                  filteredClaims.map((claim) => {
                    const isMjpjay = claim.type === 'MJPJAY';
                    const isFullySettled = claim.status === 'Settled' || claim.outstandingAmount <= 0;

                    return (
                      <tr key={claim.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isMjpjay ? 'bg-amber-500/15 text-amber-800 border border-amber-500/20' : 'bg-blue-500/15 text-blue-800 border border-blue-500/20'}`}>
                            {isMjpjay ? <HeartHandshake className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                            {claim.type}
                          </span>
                          <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">{claim.date}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-on-surface text-sm">{claim.patientName}</div>
                          {claim.patientPhone && (
                            <div className="text-xs text-on-surface-variant font-mono">{claim.patientPhone}</div>
                          )}
                          {claim.billNumber && (
                            <div className="text-[10px] text-on-surface-variant/70 font-mono">Bill: {claim.billNumber}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isMjpjay ? (
                            <div>
                              <div className="font-semibold text-on-surface">{claim.packageName || 'MJPJAY Scheme Package'}</div>
                              {claim.packageCode && (
                                <div className="text-[10px] text-on-surface-variant font-mono">Code: {claim.packageCode}</div>
                              )}
                              {claim.rationCardNumber && (
                                <div className="text-[10px] text-amber-700 font-mono">Ration/Golden: {claim.rationCardNumber}</div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-on-surface truncate max-w-[200px]">{claim.insuranceCompany || 'Mediclaim'}</div>
                              {claim.tpaName && (
                                <div className="text-[10px] text-blue-700 font-mono">TPA: {claim.tpaName}</div>
                              )}
                              {claim.preAuthNumber && (
                                <div className="text-[10px] text-on-surface-variant font-mono">Pre-Auth: {claim.preAuthNumber}</div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs text-on-surface">{claim.hospitalName || 'General Ward'}</div>
                          {claim.ipdNumber && (
                            <div className="text-[10px] text-on-surface-variant font-mono">IPD: {claim.ipdNumber}</div>
                          )}
                          {claim.doctorName && (
                            <div className="text-[10px] text-on-surface-variant">Dr: {claim.doctorName}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="font-bold text-on-surface">₹{claim.billAmount.toLocaleString()}</div>
                          {claim.approvedAmount !== claim.billAmount && (
                            <div className="text-[10px] text-on-surface-variant">Appr: ₹{claim.approvedAmount.toLocaleString()}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                          ₹{(claim.settledAmount || 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-error">
                          ₹{(claim.outstandingAmount || 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            isFullySettled 
                              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                              : claim.status === 'Partially_Settled'
                              ? 'bg-sky-500/10 text-sky-700 border border-sky-500/20'
                              : claim.status === 'Approved'
                              ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20'
                              : claim.status === 'Rejected'
                              ? 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                          }`}>
                            {claim.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isFullySettled && (
                              <button
                                onClick={() => handleOpenSettlement(claim)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                                title="Record Settlement Payment from Scheme/TPA"
                              >
                                <Coins className="w-3 h-3" />
                                <span>Settle</span>
                              </button>
                            )}
                            <button
                              onClick={() => setViewDetailClaim(claim)}
                              className="p-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded-lg transition-colors cursor-pointer"
                              title="View Full Claim Details"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                      <ShieldPlus className="w-10 h-10 mx-auto text-on-surface-variant/30 mb-2" />
                      <p className="text-sm font-semibold">No cashless claims found</p>
                      <p className="text-xs text-on-surface-variant/70 mt-1">
                        {searchQuery ? 'No matching claims match your search query.' : 'Click "New Cashless Entry" above to record MJPJAY or Insurance claims.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Cashless Entry Modal */}
      {isNewEntryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <ShieldPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">New Cashless Patient Registration</h3>
                  <p className="text-xs text-on-surface-variant">Record MJPJAY Government Scheme or Insurance / TPA claim</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewEntryOpen(false)}
                className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveClaimSubmit} className="p-6 overflow-y-auto space-y-4 text-left">
              {formError && (
                <div className="p-3 bg-error-container/20 border border-error text-error text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Cashless Type Switcher */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Cashless Scheme Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType('MJPJAY')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      formType === 'MJPJAY' 
                        ? 'bg-amber-500/15 border-amber-600 text-amber-900 shadow-2xs font-extrabold' 
                        : 'bg-surface-bright border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <HeartHandshake className="w-4 h-4 text-amber-700" />
                    <span>MJPJAY (Govt. Scheme)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('Insurance')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      formType === 'Insurance' 
                        ? 'bg-blue-500/15 border-blue-600 text-blue-900 shadow-2xs font-extrabold' 
                        : 'bg-surface-bright border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Insurance / Mediclaim TPA</span>
                  </button>
                </div>
              </div>

              {/* Patient Core Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="px-3.5 py-2.5 bg-surface-bright border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Patient Contact Mobile</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="px-3.5 py-2.5 bg-surface-bright border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Specific fields based on type */}
              {formType === 'MJPJAY' ? (
                <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
                    <HeartHandshake className="w-4 h-4 text-amber-700" />
                    <span>MJPJAY Scheme Specific Details</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Ration Card / Ayushman Golden Card No</label>
                      <input
                        type="text"
                        placeholder="e.g. MH1234567890"
                        value={rationCardNumber}
                        onChange={(e) => setRationCardNumber(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">MJPJAY Pre-Auth / Claim Approval ID</label>
                      <input
                        type="text"
                        placeholder="e.g. MJP-2026-88912"
                        value={preAuthNumber}
                        onChange={(e) => setPreAuthNumber(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Package Name / Category</label>
                      <input
                        type="text"
                        placeholder="e.g. General Medicine / Cardiology"
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Package Code (if any)</label>
                      <input
                        type="text"
                        placeholder="e.g. MJP-MED-042"
                        value={packageCode}
                        onChange={(e) => setPackageCode(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-blue-800 text-xs font-bold uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Insurance / TPA Mediclaim Details</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Insurance Company *</label>
                      <select
                        value={insuranceCompany}
                        onChange={(e) => setInsuranceCompany(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-blue-600"
                      >
                        {COMMON_INSURANCES.map(ins => (
                          <option key={ins} value={ins}>{ins}</option>
                        ))}
                      </select>
                    </div>

                    {insuranceCompany === 'Other Private / Corporate TPA' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-on-surface-variant">Custom Insurance Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Custom Corporate Policy"
                          value={customInsurance}
                          onChange={(e) => setCustomInsurance(e.target.value)}
                          className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Policy / Member ID Number</label>
                      <input
                        type="text"
                        placeholder="e.g. POL-99281726"
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">TPA Desk Name (if applicable)</label>
                      <input
                        type="text"
                        placeholder="e.g. MediBuddy / Vidal Health Desk"
                        value={tpaName}
                        onChange={(e) => setTpaName(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Pre-Auth / Claim Reference No</label>
                      <input
                        type="text"
                        placeholder="e.g. PA-STAR-2026-99"
                        value={preAuthNumber}
                        onChange={(e) => setPreAuthNumber(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hospital & Medical Info */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Hospital / Ward</label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo / City Hospital"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">IPD / Bed Number</label>
                  <input
                    type="text"
                    placeholder="e.g. IPD-402 / Bed 12"
                    value={ipdNumber}
                    onChange={(e) => setIpdNumber(e.target.value)}
                    className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Treating Doctor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Deshmukh"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Financial Calculations */}
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/40 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-on-surface">Financials & Amounts</div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">Total Bill Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">Pre-Auth Approved (₹)</label>
                    <input
                      type="number"
                      placeholder={billAmount || '0.00'}
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  {formType === 'Insurance' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-on-surface-variant">Patient Co-Pay (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={coPayAmount}
                        onChange={(e) => setCoPayAmount(e.target.value)}
                        className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">Initial Claim Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="Submitted">Submitted to Govt/TPA</option>
                      <option value="Approved">Pre-Auth Approved</option>
                      <option value="Query">Under Query</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Internal Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes about claim approval or medicines supplied..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setIsNewEntryOpen(false)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Cashless Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Claim Modal */}
      {selectedClaimForSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                <h3 className="font-bold text-base">Record Claim Reimbursement</h3>
              </div>
              <button 
                onClick={() => setSelectedClaimForSettlement(null)}
                className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="p-6 space-y-4">
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 space-y-1">
                <div className="text-xs text-on-surface-variant">Patient Name</div>
                <div className="font-bold text-sm text-on-surface">{selectedClaimForSettlement.patientName}</div>
                <div className="text-[11px] text-on-surface-variant flex items-center justify-between pt-1">
                  <span>Type: <strong className="text-primary">{selectedClaimForSettlement.type}</strong></span>
                  <span>Pending Due: <strong className="text-error font-mono">₹{selectedClaimForSettlement.outstandingAmount.toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Amount Received from Govt/TPA (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={settledAmountInput}
                  onChange={(e) => setSettledAmountInput(e.target.value)}
                  className="px-3.5 py-2 bg-surface-bright border border-outline-variant rounded-xl text-sm font-black text-emerald-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">TDS / Deductions (₹)</label>
                  <input
                    type="number"
                    value={deductionAmountInput}
                    onChange={(e) => setDeductionAmountInput(e.target.value)}
                    className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Settlement Date</label>
                  <input
                    type="date"
                    value={settlementDateInput}
                    onChange={(e) => setSettlementDateInput(e.target.value)}
                    className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Bank UTR / Cheque Ref No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9988112233"
                  value={settlementRefInput}
                  onChange={(e) => setSettlementRefInput(e.target.value)}
                  className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Settlement Note</label>
                <input
                  type="text"
                  placeholder="e.g. Final payment credited to Bank A/C"
                  value={settlementRemarksInput}
                  onChange={(e) => setSettlementRemarksInput(e.target.value)}
                  className="px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedClaimForSettlement(null)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Detail View Modal */}
      {viewDetailClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="p-5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-on-surface">Cashless Patient Claim Record</h3>
              </div>
              <button 
                onClick={() => setViewDetailClaim(null)}
                className="p-1 hover:bg-surface-container-high rounded-full text-on-surface-variant cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${viewDetailClaim.type === 'MJPJAY' ? 'bg-amber-500/15 text-amber-800' : 'bg-blue-500/15 text-blue-800'}`}>
                    {viewDetailClaim.type}
                  </span>
                  <h4 className="text-base font-bold text-on-surface mt-1">{viewDetailClaim.patientName}</h4>
                  <p className="text-on-surface-variant font-mono">{viewDetailClaim.patientPhone || 'No Phone'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface">
                    {viewDetailClaim.status}
                  </span>
                  <p className="text-[10px] text-on-surface-variant mt-1 font-mono">{viewDetailClaim.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/25">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Bill Amount</span>
                  <p className="font-bold text-sm text-on-surface font-mono">₹{viewDetailClaim.billAmount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Approved</span>
                  <p className="font-bold text-sm text-blue-700 font-mono">₹{viewDetailClaim.approvedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Settled / Paid</span>
                  <p className="font-bold text-sm text-emerald-700 font-mono">₹{(viewDetailClaim.settledAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Outstanding</span>
                  <p className="font-bold text-sm text-error font-mono">₹{(viewDetailClaim.outstandingAmount || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-on-surface">
                {viewDetailClaim.type === 'MJPJAY' ? (
                  <>
                    <p><strong>Package:</strong> {viewDetailClaim.packageName || 'N/A'}</p>
                    <p><strong>Package Code:</strong> {viewDetailClaim.packageCode || 'N/A'}</p>
                    <p><strong>Ration/Golden Card:</strong> {viewDetailClaim.rationCardNumber || 'N/A'}</p>
                    <p><strong>Pre-Auth ID:</strong> {viewDetailClaim.preAuthNumber || 'N/A'}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Insurance Company:</strong> {viewDetailClaim.insuranceCompany || 'N/A'}</p>
                    <p><strong>TPA Desk:</strong> {viewDetailClaim.tpaName || 'N/A'}</p>
                    <p><strong>Policy Number:</strong> {viewDetailClaim.policyNumber || 'N/A'}</p>
                    <p><strong>Pre-Auth Reference:</strong> {viewDetailClaim.preAuthNumber || 'N/A'}</p>
                    {viewDetailClaim.coPayAmount && <p><strong>Patient Co-Pay:</strong> ₹{viewDetailClaim.coPayAmount.toLocaleString()}</p>}
                  </>
                )}
                <p><strong>Hospital / Ward:</strong> {viewDetailClaim.hospitalName || 'N/A'}</p>
                {viewDetailClaim.doctorName && <p><strong>Doctor:</strong> {viewDetailClaim.doctorName}</p>}
                {viewDetailClaim.settlementDate && <p><strong>Settlement Date:</strong> {viewDetailClaim.settlementDate}</p>}
                {viewDetailClaim.settlementRef && <p><strong>Settlement UTR:</strong> {viewDetailClaim.settlementRef}</p>}
                {viewDetailClaim.remarks && <p><strong>Remarks:</strong> {viewDetailClaim.remarks}</p>}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setViewDetailClaim(null)}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/95 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
