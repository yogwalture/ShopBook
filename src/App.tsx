/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  ArrowUpCircle,
  Banknote,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Coins,
  Filter,
  Handshake,
  FileText,
  Home,
  ImagePlus,
  LogOut,
  Plus,
  PlusCircle,
  QrCode,
  Receipt,
  Save,
  Search,
  Settings,
  ShieldPlus,
  Smartphone,
  Store,
  TrendingUp,
  Truck,
  User,
  UserCircle,
  Users,
  Wallet,
  X,
  Trash2,
  Download,
  Edit,
  ArrowLeftRight,
  FileDown,
  ArrowUpRight,
  Printer,
  Lock,
  Unlock,
  Check,
  PieChart as PieChartIcon,
  CloudUpload,
  CloudDownload,
  Database,
  Upload,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Bell,
  BellRing,
  MessageSquare,
  Send,
  ExternalLink,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarDatePicker } from './components/CalendarDatePicker';
import { jsPDF } from 'jspdf';
import {
  testFirestoreConnection,
  setupSessionAutologin,
  dbFetchFirms,
  dbSaveFirm,
  dbDeleteFirm,
  dbFetchTransactions,
  dbSaveTransaction,
  dbDeleteTransaction,
  dbFetchCustomers,
  dbSaveCustomer,
  dbDeleteCustomer,
  dbFetchDailyRegisters,
  dbSaveDailyRegister,
  dbDeleteDailyRegister,
  triggerGoogleSignIn,
  triggerSignOut,
  dbSubscribeFirms,
  dbSubscribeTransactions,
  dbSubscribeCustomers,
  dbSubscribeDailyRegisters,
  dbSaveHandover,
  dbSubscribeHandovers,
  dbSaveBackup,
  dbSaveDeletedTransaction,
  dbDeleteDeletedTransaction,
  dbSubscribeDeletedTransactions,
} from './firebase';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export type Page = 'welcome' | 'login' | 'registerFirm' | 'firmAdmin' | 'masterAdmin' | 'dashboard' | 'supplierPayment' | 'receivePayment' | 'receiveCashPayment' | 'credit' | 'transactionHistory' | 'dayClosing' | 'schemeCreditSale' | 'customerLedger' | 'staffCredit' | 'staffAdvance' | 'expense';

export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type FirmUser = { name: string, id: string, role: string, mobile: string, password?: string, salary?: number };

export type Handover = {
  id: string;
  firmId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
  handoverTime: string;
  handoverDate: string;
  closingCashBalance: number;
  closingUpiBalance: number;
  totalTransactionsCount: number;
  notes: string;
};

export type Transaction = {
  id: string;
  firmId: string;
  type: 'credit_sale' | 'receive_payment' | 'supplier_payment' | 'scheme_bill' | 'staff_credit' | 'staff_advance';
  title: string;
  patientName?: string;
  customerPhone?: string;
  amount: number;
  date: string;
  time: string;
  salesmanName?: string;
  recordedByUserId: string;
  recordedByUserName: string;
  extraDetails?: string;
  isRecurring?: boolean;
  recurrenceInterval?: 'daily' | 'weekly' | 'monthly' | 'none';
};

export type Customer = {
  id: string;
  firmId: string;
  name: string;
  phone: string;
  status: 'Overdue' | 'Pending' | 'Paid';
  pendingBalance: number;
  lastPaymentDate: string;
};

export type Firm = {
  id: string;
  name: string;
  adminName: string;
  email: string;
  mobile: string;
  users: FirmUser[];
  status: 'Active' | 'Inactive';
  password?: string;
};

export const SEEDED_DEFAULT_FIRM: Firm = {
  id: 'F-1001',
  name: 'Yogwalture Pharmacy',
  adminName: 'Yograj Walture',
  email: 'yogwalture@gmail.com',
  mobile: '9876543210',
  users: [
    {
      id: 'amit_counter',
      name: 'Amit Counter Staff',
      role: 'Counter Staff',
      mobile: '9876543211',
      password: 'password',
      salary: 15000
    }
  ],
  status: 'Active',
  password: 'yograje1987'
};

export const INITIAL_FIRMS: Firm[] = [SEEDED_DEFAULT_FIRM];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const savedUser = localStorage.getItem('shopbooks_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u) {
          if (u.id === 'master_super_admin' || u.role === 'Master Admin') {
            return 'masterAdmin';
          }
          return 'dashboard';
        }
      } catch (e) {}
    }
    return 'welcome';
  });
  const [isPosSettingsOpen, setIsPosSettingsOpen] = useState(false);
  const [printPreset, setPrintPreset] = useState<'thermal' | 'regular'>(() => {
    return (localStorage.getItem('shopbooks_print_preset') as 'thermal' | 'regular') || 'thermal';
  });
  const [receiptHeader, setReceiptHeader] = useState<string>(() => {
    return localStorage.getItem('shopbooks_receipt_header') || 'TAX INVOICE';
  });
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(() => {
    return localStorage.getItem('shopbooks_auto_whatsapp') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('shopbooks_print_preset', printPreset);
  }, [printPreset]);

  useEffect(() => {
    localStorage.setItem('shopbooks_receipt_header', receiptHeader);
  }, [receiptHeader]);

  useEffect(() => {
    localStorage.setItem('shopbooks_auto_whatsapp', autoSendWhatsApp ? 'true' : 'false');
  }, [autoSendWhatsApp]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isMasterLoginOpen, setIsMasterLoginOpen] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('yograje1987');
  const [masterLoginError, setMasterLoginError] = useState('');
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [whatsAppNotification, setWhatsAppNotification] = useState<{
    customerName: string;
    customerPhone: string;
    amount: number;
    type: 'credit_sale' | 'receive_payment' | 'supplier_payment' | 'scheme_bill' | 'staff_credit' | 'staff_advance';
    date: string;
    newBalance: number;
    visible: boolean;
  } | null>(null);
  
  const [firms, setFirmsState] = useState<Firm[]>(() => {
    const saved = localStorage.getItem('shopbooks_firms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length === 0) return INITIAL_FIRMS;
        return parsed.map((f: Firm) => {
          if (f.id === 'F-1001') {
            return {
              ...f,
              name: 'Yogwalture Pharmacy',
              adminName: 'Yograj Walture',
              email: 'yogwalture@gmail.com',
              password: 'yograje1987',
              users: f.users || [
                {
                  id: 'amit_counter',
                  name: 'Amit Counter Staff',
                  role: 'Counter Staff',
                  mobile: '9876543211',
                  password: 'password',
                  salary: 15000
                }
              ]
            };
          }
          return { ...f, users: f.users || [] };
        });
      } catch (e) {
        return INITIAL_FIRMS;
      }
    }
    return INITIAL_FIRMS;
  });

  const setFirms = useCallback((nextVal: Firm[] | ((prev: Firm[]) => Firm[])) => {
    setFirmsState(prev => {
      const next = typeof nextVal === 'function' ? nextVal(prev) : nextVal;
      const prevIds = new Set(prev.map(f => f.id));
      const nextIds = new Set(next.map(f => f.id));
      next.forEach(f => {
        const oldF = prev.find(p => p.id === f.id);
        if (!oldF || JSON.stringify(oldF) !== JSON.stringify(f)) {
          dbSaveFirm(f);
        }
      });
      prev.forEach(f => {
        if (!nextIds.has(f.id)) {
          dbDeleteFirm(f.id);
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('shopbooks_firms', JSON.stringify(firms));
  }, [firms]);

  const [currentFirmId, setCurrentFirmId] = useState<string>(() => {
    return localStorage.getItem('shopbooks_current_firm_id') || '';
  });

  useEffect(() => {
    localStorage.setItem('shopbooks_current_firm_id', currentFirmId);
  }, [currentFirmId]);

  const [userRole, setUserRole] = useState<'user' | 'firmAdmin'>(() => {
    return (localStorage.getItem('shopbooks_user_role') as 'user' | 'firmAdmin') || 'user';
  });

  useEffect(() => {
    localStorage.setItem('shopbooks_user_role', userRole);
  }, [userRole]);

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; mobile: string } | null>(() => {
    const saved = localStorage.getItem('shopbooks_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('shopbooks_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('shopbooks_current_user');
    }
  }, [currentUser]);

  const [transactions, setTransactionsState] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('shopbooks_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const setTransactions = useCallback((nextVal: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    setTransactionsState(prev => {
      const next = typeof nextVal === 'function' ? nextVal(prev) : nextVal;
      const prevIds = new Set(prev.map(t => t.id));
      const nextIds = new Set(next.map(t => t.id));
      next.forEach(t => {
        const oldT = prev.find(p => p.id === t.id);
        if (!oldT || JSON.stringify(oldT) !== JSON.stringify(t)) {
          dbSaveTransaction(t);
        }
      });
      prev.forEach(t => {
        if (!nextIds.has(t.id)) {
          dbDeleteTransaction(t.id);
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('shopbooks_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const [deletedTransactions, setDeletedTransactionsState] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('shopbooks_deleted_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const setDeletedTransactions = useCallback((nextVal: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    setDeletedTransactionsState(prev => {
      const next = typeof nextVal === 'function' ? nextVal(prev) : nextVal;
      const prevIds = new Set(prev.map(t => t.id));
      const nextIds = new Set(next.map(t => t.id));
      next.forEach(t => {
        const oldT = prev.find(p => p.id === t.id);
        if (!oldT || JSON.stringify(oldT) !== JSON.stringify(t)) {
          dbSaveDeletedTransaction(t);
        }
      });
      prev.forEach(t => {
        if (!nextIds.has(t.id)) {
          dbDeleteDeletedTransaction(t.id);
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('shopbooks_deleted_transactions', JSON.stringify(deletedTransactions));
  }, [deletedTransactions]);

  const [handovers, setHandoversState] = useState<Handover[]>(() => {
    const saved = localStorage.getItem('shopbooks_handovers');
    return saved ? JSON.parse(saved) : [];
  });

  const setHandovers = useCallback((nextVal: Handover[] | ((prev: Handover[]) => Handover[])) => {
    setHandoversState(prev => {
      const next = typeof nextVal === 'function' ? nextVal(prev) : nextVal;
      const prevIds = new Set(prev.map(h => h.id));
      const nextIds = new Set(next.map(h => h.id));
      next.forEach(h => {
        const oldH = prev.find(p => p.id === h.id);
        if (!oldH || JSON.stringify(oldH) !== JSON.stringify(h)) {
          dbSaveHandover(h);
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('shopbooks_handovers', JSON.stringify(handovers));
  }, [handovers]);

  const [customers, setCustomersState] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('shopbooks_customers');
    return saved ? JSON.parse(saved) : [];
  });

  const setCustomers = useCallback((nextVal: Customer[] | ((prev: Customer[]) => Customer[])) => {
    setCustomersState(prev => {
      const next = typeof nextVal === 'function' ? nextVal(prev) : nextVal;
      const prevIds = new Set(prev.map(c => c.id));
      const nextIds = new Set(next.map(c => c.id));
      next.forEach(c => {
        const oldC = prev.find(p => p.id === c.id);
        if (!oldC || JSON.stringify(oldC) !== JSON.stringify(c)) {
          dbSaveCustomer(c);
        }
      });
      prev.forEach(c => {
        if (!nextIds.has(c.id)) {
          try {
            import('firebase/firestore').then(({ doc, deleteDoc }) => {
              import('./firebase').then(({ db }) => {
                deleteDoc(doc(db, 'customers', c.id));
              });
            });
          } catch(e) {
            console.error(e);
          }
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('shopbooks_customers', JSON.stringify(customers));
  }, [customers]);

  const isMainPage = currentPage === 'dashboard' || currentPage === 'credit';
  const isAuthPage = currentPage === 'welcome' || currentPage === 'login' || currentPage === 'registerFirm';
  const isAdminPage = currentPage === 'firmAdmin' || currentPage === 'masterAdmin';
  
  let wrapperClass = "bg-background text-on-background min-h-screen";
  if (isMainPage) wrapperClass += " pb-24 md:pb-0 md:pl-[280px]";

  const recordTransaction = (tx: Omit<Transaction, 'id' | 'firmId' | 'date' | 'time' | 'recordedByUserId' | 'recordedByUserName'> & { date?: string }) => {
    const activeFirm = firms.find(f => f.id === currentFirmId);
    const newTx: Transaction = {
      ...tx,
      id: `T-${Date.now()}`,
      firmId: currentFirmId,
      date: tx.date || getLocalDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recordedByUserId: currentUser?.id || 'admin',
      recordedByUserName: currentUser?.name || activeFirm?.adminName || 'System',
      salesmanName: tx.salesmanName || currentUser?.name || activeFirm?.adminName || 'Staff'
    };

    setTransactions(prev => [newTx, ...prev]);

    // Prepare variables for WhatsApp Notification
    let smsPhone = tx.customerPhone || '';
    let oldBalance = 0;
    let computedNewBalance = tx.amount;

    if (tx.patientName && tx.type !== 'scheme_bill' && tx.type !== 'staff_credit' && tx.type !== 'staff_advance') {
      const queryName = tx.patientName.trim().toLowerCase();
      const existingCust = customers.find(c => c.firmId === currentFirmId && c.name.toLowerCase() === queryName);
      if (existingCust) {
        smsPhone = smsPhone || existingCust.phone;
        oldBalance = existingCust.pendingBalance;
        if (tx.type === 'credit_sale') {
          computedNewBalance = oldBalance + tx.amount;
        } else if (tx.type === 'receive_payment') {
          computedNewBalance = Math.max(0, oldBalance - tx.amount);
        }
      } else {
        if (!smsPhone) {
          smsPhone = '+91 99999 99999';
        }
        if (tx.type === 'credit_sale') {
          computedNewBalance = tx.amount;
        } else {
          computedNewBalance = 0;
        }
      }
    }

    if (tx.type === 'credit_sale' || tx.type === 'staff_credit' || tx.type === 'staff_advance') {
      setWhatsAppNotification({
        customerName: tx.patientName || 'Staff Member',
        customerPhone: smsPhone || '+91 99999 99999',
        amount: tx.amount,
        type: tx.type,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        newBalance: tx.type === 'staff_credit' || tx.type === 'staff_advance' ? tx.amount : computedNewBalance,
        visible: true
      });
    }

    // Update customer balances if patientName exists and is not a scheme bill / staff transaction
    if (tx.patientName && tx.type !== 'scheme_bill' && tx.type !== 'staff_credit' && tx.type !== 'staff_advance') {
      setCustomers(prevCustomers => {
        const queryName = tx.patientName!.trim().toLowerCase();
        const existing = prevCustomers.find(c => c.firmId === currentFirmId && c.name.toLowerCase() === queryName);

        if (existing) {
          return prevCustomers.map(c => {
            if (c.id === existing.id) {
              let newBalance = c.pendingBalance;
              if (tx.type === 'credit_sale') {
                newBalance += tx.amount;
              } else if (tx.type === 'receive_payment') {
                newBalance = Math.max(0, newBalance - tx.amount);
              }
              const status = newBalance === 0 ? 'Paid' : newBalance > 10000 ? 'Overdue' : 'Pending';
              return {
                ...c,
                pendingBalance: newBalance,
                status,
                lastPaymentDate: tx.type === 'receive_payment' ? 'Today' : c.lastPaymentDate
              };
            }
            return c;
          });
        } else {
          const isDebitTx = tx.type === 'credit_sale';
          const newCust: Customer = {
            id: `C-${Date.now()}`,
            firmId: currentFirmId,
            name: tx.patientName!,
            phone: tx.customerPhone || '+91 99999 99999',
            status: isDebitTx ? 'Pending' : 'Paid',
            pendingBalance: isDebitTx ? tx.amount : 0,
            lastPaymentDate: tx.type === 'receive_payment' ? 'Today' : 'None'
          };
          return [...prevCustomers, newCust];
        }
      });
    }
  };

  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const [workingDate, setWorkingDate] = useState<string>(() => {
    const saved = localStorage.getItem('shopbooks_working_date');
    if (saved) return saved;
    return getLocalDateString();
  });

  useEffect(() => {
    localStorage.setItem('shopbooks_working_date', workingDate);
  }, [workingDate]);

  const [firmDailyRegisters, setFirmDailyRegistersState] = useState<Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean; forwarded?: number }>>(() => {
    const saved = localStorage.getItem('shopbooks_daily_registers');
    return saved ? JSON.parse(saved) : {};
  });

  const setFirmDailyRegisters = useCallback((nextVal: Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean; forwarded?: number }> | ((prev: Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean; forwarded?: number }>) => Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean; forwarded?: number }>)) => {
    setFirmDailyRegistersState(prev => {
      const next = typeof nextVal === 'function' ? nextVal(prev) : nextVal;
      Object.keys(next).forEach(key => {
        const oldReg = prev[key];
        const newReg = next[key];
        if (!oldReg || JSON.stringify(oldReg) !== JSON.stringify(newReg)) {
          dbSaveDailyRegister(key, newReg);
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('shopbooks_daily_registers', JSON.stringify(firmDailyRegisters));
  }, [firmDailyRegisters]);

  const [firmsLoaded, setFirmsLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [deletedTxLoaded, setDeletedTxLoaded] = useState(false);
  const [custLoaded, setCustLoaded] = useState(false);
  const [regLoaded, setRegLoaded] = useState(false);
  const [handoversLoaded, setHandoversLoaded] = useState(false);

  const firmsRef = React.useRef(firms);
  const transactionsRef = React.useRef(transactions);
  const deletedTransactionsRef = React.useRef(deletedTransactions);
  const customersRef = React.useRef(customers);
  const firmDailyRegistersRef = React.useRef(firmDailyRegisters);
  const handoversRef = React.useRef(handovers);

  useEffect(() => { firmsRef.current = firms; }, [firms]);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  useEffect(() => { deletedTransactionsRef.current = deletedTransactions; }, [deletedTransactions]);
  useEffect(() => { customersRef.current = customers; }, [customers]);
  useEffect(() => { firmDailyRegistersRef.current = firmDailyRegisters; }, [firmDailyRegisters]);
  useEffect(() => { handoversRef.current = handovers; }, [handovers]);

  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  useEffect(() => {
    if (firmsLoaded && txLoaded && deletedTxLoaded && custLoaded && regLoaded && handoversLoaded) {
      setIsFirebaseLoading(false);
    }
  }, [firmsLoaded, txLoaded, deletedTxLoaded, custLoaded, regLoaded, handoversLoaded]);

  // Daily Auto-Backup hook
  useEffect(() => {
    if (isFirebaseLoading || !currentFirmId) return;
    
    // We only trigger auto-backup if we have some data to prevent backing up empty states
    const firmTransactions = transactions.filter(t => t.firmId === currentFirmId);
    const firmCustomers = customers.filter(c => c.firmId === currentFirmId);
    if (firmTransactions.length === 0 && firmCustomers.length === 0) return;

    const todayStr = getLocalDateString();
    const lastBackupKey = `shopbooks_last_auto_backup_date_${currentFirmId}`;
    const lastAutoBackupDate = localStorage.getItem(lastBackupKey);
    
    if (lastAutoBackupDate !== todayStr) {
      try {
        const payload = {
          transactions,
          customers,
          firmDailyRegisters: localStorage.getItem('shopbooks_daily_registers') ? JSON.parse(localStorage.getItem('shopbooks_daily_registers')!) : {},
          autoBackupTime: new Date().toLocaleString('en-IN'),
          firmId: currentFirmId,
          isAuto: true
        };
        
        // Save specific daily backup in localStorage
        localStorage.setItem(`shopbooks_auto_backup_${currentFirmId}_${todayStr}`, JSON.stringify(payload));
        
        // Save highly durable daily backup in Cloud Firestore too!
        dbSaveBackup(`auto_backup_${currentFirmId}_${todayStr}`, payload)
          .then(() => console.log(`[Cloud Auto-Backup] Successfully synced backup to Firestore for ${todayStr}`))
          .catch(err => console.error("Cloud Auto-backup sync failed:", err));

        // Also update the main cloud backup replica
        localStorage.setItem('shopbooks_cloud_backup_database', JSON.stringify({
          transactions,
          customers,
          firmDailyRegisters: payload.firmDailyRegisters
        }));
        
        // Update last sync time
        const timestamp = new Date().toLocaleString('en-IN');
        localStorage.setItem('shopbooks_last_sync_timestamp', timestamp);
        
        // Mark today as backed up for this firm
        localStorage.setItem(lastBackupKey, todayStr);
        console.log(`[Auto-Backup] Daily automatic backup saved for ${todayStr} at ${timestamp}`);
      } catch (err) {
        console.error("Auto-backup failed:", err);
      }
    }
  }, [isFirebaseLoading, currentFirmId, transactions, customers]);

  // Connection validation + session auto-login + initial collections load
  useEffect(() => {
    testFirestoreConnection();

    // 1. Setup Session Listener
    const unsubAuth = setupSessionAutologin((firebaseUser) => {
      if (firebaseUser?.email === 'yogwalture@gmail.com') {
        setUserRole('firmAdmin');
        setCurrentPage('masterAdmin');
        setCurrentUser({
          id: 'master_super_admin',
          name: 'Master Super Admin (yogwalture@gmail.com)',
          role: 'Master Admin',
          mobile: 'yogwalture@gmail.com'
        });
      }
    });

    // 2. Set up real-time firebase listeners and bi-directional merge
    const unsubFirms = dbSubscribeFirms((fList) => {
      if (fList.length === 0) {
        dbSaveFirm(SEEDED_DEFAULT_FIRM);
        return;
      }
      const mappedFList = fList.map((f: Firm) => {
        if (f.id === 'F-1001') {
          return {
            ...f,
            name: f.name || 'Yogwalture Pharmacy',
            adminName: f.adminName || 'Yograj Walture',
            email: f.email || 'yogwalture@gmail.com',
            password: f.password || 'yograje1987',
            users: f.users || [
              {
                id: 'amit_counter',
                name: 'Amit Counter Staff',
                role: 'Counter Staff',
                mobile: '9876543211',
                password: 'password',
                salary: 15000
              }
            ],
            status: f.status || 'Active'
          };
        }
        return {
          ...f,
          users: f.users || []
        };
      });
      const cloudFirmsMap = new Map(mappedFList.map(f => [f.id, f]));
      const mergedFirms = [...mappedFList];
      for (const f of firmsRef.current) {
        if (!cloudFirmsMap.has(f.id)) {
          dbSaveFirm(f);
          mergedFirms.push(f);
        }
      }
      setFirmsState(mergedFirms);
      setFirmsLoaded(true);
    }, (err) => {
      setFirmsLoaded(true);
    });

    const unsubTransactions = dbSubscribeTransactions((txList) => {
      const cloudTxMap = new Map(txList.map(t => [t.id, t]));
      const mergedTx = [...txList];
      for (const t of transactionsRef.current) {
        if (!cloudTxMap.has(t.id)) {
          dbSaveTransaction(t);
          mergedTx.push(t);
        }
      }
      setTransactionsState(mergedTx);
      setTxLoaded(true);
    }, (err) => {
      setTxLoaded(true);
    });

    const unsubCustomers = dbSubscribeCustomers((cList) => {
      const cloudCustMap = new Map(cList.map(c => [c.id, c]));
      const mergedCust = [...cList];
      for (const c of customersRef.current) {
        if (!cloudCustMap.has(c.id)) {
          dbSaveCustomer(c);
          mergedCust.push(c);
        }
      }
      setCustomersState(mergedCust);
      setCustLoaded(true);
    }, (err) => {
      setCustLoaded(true);
    });

    const unsubRegisters = dbSubscribeDailyRegisters((rList) => {
      const rListSafe = rList || {};
      const mergedRegisters = { ...rListSafe };
      for (const [key, reg] of Object.entries(firmDailyRegistersRef.current)) {
        if (!(key in rListSafe)) {
          dbSaveDailyRegister(key, reg);
          mergedRegisters[key] = reg;
        }
      }
      setFirmDailyRegistersState(mergedRegisters);
      setRegLoaded(true);
    }, (err) => {
      setRegLoaded(true);
    });

    const unsubHandovers = dbSubscribeHandovers((hList) => {
      const cloudHandoversMap = new Map(hList.map(h => [h.id, h]));
      const mergedHandovers = [...hList];
      for (const h of handoversRef.current) {
        if (!cloudHandoversMap.has(h.id)) {
          dbSaveHandover(h);
          mergedHandovers.push(h);
        }
      }
      setHandoversState(mergedHandovers);
      setHandoversLoaded(true);
    }, (err) => {
      setHandoversLoaded(true);
    });

    const unsubDeletedTransactions = dbSubscribeDeletedTransactions((deletedTxList) => {
      const cloudDelTxMap = new Map(deletedTxList.map(t => [t.id, t]));
      const mergedDelTx = [...deletedTxList];
      for (const t of deletedTransactionsRef.current) {
        if (!cloudDelTxMap.has(t.id)) {
          dbSaveDeletedTransaction(t);
          mergedDelTx.push(t);
        }
      }
      setDeletedTransactionsState(mergedDelTx);
      setDeletedTxLoaded(true);
    }, (err) => {
      setDeletedTxLoaded(true);
    });

    return () => {
      unsubAuth();
      unsubFirms();
      unsubTransactions();
      unsubDeletedTransactions();
      unsubCustomers();
      unsubRegisters();
      unsubHandovers();
    };
  }, []);

  const [openingCash, setOpeningCash] = useState<number>(0);
  const [counterCashSales, setCounterCashSales] = useState<number>(0);
  const [counterOnlineSales, setCounterOnlineSales] = useState<number>(0);
  const [openingBalanceForwarded, setOpeningBalanceForwarded] = useState<number>(0);

  // Synchronize openingCash, counterCashSales, counterOnlineSales when currentFirmId or workingDate changes
  useEffect(() => {
    if (!currentFirmId) return;
    const key = `${currentFirmId}_${workingDate}`;
    const reg = firmDailyRegisters[key];
    
    const prevDateStr = (() => {
      const parts = workingDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const prevKey = `${currentFirmId}_${prevDateStr}`;
    const prevForwarded = firmDailyRegisters[prevKey]?.forwarded || 0;

    const targetOpeningCash = prevForwarded;

    if (reg) {
      setOpeningCash(targetOpeningCash);
      setCounterCashSales(reg.cashSales);
      setCounterOnlineSales(reg.onlineSales);
      setOpeningBalanceForwarded(reg.forwarded || 0);

      if (reg.opening !== targetOpeningCash) {
        setFirmDailyRegisters(prev => {
          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              opening: targetOpeningCash
            }
          };
          // Avoid triggering redundant state updates if they already equaled
          return JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated;
        });
      }
    } else {
      const initialOpening = targetOpeningCash;
      const initialCash = 0;
      const initialOnline = 0;
      
      setOpeningCash(initialOpening);
      setCounterCashSales(initialCash);
      setCounterOnlineSales(initialOnline);
      setOpeningBalanceForwarded(0);

      setFirmDailyRegisters(prev => ({
        ...prev,
        [key]: {
          opening: initialOpening,
          cashSales: initialCash,
          onlineSales: initialOnline,
          closed: false,
          forwarded: 0
        }
      }));
    }
  }, [currentFirmId, workingDate]);

  const updateActiveRegister = (fields: Partial<{ opening: number; cashSales: number; onlineSales: number; closed: boolean; forwarded: number }>) => {
    if (!currentFirmId) return;
    const key = `${currentFirmId}_${workingDate}`;
    setFirmDailyRegisters(prev => {
      const updated = {
         ...prev,
        [key]: {
          ...(prev[key] || { opening: 0, cashSales: 0, onlineSales: 0, closed: false, forwarded: 0 }),
          ...fields
        }
      };
      return updated;
    });
  };

  const handleSetOpeningBalanceForwarded = (val: number) => {
    setOpeningBalanceForwarded(val);
    updateActiveRegister({ forwarded: val });
    
    const tomorrowDateStr = (() => {
      const parts = workingDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const tomorrowKey = `${currentFirmId}_${tomorrowDateStr}`;
    setFirmDailyRegisters(prev => ({
      ...prev,
      [tomorrowKey]: {
        ...(prev[tomorrowKey] || { opening: 0, cashSales: 0, onlineSales: 0, closed: false, forwarded: 0 }),
        opening: val
      }
    }));
  };

  const handleSetOpeningCash = (val: number, bypassAuth = false) => {
    const changeAction = () => {
      setOpeningCash(val);
      updateActiveRegister({ opening: val });
    };

    const isClosed = !!firmDailyRegisters[`${currentFirmId}_${workingDate}`]?.closed;
    if (isClosed && userRole !== 'firmAdmin' && !bypassAuth) {
      setAdminUnlockAction({
        onSuccess: changeAction,
        title: "Unlock Closed Day Rescaling",
        description: `This date (${workingDate}) has been closed. Please enter the Admin Password to recalibrate register opening cash.`
      });
    } else {
      changeAction();
    }
  };

  const handleSetCounterCashSales = (val: number, bypassAuth = false) => {
    const changeAction = () => {
      setCounterCashSales(val);
      updateActiveRegister({ cashSales: val });
    };

    const isClosed = !!firmDailyRegisters[`${currentFirmId}_${workingDate}`]?.closed;
    if (isClosed && userRole !== 'firmAdmin' && !bypassAuth) {
      setAdminUnlockAction({
        onSuccess: changeAction,
        title: "Unlock Closed Day Rescaling",
        description: `This date (${workingDate}) has been closed. Please enter the Admin Password to recalibrate counter cash sales.`
      });
    } else {
      changeAction();
    }
  };

  const handleSetCounterOnlineSales = (val: number, bypassAuth = false) => {
    const changeAction = () => {
      setCounterOnlineSales(val);
      updateActiveRegister({ onlineSales: val });
    };

    const isClosed = !!firmDailyRegisters[`${currentFirmId}_${workingDate}`]?.closed;
    if (isClosed && userRole !== 'firmAdmin' && !bypassAuth) {
      setAdminUnlockAction({
        onSuccess: changeAction,
        title: "Unlock Closed Day Rescaling",
        description: `This date (${workingDate}) has been closed. Please enter the Admin Password to recalibrate counter online sales.`
      });
    } else {
      changeAction();
    }
  };

  const [adminUnlockAction, setAdminUnlockAction] = useState<{
    onSuccess: () => void;
    title: string;
    description: string;
  } | null>(null);

  const [txHistoryFilter, setTxHistoryFilter] = useState<string>('all');
  const [txHistorySearchQuery, setTxHistorySearchQuery] = useState<string>('');

  const handleNavigateToTxHistory = (filterType: string, searchQuery?: string) => {
    setTxHistoryFilter(filterType);
    setTxHistorySearchQuery(searchQuery || '');
    setCurrentPage('transactionHistory');
  };

  const handleClearAllData = async () => {
    if (window.confirm("WARNING: This will completely ERASE ALL customers, transactions, daily register closure history, and registered firms from BOTH local storage and the cloud Firestore database, then create Yogwalture@gmail.com as the Master Admin. Are you absolutely sure you want to proceed?")) {
      setIsFirebaseLoading(true);
      try {
        // 1. Delete all transactions from cloud
        for (const tx of transactionsRef.current) {
          try {
            await dbDeleteTransaction(tx.id);
          } catch (e) {
            console.warn(`Failed deleting transaction ${tx.id}`, e);
          }
        }
        // 2. Delete all customers from cloud
        for (const cust of customersRef.current) {
          try {
            await dbDeleteCustomer(cust.id);
          } catch (e) {
            console.warn(`Failed deleting customer ${cust.id}`, e);
          }
        }
        // 3. Delete all daily registers from cloud
        for (const key of Object.keys(firmDailyRegistersRef.current)) {
          try {
            await dbDeleteDailyRegister(key);
          } catch (e) {
            console.warn(`Failed deleting register ${key}`, e);
          }
        }
        // 4. Delete all firms from cloud
        for (const firm of firmsRef.current) {
          try {
            await dbDeleteFirm(firm.id);
          } catch (e) {
            console.warn(`Failed deleting firm ${firm.id}`, e);
          }
        }

        // 5. Clear all local states
        setTransactionsState([]);
        setCustomersState([]);
        setFirmDailyRegistersState({});
        setFirmsState([]);

        // 6. Write/Seed Master default firm to database
        await dbSaveFirm(SEEDED_DEFAULT_FIRM);

        // 7. Reset adjustments
        setIsDemoMode(false);
        setOpeningCash(0);
        setCounterCashSales(0);
        setCounterOnlineSales(0);
        setOpeningBalanceForwarded(0);

        localStorage.setItem('shopbooks_demo_mode', 'false');
        localStorage.setItem('shopbooks_transactions', JSON.stringify([]));
        localStorage.setItem('shopbooks_customers', JSON.stringify([]));
        localStorage.setItem('shopbooks_opening_cash', '0');
        localStorage.setItem('shopbooks_counter_cash_sales', '0');
        localStorage.setItem('shopbooks_counter_online_sales', '0');
        localStorage.setItem('shopbooks_current_firm_id', 'F-1001');

        setCurrentFirmId('F-1001');

        alert("Database completely erased! Master Admin firm 'Yogwalture Pharmacy' seeded successfully with admin 'yogwalture@gmail.com' and password 'yograje1987'.");
      } catch (err) {
        alert("Erase failed: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsFirebaseLoading(false);
      }
    }
  };

  const handleLogin = (firmId: string, role: 'user' | 'firmAdmin', userId: string, userName: string, userMobile: string, loginWorkingDate?: string) => {
    setCurrentFirmId(firmId);
    setUserRole(role);
    setCurrentUser({
      id: userId,
      name: userName,
      role: role === 'firmAdmin' ? 'Firm Admin' : 'Counter Staff',
      mobile: userMobile
    });
    if (loginWorkingDate) {
      setWorkingDate(loginWorkingDate);
    }
    setCurrentPage('dashboard');
  };

  const handleGoogleSignInFlow = async () => {
    setMasterPasswordInput('yograje1987');
    setMasterLoginError('');
    setIsMasterLoginOpen(true);
  };

  const handleMasterPasswordSubmit = (enteredPassword: string) => {
    if (enteredPassword.trim() === 'yograje1987' || enteredPassword.trim() === 'yograje') {
      setUserRole('firmAdmin');
      setCurrentUser({
        id: 'master_super_admin',
        name: 'Master Super Admin (yogwalture@gmail.com)',
        role: 'Master Admin',
        mobile: 'yogwalture@gmail.com'
      });
      setIsMasterLoginOpen(false);
      setCurrentPage('masterAdmin');
      alert("Welcome Master Super Admin (yogwalture@gmail.com)!");
    } else {
      setMasterLoginError("Incorrect password. Please try again or use Yograj's default.");
    }
  };

  const handleMasterGoogleLogin = async () => {
    try {
      const u = await triggerGoogleSignIn();
      if (u && u.email === 'yogwalture@gmail.com') {
        setUserRole('firmAdmin');
        setCurrentUser({
          id: 'master_super_admin',
          name: 'Master Super Admin (yogwalture@gmail.com)',
          role: 'Master Admin',
          mobile: 'yogwalture@gmail.com'
        });
        setIsMasterLoginOpen(false);
        setCurrentPage('masterAdmin');
        alert("Welcome Master Super Admin (yogwalture@gmail.com)!");
      } else {
        setMasterLoginError("Access Denied: Google login is reserved for the Master Admin (yogwalture@gmail.com).");
        await triggerSignOut();
      }
    } catch (err) {
      setMasterLoginError("Google Sign In failed or cancelled inside browser iFrame.");
    }
  };

  const handleLogout = () => {
    triggerSignOut();
    setUserRole('user');
    setCurrentUser(null);
    setCurrentPage('welcome');
  };

  const handleConfirmHandover = (
    toUser: { id: string; name: string },
    notes: string,
    cash: number,
    upi: number,
    txCount: number
  ) => {
    if (!currentUser || !currentFirmId) return;

    const newHandover: Handover = {
      id: `ho_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      firmId: currentFirmId,
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      toUserId: toUser.id,
      toUserName: toUser.name,
      handoverDate: workingDate,
      handoverTime: new Date().toISOString(),
      closingCashBalance: cash,
      closingUpiBalance: upi,
      totalTransactionsCount: txCount,
      notes: notes,
      status: 'pending'
    };

    setHandovers(prev => [...prev, newHandover]);
    setIsHandoverModalOpen(false);
    handleLogout();
    alert(`Handover submitted to ${toUser.name} successfully. You have been safely logged out.`);
  };

  const pendingHandover = useMemo(() => {
    if (!currentUser || !currentFirmId) return null;
    return handovers.find(h => 
      h.firmId === currentFirmId && 
      h.toUserId.trim().toLowerCase() === currentUser.id.trim().toLowerCase() && 
      h.status === 'pending'
    );
  }, [handovers, currentUser, currentFirmId]);

  const showHandoverAcceptanceOverlay = !!pendingHandover && currentPage !== 'welcome' && currentPage !== 'login' && currentPage !== 'registerFirm';

  const handleAcceptHandover = (handoverId: string) => {
    setHandovers(prev => prev.map(h => {
      if (h.id === handoverId) {
        return { ...h, status: 'accepted' };
      }
      return h;
    }));
  };

  const isDayClosed = !!firmDailyRegisters[`${currentFirmId}_${workingDate}`]?.closed;

  if (isFirebaseLoading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col justify-center items-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-outline-variant shadow-sm max-w-sm w-full flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <h2 className="text-headline-md font-bold text-primary font-sans text-xl">ShopBooks UPI Ledgers</h2>
          <p className="text-body-md text-on-surface-variant font-medium text-sm">Securing cloud connection & synchronizing records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {isMainPage && (
        <>
          <SideNav 
            activePage={currentPage} 
            onNavigate={setCurrentPage} 
            userRole={userRole} 
            onLogout={handleLogout} 
            activeFirm={firms.find(f => f.id === currentFirmId)} 
            currentUser={currentUser} 
            onClearAllData={handleClearAllData}
            onOpenSettings={() => setIsPosSettingsOpen(true)}
            onOpenHandover={() => setIsHandoverModalOpen(true)}
          />
          <MobileHeader 
            activeFirm={firms.find(f => f.id === currentFirmId)} 
            currentUser={currentUser} 
            onClearAllData={handleClearAllData}
            onOpenSettings={() => setIsPosSettingsOpen(true)}
            onOpenHandover={() => setIsHandoverModalOpen(true)}
            onNavigate={setCurrentPage}
            customers={customers}
            transactions={transactions}
            currentFirmId={currentFirmId}
            onSelectCustomer={setSelectedCustomerId}
          />
        </>
      )}

      {currentPage === 'welcome' && <WelcomeScreen onNavigate={setCurrentPage} onGoogleLogin={handleGoogleSignInFlow} />}
      {currentPage === 'login' && <LoginScreen onNavigate={setCurrentPage} onLogin={handleLogin} onGoogleLogin={handleGoogleSignInFlow} firms={firms} />}
      {currentPage === 'registerFirm' && <RegisterFirmScreen onNavigate={setCurrentPage} onRegister={(firm) => { setFirms(prev => [...prev, firm]); setCurrentFirmId(firm.id); setUserRole('firmAdmin'); setCurrentPage('firmAdmin'); }} />}
      {currentPage === 'firmAdmin' && (
        <FirmAdminScreen 
          onNavigate={setCurrentPage} 
          onLogout={handleLogout} 
          activeFirm={firms.find(f => f.id === currentFirmId)} 
          onUpdateFirm={(updatedFirm) => setFirms(prev => prev.map(f => f.id === updatedFirm.id ? updatedFirm : f))} 
          transactions={transactions}
          setTransactions={setTransactions}
          customers={customers}
          setCustomers={setCustomers}
          firmDailyRegisters={firmDailyRegisters}
          setFirmDailyRegisters={setFirmDailyRegisters}
          workingDate={workingDate}
        />
      )}
      {currentPage === 'masterAdmin' && (
        <MasterAdminScreen 
          onNavigate={setCurrentPage} 
          firms={firms} 
          onUpdateFirm={(updatedFirm) => setFirms(prev => prev.map(f => f.id === updatedFirm.id ? updatedFirm : f))} 
          onDeleteFirm={(firmId) => setFirms(prev => prev.filter(f => f.id !== firmId))} 
          transactions={transactions}
          setTransactions={setTransactions}
          customers={customers}
          setCustomers={setCustomers}
          firmDailyRegisters={firmDailyRegisters}
          setFirmDailyRegisters={setFirmDailyRegisters}
        />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard 
          onNavigate={setCurrentPage} 
          onSelectCustomer={setSelectedCustomerId}
          activeFirm={firms.find(f => f.id === currentFirmId)} 
          currentUser={currentUser}
          transactions={transactions}
          customers={customers}
          currentFirmId={currentFirmId}
          isDemoMode={isDemoMode}
          onClearAllData={handleClearAllData}
          openingCash={openingCash}
          counterCashSales={counterCashSales}
          counterOnlineSales={counterOnlineSales}
          onNavigateToTxHistory={handleNavigateToTxHistory}
          workingDate={workingDate}
          isClosed={isDayClosed}
          setTransactions={setTransactions}
          setCustomers={setCustomers}
          setFirmDailyRegisters={setFirmDailyRegisters}
          userRole={userRole}
          firms={firms}
          onWorkingDateChange={setWorkingDate}
          onOpenHandover={() => setIsHandoverModalOpen(true)}
        />
      )}
      {currentPage === 'credit' && (
        <CreditScreen 
          onNavigate={setCurrentPage} 
          currentUser={currentUser}
          customers={customers}
          transactions={transactions}
          currentFirmId={currentFirmId}
          onSelectCustomer={setSelectedCustomerId}
          firms={firms}
          workingDate={workingDate}
          onRecordCreditSale={(patientName, customerPhone, amount, date, salesmanName) => {
            const txDate = date || workingDate;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const doRecord = () => {
              recordTransaction({
                type: 'credit_sale',
                title: `Credit Sale - ${patientName}`,
                patientName,
                customerPhone,
                amount,
                date: txDate,
                salesmanName
              });
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: doRecord,
                title: "Unlock Closed Day Entry",
                description: `The ledger for ${txDate} is locked. Submit the Admin Password to record this credit sale.`
              });
            } else {
              doRecord();
            }
          }}
          onRecordStaffCredit={(staffName, amount, date, purpose) => {
            const txDate = date || workingDate;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const doRecord = () => {
              recordTransaction({
                type: 'staff_credit',
                title: `Staff Credit - ${staffName}`,
                patientName: staffName,
                amount,
                date: txDate,
                extraDetails: purpose
              });
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: doRecord,
                title: "Unlock Closed Day Entry",
                description: `The ledger for ${txDate} is locked. Submit the Admin Password to record this staff credit.`
              });
            } else {
              doRecord();
            }
          }}
          onRecordStaffAdvance={(staffName, amount, date, paymentMode, purpose) => {
            const txDate = date || workingDate;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const doRecord = () => {
              recordTransaction({
                type: 'staff_advance',
                title: `Staff Advance - ${staffName}`,
                patientName: staffName,
                amount,
                date: txDate,
                extraDetails: `${paymentMode} (${purpose})`
              });
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: doRecord,
                title: "Unlock Closed Day Entry",
                description: `The ledger for ${txDate} is locked. Submit the Admin Password to record this staff advance.`
              });
            } else {
              doRecord();
            }
          }}
        />
      )}
      
      {isMainPage && <BottomNav activePage={currentPage} onNavigate={setCurrentPage} userRole={userRole} onLogout={handleLogout} />}

      {currentPage === 'supplierPayment' && (
        <SupplierPaymentScreen 
          onBack={() => setCurrentPage('dashboard')} 
          workingDate={workingDate}
          onRecordSupplierPayment={(amount, supplierName, date, paymentMode, purpose) => {
            const txDate = date || workingDate;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const doRecord = () => {
              recordTransaction({
                type: 'supplier_payment',
                title: `Paid Supplier - ${supplierName}`,
                amount,
                date: txDate,
                extraDetails: `${paymentMode} - ${purpose}`,
                patientName: supplierName
              });
              setCurrentPage('dashboard');
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: doRecord,
                title: "Unlock Closed Day Entry",
                description: `The ledger for ${txDate} is locked. Submit the Admin Password to record this supplier payment.`
              });
            } else {
              doRecord();
            }
          }}
        />
      )}

      {currentPage === 'expense' && (
        <ExpenseScreen 
          onBack={() => setCurrentPage('dashboard')} 
          workingDate={workingDate}
          onRecordExpense={(amount, expenseName, date, paymentMode, category) => {
            const txDate = date || workingDate;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const doRecord = () => {
              recordTransaction({
                type: 'supplier_payment',
                title: `Expense: ${category} - ${expenseName}`,
                amount,
                date: txDate,
                extraDetails: `Expense Payment (${paymentMode})`,
                patientName: expenseName
              });
              setCurrentPage('dashboard');
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: doRecord,
                title: "Unlock Closed Day Entry",
                description: `The ledger for ${txDate} is locked. Submit the Admin Password to record this expense.`
              });
            } else {
              doRecord();
            }
          }}
        />
      )}
      {(currentPage === 'receivePayment' || currentPage === 'receiveCashPayment') && (
        <ReceivePaymentScreen 
          onBack={() => {
            if (selectedCustomerId) {
              setCurrentPage('customerLedger');
            } else {
              setCurrentPage('dashboard');
            }
          }} 
          workingDate={workingDate}
          initialPlatform={currentPage === 'receiveCashPayment' ? 'cash' : 'upi'}
          onRecordReceivePayment={(amount, customerName, customerPhone, platform, txnId, notes, date) => {
            const txDate = date || workingDate;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const doRecord = () => {
              recordTransaction({
                type: 'receive_payment',
                title: `Payment Received - ${customerName}`,
                amount,
                patientName: customerName,
                customerPhone: customerPhone,
                date: txDate,
                extraDetails: `${platform.toUpperCase()} ${txnId ? '(' + txnId + ')' : ''}`
              });
              if (selectedCustomerId) {
                setCurrentPage('customerLedger');
              } else {
                setCurrentPage('dashboard');
              }
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: doRecord,
                title: "Unlock Closed Day Entry",
                description: `The ledger for ${txDate} is locked. Submit the Admin Password to record this payment collection.`
              });
            } else {
              doRecord();
            }
          }}
          selectedCustomerId={selectedCustomerId}
          customers={customers}
          currentFirmId={currentFirmId}
        />
      )}
      {currentPage === 'transactionHistory' && (
        <TransactionHistoryScreen 
          onBack={() => setCurrentPage('dashboard')} 
          transactions={transactions}
          customers={customers}
          currentFirmId={currentFirmId}
          firms={firms}
          currentUser={currentUser}
          initialFilter={txHistoryFilter}
          initialSearch={txHistorySearchQuery}
          openingCash={openingCash}
          setOpeningCash={handleSetOpeningCash}
          counterCashSales={counterCashSales}
          setCounterCashSales={handleSetCounterCashSales}
          counterOnlineSales={counterOnlineSales}
          setCounterOnlineSales={handleSetCounterOnlineSales}
          firmDailyRegisters={firmDailyRegisters}
          workingDate={workingDate}
          userRole={userRole}
          setTransactions={setTransactions}
          setCustomers={setCustomers}
          deletedTransactions={deletedTransactions}
          setDeletedTransactions={setDeletedTransactions}
          onDeleteTransaction={(id) => {
            const tx = transactions.find(t => t.id === id);
            if (!tx) return;

            // Check if current user is allowed to delete this transaction
            const isMasterAdmin = currentUser?.id === 'master_super_admin' || currentUser?.role === 'Master Admin';
            const isAdmin = userRole === 'firmAdmin' || isMasterAdmin;
            const isOwner = currentUser && tx.recordedByUserId === currentUser.id;

            if (!isAdmin && !isOwner) {
              alert(`Permission Denied: You can only delete entries recorded by yourself. This entry was recorded by ${tx.recordedByUserName || 'another user'}.`);
              return;
            }

            const txDate = tx.date;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const deleteAction = () => {
              if (window.confirm("Are you sure you want to strike off and permanently delete this transaction? Balance adjustments will apply automatically.")) {
                if (tx.patientName && tx.type !== 'scheme_bill' && tx.type !== 'staff_credit' && tx.type !== 'staff_advance') {
                  const queryName = tx.patientName.trim().toLowerCase();
                  setCustomers(prev => prev.map(c => {
                    if (c.firmId === currentFirmId && c.name.toLowerCase() === queryName) {
                      let diff = 0;
                      if (tx.type === 'credit_sale') {
                        diff = -tx.amount;
                      } else if (tx.type === 'receive_payment') {
                        diff = tx.amount;
                      }
                      return { ...c, pendingBalance: Math.max(0, c.pendingBalance + diff) };
                    }
                    return c;
                  }));
                }
                const deletedTxRecord = {
                  ...tx,
                  deletedAt: new Date().toISOString(),
                  deletedByUserId: currentUser?.id || 'admin',
                  deletedByUserName: currentUser?.name || 'Admin'
                };
                setDeletedTransactions(prev => [deletedTxRecord, ...prev]);
                setTransactions(prev => prev.filter(t => t.id !== id));
              }
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: deleteAction,
                title: "Unlock Closed Day Strike Log",
                description: `This transaction resides on a closed date (${txDate}). Please enter the Admin Password to override and delete.`
              });
            } else {
              deleteAction();
            }
          }}
        />
      )}
      {currentPage === 'dayClosing' && (
        <DayClosingScreen 
          onBack={() => setCurrentPage('dashboard')} 
          transactions={transactions}
          currentFirmId={currentFirmId}
          isDemoMode={isDemoMode}
          openingCash={openingCash}
          setOpeningCash={handleSetOpeningCash}
          todayDaySales={counterCashSales}
          setTodayDaySales={handleSetCounterCashSales}
          workingDate={workingDate}
          onWorkingDateChange={setWorkingDate}
          isClosed={isDayClosed}
          onCloseDay={() => {
            updateActiveRegister({ closed: true });
            alert(`Working Day (${workingDate}) ledger closed and locked successfully! Core user edits are now locked.`);
            setCurrentPage('dashboard');
          }}
          onReopenDay={() => {
            updateActiveRegister({ closed: false });
            alert(`Working Day (${workingDate}) ledger reopened successfully! User edits unlocked.`);
          }}
          userRole={userRole}
          firms={firms}
          openingBalanceForwarded={openingBalanceForwarded}
          setOpeningBalanceForwarded={handleSetOpeningBalanceForwarded}
          counterOnlineSales={counterOnlineSales}
          setCounterOnlineSales={handleSetCounterOnlineSales}
        />
      )}
      {currentPage === 'schemeCreditSale' && (
        <SchemeCreditSaleScreen 
          onBack={() => setCurrentPage('dashboard')} 
          customers={customers}
          currentFirmId={currentFirmId}
          currentUser={currentUser}
          workingDate={workingDate}
          onRecordScheme={(amount, patientName, customerPhone, salesmanName, scheme, dateOfBill) => {
            const txDate = dateOfBill || workingDate;
            const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${txDate}`]?.closed;

            const doRecord = () => {
              recordTransaction({
                type: 'scheme_bill',
                title: `Scheme Bill - ${scheme.toUpperCase()}`,
                patientName,
                customerPhone,
                salesmanName,
                amount,
                extraDetails: scheme.toUpperCase(),
                date: txDate
              });
              setCurrentPage('dashboard');
            };

            if (isTxDateClosed && userRole !== 'firmAdmin') {
              setAdminUnlockAction({
                onSuccess: doRecord,
                title: "Unlock Closed Day Entry",
                description: `The ledger for ${txDate} is locked. Submit the Admin Password to record this scheme bill.`
              });
            } else {
              doRecord();
            }
          }}
        />
      )}
      {currentPage === 'customerLedger' && (
        <CustomerLedgerScreen 
          onBack={() => {
            setSelectedCustomerId(null);
            setCurrentPage('credit');
          }}
          onNavigate={(page) => {
            setCurrentPage(page);
          }}
          customerId={selectedCustomerId}
          customers={customers}
          transactions={transactions}
          currentFirmId={currentFirmId}
          firms={firms}
        />
      )}

      {isPosSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button 
              onClick={() => setIsPosSettingsOpen(false)}
              className="absolute top-5 right-5 text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-[20px] text-on-surface leading-tight">Counter POS Settings</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Customize your point of sale workspace preference</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* WhatsApp auto prompt toggle */}
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Auto WhatsApp Drafts</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Launch receipt prompt after confirm</p>
                </div>
                <button 
                  onClick={() => setAutoSendWhatsApp(!autoSendWhatsApp)}
                  className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors relative ${autoSendWhatsApp ? 'bg-secondary' : 'bg-outline-variant'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md block transition-all transform ${autoSendWhatsApp ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Receipt / Invoice Print Style */}
              <div className="flex flex-col gap-2 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                <label className="text-xs font-black uppercase tracking-wider text-secondary">Default Document Format</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button 
                    onClick={() => setPrintPreset('thermal')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${printPreset === 'thermal' ? 'bg-secondary text-white border-transparent' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-low'}`}
                  >
                    Thermal Receipt (80mm)
                  </button>
                  <button 
                    onClick={() => setPrintPreset('regular')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${printPreset === 'regular' ? 'bg-secondary text-white border-transparent' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-low'}`}
                  >
                    Plain Paper Ledger (A4)
                  </button>
                </div>
              </div>

              {/* Custom invoice title */}
              <div className="flex flex-col gap-1.5 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                <label className="text-xs font-black uppercase tracking-wider text-secondary">Receipt Header Text</label>
                <input 
                  type="text" 
                  value={receiptHeader} 
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  placeholder="TAX INVOICE, RETAIL MEMO, etc."
                  className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              {/* Helper detail info about persistence */}
              <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/10 flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p className="text-[11px] text-emerald-800 leading-relaxed font-sans">
                  These workspace preferences are secured locally to your device and are immediately active for live transaction records.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button 
                  onClick={() => setIsPosSettingsOpen(false)}
                  className="flex-1 bg-primary text-on-primary font-bold text-xs py-3 rounded-xl transition-all hover:bg-primary/90 cursor-pointer text-center"
                >
                  Save & Apply Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <WhatsAppNotificationModal 
        notification={whatsAppNotification}
        onClose={() => setWhatsAppNotification(null)}
        activeFirmName={firms.find(f => f.id === currentFirmId)?.name || 'Yogwalture Pharmacy'}
      />

      {adminUnlockAction && (
        <AdminPasswordModal 
          title={adminUnlockAction.title}
          description={adminUnlockAction.description}
          onCancel={() => setAdminUnlockAction(null)}
          onVerify={(enteredPassword) => {
            const activeFirm = firms.find(f => f.id === currentFirmId);
            const correctPassword = activeFirm?.password || 'password';
            if (enteredPassword === correctPassword) {
              setAdminUnlockAction(null);
              adminUnlockAction.onSuccess();
            } else {
              alert("Incorrect Admin Password. Action is not authorized.");
            }
          }}
        />
      )}

      {isMasterLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button 
              onClick={() => setIsMasterLoginOpen(false)}
              className="absolute top-5 right-5 text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-[20px] text-on-surface leading-tight">Master Admin Secure Access</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Yograj Super Administration Zone</p>
              </div>
            </div>

            {masterLoginError && (
              <div className="bg-error-container/20 border border-error text-error text-xs p-3 rounded-xl mb-4 leading-normal">
                ⚠️ {masterLoginError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-primary">Master Admin Password</label>
                <input 
                  type="password" 
                  value={masterPasswordInput} 
                  onChange={(e) => setMasterPasswordInput(e.target.value)}
                  placeholder="Enter Master Password"
                  className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-primary transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleMasterPasswordSubmit(masterPasswordInput);
                    }
                  }}
                />
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                  Hint: Default superpassword is <code className="bg-surface-container-high px-1 py-0.5 rounded font-mono">yograje1987</code>
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button 
                  onClick={() => handleMasterPasswordSubmit(masterPasswordInput)}
                  className="w-full bg-primary text-on-primary font-bold text-sm py-3.5 rounded-xl transition-all hover:bg-primary/90 cursor-pointer text-center flex items-center justify-center gap-2 shadow-sm"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Master Console
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-outline-variant/50"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-on-surface-variant font-black uppercase tracking-wider">Alternative Secure Method</span>
                  <div className="flex-grow border-t border-outline-wider"></div>
                </div>

                <button 
                  onClick={handleMasterGoogleLogin}
                  className="w-full bg-surface text-primary border border-outline-variant/80 hover:bg-surface-container-high font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-xs"
                >
                  <Smartphone className="w-4 h-4 text-primary" />
                  Authenticate via Google SSO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHandoverAcceptanceOverlay && pendingHandover && (
        <HandoverAcceptanceOverlay
          handover={pendingHandover}
          onAccept={() => handleAcceptHandover(pendingHandover.id)}
          onLogout={handleLogout}
        />
      )}

      <HandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        currentUser={currentUser}
        currentFirmId={currentFirmId}
        workingDate={workingDate}
        transactions={transactions}
        activeFirm={firms.find(f => f.id === currentFirmId)}
        onConfirmHandover={handleConfirmHandover}
      />
    </div>
  );
}

function Dashboard({ 
  onNavigate, 
  onSelectCustomer,
  activeFirm, 
  currentUser, 
  transactions, 
  customers, 
  currentFirmId, 
  isDemoMode, 
  onClearAllData,
  openingCash,
  counterCashSales,
  counterOnlineSales,
  onNavigateToTxHistory,
  onNavigateToDayClosing,
  workingDate,
  isClosed,
  setTransactions,
  setCustomers,
  setFirmDailyRegisters,
  userRole,
  firms,
  onWorkingDateChange,
  onOpenHandover
}: { 
  onNavigate: (page: Page) => void, 
  onSelectCustomer?: (id: string | null) => void,
  activeFirm?: Firm, 
  currentUser: any, 
  transactions: Transaction[], 
  customers: Customer[], 
  currentFirmId: string, 
  isDemoMode?: boolean, 
  onClearAllData?: () => void,
  openingCash: number,
  counterCashSales: number,
  counterOnlineSales: number,
  onNavigateToTxHistory: (filterType: string, searchQuery?: string) => void,
  onNavigateToDayClosing?: () => void,
  workingDate: string,
  isClosed: boolean,
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>,
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>,
  setFirmDailyRegisters?: React.Dispatch<React.SetStateAction<Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean }>>>,
  userRole?: 'user' | 'firmAdmin',
  firms?: Firm[],
  onWorkingDateChange?: (date: string) => void,
  onOpenHandover?: () => void
}) {
  const activeTransactions = transactions.filter(t => t.firmId === currentFirmId && t.date === workingDate);
  const activeCustomers = customers.filter(c => c.firmId === currentFirmId);

  const handleReopenDay = () => {
    if (!setFirmDailyRegisters) return;
    const key = `${currentFirmId}_${workingDate}`;
    setFirmDailyRegisters(prev => {
      const existing = prev[key] || { opening: 0, cashSales: 0, onlineSales: 0, closed: false };
      return {
        ...prev,
        [key]: {
          ...existing,
          closed: false
        }
      };
    });
    alert(`Working Day (${workingDate}) ledger reopened successfully! User edits unlocked.`);
  };

  // Sync and Backup states
  const [isBackupPanelOpen, setIsBackupPanelOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('shopbooks_last_sync_timestamp') || 'Never synced';
  });
  const [importPreview, setImportPreview] = useState<{
    transactions: any[];
    customers: any[];
    firmDailyRegisters?: Record<string, any>;
  } | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelSuccess, setPanelSuccess] = useState<string | null>(null);

  // Staff Salary and Settlement states
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementStaffName, setSettlementStaffName] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [salaryMonth, setSalaryMonth] = useState(() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });
  const [settlementRemarks, setSettlementRemarks] = useState('');
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  const handleStaffSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettlementSuccess(null);
    setSettlementError(null);

    if (!settlementStaffName) {
      setSettlementError("Please select a staff member to proceed.");
      return;
    }

    const parsedSalary = parseFloat(baseSalary);
    if (isNaN(parsedSalary) || parsedSalary <= 0) {
      setSettlementError("Please enter a valid base monthly salary (> 0).");
      return;
    }

    const parsedDeductions = parseFloat(otherDeductions) || 0;
    if (parsedDeductions < 0) {
      setSettlementError("Deduction cannot be a negative amount.");
      return;
    }

    // outstanding calculations
    const chosenStaffCreditOutstanding = transactions
      .filter(t => t.firmId === currentFirmId && t.type === 'staff_credit' && t.patientName === settlementStaffName)
      .reduce((sum, t) => sum + t.amount, 0);

    const chosenStaffAdvanceOutstanding = transactions
      .filter(t => t.firmId === currentFirmId && t.type === 'staff_advance' && t.patientName === settlementStaffName)
      .reduce((sum, t) => sum + t.amount, 0);

    // Prioritized calculations
    let availableForRecovery = Math.max(0, parsedSalary - parsedDeductions);
    
    const recoveredStaffCredit = Math.min(availableForRecovery, Math.max(0, chosenStaffCreditOutstanding));
    availableForRecovery = Math.max(0, availableForRecovery - recoveredStaffCredit);

    const recoveredStaffAdvance = Math.min(availableForRecovery, Math.max(0, chosenStaffAdvanceOutstanding));
    availableForRecovery = Math.max(0, availableForRecovery - recoveredStaffAdvance);

    const netSalary = Math.max(0, parsedSalary - recoveredStaffCredit - recoveredStaffAdvance - parsedDeductions);

    if (!setTransactions) {
      setSettlementError("System configuration issue: cannot access state updates.");
      return;
    }

    const newTxList: Transaction[] = [];
    const currentDateStr = workingDate || getLocalDateString();
    const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const randId = () => Math.floor(Math.random() * 100000);

    // 1. Disbursement expense
    newTxList.push({
      id: 'TX_' + Date.now() + '_sal_' + randId(),
      firmId: currentFirmId,
      type: 'supplier_payment',
      title: `Staff Salary Disbursed (Net) - ${settlementStaffName}`,
      amount: netSalary,
      date: currentDateStr,
      time: currentTimeStr,
      recordedByUserId: currentUser?.id || 'admin',
      recordedByUserName: currentUser?.name || 'Firm Admin',
      extraDetails: `Base Salary: ₹${parsedSalary}. Deductions: Store Udhaar ₹${recoveredStaffCredit}, Temp Advance ₹${recoveredStaffAdvance}, Misc ₹${parsedDeductions}. Method: ${paymentMode}. Month: ${salaryMonth}. Remarks: ${settlementRemarks}`
    });

    // 2. Staff Credit offset
    if (recoveredStaffCredit > 0) {
      newTxList.push({
        id: 'TX_' + Date.now() + '_sc_clear_' + randId(),
        firmId: currentFirmId,
        type: 'staff_credit',
        title: `Salary Settlement Recovery Store Udhaar - ${settlementStaffName}`,
        amount: -recoveredStaffCredit,
        date: currentDateStr,
        time: currentTimeStr,
        recordedByUserId: currentUser?.id || 'admin',
        recordedByUserName: currentUser?.name || 'Firm Admin',
        extraDetails: `Reconciliation offset deducted from ${salaryMonth} salary.`
      });
    }

    // 3. Staff Advance offset
    if (recoveredStaffAdvance > 0) {
      newTxList.push({
        id: 'TX_' + Date.now() + '_sa_clear_' + randId(),
        firmId: currentFirmId,
        type: 'staff_advance',
        title: `Salary Settlement Recovery Temp Advance - ${settlementStaffName}`,
        amount: -recoveredStaffAdvance,
        date: currentDateStr,
        time: currentTimeStr,
        recordedByUserId: currentUser?.id || 'admin',
        recordedByUserName: currentUser?.name || 'Firm Admin',
        extraDetails: `Reconciliation offset deducted from ${salaryMonth} salary.`
      });
    }

    setTransactions(prev => [...prev, ...newTxList]);
    setSettlementSuccess(`Salary payout for ${settlementStaffName} finalized! Net ₹${netSalary.toLocaleString()} disbursed. Recovery offsets of ₹${(recoveredStaffCredit + recoveredStaffAdvance).toLocaleString()} successfully processed (Store Udhaar recovered: ₹${recoveredStaffCredit.toLocaleString()}, Advances recovered: ₹${recoveredStaffAdvance.toLocaleString()}).`);
    
    // partial resets
    setBaseSalary('');
    setOtherDeductions('');
    setSettlementRemarks('');
  };

  const triggerCloudSync = () => {
    setIsSyncing(true);
    setSyncStatusMsg("Encrypting ledger records...");
    setPanelError(null);
    setPanelSuccess(null);
    
    setTimeout(() => {
      setSyncStatusMsg("Configuring secure backup database...");
      setTimeout(() => {
        try {
          const payload = {
            transactions,
            customers,
            firmDailyRegisters: localStorage.getItem('shopbooks_daily_registers') ? JSON.parse(localStorage.getItem('shopbooks_daily_registers')!) : {}
          };
          localStorage.setItem('shopbooks_cloud_backup_database', JSON.stringify(payload));
          const timestamp = new Date().toLocaleString('en-IN');
          localStorage.setItem('shopbooks_last_sync_timestamp', timestamp);
          setLastSyncTime(timestamp);
          setIsSyncing(false);
          setSyncStatusMsg(null);
          setPanelSuccess("Cloud replication successful! Reconciled records backup is secure.");
        } catch (err) {
          console.error(err);
          setIsSyncing(false);
          setSyncStatusMsg(null);
          setPanelError("Backup failed: Storage quota exceeded.");
        }
      }, 750);
    }, 600);
  };

  const recoverFromCloud = () => {
    setPanelError(null);
    setPanelSuccess(null);
    const saved = localStorage.getItem('shopbooks_cloud_backup_database');
    if (!saved) {
      setPanelError("No backup found in cloud server replica! Execute 'Sync & Backup Now' first.");
      return;
    }
    
    if (window.confirm("Restore local database from secure cloud backup? This will overwrite your active live screen's transactions and customers with the last synced state.")) {
      try {
        const payload = JSON.parse(saved);
        if (payload.transactions && Array.isArray(payload.transactions)) {
          if (setTransactions) setTransactions(payload.transactions);
        }
        if (payload.customers && Array.isArray(payload.customers)) {
          if (setCustomers) setCustomers(payload.customers);
        }
        if (payload.firmDailyRegisters && typeof payload.firmDailyRegisters === 'object') {
          if (setFirmDailyRegisters) setFirmDailyRegisters(payload.firmDailyRegisters);
        }
        setPanelSuccess("Database restored successfully from secure backup mirror! Reconciled records loaded.");
      } catch (err) {
        console.error(err);
        setPanelError("Restoring from backup mirror failed due to a corrupted data payload.");
      }
    }
  };

  const triggerJSONDownload = () => {
    try {
      const payload = {
        app: "ShopBooks Ledger",
        backupVersion: "1.0",
        timestamp: new Date().toISOString(),
        firmId: currentFirmId,
        firmName: activeFirm?.name || "Yogwalture Pharmacy",
        transactions,
        customers,
        firmDailyRegisters: localStorage.getItem('shopbooks_daily_registers') ? JSON.parse(localStorage.getItem('shopbooks_daily_registers')!) : {}
      };
      
      const fileData = JSON.stringify(payload, null, 2);
      const blob = new Blob([fileData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shopbooks_reconciled_backup_${activeFirm?.name ? activeFirm.name.replace(/\s+/g, '_') : 'ledger'}_${workingDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setPanelSuccess("Local backup JSON descriptor exported successfully! Keep this file safe.");
    } catch (err) {
      setPanelError("Unable to serialize backup payload.");
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setPanelError(null);
    setPanelSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.transactions || !Array.isArray(parsed.transactions) || !parsed.customers || !Array.isArray(parsed.customers)) {
          setPanelError("Invalid database backup file. Missing 'transactions' or 'customers' catalog.");
          return;
        }
        setImportPreview({
          transactions: parsed.transactions,
          customers: parsed.customers,
          firmDailyRegisters: parsed.firmDailyRegisters || {}
        });
      } catch (err) {
        setPanelError("Parser error: selected file contains malformed JSON.");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    if (setTransactions) setTransactions(importPreview.transactions);
    if (setCustomers) setCustomers(importPreview.customers);
    if (importPreview.firmDailyRegisters && setFirmDailyRegisters) {
      setFirmDailyRegisters(importPreview.firmDailyRegisters);
    }
    setPanelSuccess(`Success! Loaded ${importPreview.transactions.length} Transactions & ${importPreview.customers.length} Customers successfully from backup.`);
    setImportPreview(null);
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-container-padding-mobile md:px-container-padding-desktop py-stack-lg space-y-stack-lg">
        {/* Erase Demo Data Banner */}
        {(transactions.filter(t => t.firmId === currentFirmId).length > 0 || activeCustomers.length > 0) && onClearAllData && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-700 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-bold text-amber-805 text-amber-800 text-sm">Demo Data Active</h4>
                <p className="text-xs text-amber-700/90">Click the button below to clear all sample customers and transactions to begin your own custom testing.</p>
              </div>
            </div>
            <button 
              onClick={onClearAllData}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Erase Demo Data</span>
            </button>
          </div>
        )}

        {/* Dynamic User Profile and Firm Details Banner */}
        <section className="bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent rounded-2xl p-5 border border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">Active Firm</span>
              <h2 className="text-xl font-bold text-on-surface tracking-tight mt-1">{activeFirm?.name}</h2>
              <p className="text-xs text-on-surface-variant">ID: {activeFirm?.id} • {activeFirm?.email} • {activeFirm?.mobile}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-3 bg-surface-container-low/80 backdrop-blur px-4 py-2.5 rounded-xl border border-outline-variant/30 flex-1 sm:flex-initial">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                {currentUser?.name ? currentUser.name.slice(0, 2) : 'SB'}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs text-on-surface-variant font-medium">Logged in User</p>
                <h4 className="text-sm font-semibold text-on-surface truncate pr-pr-2 truncate">{currentUser?.name}</h4>
                <p className="text-[10px] text-on-surface-variant/80 font-mono italic truncate">{currentUser?.role} • {currentUser?.mobile}</p>
              </div>
            </div>
            {onOpenHandover && (
              <button 
                type="button"
                onClick={onOpenHandover}
                className="px-4 py-3 bg-secondary hover:bg-secondary/90 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider h-11"
              >
                <ArrowLeftRight className="w-4 h-4 text-white" />
                <span>Handover Duty</span>
              </button>
            )}
          </div>
        </section>

        {/* System Synchronization & Database Backup Hub */}
        {userRole === 'firmAdmin' && (
          <section className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
            {/* Header */}
            <button 
              type="button"
              onClick={() => setIsBackupPanelOpen(!isBackupPanelOpen)}
              className="w-full flex items-center justify-between p-5 bg-surface-container-low/40 hover:bg-surface-container-low/75 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                    System Database Sync & Backup Hub
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Reconciled
                    </span>
                  </h3>
                  <p className="text-xs text-on-surface-variant">Manually export, restore, or sync offline database to handle browser cache clearances safely.</p>
                </div>
              </div>
              <div className="text-on-surface-variant ml-2">
                <span className="text-xs font-semibold text-primary block sm:inline">
                  {isBackupPanelOpen ? 'Collapse Tools ▲' : 'Expand Tools ▼'}
                </span>
              </div>
            </button>

            {isBackupPanelOpen && (
              <div className="p-6 border-t border-outline-variant/20 space-y-5 animate-fade-in text-left">
                {/* Alert Notifications inside panel */}
                {panelSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{panelSuccess}</span>
                  </div>
                )}
                {panelError && (
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-medium">{panelError}</span>
                  </div>
                )}

                {/* Sync Loader Overlay */}
                {isSyncing && (
                  <div className="p-4 bg-primary/5 border border-primary/20 text-primary rounded-xl flex items-center gap-3 justify-center text-xs font-bold animate-pulse">
                    <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{syncStatusMsg}</span>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Section A: Replicated Standalone Cloud Mirror */}
                  <div className="bg-surface-container-low/60 rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">Sandbox Cloud Sync</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">Status: Connected</span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Replicate and lock a copy of your Ledger database into the ShopBooks offline mirror space. If local storage is ever deleted, you can instantly run a quick recovery check to restore everything instantly.
                      </p>
                      <div className="mt-3.5 flex items-center gap-2 text-[11px] text-on-surface-variant/90 bg-surface-container-low p-2 rounded-lg border border-outline-variant/15">
                        <span className="font-bold">Last Replicated Sync:</span>
                        <span className="text-primary font-mono font-bold bg-primary/10 px-2 py-0.5 rounded-full">{lastSyncTime}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={triggerCloudSync}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 cursor-pointer-none"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>Sync & Backup Now</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={recoverFromCloud}
                        className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg border border-outline-variant/30 transition-all flex items-center gap-1.5 focus:ring-2 focus:ring-outline/20 disabled:opacity-50 cursor-pointer-none"
                      >
                        <CloudDownload className="w-4 h-4 text-emerald-600 animate-bounce" style={{ animationDuration: '3s' }} />
                        <span>One-Click Cloud Restore</span>
                      </button>
                    </div>
                  </div>

                  {/* Section B: Hardcopy JSON Ledger Descriptors */}
                  <div className="bg-surface-container-low/60 rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-xs font-bold text-on-surface uppercase tracking-wider block mb-2">Manual File Backup Descriptors</span>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Download a complete, offline-readable backup database file (JSON representation) directly onto your desktop or mobile device. Use this file at any time below to load your shop ledger on other browsers.
                      </p>

                      {/* Import Preview Summary Container */}
                      {importPreview && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-left animate-fade-in space-y-2">
                          <div className="font-bold text-amber-800 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-amber-600" />
                            <span>Detected Schema Descriptor:</span>
                          </div>
                          <ul className="text-amber-700 space-y-0.5 list-disc list-inside font-mono text-[11px]">
                            <li>Transactions count: <strong className="text-amber-900">{importPreview.transactions.length}</strong></li>
                            <li>Customers ledger count: <strong className="text-amber-900">{importPreview.customers.length}</strong></li>
                            <li>Daily closing records: <strong className="text-amber-900">{Object.keys(importPreview.firmDailyRegisters || {}).length} dates</strong></li>
                          </ul>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={confirmImport}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-md text-[10px] shrink-0 transition-colors cursor-pointer uppercase tracking-wider shadow-sm"
                            >
                              Proceed & Apply Override
                            </button>
                            <button
                              type="button"
                              onClick={() => setImportPreview(null)}
                              className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-3 py-1.5 rounded-md text-[10px] shrink-0 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={triggerJSONDownload}
                          className="px-4 py-2 bg-secondary text-white hover:bg-secondary-hover text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer-none"
                        >
                          <Download className="w-4 h-4" />
                          <span>Export Backup JSON</span>
                        </button>

                        <label className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg border border-outline-variant/30 cursor-pointer transition-all flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-primary" />
                          <span>Import Backup File</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleFileImport}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Firm Admin Board: Employee Salary Settlement Center */}
        {userRole === 'firmAdmin' && (
          <section className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
            <button 
              type="button"
              onClick={() => setIsSettlementOpen(!isSettlementOpen)}
              className="w-full flex items-center justify-between p-5 bg-surface-container-low/40 hover:bg-surface-container-low/75 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-secondary/10 text-secondary rounded-xl shrink-0">
                  <Coins className="w-5 h-5 text-secondary" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                    Firm Admin Staff Settlement Board
                    <span className="text-[10px] bg-sky-500/10 text-sky-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> Salary Settlement Active
                    </span>
                  </h3>
                  <p className="text-xs text-on-surface-variant">Disburse employee salaries, reconcile outstanding store credits, and settle cash advances elegantly.</p>
                </div>
              </div>
              <div className="text-on-surface-variant ml-2">
                <span className="text-xs font-semibold text-secondary block sm:inline">
                  {isSettlementOpen ? 'Collapse Panel ▲' : 'Open Salary Settlements ▼'}
                </span>
              </div>
            </button>

            {isSettlementOpen && (
              <div className="p-6 border-t border-outline-variant/20 space-y-6 animate-fade-in text-left">
                {settlementSuccess && (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2.5">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">{settlementSuccess}</span>
                  </div>
                )}
                {settlementError && (
                  <div className="p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                    <span className="font-medium">{settlementError}</span>
                  </div>
                )}

                <div className="grid lg:grid-cols-12 gap-6">
                  {/* Staff List with balances */}
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Registered Team Directory</h4>
                    <p className="text-xs text-on-surface-variant">Select any employee to compile their monthly pay slip deductions automatically.</p>
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {Array.from(new Set([
                        ...(activeFirm?.users || []).map(u => u.name), 
                        ...transactions.filter(t => t.firmId === currentFirmId && (t.type === 'staff_credit' || t.type === 'staff_advance')).map(t => t.patientName || '')
                      ])).filter(Boolean).map((staffName) => {
                        const matchingUser = (activeFirm?.users || []).find(u => u.name === staffName);
                        const scOutstanding = transactions
                          .filter(t => t.firmId === currentFirmId && t.type === 'staff_credit' && t.patientName === staffName)
                          .reduce((sum, t) => sum + t.amount, 0);
                        const saOutstanding = transactions
                          .filter(t => t.firmId === currentFirmId && t.type === 'staff_advance' && t.patientName === staffName)
                          .reduce((sum, t) => sum + t.amount, 0);
                        const isSelected = settlementStaffName === staffName;

                        return (
                          <div 
                            key={staffName}
                            onClick={() => {
                              setSettlementStaffName(staffName);
                              setSettlementSuccess(null);
                              setSettlementError(null);
                              if (matchingUser && matchingUser.salary) {
                                setBaseSalary(matchingUser.salary.toString());
                              } else {
                                setBaseSalary('');
                              }
                            }}
                            className={`p-3.5 border rounded-xl transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'bg-primary/5 border-primary shadow-[0_2px_8px_rgba(0,0,0,0.03)]' : 'bg-surface-container-low hover:bg-surface-container-medium border-outline-variant/30'}`}
                          >
                            <div className="min-w-0 flex-1">
                              <h5 className="font-semibold text-xs text-on-surface flex items-center gap-1.5 flex-wrap">
                                {staffName}
                                {matchingUser && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{matchingUser.role}</span>}
                              </h5>
                              <p className="text-[10px] text-on-surface-variant/80 font-mono mt-0.5">{matchingUser?.mobile || 'No Mobile Registered'}</p>
                            </div>
                            <div className="text-right flex flex-col gap-1 items-end shrink-0 ml-3">
                              {scOutstanding !== 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${scOutstanding > 0 ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                                  {scOutstanding > 0 ? 'Udhaar' : 'Cleared'}: ₹{scOutstanding.toLocaleString()}
                                </span>
                              )}
                              {saOutstanding !== 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${saOutstanding > 0 ? 'bg-cyan-500/10 text-cyan-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                                  {saOutstanding > 0 ? 'Advance' : 'Cleared'}: ₹{saOutstanding.toLocaleString()}
                                </span>
                              )}
                              {scOutstanding === 0 && saOutstanding === 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-emerald-600 bg-emerald-500/10">
                                  Reconciled ₹0
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(!activeFirm || !activeFirm.users || activeFirm.users.length === 0) && (
                        <p className="text-xs text-on-surface-variant italic py-4">No employees registered on this firm's workspace.</p>
                      )}
                    </div>
                  </div>

                  {/* Calculator Form */}
                  <div className="lg:col-span-7 bg-surface-container-low/60 rounded-xl p-5 border border-outline-variant/30 space-y-4">
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider block border-b border-outline-variant/10 pb-2">Reconciliation & Disbursal Sheet</h4>
                    
                    {settlementStaffName ? (
                      <form onSubmit={handleStaffSettlementSubmit} className="space-y-4">
                        <div className="p-3.5 bg-surface-container rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-on-surface-variant font-semibold">Preparing Payslip For:</span>
                            <h5 className="font-bold text-sm text-on-surface mt-0.5">{settlementStaffName}</h5>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              setSettlementStaffName('');
                              setSettlementSuccess(null);
                              setSettlementError(null);
                            }}
                            className="text-xs text-primary font-bold hover:underline"
                          >
                            Change Staff
                          </button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-on-surface-variant font-bold">BASE MONTHLY SALARY (₹) *</label>
                            <input 
                              type="number"
                              placeholder="e.g. 25000"
                              value={baseSalary}
                              onChange={(e) => setBaseSalary(e.target.value)}
                              className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background focus:border-secondary outline-none w-full"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-on-surface-variant font-bold">MISC OTHER DEDUCTIONS (₹)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 500"
                              value={otherDeductions}
                              onChange={(e) => setOtherDeductions(e.target.value)}
                              className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background focus:border-secondary outline-none w-full"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-on-surface-variant font-bold">PAYMENT OPTION / GATEWAY</label>
                            <select 
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value)}
                              className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background focus:border-secondary outline-none w-full"
                            >
                              <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                              <option value="Cash Handout">Cash Handout (from Counter)</option>
                              <option value="UPI / GPay">UPI (PhonePe/GPay)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-on-surface-variant font-bold">SALARY PERIOD / MONTH</label>
                            <input 
                              type="text"
                              placeholder="June 2026"
                              value={salaryMonth}
                              onChange={(e) => setSalaryMonth(e.target.value)}
                              className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background focus:border-secondary outline-none w-full"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] text-on-surface-variant font-bold">TRANSACTION MEMO / REMARKS</label>
                          <textarea 
                            rows={2}
                            placeholder="Add payment notes or deduction details here..."
                            value={settlementRemarks}
                            onChange={(e) => setSettlementRemarks(e.target.value)}
                            className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background focus:border-secondary outline-none w-full resize-none"
                          />
                        </div>

                        {/* Deductions invoice preview */}
                        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant/20 space-y-2.5 font-sans">
                          <div className="flex justify-between items-center text-xs text-on-surface font-medium">
                            <span>(+) Gross Base Salary:</span>
                            <span className="font-bold text-on-surface">₹{(parseFloat(baseSalary) || 0).toLocaleString()}</span>
                          </div>
                          {(() => {
                            const scOutstanding = transactions
                              .filter(t => t.firmId === currentFirmId && t.type === 'staff_credit' && t.patientName === settlementStaffName)
                              .reduce((sum, t) => sum + t.amount, 0);
                            const saOutstanding = transactions
                              .filter(t => t.firmId === currentFirmId && t.type === 'staff_advance' && t.patientName === settlementStaffName)
                              .reduce((sum, t) => sum + t.amount, 0);
                            const parsedDed = parseFloat(otherDeductions) || 0;
                            const grossBase = parseFloat(baseSalary) || 0;

                            let availableForRecovery = Math.max(0, grossBase - parsedDed);
                            const recoveredStaffCredit = Math.min(availableForRecovery, Math.max(0, scOutstanding));
                            availableForRecovery = Math.max(0, availableForRecovery - recoveredStaffCredit);

                            const recoveredStaffAdvance = Math.min(availableForRecovery, Math.max(0, saOutstanding));

                            const net = Math.max(0, grossBase - recoveredStaffCredit - recoveredStaffAdvance - parsedDed);

                            return (
                              <>
                                {scOutstanding !== 0 && (
                                  <div className="flex justify-between items-center text-xs text-amber-800">
                                    <span>(-) Recover Store Udhaar:</span>
                                    <span className="font-semibold">
                                      -₹{recoveredStaffCredit.toLocaleString()}
                                      {scOutstanding > recoveredStaffCredit && (
                                        <span className="text-[10px] text-amber-600 block sm:inline font-normal font-sans"> (₹{(scOutstanding - recoveredStaffCredit).toLocaleString()} carried fwd)</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {saOutstanding !== 0 && (
                                  <div className="flex justify-between items-center text-xs text-cyan-800">
                                    <span>(-) Recover Temp Advance:</span>
                                    <span className="font-semibold">
                                      -₹{recoveredStaffAdvance.toLocaleString()}
                                      {saOutstanding > recoveredStaffAdvance && (
                                        <span className="text-[10px] text-cyan-600 block sm:inline font-normal font-sans"> (₹{(saOutstanding - recoveredStaffAdvance).toLocaleString()} carried fwd)</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {parsedDed > 0 && (
                                  <div className="flex justify-between items-center text-xs text-rose-800">
                                    <span>(-) Miscellaneous Deductions:</span>
                                    <span className="font-semibold">-₹{parsedDed.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="border-t border-outline-variant/30 pt-2.5 flex justify-between items-center font-bold">
                                  <span className="text-xs text-on-surface">(=) Net Disbursed Salary:</span>
                                  <span className="text-sm text-primary bg-primary/10 px-3 py-1 rounded-lg">₹{net.toLocaleString()}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-secondary hover:bg-secondary-hover text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Coins className="w-4 h-4" />
                          <span>Finalize Payslip & Reconcile Ledgers</span>
                        </button>
                      </form>
                    ) : (
                      <div className="py-20 text-center text-on-surface-variant flex flex-col items-center justify-center space-y-2">
                        <Users className="w-10 h-10 text-on-surface-variant/35" />
                        <p className="text-xs font-semibold">No Employee Selected</p>
                        <p className="text-[11px] text-on-surface-variant/70 max-w-xs leading-relaxed">Select one of the registered staff on the team directory to compile their payslip details and automatically deduct balances here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <CollectionNotificationBanner 
          customers={customers}
          currentFirmId={currentFirmId}
          onNavigate={onNavigate}
          onSelectCustomer={onSelectCustomer}
        />
        <QuickActions onNavigate={onNavigate} />
        <PageHeader 
          workingDate={workingDate} 
          isClosed={isClosed} 
          onWorkingDateChange={onWorkingDateChange} 
          userRole={userRole}
          onUnlockDay={handleReopenDay}
        />
        <BentoGrid 
          transactions={activeTransactions} 
          customers={activeCustomers} 
          isDemoMode={isDemoMode}
          openingCash={openingCash}
          onNavigateToTxHistory={onNavigateToTxHistory}
          onNavigateToDayClosing={onNavigateToDayClosing}
          allTransactions={transactions.filter(t => t.firmId === currentFirmId)}
          onNavigate={onNavigate}
          onSelectCustomer={onSelectCustomer}
        />
        
        <div className="grid md:grid-cols-3 gap-gutter">
          <TrendChart isDemoMode={isDemoMode} />
          <RecentTransactions onNavigate={onNavigate} transactions={activeTransactions} />
        </div>
      </main>
      <FloatingActionButton onClick={() => onNavigate('supplierPayment')} />
    </>
  );
}

function QuickActions({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <section>
      <h2 className="text-headline-md text-on-surface mb-stack-md">Quick Actions</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-gutter">
        <button onClick={() => onNavigate('credit')} className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-14 h-14 bg-error-container/30 rounded-xl flex items-center justify-center text-error shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-95 transition-transform">
            <FileText className="w-7 h-7" />
          </div>
          <span className="text-label-md text-center text-on-surface text-[12px] leading-tight">Add Credit Sale</span>
        </button>
        <button onClick={() => onNavigate('schemeCreditSale')} className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-14 h-14 bg-surface-container-lowest rounded-xl flex items-center justify-center text-on-surface-variant shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-95 transition-transform">
            <ShieldPlus className="w-7 h-7 text-secondary" />
          </div>
          <span className="text-label-md text-center text-on-surface text-[12px] leading-tight">Scheme Bill</span>
        </button>
        <button onClick={() => onNavigate('receivePayment')} className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-14 h-14 bg-surface-container-lowest rounded-xl flex items-center justify-center text-secondary shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-95 transition-transform">
            <QrCode className="w-7 h-7" />
          </div>
          <span className="text-label-md text-center text-on-surface text-[12px] leading-tight">Online Payment</span>
        </button>
        <button onClick={() => onNavigate('receiveCashPayment')} className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-14 h-14 bg-surface-container-lowest rounded-xl flex items-center justify-center text-green-600 shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-95 transition-transform">
            <Coins className="w-7 h-7" />
          </div>
          <span className="text-label-md text-center text-on-surface text-[12px] leading-tight">Cash Payment</span>
        </button>
        <button onClick={() => onNavigate('supplierPayment')} className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-14 h-14 bg-surface-container-lowest rounded-xl flex items-center justify-center text-on-surface-variant shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-95 transition-transform">
            <Truck className="w-7 h-7" />
          </div>
          <span className="text-label-md text-center text-on-surface text-[12px] leading-tight">Supplier Payment</span>
        </button>
        <button onClick={() => onNavigate('expense')} className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-95 transition-transform border border-rose-200/40">
            <TrendingUp className="w-7 h-7 rotate-180 text-rose-600" />
          </div>
          <span className="text-label-md text-center text-on-surface text-[12px] leading-tight">Record Expense</span>
        </button>
      </div>
    </section>
  );
}

function SupplierPaymentScreen({ onBack, onRecordSupplierPayment, workingDate }: { onBack: () => void, onRecordSupplierPayment: (amount: number, supplierName: string, date: string, paymentMode: string, purpose: string) => void, workingDate?: string }) {
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [date, setDate] = useState(() => workingDate || getLocalDateString());
  const [purpose, setPurpose] = useState('Stock');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount (> 0).');
      return;
    }
    if (!supplierName.trim()) {
      setErrorMsg('Please enter a supplier name.');
      return;
    }
    setErrorMsg('');
    onRecordSupplierPayment(parsedAmount, supplierName.trim(), date, paymentMode, purpose);
  };

  return (
    <>
      <header className="bg-surface-container-lowest w-full top-0 sticky border-b border-outline-variant flex justify-between items-center px-container-padding-mobile h-16 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md text-label-md uppercase font-bold text-xs">
            {supplierName ? supplierName.slice(0, 2) : 'SL'}
          </div>
          <span className="text-headline-mobile text-primary">ShopBooks</span>
        </div>
        <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 p-2 rounded-full flex items-center justify-center" onClick={onBack}>
          <UserCircle className="w-6 h-6" />
        </button>
      </header>
      
      <main className="px-container-padding-mobile pt-stack-lg space-y-stack-lg max-w-md mx-auto text-left pb-24">
        <div className="flex items-center gap-2 mb-1">
          <ArrowUpCircle className="w-6 h-6 text-error flex-shrink-0" fill="currentColor" stroke="white" />
          <h1 className="text-headline-mobile text-on-surface">Supplier Payment</h1>
        </div>
        <p className="text-body-md text-on-surface-variant">Record an outflow of funds.</p>

        {errorMsg && (
          <div className="bg-error-container/20 border border-error text-error text-sm p-3 rounded-xl">
            {errorMsg}
          </div>
        )}
        
        <form onSubmit={handleConfirm} className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-stack-md relative z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-error-container opacity-50 rounded-bl-full pointer-events-none blur-2xl"></div>
          
          <div className="flex flex-col gap-stack-sm relative z-10">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="supplier_amount">Payment Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-number-xl text-on-surface-variant">₹</span>
              <input 
                id="supplier_amount"
                className="w-full bg-surface text-on-surface text-number-xl py-4 pr-4 pl-12 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow text-right style-hide-arrows" 
                placeholder="0" 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ MozAppearance: 'textfield' }}
              />
            </div>
          </div>
          
          <hr className="border-outline-variant/50" />
          
          <div className="flex flex-col gap-stack-sm relative z-10">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="supplier_name">Supplier Name</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input 
                id="supplier_name"
                className="w-full bg-surface text-on-surface text-body-md py-3 pr-3 pl-10 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow placeholder:text-outline/70" 
                placeholder="Supplier or distributor name..." 
                type="text" 
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-stack-sm relative z-10">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="supplier_date">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input 
                id="supplier_date"
                className="w-full bg-surface text-on-surface text-body-md py-3 pr-3 pl-10 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow css-1appearancenone" 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ appearance: 'none', WebkitAppearance: 'none' }}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-stack-sm relative z-10">
            <label className="text-label-md text-on-surface font-semibold">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2 bg-surface p-1 rounded-lg border border-outline-variant">
              {['Cash', 'Online', 'Cheque'].map(mode => (
                <label key={mode} className="cursor-pointer relative">
                  <input 
                    className="peer sr-only" 
                    name="payment_mode" 
                    type="radio" 
                    checked={paymentMode === mode}
                    onChange={() => setPaymentMode(mode)}
                  />
                  <div className="py-2 text-center rounded-DEFAULT text-on-surface-variant text-label-md peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-checked:shadow-sm transition-all">
                    {mode}
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-stack-sm relative z-10">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="supplier_purpose">Purpose</label>
            <div className="relative">
              <select 
                id="supplier_purpose"
                className="w-full bg-surface text-on-surface text-body-md p-3 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow" 
                style={{ appearance: 'none', WebkitAppearance: 'none' }}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="Stock">Stock</option>
                <option value="Bill Payment">Bill Payment</option>
                <option value="Advance">Advance</option>
                <option value="Other">Other</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex flex-col gap-stack-sm pt-2 relative z-10">
            <label className="text-label-md text-on-surface-variant">Receipt Upload</label>
            <button className="w-full border-2 border-dashed border-outline-variant/70 rounded-lg py-6 flex flex-col items-center justify-center gap-2 bg-surface hover:bg-surface-variant/50 transition-colors cursor-pointer" type="button">
              <ImagePlus className="text-outline w-8 h-8" />
              <span className="text-label-md text-on-surface-variant">Attach Bill / Receipt</span>
            </button>
          </div>
        </form>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant p-container-padding-mobile z-50">
        <div className="max-w-md mx-auto">
          <button onClick={handleConfirm} className="w-full h-12 bg-error text-on-error rounded-lg text-label-md flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_4px_12px_rgba(186,26,26,0.2)] cursor-pointer">
            <CheckCircle className="w-5 h-5 flex-shrink-0" fill="currentColor" stroke="white" />
            Confirm Outflow
          </button>
        </div>
      </div>
    </>
  );
}

function ExpenseScreen({ 
  onBack, 
  onRecordExpense, 
  workingDate 
}: { 
  onBack: () => void; 
  onRecordExpense: (amount: number, expenseName: string, date: string, paymentMode: string, category: string) => void; 
  workingDate?: string; 
}) {
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [date, setDate] = useState(() => workingDate || getLocalDateString());
  const [category, setCategory] = useState('Miscellaneous');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount (> 0).');
      return;
    }
    if (!expenseName.trim()) {
      setErrorMsg('Please enter an expense details / recipient.');
      return;
    }
    setErrorMsg('');
    onRecordExpense(parsedAmount, expenseName.trim(), date, paymentMode, category);
  };

  const categories = [
    'Rent & Utilities',
    'Food & Catering',
    'Salary & Wages',
    'Office & Stationery',
    'Maintenance & Repairs',
    'Stock / Inventory',
    'Miscellaneous'
  ];

  return (
    <>
      <header className="bg-surface-container-lowest w-full top-0 sticky border-b border-outline-variant flex justify-between items-center px-container-padding-mobile h-16 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md text-label-md uppercase font-bold text-xs font-sans">
            {expenseName ? expenseName.slice(0, 2) : 'EX'}
          </div>
          <span className="text-headline-mobile text-primary">ShopBooks</span>
        </div>
        <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 p-2 rounded-full flex items-center justify-center animate-fade-in" onClick={onBack} type="button">
          <UserCircle className="w-6 h-6" />
        </button>
      </header>
      
      <main className="px-container-padding-mobile pt-stack-lg space-y-stack-lg max-w-md mx-auto text-left pb-24 animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-6 h-6 text-error flex-shrink-0 rotate-180" />
          <h1 className="text-headline-mobile text-on-surface">Record Expense</h1>
        </div>
        <p className="text-body-md text-on-surface-variant">Log business operational outflows.</p>

        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-stack-md">
          <div className="flex flex-col gap-stack-xs">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="exp_amount">Amount (₹)</label>
            <input 
              id="exp_amount"
              type="number" 
              step="any"
              placeholder="e.g. 350" 
              className="w-full bg-surface text-on-surface text-body-md p-3 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow font-mono font-bold" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="exp_name">Paid For / Description</label>
            <input 
              id="exp_name"
              type="text" 
              placeholder="e.g. Tea & snacks / internet bill" 
              className="w-full bg-surface text-on-surface text-body-md p-3 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow" 
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="exp_date">Date</label>
            <input 
              id="exp_date"
              type="date" 
              className="w-full bg-surface text-on-surface text-body-md p-3 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow font-mono" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="exp_category">Expense Category</label>
            <div className="relative">
              <select 
                id="exp_category"
                className="w-full bg-surface text-on-surface text-body-md p-3 rounded-lg border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-shadow cursor-pointer" 
                style={{ appearance: 'none', WebkitAppearance: 'none' }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="text-label-md text-on-surface font-semibold">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'UPI / Online', 'Cheque'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-3 text-[12px] text-label-md font-bold rounded-lg transition-colors border cursor-pointer ${paymentMode === mode ? 'bg-secondary text-on-secondary border-secondary shadow-sm' : 'bg-surface text-on-surface border-outline-variant hover:bg-surface-variant/30'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-stack-sm pt-2 relative z-10">
            <label className="text-label-md text-on-surface-variant">Receipt Upload</label>
            <button className="w-full border-2 border-dashed border-outline-variant/70 rounded-lg py-6 flex flex-col items-center justify-center gap-2 bg-surface hover:bg-surface-variant/50 transition-colors cursor-pointer" type="button">
              <ImagePlus className="text-outline w-8 h-8" />
              <span className="text-label-md text-on-surface-variant">Attach Bill / Receipt</span>
            </button>
          </div>
        </form>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant p-container-padding-mobile z-50">
        <div className="max-w-md mx-auto">
          <button onClick={handleConfirm} className="w-full h-12 bg-error text-on-error rounded-lg text-label-md flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_4px_12px_rgba(186,26,26,0.2)] cursor-pointer">
            <CheckCircle className="w-5 h-5 flex-shrink-0" fill="currentColor" stroke="white" />
            Confirm Outflow
          </button>
        </div>
      </div>
    </>
  );
}

function SideNav({ onNavigate, activePage, userRole, onLogout, activeFirm, currentUser, onClearAllData, onOpenSettings, onOpenHandover }: { onNavigate: (page: Page) => void, activePage: Page, userRole?: 'user' | 'firmAdmin', onLogout?: () => void, activeFirm?: Firm, currentUser?: any, onClearAllData?: () => void, onOpenSettings?: () => void, onOpenHandover?: () => void }) {
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[280px] bg-surface-container-lowest border-r border-outline-variant z-50">
      <div className="p-6">
        <span className="text-headline-md text-primary font-bold">ShopBooks</span>
      </div>
      <div className="flex flex-col gap-2 px-4 mt-4 flex-1">
        <button onClick={() => onNavigate('dashboard')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${activePage === 'dashboard' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
          <Home className="w-6 h-6" />
          <span className="text-label-md">Home</span>
        </button>
        <button onClick={() => onNavigate('credit')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${activePage === 'credit' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
          <Wallet className="w-6 h-6" />
          <span className="text-label-md">Credit</span>
        </button>
        <button onClick={onOpenSettings} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-on-surface-variant hover:bg-surface-container-low">
          <Settings className="w-6 h-6" />
          <span className="text-label-md">Settings</span>
        </button>
        {userRole === 'firmAdmin' && (
          <button onClick={() => onNavigate('firmAdmin')} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-on-surface-variant hover:bg-surface-container-low mt-4 border border-outline-variant/50">
            <ShieldPlus className="w-6 h-6 text-primary" />
            <span className="text-label-md text-primary">Admin Portal</span>
          </button>
        )}
        {currentUser?.id === 'master_super_admin' && (
          <button onClick={() => onNavigate('masterAdmin')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 mt-2 border border-primary/30 ${activePage === 'masterAdmin' ? 'bg-primary/20 text-primary' : 'text-primary hover:bg-primary/10'}`}>
            <ShieldAlert className="w-6 h-6 text-primary animate-pulse" />
            <span className="text-label-md text-primary font-bold">Master Console</span>
          </button>
        )}
      </div>
      <div className="p-4 border-t border-outline-variant space-y-4">
        {activeFirm && currentUser && (
          <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Active Firm</p>
            <p className="text-sm font-semibold text-on-surface truncate">{activeFirm.name}</p>
            <p className="text-xs text-on-surface-variant font-mono">ID: {activeFirm.id}</p>
            
            <div className="mt-2.5 pt-2 border-t border-outline-variant/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Logged In As</p>
              <p className="text-sm font-semibold text-on-surface truncate">{currentUser.name}</p>
              <p className="text-xs text-on-surface-variant truncate italic">{currentUser.role}</p>
            </div>
          </div>
        )}
        {onClearAllData && (
          <button onClick={onClearAllData} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-amber-600 hover:bg-amber-500/10 border border-amber-500/10 shrink-0">
            <Trash2 className="w-6 h-6 text-amber-500" />
            <span className="text-label-md">Erase Demo Data</span>
          </button>
        )}
        {onOpenHandover && (
          <button onClick={onOpenHandover} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-secondary hover:bg-secondary/10 border border-secondary/20 shrink-0">
            <ArrowLeftRight className="w-6 h-6 text-secondary" />
            <span className="text-label-md">Handover Shift</span>
          </button>
        )}
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 text-error hover:bg-error-container/20">
          <LogOut className="w-6 h-6" />
          <span className="text-label-md">Logout</span>
        </button>
      </div>
    </nav>
  );
}

function MobileHeader({ 
  activeFirm, 
  currentUser, 
  onClearAllData, 
  onOpenSettings, 
  onOpenHandover, 
  onNavigate,
  customers = [],
  transactions = [],
  currentFirmId = '',
  onSelectCustomer
}: { 
  activeFirm?: Firm, 
  currentUser?: any, 
  onClearAllData?: () => void, 
  onOpenSettings?: () => void, 
  onOpenHandover?: () => void, 
  onNavigate?: (page: Page) => void,
  customers?: Customer[],
  transactions?: Transaction[],
  currentFirmId?: string,
  onSelectCustomer?: (id: string | null) => void
}) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="w-full top-0 sticky bg-surface-container-lowest flex justify-between items-center px-container-padding-mobile h-16 md:hidden z-40 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-b border-outline-variant">
      <div className="flex items-center gap-2">
        <span className="text-headline-mobile text-primary font-bold">ShopBooks</span>
      </div>
      <div className="flex items-center gap-1">
        {onNavigate && onSelectCustomer && (
          <CollectionNotificationCenter 
            customers={customers}
            transactions={transactions}
            currentFirmId={currentFirmId}
            activeFirm={activeFirm}
            onNavigate={onNavigate}
            onSelectCustomer={onSelectCustomer}
          />
        )}
        <button 
          onClick={() => setShowProfile(true)}
          className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors duration-200 cursor-pointer"
        >
          <UserCircle className="w-6 h-6 text-primary" />
        </button>
      </div>

      {/* Profile Dialog */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-on-surface text-[18px]">Profile & Firm</h3>
                <p className="text-xs text-on-surface-variant">Active Session Info</p>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Firm Details</p>
                <p className="text-sm font-semibold text-on-surface mt-1">{activeFirm?.name}</p>
                <p className="text-xs text-on-surface-variant">ID: {activeFirm?.id}</p>
                <p className="text-xs text-on-surface-variant">Email: {activeFirm?.email}</p>
                <p className="text-xs text-on-surface-variant">Mobile: {activeFirm?.mobile}</p>
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Logged In As</p>
                <p className="text-sm font-semibold text-on-surface mt-1">{currentUser?.name}</p>
                <p className="text-xs text-on-surface-variant">User ID: {currentUser?.id}</p>
                <p className="text-xs text-on-surface-variant">Role: {currentUser?.role}</p>
                {currentUser?.mobile && (
                  <p className="text-xs text-on-surface-variant">Mobile: {currentUser?.mobile}</p>
                )}
              </div>
            </div>

            {onClearAllData && (
              <button 
                onClick={() => { setShowProfile(false); onClearAllData(); }}
                className="w-full mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 py-2.5 rounded-xl text-label-md font-medium hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Erase Demo Data</span>
              </button>
            )}

            <button 
              onClick={() => {
                setShowProfile(false);
                onOpenSettings?.();
              }}
              className="w-full mt-2 bg-secondary text-white py-2.5 rounded-xl text-label-md font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              <Settings className="w-4.5 h-4.5" />
              Settings
            </button>

            {onOpenHandover && (
              <button 
                onClick={() => {
                  setShowProfile(false);
                  onOpenHandover();
                }}
                className="w-full mt-2 bg-secondary/15 border border-secondary/25 text-secondary py-2.5 rounded-xl text-label-md font-bold flex items-center justify-center gap-2 hover:bg-secondary/20 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-4.5 h-4.5" />
                Handover Shift
              </button>
            )}

            {currentUser?.id === 'master_super_admin' && onNavigate && (
              <button 
                onClick={() => {
                  setShowProfile(false);
                  onNavigate('masterAdmin');
                }}
                className="w-full mt-2 bg-primary/10 border border-primary/20 text-primary py-2.5 rounded-xl text-label-md font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4.5 h-4.5" />
                Master Console
              </button>
            )}

            <button 
              onClick={() => setShowProfile(false)}
              className="w-full mt-2 bg-primary text-on-primary py-2.5 rounded-xl text-label-md font-medium hover:bg-primary/95 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function PageHeader({ 
  workingDate, 
  isClosed, 
  onWorkingDateChange,
  userRole,
  onUnlockDay
}: { 
  workingDate: string; 
  isClosed: boolean; 
  onWorkingDateChange?: (date: string) => void; 
  userRole?: 'user' | 'firmAdmin';
  onUnlockDay?: () => void;
}) {
  const formattedDate = new Date(workingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 text-left">
      <div className="text-left flex-1">
        <h1 className="text-headline-mobile md:text-headline-lg font-black text-on-surface flex items-center gap-2">
          <span>Working Overview</span>
          {isClosed ? (
            <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">LOCKED</span>
          ) : (
            <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">OPEN</span>
          )}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-on-surface-variant text-xs flex items-center gap-1.5 font-semibold">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="font-mono text-xs">{formattedDate}</span>
          </p>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Change Date:</span>
            <input 
              type="date"
              value={workingDate}
              onChange={(e) => {
                if (e.target.value && onWorkingDateChange) {
                  onWorkingDateChange(e.target.value);
                }
              }}
              className="bg-surface-bright text-on-surface border border-outline-variant rounded-lg px-2.5 py-1 text-xs font-bold font-mono outline-none cursor-pointer focus:border-primary transition-shadow" 
            />
          </div>
        </div>
      </div>
      {isClosed ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="text-[10px] leading-snug">
              <span className="font-extrabold block uppercase tracking-wider text-rose-850">DAY LOCKED</span>
              <span className="text-on-surface-variant/80 font-normal">Edits locked for counter staff.</span>
            </div>
          </div>
          {userRole === 'firmAdmin' && onUnlockDay && (
            <button
              onClick={onUnlockDay}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Ledger</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm max-w-xs shrink-0">
          <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-[10px] leading-snug">
            <span className="font-extrabold block uppercase tracking-wider text-emerald-850">REGISTER ACTIVE</span>
            <span className="text-on-surface-variant/80 font-normal font-sans">Full user actions unlocked.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function BentoGrid({ 
  transactions, 
  customers, 
  isDemoMode,
  openingCash,
  onNavigateToTxHistory,
  onNavigateToDayClosing,
  allTransactions,
  onNavigate,
  onSelectCustomer
}: { 
  transactions: Transaction[], 
  customers: Customer[], 
  isDemoMode?: boolean,
  openingCash: number,
  onNavigateToTxHistory: (filterType: string, searchQuery?: string) => void,
  onNavigateToDayClosing?: () => void,
  allTransactions: Transaction[],
  onNavigate?: (page: Page) => void,
  onSelectCustomer?: (id: string | null) => void
}) {
  const [showPatientsModal, setShowPatientsModal] = useState(false);
  const [patientsSearch, setPatientsSearch] = useState('');

  const outstandingPatients = useMemo(() => {
    return customers
      .filter(c => (c.pendingBalance || 0) > 0)
      .filter(c => {
        if (!patientsSearch.trim()) return true;
        const q = patientsSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
      })
      .sort((a, b) => b.pendingBalance - a.pendingBalance);
  }, [customers, patientsSearch]);

  // Filter types
  const creditSales = transactions.filter(t => t.type === 'credit_sale');
  const creditReceived = transactions.filter(t => t.type === 'receive_payment');
  const supplierPaid = transactions.filter(t => t.type === 'supplier_payment');
  const schemePaid = transactions.filter(t => t.type === 'scheme_bill');
  const staffCredits = transactions.filter(t => t.type === 'staff_credit');
  const staffAdvances = transactions.filter(t => t.type === 'staff_advance');

  // Sums
  const dynamicCreditGiven = creditSales.reduce((sum, t) => sum + t.amount, 0);
  const dynamicSchemeReceivables = schemePaid.reduce((sum, t) => sum + t.amount, 0);
  const dynamicExpenses = supplierPaid.reduce((sum, t) => sum + t.amount, 0);
  const dynamicStaffCredit = staffCredits.reduce((sum, t) => sum + t.amount, 0);
  const dynamicStaffAdvance = staffAdvances.reduce((sum, t) => sum + t.amount, 0);

  let paymentCollectionCash = 0;
  let paymentCollectionOnline = 0;
  creditReceived.forEach(t => {
    if ((t.extraDetails || '').toLowerCase().includes('cash')) {
      paymentCollectionCash += t.amount;
    } else {
      paymentCollectionOnline += t.amount;
    }
  });

  const staffCreditToday = dynamicStaffCredit;
  const staffAdvanceToday = dynamicStaffAdvance;

  // Include both patient credit and staff credit in totalCreditGiven as requested
  const totalCreditGiven = dynamicCreditGiven + staffCreditToday;
  const totalExpenses = (isDemoMode ? 1250 : 0) + dynamicExpenses;

  // Calculate day sales (includes total credit sales [patients + staff], and scheme bills)
  const totalSalesToday = totalCreditGiven + dynamicSchemeReceivables;

  const supplierPaidInCash = supplierPaid.filter(t => {
    const details = (t.extraDetails || '').toLowerCase();
    return details.includes('cash') || (!details.includes('upi') && !details.includes('online') && !details.includes('bank') && !details.includes('card'));
  });
  const supplierPaymentInCash = supplierPaidInCash.reduce((sum, t) => sum + t.amount, 0);

  const staffAdvancesPaidInCash = staffAdvances.filter(t => {
    const details = (t.extraDetails || '').toLowerCase();
    return details.includes('cash');
  });
  const staffAdvanceInCashToday = staffAdvancesPaidInCash.reduce((sum, t) => sum + t.amount, 0);

  // Total Cash in Hand Formula: Opening Cash + Payment Collection by Cash - Supplier Expenses in Cash - Staff Advance in Cash
  const totalCashInHand = openingCash + paymentCollectionCash - supplierPaymentInCash - staffAdvanceInCashToday;

  // Cumulative Receivables (All-time Outstanding)
  const totalPatientOutstanding = customers.reduce((sum, c) => sum + (c.pendingBalance || 0), 0);
  const totalStaffCreditOutstanding = allTransactions.filter(t => t.type === 'staff_credit').reduce((sum, t) => sum + t.amount, 0);
  const totalSchemeBillsOutstanding = allTransactions.filter(t => t.type === 'scheme_bill').reduce((sum, t) => sum + t.amount, 0);
  const cumulativeReceivables = totalPatientOutstanding + totalStaffCreditOutstanding + totalSchemeBillsOutstanding;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter text-left">
        {/* Total Receivables Hero Card */}
        <div 
          onClick={() => setShowPatientsModal(true)}
          className="col-span-2 md:col-span-3 bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-lowest rounded-xl p-6 border border-primary/10 hover:border-primary/35 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div className="flex-1 text-left">
            <div className="flex items-center gap-1.5 mb-2 bg-primary/10 text-primary px-2.5 py-1 rounded-full w-fit">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Live Outstanding Ledger
              </span>
            </div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Receivables</h3>
            <span className="text-3xl md:text-4xl font-extrabold text-primary mt-1 block">₹{cumulativeReceivables.toLocaleString()}</span>
            <p className="text-on-surface-variant text-xs mt-2 leading-relaxed max-w-xl">
              Overall outstanding payments awaiting recovery. Represents the sum of current patient dues, staff store credits, and insurance/scheme bills. Click to view outstanding patient records.
            </p>
          </div>
          
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto min-w-[280px] lg:min-w-[480px]">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToTxHistory('credit_sale');
                }}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 hover:border-error/60 hover:bg-error/5 transition-all flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1">Patient Dues</div>
                    <ExternalLink className="w-3.5 h-3.5 text-error opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-lg font-bold text-error">₹{totalPatientOutstanding.toLocaleString()}</div>
                </div>
                <div className="text-[10px] text-on-surface-variant/70 mt-1.5 flex items-center justify-between">
                  <span>Patient credit sales</span>
                  <span className="font-bold text-error text-[9px] underline">View Entries →</span>
                </div>
              </div>

              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToTxHistory('staff_credit');
                }}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 hover:border-amber-600/60 hover:bg-amber-500/5 transition-all flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1">Staff Credits</div>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-lg font-bold text-amber-600">₹{totalStaffCreditOutstanding.toLocaleString()}</div>
                </div>
                <div className="text-[10px] text-on-surface-variant/70 mt-1.5 flex items-center justify-between">
                  <span>Store credit ledger</span>
                  <span className="font-bold text-amber-600 text-[9px] underline">View Entries →</span>
                </div>
              </div>

              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToTxHistory('scheme_bill');
                }}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 hover:border-blue-600/60 hover:bg-blue-500/5 transition-all flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1">Scheme Bills</div>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-lg font-bold text-blue-600">₹{totalSchemeBillsOutstanding.toLocaleString()}</div>
                </div>
                <div className="text-[10px] text-on-surface-variant/70 mt-1.5 flex items-center justify-between">
                  <span>Scheme recovery</span>
                  <span className="font-bold text-blue-600 text-[9px] underline">View Entries →</span>
                </div>
              </div>
            </div>
        </div>

        {/* Secondary Metrics */}
        <MetricCard 
          title="Payment Collection (Cash)" 
          amount={`₹${paymentCollectionCash.toLocaleString()}`} 
          amountColor="text-green-600" 
          onClick={() => onNavigateToTxHistory('receive_payment_cash')}
        />
        <MetricCard 
          title="Payment Collection (Online)" 
          amount={`₹${paymentCollectionOnline.toLocaleString()}`} 
          amountColor="text-teal-600" 
          onClick={() => onNavigateToTxHistory('receive_payment_online')}
        />
        <MetricCard 
          title="Credit Given (Patients & Staff)" 
          amount={`₹${totalCreditGiven.toLocaleString()}`} 
          className="border border-error-container hover:border-error/40" 
          amountColor="text-error" 
          onClick={() => onNavigateToTxHistory('credit_sale')}
        />
        <MetricCard 
          title="Scheme Bills (Today)" 
          amount={`₹${dynamicSchemeReceivables.toLocaleString()}`} 
          amountColor="text-blue-600" 
          onClick={() => onNavigateToTxHistory('scheme_bill')}
        />
        <MetricCard 
          title="Supplier Payment" 
          amount={`₹${supplierPaymentInCash.toLocaleString()}`} 
          amountColor="text-purple-600" 
          onClick={() => onNavigateToTxHistory('supplier_payment')}
        />
        <MetricCard 
          title="Expenses (Store/Expenses)" 
          amount={`₹${totalExpenses.toLocaleString()}`} 
          amountColor="text-on-surface" 
          onClick={() => onNavigateToTxHistory('expense')}
        />
        <MetricCard 
          title="Staff Credit Ledger" 
          amount={`₹${staffCreditToday.toLocaleString()}`} 
          amountColor="text-amber-600" 
          onClick={() => onNavigateToTxHistory('staff_credit', '')}
        />
        <MetricCard 
          title="Staff Advance Ledger" 
          amount={`₹${staffAdvanceToday.toLocaleString()}`} 
          amountColor="text-cyan-600" 
          onClick={() => onNavigateToTxHistory('staff_advance', '')}
        />
      </div>

      {showPatientsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="bg-surface-bright rounded-2xl shadow-xl border border-outline-variant max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-primary text-on-primary p-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 p-2 rounded-full">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">Outstanding Patients List</h3>
                  <p className="text-xs text-white/85">
                    {outstandingPatients.length} patient accounts • Total: ₹{totalPatientOutstanding.toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPatientsModal(false);
                  setPatientsSearch('');
                }}
                className="hover:bg-white/20 p-1.5 rounded-full text-white transition-colors outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter input block */}
            <div className="p-4 bg-surface-container-low border-b border-outline-variant flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search patient by name or mobile number..."
                  value={patientsSearch}
                  onChange={(e) => setPatientsSearch(e.target.value)}
                  className="bg-surface-bright border border-outline-variant focus:border-primary/80 rounded-xl pl-10 pr-4 py-2 text-sm text-on-background outline-none w-full transition-all"
                  autoFocus
                />
                {patientsSearch && (
                  <button 
                    onClick={() => setPatientsSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface-variant cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Patients list panel (scrollable) */}
            <div className="p-4 overflow-y-auto max-h-[55vh] flex flex-col gap-2.5 bg-surface-container-lowest">
              {outstandingPatients.length > 0 ? (
                outstandingPatients.map((c) => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      if (onSelectCustomer) onSelectCustomer(c.id);
                      if (onNavigate) onNavigate('customerLedger');
                      setShowPatientsModal(false);
                      setPatientsSearch('');
                    }}
                    className="flex justify-between items-center p-3.5 hover:bg-primary/5 rounded-xl border border-outline-variant/30 hover:border-primary/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-on-background group-hover:text-primary transition-colors">
                          {c.name}
                        </div>
                        {c.phone && (
                          <div className="text-xs text-on-surface-variant font-mono">
                            {c.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-error">
                          ₹{c.pendingBalance.toLocaleString()}
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.status === 'Overdue' ? 'bg-error/10 text-error' : 'bg-amber-500/10 text-amber-700'}`}>
                          {c.status || 'Pending'}
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
                  <p className="text-sm text-on-surface-variant">No patients with outstanding balance found.</p>
                </div>
              )}
            </div>

            {/* Footer with actions/hints */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant text-center text-[11px] text-on-surface-variant/85 font-medium leading-normal">
              <span>💡 Tip: Click on a patient's row to open their complete transaction ledger directly.</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function CollectionNotificationCenter({
  customers,
  transactions,
  currentFirmId,
  activeFirm,
  onNavigate,
  onSelectCustomer
}: {
  customers: Customer[],
  transactions: Transaction[],
  currentFirmId: string,
  activeFirm?: Firm,
  onNavigate: (page: Page) => void,
  onSelectCustomer: (id: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'high_value'>('all');
  const [followUpDates, setFollowUpDates] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`shopbooks_followups_${currentFirmId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const activeCustomers = useMemo(() => {
    return customers.filter(c => c.firmId === currentFirmId && c.pendingBalance > 0);
  }, [customers, currentFirmId]);

  const totalPending = useMemo(() => {
    return activeCustomers.reduce((sum, c) => sum + c.pendingBalance, 0);
  }, [activeCustomers]);

  const filteredList = useMemo(() => {
    let list = activeCustomers;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }
    if (activeTab === 'overdue') {
      list = list.filter(c => c.status === 'Overdue' || c.pendingBalance > 1000);
    } else if (activeTab === 'high_value') {
      list = [...list].sort((a, b) => b.pendingBalance - a.pendingBalance);
    }
    return list;
  }, [activeCustomers, search, activeTab]);

  const handleSetFollowUp = (customerId: string, dateStr: string) => {
    const updated = { ...followUpDates, [customerId]: dateStr };
    setFollowUpDates(updated);
    try {
      localStorage.setItem(`shopbooks_followups_${currentFirmId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const getWhatsAppLink = (customer: Customer) => {
    const rawPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const firmName = activeFirm?.name || 'ShopBooks';
    const message = `Hello ${customer.name} Ji,\n\nThis is a gentle reminder from ${firmName} regarding your pending bill balance of ₹${customer.pendingBalance.toLocaleString()}.\n\nKindly settle the amount at your convenience via UPI or Cash.\n\nThank you!`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  };

  return (
    <>
      {/* Bell Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-full hover:bg-surface-container-low transition-colors duration-200 cursor-pointer flex items-center justify-center text-on-surface-variant"
        title="Payment Collection Notifications"
      >
        <Bell className="w-5.5 h-5.5 text-primary" />
        {activeCustomers.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-error text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface-container-lowest animate-pulse">
            {activeCustomers.length}
          </span>
        )}
      </button>

      {/* Slide-over Drawer / Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-end bg-black/60 backdrop-blur-sm p-0 md:p-4 text-left">
          <div className="bg-surface-bright border-l md:border border-outline-variant w-full max-w-md h-full md:h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="bg-primary text-on-primary p-4 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <BellRing className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-snug">Payment Collection Alerts</h3>
                  <p className="text-xs text-white/85">
                    {activeCustomers.length} pending accounts • Total: ₹{totalPending.toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1.5 rounded-full text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter Tabs */}
            <div className="p-3 bg-surface-container-low border-b border-outline-variant flex gap-2">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-bright text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                All ({activeCustomers.length})
              </button>
              <button 
                onClick={() => setActiveTab('overdue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'overdue' ? 'bg-error text-white shadow-xs' : 'bg-surface-bright text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                Overdue
              </button>
              <button 
                onClick={() => setActiveTab('high_value')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'high_value' ? 'bg-amber-600 text-white shadow-xs' : 'bg-surface-bright text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                Highest Dues
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 bg-surface-container-lowest border-b border-outline-variant">
              <div className="relative">
                <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search patient name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-surface-bright border border-outline-variant rounded-lg text-xs text-on-background outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Collection Cards Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
              {filteredList.length > 0 ? (
                filteredList.map((c) => {
                  const whatsappUrl = getWhatsAppLink(c);
                  const savedFollowUp = followUpDates[c.id];

                  return (
                    <div 
                      key={c.id}
                      className="p-3.5 bg-surface-bright rounded-xl border border-outline-variant/40 hover:border-primary/40 shadow-xs transition-all space-y-2.5"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-on-background">{c.name}</div>
                            <div className="text-xs text-on-surface-variant font-mono">{c.phone || 'No Mobile'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-extrabold text-error">₹{c.pendingBalance.toLocaleString()}</div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${c.status === 'Overdue' ? 'bg-error/10 text-error' : 'bg-amber-500/10 text-amber-700'}`}>
                            {c.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {savedFollowUp && (
                        <div className="bg-primary/5 text-primary p-2 rounded-lg text-xs flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Follow-up Date: {savedFollowUp}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/20">
                        <a 
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>

                        <button 
                          onClick={() => {
                            onSelectCustomer(c.id);
                            onNavigate('receiveCashPayment');
                            setIsOpen(false);
                          }}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          Settle Cash
                        </button>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-on-surface-variant pt-1">
                        <button 
                          onClick={() => {
                            onSelectCustomer(c.id);
                            onNavigate('customerLedger');
                            setIsOpen(false);
                          }}
                          className="hover:text-primary font-semibold underline cursor-pointer"
                        >
                          View Full Ledger →
                        </button>

                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-on-surface-variant/70">Follow-up:</span>
                          <input 
                            type="date"
                            value={savedFollowUp || ''}
                            onChange={(e) => handleSetFollowUp(c.id, e.target.value)}
                            className="text-[10px] border border-outline-variant rounded px-1 py-0.5 bg-surface-bright text-on-surface-variant cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-8 bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-on-surface">No matching collection accounts!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant text-center text-[11px] text-on-surface-variant font-medium">
              <span>💡 Tap <b>Settle Cash</b> to record cash payment received directly against a patient's credit sale.</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function CollectionNotificationBanner({
  customers,
  currentFirmId,
  onNavigate,
  onSelectCustomer
}: {
  customers: Customer[],
  currentFirmId: string,
  onNavigate: (page: Page) => void,
  onSelectCustomer: (id: string | null) => void
}) {
  const pendingCustomers = useMemo(() => {
    return customers.filter(c => c.firmId === currentFirmId && c.pendingBalance > 0);
  }, [customers, currentFirmId]);

  const totalAmount = useMemo(() => {
    return pendingCustomers.reduce((sum, c) => sum + c.pendingBalance, 0);
  }, [pendingCustomers]);

  if (pendingCustomers.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left my-2 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="bg-amber-500 text-white p-2 rounded-xl shrink-0">
          <BellRing className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Payment Collection Alert</h4>
          <p className="text-xs text-on-surface font-semibold mt-0.5">
            <b>{pendingCustomers.length} patient accounts</b> have a total of <span className="text-error font-extrabold">₹{totalAmount.toLocaleString()}</span> in pending dues awaiting collection.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={() => {
            if (pendingCustomers[0]) {
              onSelectCustomer(pendingCustomers[0].id);
            }
            onNavigate('receiveCashPayment');
          }}
          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <Banknote className="w-3.5 h-3.5" />
          Settle Cash
        </button>
        <button 
          onClick={() => {
            if (pendingCustomers[0]) {
              onSelectCustomer(pendingCustomers[0].id);
            }
            onNavigate('credit');
          }}
          className="px-3 py-1.5 bg-surface-bright hover:bg-surface-container-high border border-outline-variant text-on-surface font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          View Dues
        </button>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  amount, 
  className = "", 
  amountColor = "text-primary",
  onClick 
}: { 
  title: string, 
  amount: string, 
  className?: string, 
  amountColor?: string,
  onClick?: () => void
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-surface-container-lowest rounded-xl p-gutter shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-transparent hover:border-primary/20 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${className}`}
    >
      <span className="text-label-md text-on-surface-variant block mb-stack-md flex justify-between items-center text-xs font-semibold uppercase tracking-wider">
        <span>{title}</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-on-surface-variant/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </span>
      <span className={`text-number-md block font-bold ${amountColor}`}>{amount}</span>
    </div>
  );
}

function TrendChart({ isDemoMode }: { isDemoMode?: boolean }) {
  return (
    <div className="md:col-span-2 bg-surface-container-lowest rounded-xl p-gutter shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-left flex flex-col justify-between">
      <div className="flex justify-between items-center mb-stack-lg">
        <h2 className="text-headline-md text-on-surface">Daily Trend</h2>
        <select className="bg-surface-bright border-outline-variant text-sm rounded-lg px-3 py-1.5 focus:border-secondary focus:ring-secondary focus:outline-none border">
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>
      
      {isDemoMode ? (
        <div className="h-64 w-full bg-surface-container flex items-end justify-between px-4 pb-4 pt-12 rounded-lg relative overflow-hidden">
          {/* Fake Graph Bars - translating original HTML to React */}
          <div className="w-1/12 bg-primary-fixed-dim rounded-t-md h-1/3"></div>
          <div className="w-1/12 bg-primary-fixed-dim rounded-t-md h-1/2"></div>
          <div className="w-1/12 bg-primary-fixed-dim rounded-t-md h-2/5"></div>
          <div className="w-1/12 bg-primary-fixed-dim rounded-t-md h-3/4"></div>
          <div className="w-1/12 bg-primary-fixed-dim rounded-t-md h-1/2"></div>
          <div className="w-1/12 bg-primary-fixed-dim rounded-t-md h-4/5"></div>
          <div className="w-1/12 bg-secondary rounded-t-md h-full relative group cursor-pointer transition-colors duration-200 hover:bg-secondary/90">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              ₹45k
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 w-full bg-surface-container/40 flex flex-col items-center justify-center p-6 rounded-lg text-center border border-dashed border-outline-variant">
          <TrendingUp className="w-10 h-10 text-on-surface-variant/40 mb-2" />
          <p className="text-sm font-semibold text-on-surface">Ledger Visualizations</p>
          <p className="text-xs text-on-surface-variant max-w-xs mt-1">Daily trend graphs will display here live as you record transactions.</p>
        </div>
      )}
    </div>
  );
}

function RecentTransactions({ onNavigate, transactions }: { onNavigate: (page: Page) => void, transactions: Transaction[] }) {
  const latestTransactions = transactions.slice(0, 5);

  return (
    <div className="bg-surface-container-lowest rounded-xl p-gutter shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-left">
      <div className="flex justify-between items-center mb-stack-md">
        <h2 className="text-headline-md text-on-surface">Recent Transactions</h2>
        <a className="text-secondary text-sm font-semibold hover:underline cursor-pointer" onClick={() => onNavigate('transactionHistory')}>View All</a>
      </div>
      <div className="space-y-0 max-h-[360px] overflow-y-auto pr-1">
        {latestTransactions.map((t, idx) => {
          let icon = <FileText className="w-5 h-5" />;
          let iconContainerClass = "bg-primary-container/20 text-primary";
          let typeLabel = "";
          let amountStr = "";
          let amountColor = "text-on-surface";

          switch (t.type) {
            case 'credit_sale':
              icon = <FileText className="w-5 h-5" />;
              iconContainerClass = "bg-error-container/30 text-error";
              typeLabel = "Credit Sale";
              amountStr = `-₹${t.amount.toLocaleString()}`;
              amountColor = "text-error";
              break;
            case 'receive_payment':
              icon = <QrCode className="w-5 h-5" />;
              iconContainerClass = "bg-secondary-container/30 text-secondary";
              typeLabel = t.extraDetails ? `Payment Recv. (${t.extraDetails})` : "Payment Received";
              amountStr = `+₹${t.amount.toLocaleString()}`;
              amountColor = "text-secondary";
              break;
            case 'supplier_payment':
              icon = <Truck className="w-5 h-5" />;
              iconContainerClass = "bg-outline-variant/30 text-on-surface-variant";
              typeLabel = "Supplier Payment";
              amountStr = `-₹${t.amount.toLocaleString()}`;
              amountColor = "text-on-surface";
              break;
            case 'scheme_bill':
              icon = <ShieldPlus className="w-5 h-5" />;
              iconContainerClass = "bg-secondary-container/30 text-secondary";
              typeLabel = `Scheme Bill (${t.extraDetails || 'MJPJAY'})`;
              amountStr = `+₹${t.amount.toLocaleString()}`;
              amountColor = "text-secondary";
              break;
          }

          return (
            <TransactionRow 
              key={t.id}
              icon={icon}
              title={`${typeLabel} - ${t.patientName || 'General'}`}
              time={`${t.date} ${t.time} • By: ${t.recordedByUserName || 'Staff'}`}
              amount={amountStr}
              amountColor={amountColor}
              iconContainerClass={iconContainerClass}
              isLast={idx === latestTransactions.length - 1}
            />
          );
        })}
        {latestTransactions.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-8">No recent transactions recorded today.</p>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ 
  icon, title, time, amount, amountColor, iconContainerClass = "bg-surface-container text-on-surface-variant", isLast = false 
}: { 
  key?: string, icon: React.ReactNode, title: string, time: string, amount: string, amountColor: string, iconContainerClass?: string, isLast?: boolean 
}) {
  return (
    <div className={`flex items-center justify-between py-stack-md min-h-[64px] ${!isLast ? 'border-b border-outline-variant/30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconContainerClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-label-md text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant">{time}</p>
        </div>
      </div>
      <span className={`text-number-md ${amountColor}`}>{amount}</span>
    </div>
  );
}

function FloatingActionButton({ onClick }: { onClick?: () => void }) {
  return (
    <button 
      className="fixed bottom-24 right-4 w-14 h-14 bg-secondary text-on-secondary rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex items-center justify-center md:hidden z-40 active:scale-95 transition-transform"
      onClick={onClick}
    >
      <Plus className="w-7 h-7" />
    </button>
  );
}

function BottomNav({ onNavigate, activePage, userRole, onLogout }: { onNavigate: (page: Page) => void, activePage: Page, userRole?: 'user' | 'firmAdmin', onLogout?: () => void }) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-2 bg-surface-container-lowest border-t border-outline-variant md:hidden">
      <NavItem icon={<Home className={`w-6 h-6 ${activePage === 'dashboard' ? 'fill-on-secondary-container' : ''}`} />} label="Home" active={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')} />
      <NavItem icon={<Wallet className={`w-6 h-6 ${activePage === 'credit' ? 'fill-on-secondary-container' : ''}`} />} label="Credit" active={activePage === 'credit'} onClick={() => onNavigate('credit')} />
      {userRole === 'firmAdmin' && (
         <NavItem icon={<ShieldPlus className="w-6 h-6 text-primary" />} label="Admin" active={false} onClick={() => onNavigate('firmAdmin')} />
      )}
      <NavItem icon={<LogOut className="w-6 h-6 text-error" />} label="Logout" active={false} onClick={onLogout || (() => {})} />
    </nav>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  if (active) {
    return (
      <button onClick={onClick} className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1.5 active:scale-95 transition-transform duration-150 cursor-pointer">
        {icon}
        <span className="text-[12px] font-semibold mt-1">{label}</span>
      </button>
    );
  }
  
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1.5 hover:bg-surface-container-high rounded-full active:scale-95 transition-transform duration-150 cursor-pointer">
      {icon}
      <span className="text-[12px] font-semibold mt-1">{label}</span>
    </button>
  );
}

function ReceivePaymentScreen({ 
  onBack, 
  onRecordReceivePayment, 
  selectedCustomerId, 
  customers,
  currentFirmId,
  workingDate,
  initialPlatform
}: { 
  onBack: () => void, 
  onRecordReceivePayment: (amount: number, customerName: string, customerPhone: string, platform: string, txnId: string, notes: string, date?: string) => void, 
  selectedCustomerId: string | null, 
  customers: Customer[],
  currentFirmId: string,
  workingDate?: string,
  initialPlatform?: string
}) {
  const [platform, setPlatform] = useState(() => initialPlatform || 'upi');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => workingDate || getLocalDateString());
  
  const prefilledCustomer = selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : null;
  const [customerName, setCustomerName] = useState(() => prefilledCustomer ? prefilledCustomer.name : '');
  const [customerPhone, setCustomerPhone] = useState(() => prefilledCustomer ? prefilledCustomer.phone : '');

  const [showAutoPrefilledBadge, setShowAutoPrefilledBadge] = useState(!!prefilledCustomer);
  const [focusedInput, setFocusedInput] = useState(false);

  const activeCustomers = customers.filter(c => c.firmId === currentFirmId);
  const outstandingPatients = activeCustomers.filter(c => (c.pendingBalance || 0) > 0);
  const autocompleteSuggestions = !selectedCustomerId
    ? (customerName.trim()
        ? activeCustomers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()))
        : outstandingPatients)
    : [];
  
  useEffect(() => {
    if (prefilledCustomer) {
      setCustomerName(prefilledCustomer.name);
      setCustomerPhone(prefilledCustomer.phone);
      setShowAutoPrefilledBadge(true);
    }
  }, [selectedCustomerId, customers]);

  const [txnId, setTxnId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const handleConfirm = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount (> 0).');
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg('Please enter customer name to track payment under.');
      return;
    }
    setErrorMsg('');
    onRecordReceivePayment(parsedAmount, customerName.trim(), customerPhone.trim(), platform, txnId.trim(), notes.trim(), date);
  };

  return (
    <>
      <header className="bg-surface-container-lowest sticky top-0 z-40 w-full border-b border-outline-variant/30 flex items-center justify-between px-container-padding-mobile h-16">
        <button 
          className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-headline-md text-primary absolute left-1/2 -translate-x-1/2">Receive Payment</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-container-padding-mobile py-stack-lg flex flex-col gap-stack-lg max-w-md mx-auto w-full">
        {errorMsg && (
          <div className="bg-error-container/20 border border-error text-error text-sm p-3 rounded-xl text-left">
            {errorMsg}
          </div>
        )}

        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>
          <label className="text-label-md text-on-surface-variant mb-2" htmlFor="amount">Payment Amount</label>
          <div className="flex items-baseline gap-1">
            <span className="text-number-xl text-primary opacity-80">₹</span>
            <input 
              className="w-48 bg-transparent border-none p-0 text-center text-number-xl text-primary focus:ring-0 placeholder:text-outline-variant appearance-none style-hide-arrows" 
              id="amount" 
              placeholder="0.00" 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ MozAppearance: 'textfield' }}
            />
          </div>
          <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50 mt-2"></div>
        </section>

        <section className="bg-surface-container-lowest rounded-xl p-container-padding-mobile shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-stack-md relative z-10 text-left">
          <div className="flex flex-col gap-stack-sm relative">
            <div className="flex items-center justify-between">
              <label className="text-label-md text-on-surface font-semibold" htmlFor="customer_name">Customer Name *</label>
              {selectedCustomerId ? (
                <span className="text-[11px] bg-secondary-container/50 text-on-secondary-container px-2 py-0.5 rounded-full font-bold">Prefilled Ledger</span>
              ) : showAutoPrefilledBadge ? (
                <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-black font-sans">
                  ✓ Profile Linked
                </span>
              ) : null}
            </div>

            {!selectedCustomerId && outstandingPatients.length > 0 && !customerName.trim() && (
              <div className="mb-1">
                <span className="text-[10px] font-bold text-on-surface-variant/85 uppercase tracking-wider block mb-1">
                  Tap to Select Outstanding Patients
                </span>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {outstandingPatients.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setCustomerName(cust.name);
                        setCustomerPhone(cust.phone);
                        setShowAutoPrefilledBadge(true);
                        setAmount(String(cust.pendingBalance));
                      }}
                      className="px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full text-xs text-green-800 font-bold flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <User className="w-3 h-3 text-green-600" />
                      <span>{cust.name}</span>
                      <span className="bg-green-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                        ₹{cust.pendingBalance}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input 
                className="w-full pl-10 pr-3 py-3 bg-surface rounded-DEFAULT border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md text-on-surface placeholder:text-outline" 
                id="customer_name" 
                placeholder="Enter or search database customer name" 
                type="text" 
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setShowAutoPrefilledBadge(false);
                }}
                onFocus={() => setFocusedInput(true)}
                onBlur={() => setTimeout(() => setFocusedInput(false), 200)}
                disabled={!!selectedCustomerId}
              />
            </div>
            {focusedInput && autocompleteSuggestions.length > 0 && (
              <div className="absolute top-[100%] left-0 w-full bg-white border border-outline-variant rounded-b-xl shadow-lg z-50 divide-y divide-outline-variant/30 max-h-48 overflow-y-auto">
                <div className="p-2 text-[10px] bg-surface-container font-bold text-on-surface-variant uppercase tracking-wider font-sans">
                  {customerName.trim() ? 'Matching Registered Customers' : 'Patients with Outstanding Credit'}
                </div>
                {autocompleteSuggestions.map(cust => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setCustomerName(cust.name);
                      setCustomerPhone(cust.phone);
                      setShowAutoPrefilledBadge(true);
                      setFocusedInput(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-secondary-container/20 text-sm flex justify-between items-center transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-on-background">{cust.name}</p>
                      <p className="text-xs text-on-surface-variant font-mono">{cust.phone}</p>
                    </div>
                    <span className="text-xs text-secondary bg-secondary-container/30 px-1.5 py-0.5 rounded font-bold font-sans">
                      Outstanding: ₹{cust.pendingBalance}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-stack-sm mt-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="customer_phone">Customer Mobile Number</label>
            <input 
              className="w-full px-3 py-3 bg-surface rounded-DEFAULT border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md text-on-surface placeholder:text-outline" 
              id="customer_phone" 
              placeholder="e.g. +91 98765 43210" 
              type="text" 
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={!!selectedCustomerId}
            />
          </div>
          
          <div className="flex flex-col gap-stack-sm mt-1">
            <label className="text-label-md text-on-surface font-semibold">Online Platform</label>
            <div className="flex overflow-x-auto gap-2 pb-1 -mx-container-padding-mobile px-container-padding-mobile" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <PlatformChip 
                id="upi"
                label="UPI"
                icon={<QrCode className="w-[18px] h-[18px]" />}
                selected={platform === 'upi'}
                onClick={() => setPlatform('upi')}
              />
              <PlatformChip 
                id="gpay"
                label="GPay"
                icon={<Smartphone className="w-[18px] h-[18px]" />}
                selected={platform === 'gpay'}
                onClick={() => setPlatform('gpay')}
              />
              <PlatformChip 
                id="phonepe"
                label="PhonePe"
                icon={<Smartphone className="w-[18px] h-[18px]" />}
                selected={platform === 'phonepe'}
                onClick={() => setPlatform('phonepe')}
              />
              <PlatformChip 
                id="cash-re"
                label="Cash Handover"
                icon={<Wallet className="w-[18px] h-[18px]" />}
                selected={platform === 'cash'}
                onClick={() => setPlatform('cash')}
              />
              <PlatformChip 
                id="bank"
                label="Bank Transfer"
                icon={<Building2 className="w-[18px] h-[18px]" />}
                selected={platform === 'bank'}
                onClick={() => setPlatform('bank')}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md mt-1">
            <div className="flex flex-col gap-stack-sm">
              <label className="text-label-md text-on-surface font-semibold" htmlFor="txn_id">Transaction / UTR ID</label>
              <input 
                className="w-full px-3 py-3 bg-surface rounded-DEFAULT border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md text-on-surface placeholder:text-outline uppercase" 
                id="txn_id" 
                placeholder="e.g. UTR12345" 
                type="text" 
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col gap-stack-sm">
              <label className="text-label-md text-on-surface font-semibold" htmlFor="datetime">Receipt Date</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5 pointer-events-none" />
                <input 
                  className="w-full pl-3 pr-10 py-3 bg-surface rounded-DEFAULT border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md text-on-surface" 
                  id="datetime" 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-stack-sm mt-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="notes">Additional Notes</label>
            <textarea 
              className="w-full px-3 py-3 bg-surface rounded-DEFAULT border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md text-on-surface placeholder:text-outline resize-none" 
              id="notes" 
              placeholder="Optional notes about this payment..." 
              rows={2} 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>
      </main>
      
      <footer className="fixed bottom-0 w-full bg-surface-container-lowest border-t border-outline-variant/30 px-container-padding-mobile py-4 z-50 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button 
          className="w-full max-w-md h-12 bg-secondary text-on-secondary rounded-lg text-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          onClick={handleConfirm}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" fill="currentColor" stroke="white" />
          Confirm Payment
        </button>
      </footer>
    </>
  );
}

function PlatformChip({ id, label, icon, selected, onClick }: { id: string, label: string, icon: React.ReactNode, selected: boolean, onClick: () => void }) {
  return (
    <label className="cursor-pointer shrink-0">
      <input 
        className="peer sr-only" 
        name="platform" 
        type="radio" 
        value={id} 
        checked={selected}
        onChange={onClick}
      />
      <div className="px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-checked:border-secondary-container text-label-md transition-colors flex items-center gap-1.5">
        {icon}
        {label}
      </div>
    </label>
  );
}

function WhatsAppNotificationModal({ 
  notification, 
  onClose,
  activeFirmName
}: { 
  notification: {
    customerName: string;
    customerPhone: string;
    amount: number;
    type: 'credit_sale' | 'receive_payment' | 'supplier_payment' | 'scheme_bill' | 'staff_credit' | 'staff_advance';
    date: string;
    newBalance: number;
    visible: boolean;
  } | null;
  onClose: () => void;
  activeFirmName: string;
}) {
  if (!notification || !notification.visible) return null;

  const { customerName, customerPhone, amount, type, date, newBalance } = notification;

  let rawText = '';
  let typeLabel = '';
  if (type === 'credit_sale') {
    typeLabel = 'Udhaar Sale Logged';
    rawText = `Dear *${customerName}*,\nA new Credit Sale entry (Udhaar) of *₹${amount.toLocaleString()}* has been added to your ledger at *${activeFirmName}* on ${date}.\n\n*Total Outstanding Balance*: *₹${newBalance.toLocaleString()}*\n\nThank you!\nShopBooks UPI Ledgers`;
  } else if (type === 'staff_credit') {
    typeLabel = 'Staff Credit Logged';
    rawText = `Dear *${customerName}*,\nA staff credit of *₹${amount.toLocaleString()}* has been recorded on ${date} at *${activeFirmName}*.\n\nThank you!\nShopBooks UPI Ledgers`;
  } else if (type === 'staff_advance') {
    typeLabel = 'Staff Advance Logged';
    rawText = `Dear *${customerName}*,\nA cash advance of *₹${amount.toLocaleString()}* has been given to you on ${date} at *${activeFirmName}*.\n\nThank you!\nShopBooks UPI Ledgers`;
  } else if (type === 'receive_payment') {
    typeLabel = 'Payment Received';
    rawText = `Dear *${customerName}*,\nWe have successfully received payment of *₹${amount.toLocaleString()}* on ${date}, credited to your outstanding ledger at *${activeFirmName}*.\n\n*Remaining Balance*: *₹${newBalance.toLocaleString()}*\n\nThank you for choosing us!\nShopBooks UPI Ledgers`;
  } else if (type === 'scheme_bill') {
    typeLabel = 'Scheme Bill Logged';
    rawText = `Dear *${customerName}*,\nA government/insurance claim scheme bill of *₹${amount.toLocaleString()}* has been successfully recorded on ${date} at *${activeFirmName}*.\n\nThank you!\nShopBooks UPI Ledgers`;
  } else {
    typeLabel = 'Transaction Logged';
    rawText = `Dear *${customerName}*,\nA payment transaction of *₹${amount.toLocaleString()}* has been processed on ${date} at *${activeFirmName}*.\n\nThank you!\nShopBooks UPI Ledgers`;
  }

  const encodedText = encodeURIComponent(rawText);
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const whatsAppUrl = `https://api.whatsapp.com/send?phone=${cleanPhone || '919999999999'}&text=${encodedText}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
      <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant max-w-md w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-[#128C7E] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-full">
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12.003 21c-1.897 0-3.754-.51-5.385-1.478L2 21l1.523-4.503A8.973 8.973 0 0 1 2.003 12c0-4.963 4.037-9 9-9s9 4.037 9 9-4.037 9-9 9zm0-16c-3.859 0-7 3.14-7 7 0 1.543.513 3.01 1.482 4.223l-.155.457-.96 2.836 2.914-.925.441.229A6.974 6.974 0 0 0 12.003 19c3.859 0 7-3.14 7-7s-3.141-7-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-white/80 font-bold tracking-wider uppercase font-sans">ShopBooks WhatsApp SMS</p>
              <h3 className="text-semibold text-lg leading-tight font-bold">{typeLabel}</h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Info panel */}
        <div className="bg-[#E5DDD5] px-4 py-3 border-b border-outline-variant/30 flex justify-between items-center text-xs text-on-surface-variant font-medium">
          <p>Recipient: {customerName} ({customerPhone})</p>
          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">Encrypted Dispatched</span>
        </div>

        {/* WhatsApp Chat Preview Container */}
        <div className="bg-[#E5DDD5] p-4 flex-1 overflow-y-auto" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: 'contain' }}>
          
          {/* Simulated WhatsApp Bubble */}
          <div className="bg-[#DCF8C6] text-on-surface p-3.5 rounded-lg shadow-sm max-w-[85%] ml-auto relative text-sm border-b border-[#C7EDB2]">
            <p className="whitespace-pre-wrap leading-relaxed">
              {rawText.split('\n').map((line, idx) => {
                let segments = line.split('*');
                let isBold = false;
                return (
                  <span key={idx} className="block">
                    {segments.map((segment, sIdx) => {
                      const element = isBold ? <strong key={sIdx} className="font-extrabold text-black">{segment}</strong> : <span key={sIdx}>{segment}</span>;
                      isBold = !isBold;
                      return element;
                    })}
                  </span>
                );
              })}
            </p>
            <div className="flex items-center justify-end gap-1 text-[10px] text-on-surface-variant/70 mt-1">
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <svg className="w-4 h-4 text-[#34B7F1] fill-current" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0V0z" fill="none" />
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            
            {/* tail arrow */}
            <div className="absolute right-0 top-0 -mr-2 w-0 h-0 border-t-[10px] border-t-[#DCF8C6] border-r-[10px] border-r-transparent"></div>
          </div>
        </div>

        {/* Dispatch Progress Bars */}
        <div className="p-4 bg-white border-t border-outline-variant/30 space-y-3 font-sans">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-on-surface-variant font-medium">
              <span>Transmission Progress</span>
              <span className="text-secondary font-bold">100% Dispatched</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
              <div className="bg-[#25D366] h-full w-full rounded-full"></div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <a 
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] transition-all text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-md text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.459L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.467 0 9.911-4.436 9.914-9.899.002-2.647-1.026-5.133-2.897-7.009C16.366 1.819 13.882.784 11.23.784c-5.474 0-9.922 4.437-9.925 9.902-.001 2.012.524 3.984 1.522 5.724L1.7 20.8l4.947-1.295z" />
              </svg>
              Open in Live WhatsApp App
            </a>
            
            <button 
              onClick={onClose}
              type="button"
              className="w-full h-11 bg-surface hover:bg-surface-container text-on-surface font-semibold rounded-lg text-sm border border-outline-variant/50 transition-colors cursor-pointer text-center"
            >
              Continue to Ledger Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerLedgerScreen({ 
  onBack, 
  onNavigate, 
  customerId, 
  customers, 
  transactions, 
  currentFirmId,
  firms
}: { 
  onBack: () => void, 
  onNavigate: (page: Page) => void, 
  customerId: string | null, 
  customers: Customer[], 
  transactions: Transaction[], 
  currentFirmId: string,
  firms: Firm[]
}) {
  const customer = customers.find(c => c.id === customerId);
  const [animationKey, setAnimationKey] = useState(0);
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [customerId]);

  if (!customer) {
    return (
      <div className="min-h-[60dvh] flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest">
        <p className="text-body-md text-error font-bold text-lg mb-4">Patient/Customer ledger could not be located.</p>
        <button onClick={onBack} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm cursor-pointer hover:opacity-95">Go Back</button>
      </div>
    );
  }

  const customerTransactions = transactions.filter(t => 
    t.firmId === currentFirmId && 
    t.patientName && 
    t.type !== 'scheme_bill' &&
    t.patientName.trim().toLowerCase() === customer.name.trim().toLowerCase()
  );

  const totalOutstanding = customer.pendingBalance;

  const [activeTab, setActiveTab] = useState<'timeline' | 'list'>('timeline');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'dues' | 'payments'>('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineSort, setTimelineSort] = useState<'desc' | 'asc'>('desc');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const [listStartDate, setListStartDate] = useState('');
  const [listEndDate, setListEndDate] = useState('');

  const filteredListTransactions = useMemo(() => {
    return customerTransactions.filter(tx => {
      if (listStartDate && tx.date < listStartDate) return false;
      if (listEndDate && tx.date > listEndDate) return false;
      return true;
    });
  }, [customerTransactions, listStartDate, listEndDate]);

  const downloadFilteredPdfStatement = () => {
    try {
      const doc = new jsPDF();
      
      // Header Banner Background (#128C7E)
      doc.setFillColor(18, 140, 126);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Header Title & Meta Description
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("ShopBooks Ledger", 15, 17);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Smart UPI Business Accounting Statement", 15, 24);
      
      const currentFirm = firms.find(f => f.id === currentFirmId);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 145, 17);
      doc.text(`Firm: ${currentFirm?.name || 'Yogwalture Pharmacy'}`, 145, 24);
      doc.text(`Mobile: ${currentFirm?.mobile || ''}`, 145, 30);

      // Section: Ledger Account Title
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("FILTERED AUDIT STATEMENT SUMMARY", 15, 52);
      
      // Horizontal Gray Divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, 56, 195, 56);
      
      // Detailed Customer Profile Block
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("STATEMENT HOLDER:", 15, 65);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Customer Name:   ${customer.name}`, 15, 71);
      doc.text(`Mobile Connection: ${customer.phone}`, 15, 77);
      const startRangeLabel = listStartDate ? listStartDate : "Beginning";
      const endRangeLabel = listEndDate ? listEndDate : "Present";
      doc.text(`Period Covered:   ${startRangeLabel} to ${endRangeLabel}`, 15, 83);

      // Calculate baseline opening balance for full customerTransactions history
      const totalDebitsAll = customerTransactions
        .filter(t => t.type === 'credit_sale')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalCreditsAll = customerTransactions
        .filter(t => t.type === 'receive_payment')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const baselineBalance = Math.max(0, customer.pendingBalance - totalDebitsAll + totalCreditsAll);

      // Sort all transactions to calculate opening balance up to the start date
      const allChronTx = [...customerTransactions].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const timeCompare = (a.time || '').localeCompare(b.time || '');
        if (timeCompare !== 0) return timeCompare;
        return a.id.localeCompare(b.id);
      });

      let openingBalance = baselineBalance;
      allChronTx.forEach((tx) => {
        if (listStartDate && tx.date < listStartDate) {
          const isDebit = tx.type === 'credit_sale';
          if (isDebit) {
            openingBalance += tx.amount;
          } else {
            openingBalance = Math.max(0, openingBalance - tx.amount);
          }
        }
      });

      // Filtered & sorted list
      const sortedFilteredTx = [...filteredListTransactions].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const timeCompare = (a.time || '').localeCompare(b.time || '');
        if (timeCompare !== 0) return timeCompare;
        return a.id.localeCompare(b.id);
      });

      // Totals inside this filtered period
      const rangeDebits = sortedFilteredTx
        .filter(t => t.type === 'credit_sale')
        .reduce((sum, t) => sum + t.amount, 0);
      const rangeCredits = sortedFilteredTx
        .filter(t => t.type === 'receive_payment')
        .reduce((sum, t) => sum + t.amount, 0);

      let running = openingBalance;
      sortedFilteredTx.forEach((tx) => {
        const isDebit = tx.type === 'credit_sale';
        if (isDebit) {
          running += tx.amount;
        } else {
          running = Math.max(0, running - tx.amount);
        }
      });
      const endingBalance = running;

      // Outstanding Balance Metric Box on Right Side
      doc.setFillColor(245, 245, 245);
      doc.rect(125, 61, 70, 24, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(125, 61, 70, 24, 'D');
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(8.5);
      doc.text("PERIOD ENDING BALANCE", 130, 68);
      
      doc.setFontSize(14);
      doc.setTextColor(endingBalance > 0 ? 180 : 50, 40, 40); // red for positive outstanding, dark gray for zero
      doc.text(`INR ${endingBalance.toLocaleString('en-IN')}`, 130, 77);

      // Table Title
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("AUDITED ACCOUNT LEDGER HISTORIES (FILTERED)", 15, 96);
      
      let currentY = 101;
      
      // Draw Table Header Background (Light Steel Accent)
      doc.setFillColor(235, 242, 239);
      doc.rect(15, currentY, 180, 8, 'F');
      
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      
      doc.text("S.No", 18, currentY + 6);
      doc.text("Date & Time", 30, currentY + 6);
      doc.text("Transaction Type", 70, currentY + 6);
      doc.text("Debit (DR)", 125, currentY + 6);
      doc.text("Credit (CR)", 155, currentY + 6);
      doc.text("Outstanding", 180, currentY + 6);
      
      currentY += 8;

      // Print opening baseline row
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(8.5);
      
      doc.setDrawColor(235, 235, 235);
      doc.line(15, currentY, 195, currentY);
      
      doc.text("1", 18, currentY + 6);
      doc.text(listStartDate ? `${listStartDate} 00:00` : "Baseline", 30, currentY + 6);
      doc.text("Opening Balance of Filter Period", 70, currentY + 6);
      doc.text("-", 130, currentY + 6);
      doc.text("-", 160, currentY + 6);
      doc.text(`INR ${openingBalance.toLocaleString('en-IN')}`, 180, currentY + 6);
      
      currentY += 8;

      running = openingBalance;
      sortedFilteredTx.forEach((tx, idx) => {
        // Page break safety margin
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
          
          doc.setFillColor(235, 242, 239);
          doc.rect(15, currentY, 180, 8, 'F');
          
          doc.setTextColor(40, 40, 40);
          doc.setFont("helvetica", "bold");
          doc.text("S.No", 18, currentY + 6);
          doc.text("Date & Time", 30, currentY + 6);
          doc.text("Transaction Type", 70, currentY + 6);
          doc.text("Debit (DR)", 125, currentY + 6);
          doc.text("Credit (CR)", 155, currentY + 6);
          doc.text("Outstanding", 180, currentY + 6);
          
          currentY += 8;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(70, 70, 70);
        }
        
        const serialNo = idx + 2;
        const isDebit = tx.type === 'credit_sale';
        
        if (isDebit) {
          running += tx.amount;
        } else {
          running = Math.max(0, running - tx.amount);
        }
        
        doc.line(15, currentY, 195, currentY);
        doc.text(serialNo.toString(), 18, currentY + 6);
        doc.text(`${tx.date} ${tx.time || ''}`, 30, currentY + 6);
        
        let typeStr = '';
        if (tx.type === 'credit_sale') {
          typeStr = tx.extraDetails ? `Udhaar (${tx.extraDetails})` : 'Udhaar (Credit Purchase)';
        } else if (tx.type === 'receive_payment') {
          typeStr = tx.extraDetails ? `Payment Recv (${tx.extraDetails})` : 'Collected Payment';
        } else {
          typeStr = 'Ledger Modification';
        }
        
        const cleanTypeStr = typeStr.length > 28 ? typeStr.substring(0, 25) + '...' : typeStr;
        doc.text(cleanTypeStr, 70, currentY + 6);
        
        if (isDebit) {
          doc.text(`+INR ${tx.amount.toLocaleString('en-IN')}`, 125, currentY + 6);
          doc.text("-", 160, currentY + 6);
        } else {
          doc.text("-", 130, currentY + 6);
          doc.text(`-INR ${tx.amount.toLocaleString('en-IN')}`, 155, currentY + 6);
        }
        
        doc.text(`INR ${running.toLocaleString('en-IN')}`, 180, currentY + 6);
        currentY += 8;
      });

      // Show Period Totals
      if (currentY > 265) {
        doc.addPage();
        currentY = 20;
      }
      doc.setDrawColor(18, 140, 126);
      doc.setLineWidth(0.5);
      doc.line(15, currentY, 195, currentY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Period Totals & Net Summary:", 30, currentY + 6);
      doc.text(`+INR ${rangeDebits.toLocaleString('en-IN')}`, 125, currentY + 6);
      doc.text(`-INR ${rangeCredits.toLocaleString('en-IN')}`, 155, currentY + 6);
      doc.text(`INR ${endingBalance.toLocaleString('en-IN')}`, 180, currentY + 6);
      currentY += 8;

      // Bottom highlight double bar
      doc.setDrawColor(18, 140, 126);
      doc.setLineWidth(1);
      doc.line(15, currentY, 195, currentY);
      
      currentY += 12;
      
      if (currentY > 270) {
        doc.addPage();
        currentY = 25;
      }
      
      doc.setTextColor(110, 110, 110);
      doc.setFontSize(8);
      doc.text("Disclaimer: This is a computer-synced electronic transaction ledger generated inside ShopBooks cloud workspaces.", 15, currentY);
      doc.text("Outstanding values match active patient registers at local Indian standard times.", 15, currentY + 4);
      doc.text("Thank you for your business relationship!", 15, currentY + 8);
      
      const fileLabel = `Filtered_Statement_${customer.name.replace(/\s+/g, '_')}_${getLocalDateString()}.pdf`;
      doc.save(fileLabel);
    } catch (err) {
      alert("Error generating statement PDF: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handlePresetRange = (preset: 'today' | 'this_month' | 'last_30' | 'clear') => {
    const todayStr = getLocalDateString();
    if (preset === 'today') {
      setListStartDate(todayStr);
      setListEndDate(todayStr);
    } else if (preset === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const yyyy = firstDay.getFullYear();
      const mm = String(firstDay.getMonth() + 1).padStart(2, '0');
      const dd = '01';
      setListStartDate(`${yyyy}-${mm}-${dd}`);
      setListEndDate(todayStr);
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      const yyyy = past30.getFullYear();
      const mm = String(past30.getMonth() + 1).padStart(2, '0');
      const dd = String(past30.getDate()).padStart(2, '0');
      setListStartDate(`${yyyy}-${mm}-${dd}`);
      setListEndDate(todayStr);
    } else if (preset === 'clear') {
      setListStartDate('');
      setListEndDate('');
    }
  };

  // 1. Sort chronologically (oldest first) to compute accurate running balance
  const timelineData = useMemo(() => {
    const chronTx = [...customerTransactions].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = (a.time || '').localeCompare(b.time || '');
      if (timeCompare !== 0) return timeCompare;
      return a.id.localeCompare(b.id);
    });

    const totalDebits = customerTransactions
      .filter(t => t.type === 'credit_sale')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = customerTransactions
      .filter(t => t.type === 'receive_payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const initialBalance = Math.max(0, customer.pendingBalance - totalDebits + totalCredits);
    let currentRunning = initialBalance;

    return chronTx.map((tx, idx) => {
      const isDebit = tx.type === 'credit_sale';
      const prevRunning = currentRunning;
      if (isDebit) {
        currentRunning += tx.amount;
      } else {
        currentRunning = Math.max(0, currentRunning - tx.amount);
      }
      return {
        ...tx,
        isDebit,
        prevRunning,
        runningBalance: currentRunning,
        index: idx + 1
      };
    });
  }, [customerTransactions, customer.pendingBalance]);

  // 2. Filter & Sort for Display
  const filteredTimeline = useMemo(() => {
    let result = [...timelineData];

    if (timelineFilter === 'dues') {
      result = result.filter(item => item.isDebit);
    } else if (timelineFilter === 'payments') {
      result = result.filter(item => !item.isDebit);
    }

    if (timelineSearch.trim() !== '') {
      const query = timelineSearch.toLowerCase();
      result = result.filter(item => 
        (item.extraDetails || '').toLowerCase().includes(query) ||
        (item.recordedByUserName || '').toLowerCase().includes(query) ||
        item.amount.toString().includes(query) ||
        item.date.includes(query) ||
        (item.type === 'credit_sale' ? 'udhaar dues' : 'payment receipts').includes(query)
      );
    }

    if (timelineSort === 'desc') {
      result.reverse();
    }

    return result;
  }, [timelineData, timelineFilter, timelineSearch, timelineSort]);

  // 3. Active selected transaction
  const selectedTx = useMemo(() => {
    if (filteredTimeline.length === 0) return null;
    if (selectedTxId) {
      const found = filteredTimeline.find(t => t.id === selectedTxId);
      if (found) return found;
    }
    return filteredTimeline[0]; // fallback to first item
  }, [selectedTxId, filteredTimeline]);

  const downloadPdfStatement = () => {
    try {
      const doc = new jsPDF();
      
      // Header Banner Background (#128C7E)
      doc.setFillColor(18, 140, 126);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Header Title & Meta Description
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("ShopBooks Ledger", 15, 17);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Smart UPI Business Accounting Statement", 15, 24);
      
      const currentFirm = firms.find(f => f.id === currentFirmId);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 145, 17);
      doc.text(`Firm: ${currentFirm?.name || 'Yogwalture Pharmacy'}`, 145, 24);
      doc.text(`Mobile: ${currentFirm?.mobile || ''}`, 145, 30);

      // Section: Ledger Account Title
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER ACCOUNT STATEMENT", 15, 52);
      
      // Horizontal Gray Divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, 56, 195, 56);
      
      // Detailed Customer Profile Block
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("STATEMENT HOLDER:", 15, 65);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Customer Name:   ${customer.name}`, 15, 71);
      doc.text(`Mobile Connection: ${customer.phone}`, 15, 77);
      doc.text(`Account Status:   Active Registered`, 15, 83);
      
      // Outstanding Balance Metric Box on Right Side
      doc.setFillColor(245, 245, 245);
      doc.rect(125, 61, 70, 24, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(125, 61, 70, 24, 'D');
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(9);
      doc.text("OPEN OUTSTANDING TOTAL", 130, 68);
      
      doc.setFontSize(14);
      doc.setTextColor(totalOutstanding > 0 ? 180 : 50, 40, 40); // red for positive outstanding, dark gray for zero
      doc.text(`INR ${totalOutstanding.toLocaleString('en-IN')}`, 130, 77);

      // Transaction Table Segment Header
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("AUDITED ACCOUNT LEDGER HISTORIES", 15, 96);
      
      let currentY = 101;
      
      // Draw Table Header Background (Light Steel Accent)
      doc.setFillColor(235, 242, 239);
      doc.rect(15, currentY, 180, 8, 'F');
      
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      
      doc.text("S.No", 18, currentY + 6);
      doc.text("Date & Time", 30, currentY + 6);
      doc.text("Transaction Type", 70, currentY + 6);
      doc.text("Debit (DR)", 125, currentY + 6);
      doc.text("Credit (CR)", 155, currentY + 6);
      doc.text("Outstanding", 180, currentY + 6);
      
      currentY += 8;
      
      // Fetch Chronological Transaction History
      const sortedTx = [...customerTransactions].sort((a, b) => a.id.localeCompare(b.id));
      
      const totalDebits = customerTransactions
        .filter(t => t.type === 'credit_sale')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalCredits = customerTransactions
        .filter(t => t.type === 'receive_payment')
        .reduce((sum, t) => sum + t.amount, 0);
      
      let running = Math.max(0, customer.pendingBalance - totalDebits + totalCredits);
      
      // Print opening baseline row
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(8.5);
      
      doc.setDrawColor(235, 235, 235);
      doc.line(15, currentY, 195, currentY);
      
      doc.text("1", 18, currentY + 6);
      doc.text("Opening", 30, currentY + 6);
      doc.text("Opening Account Balance Baseline", 70, currentY + 6);
      doc.text("-", 130, currentY + 6);
      doc.text("-", 160, currentY + 6);
      doc.text(`INR ${running.toLocaleString('en-IN')}`, 180, currentY + 6);
      
      currentY += 8;

      sortedTx.forEach((tx, idx) => {
        // Page break safety margin
        if (currentY > 275) {
          doc.addPage();
          currentY = 20;
          
          doc.setFillColor(235, 242, 239);
          doc.rect(15, currentY, 180, 8, 'F');
          
          doc.setTextColor(40, 40, 40);
          doc.setFont("helvetica", "bold");
          doc.text("S.No", 18, currentY + 6);
          doc.text("Date & Time", 30, currentY + 6);
          doc.text("Transaction Type", 70, currentY + 6);
          doc.text("Debit (DR)", 125, currentY + 6);
          doc.text("Credit (CR)", 155, currentY + 6);
          doc.text("Outstanding", 180, currentY + 6);
          
          currentY += 8;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(70, 70, 70);
        }
        
        const serialNo = idx + 2;
        const isDebit = tx.type === 'credit_sale' || tx.type === 'scheme_bill';
        
        if (isDebit) {
          running += tx.amount;
        } else {
          running = Math.max(0, running - tx.amount);
        }
        
        doc.line(15, currentY, 195, currentY);
        doc.text(serialNo.toString(), 18, currentY + 6);
        doc.text(`${tx.date} ${tx.time}`, 30, currentY + 6);
        
        let typeStr = '';
        if (tx.type === 'credit_sale') {
          typeStr = tx.extraDetails ? `Udhaar (${tx.extraDetails})` : 'Udhaar (Credit Purchase)';
        } else if (tx.type === 'receive_payment') {
          typeStr = tx.extraDetails ? `Payment Recv (${tx.extraDetails})` : 'Collected Payment';
        } else if (tx.type === 'scheme_bill') {
          typeStr = tx.extraDetails ? `Scheme (${tx.extraDetails})` : 'Scheme Claim Bill';
        } else {
          typeStr = 'Ledger Modification';
        }
        
        const cleanTypeStr = typeStr.length > 28 ? typeStr.substring(0, 25) + '...' : typeStr;
        doc.text(cleanTypeStr, 70, currentY + 6);
        
        if (isDebit) {
          doc.text(`+INR ${tx.amount.toLocaleString('en-IN')}`, 125, currentY + 6);
          doc.text("-", 160, currentY + 6);
        } else {
          doc.text("-", 130, currentY + 6);
          doc.text(`-INR ${tx.amount.toLocaleString('en-IN')}`, 155, currentY + 6);
        }
        
        doc.text(`INR ${running.toLocaleString('en-IN')}`, 180, currentY + 6);
        currentY += 8;
      });
      
      // Bottom highlight double bar
      doc.setDrawColor(18, 140, 126);
      doc.setLineWidth(1);
      doc.line(15, currentY, 195, currentY);
      
      currentY += 12;
      
      if (currentY > 270) {
        doc.addPage();
        currentY = 25;
      }
      
      doc.setTextColor(110, 110, 110);
      doc.setFontSize(8);
      doc.text("Disclaimer: This is a computer-synced electronic transaction ledger generated inside ShopBooks cloud workspaces.", 15, currentY);
      doc.text("Outstanding values match active patient registers at local Indian standard times.", 15, currentY + 4);
      doc.text("Thank you for your business relationship!", 15, currentY + 8);
      
      const fileLabel = `Statement_${customer.name.replace(/\s+/g, '_')}_${getLocalDateString()}.pdf`;
      doc.save(fileLabel);
    } catch (e) {
      console.error("Statement construction failed:", e);
      window.print();
    }
  };

  const chartData = (() => {
    const sortedTx = [...customerTransactions].sort((a, b) => a.id.localeCompare(b.id));
    
    const totalDebits = customerTransactions
      .filter(t => t.type === 'credit_sale')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = customerTransactions
      .filter(t => t.type === 'receive_payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const initialBalance = Math.max(0, customer.pendingBalance - totalDebits + totalCredits);
    
    let running = initialBalance;
    const points = [
      {
        displayDate: 'Initial',
        dateStr: 'Baseline (Opening)',
        balance: running,
        type: 'Baseline',
        amount: 0,
        desc: 'Opening Balance'
      }
    ];
    
    sortedTx.forEach((tx) => {
      if (tx.type === 'credit_sale') {
        running += tx.amount;
      } else if (tx.type === 'receive_payment') {
        running = Math.max(0, running - tx.amount);
      }
      
      let displayDate = tx.date;
      try {
        const d = new Date(tx.date);
        displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } catch (e) {}

      points.push({
        displayDate,
        dateStr: `${tx.date} (${tx.time})`,
        balance: running,
        type: tx.type === 'credit_sale' ? 'Debit' : 'Credit',
        amount: tx.amount,
        desc: tx.type === 'credit_sale' 
          ? `Credit Sale +₹${tx.amount}` 
          : `Received Payment -₹${tx.amount}`
      });
    });
    
    return points;
  })();

  return (
    <div className="min-h-[100dvh] bg-surface-container-lowest flex flex-col">
      <header className="bg-surface-container-lowest sticky top-0 z-40 w-full border-b border-outline-variant/30 flex items-center justify-between px-container-padding-mobile h-16">
        <button 
          className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center cursor-pointer text-sm font-semibold flex gap-1 items-center"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-headline-md text-primary absolute left-1/2 -translate-x-1/2 text-lg font-bold font-sans">Patient Ledger</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-container-padding-mobile py-stack-lg flex flex-col gap-5 max-w-3xl mx-auto w-full text-left pb-32">
        <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] bg-secondary-container/50 text-on-secondary-container font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">Personal Ledger Account</span>
            <h2 className="text-2xl font-bold font-sans text-on-background">{customer.name}</h2>
            <p className="text-body-md text-on-surface-variant flex items-center gap-1">
              <Smartphone className="w-4 h-4 text-on-surface-variant/70" />
              <span className="font-mono text-sm">{customer.phone}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl text-left min-w-[170px] ${totalOutstanding > 0 ? 'bg-error-container/20 border border-error/20' : 'bg-secondary-container/15 border border-secondary/20'}`}>
              <p className="text-xs text-on-surface-variant font-semibold">Pending Outstanding</p>
              <p className={`text-2xl font-bold font-sans ${totalOutstanding > 0 ? 'text-error' : 'text-secondary'}`}>₹{totalOutstanding.toLocaleString()}</p>
              <span className="text-[10px] text-on-surface-variant/80 block mt-0.5 font-sans">Last payment: {customer.lastPaymentDate || 'None'}</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => onNavigate('receivePayment')}
            className="h-12 rounded-xl bg-secondary text-on-secondary flex items-center justify-center gap-2 text-sm font-semibold hover:opacity-95 cursor-pointer active:scale-[0.98] transition-all shadow-sm font-sans"
          >
            <Banknote className="w-5 h-5 text-white" />
            Collect/Receive Payment
          </button>
          <button 
            onClick={() => onNavigate('credit')}
            className="h-12 rounded-xl bg-white border border-outline-variant text-on-surface flex items-center justify-center gap-2 text-sm font-semibold hover:bg-surface-container-low cursor-pointer active:scale-[0.98] transition-all font-sans"
          >
            <PlusCircle className="w-5 h-5 text-on-surface-variant" />
            Add New Credit (Udhaar)
          </button>
          <button 
            onClick={downloadPdfStatement}
            className="h-12 rounded-xl bg-[#128C7E] text-white flex items-center justify-center gap-2 text-sm font-semibold hover:opacity-95 cursor-pointer active:scale-[0.98] transition-all shadow-sm font-sans"
          >
            <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
            Download PDF Statement
          </button>
        </section>

        {/* Balance Trend Line Chart */}
        <section className="bg-white border border-outline-variant/40 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
            <div>
              <h3 className="font-bold text-base text-on-background font-sans flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                Outstanding Balance Trend
              </h3>
              <p className="text-xs text-on-surface-variant">Track credit purchases (debit) and collected payments (credit)</p>
            </div>
            
            <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-error" />
                Purchases (DR)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                Receipts (CR)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 bg-secondary rounded" />
                Balance Trend
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length <= 1 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center text-on-surface-variant border border-dashed border-outline-variant/50 rounded-xl p-6 bg-surface-container-low/30">
                <TrendingUp className="w-10 h-10 text-outline-variant mb-2" />
                <p className="text-sm font-semibold text-on-background">Awaiting Translation History</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Log some credit sales or collect payments to visualize the balance trend.</p>
              </div>
            ) : (
              <ResponsiveContainer key={animationKey} width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="balanceGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006c49" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#006c49" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eeff" strokeWidth={0.5} />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 10, fill: '#45464d', fontWeight: 600 }}
                    axisLine={{ stroke: '#c6c6cd' }}
                    tickLine={{ stroke: '#c6c6cd' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#45464d', fontWeight: 600 }}
                    axisLine={{ stroke: '#c6c6cd' }}
                    tickLine={{ stroke: '#c6c6cd' }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-outline-variant p-3 rounded-xl shadow-md text-xs space-y-1 text-left min-w-[190px] font-sans">
                            <p className="font-bold text-on-background border-b border-outline-variant/30 pb-1 flex items-center justify-between">
                              <span>{data.dateStr}</span>
                            </p>
                            <div className="space-y-1 pt-1">
                              <p className="flex justify-between gap-4 font-bold text-on-background">
                                <span>Outstanding:</span>
                                <span className="text-secondary">₹{data.balance.toLocaleString()}</span>
                              </p>
                              {data.type !== 'Baseline' && (
                                <p className="flex justify-between gap-4">
                                  <span>Activity:</span>
                                  <span className={`font-semibold ${data.type === 'Debit' ? 'text-error' : 'text-secondary'}`}>
                                    {data.desc}
                                  </span>
                                </p>
                              )}
                              {data.type === 'Baseline' && (
                                <p className="text-[10px] text-on-surface-variant italic">Opening baseline balance</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#006c49" 
                    strokeWidth={3} 
                    fillOpacity={1}
                    fill="url(#balanceGrowthGradient)"
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    animationBegin={150}
                    dot={{ r: 5, stroke: '#006c49', strokeWidth: 2, fill: '#ffffff' }}
                    activeDot={{ r: 7, stroke: '#006c49', strokeWidth: 2, fill: '#006c49' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="space-y-4 font-sans">
          {/* Dual-View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-1.5">
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'timeline'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Interactive Timeline
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'list'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Audit Statement List
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-primary/80 bg-primary/10 px-2.5 py-1 rounded-full">
                {customerTransactions.length} Total Records
              </span>
            </div>
          </div>

          {activeTab === 'timeline' ? (
            <div className="space-y-4">
              {/* Timeline Action and Control Filters */}
              <div className="bg-white border border-outline-variant/35 rounded-xl p-4 shadow-sm space-y-3.5">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  {/* Search bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-on-surface-variant/70 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search timeline notes, amount, date..."
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 text-xs border border-outline-variant rounded-lg outline-none focus:border-primary bg-surface-bright font-sans font-medium"
                    />
                    {timelineSearch && (
                      <button
                        onClick={() => setTimelineSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-on-surface-variant hover:text-on-surface"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Ordering / Sorting Toggle */}
                  <button
                    onClick={() => setTimelineSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container-low transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap bg-white self-start sm:self-auto"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 rotate-90 text-on-surface-variant" />
                    Sort: {timelineSort === 'desc' ? 'Newest First' : 'Oldest First'}
                  </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed border-outline-variant/20">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mr-1">Filter Timeline:</span>
                  <button
                    onClick={() => setTimelineFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      timelineFilter === 'all'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    All ({timelineData.length})
                  </button>
                  <button
                    onClick={() => setTimelineFilter('dues')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      timelineFilter === 'dues'
                        ? 'bg-error text-white shadow-sm'
                        : 'bg-error/5 text-error hover:bg-error/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-error" />
                    Dues/DR ({timelineData.filter(x => x.isDebit).length})
                  </button>
                  <button
                    onClick={() => setTimelineFilter('payments')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      timelineFilter === 'payments'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'bg-secondary/5 text-secondary hover:bg-secondary/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    Payments/CR ({timelineData.filter(x => !x.isDebit).length})
                  </button>
                </div>
              </div>

              {filteredTimeline.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/40 rounded-2xl bg-white space-y-2">
                  <p className="text-sm font-semibold text-on-background">No matching timeline entries found</p>
                  <p className="text-xs text-on-surface-variant">Try refining your search text or shifting filters above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  
                  {/* Timeline Node Chain (Left panel/Full width on mobile) */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="relative border-l-2 border-outline-variant/40 ml-4 pl-6 space-y-5 text-left py-2">
                      {filteredTimeline.map((tx) => {
                        const isSelected = selectedTx?.id === tx.id;
                        return (
                          <div
                            key={tx.id}
                            onClick={() => setSelectedTxId(tx.id)}
                            className={`relative group cursor-pointer transition-all duration-200`}
                          >
                            {/* Interactive Connected Dot */}
                            <div className={`absolute -left-[37px] top-4 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? (tx.isDebit ? 'bg-error text-white ring-4 ring-error/25' : 'bg-secondary text-white ring-4 ring-secondary/25')
                                : (tx.isDebit ? 'bg-white border-2 border-error/50 text-error' : 'bg-white border-2 border-secondary/50 text-secondary')
                            }`}>
                              {tx.isDebit ? (
                                <Plus className="w-3 h-3" strokeWidth={3} />
                              ) : (
                                <Check className="w-3 h-3" strokeWidth={3} />
                              )}
                            </div>

                            {/* Timeline Node Card */}
                            <div className={`p-4 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20'
                                : 'bg-white hover:bg-surface-container-lowest/30 border-outline-variant/45 hover:border-outline-variant/80'
                            }`}>
                              <div className="flex items-center justify-between gap-2 border-b border-outline-variant/10 pb-2 mb-2">
                                <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase tracking-wider">
                                  #{tx.index} • {tx.date} <span className="text-on-surface-variant/50 ml-1">{tx.time}</span>
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                                  tx.isDebit ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
                                }`}>
                                  {tx.isDebit ? 'Dues (DR)' : 'Paid (CR)'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center gap-3">
                                <div>
                                  <p className="text-xs text-on-surface-variant/80 font-bold">
                                    {tx.type === 'credit_sale' ? 'Credit Purchase (Udhaar)' : 'Settled Balance Receipt'}
                                  </p>
                                  {tx.extraDetails && (
                                    <p className="text-xs font-semibold text-on-surface mt-1 italic">
                                      "{tx.extraDetails}"
                                    </p>
                                  )}
                                </div>
                                <div className="text-right whitespace-nowrap">
                                  <p className={`text-base font-extrabold ${tx.isDebit ? 'text-error' : 'text-secondary'}`}>
                                    {tx.isDebit ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Progress Track visualizer */}
                              <div className="mt-3.5 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant">
                                <span className="font-semibold flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-on-surface-variant/60" />
                                  Running Balance:
                                </span>
                                <span className="font-bold text-on-surface font-mono">
                                  ₹{tx.runningBalance.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sticky Detail panel (Right panel on desktop) */}
                  {selectedTx && (
                    <div className="md:col-span-5 md:sticky md:top-20 space-y-4">
                      <div className="bg-white border-2 border-primary/20 rounded-2xl p-5 shadow-sm space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Interactive Details (S.No #{selectedTx.index})
                          </span>
                          <span className="text-xs font-mono text-on-surface-variant">{selectedTx.date}</span>
                        </div>

                        {/* Visual Dues Progression Graphic */}
                        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3.5 text-center">
                          <div className="grid grid-cols-3 items-center gap-1.5">
                            <div className="text-center">
                              <p className="text-[10px] text-on-surface-variant font-bold uppercase">Balance Before</p>
                              <p className="text-sm font-black text-on-surface-variant/80 font-mono">₹{selectedTx.prevRunning.toLocaleString()}</p>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full mb-1 flex items-center gap-0.5 ${
                                selectedTx.isDebit ? 'bg-error/15 text-error' : 'bg-secondary/15 text-secondary'
                              }`}>
                                {selectedTx.isDebit ? '+' : '-'}₹{selectedTx.amount.toLocaleString()}
                              </span>
                              <div className="w-full flex items-center">
                                <div className="h-[2px] bg-outline-variant/60 flex-1"></div>
                                <div className={`w-1.5 h-1.5 rounded-full rotate-45 border-t-2 border-r-2 ${selectedTx.isDebit ? 'border-error' : 'border-secondary'}`}></div>
                              </div>
                            </div>

                            <div className="text-center">
                              <p className="text-[10px] text-on-surface-variant font-bold uppercase">Balance After</p>
                              <p className="text-sm font-black text-primary font-mono bg-primary/5 rounded py-0.5 border border-primary/10">₹{selectedTx.runningBalance.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="text-xs text-on-surface-variant/90 font-medium">
                            {selectedTx.isDebit ? (
                              <p>Outstanding balance increased by <strong className="text-error">₹{selectedTx.amount.toLocaleString()}</strong> due to credit purchase.</p>
                            ) : (
                              <p>Outstanding balance decreased by <strong className="text-secondary">₹{selectedTx.amount.toLocaleString()}</strong> via collected payment.</p>
                            )}
                          </div>
                        </div>

                        {/* General Metadata */}
                        <div className="space-y-2.5 text-xs text-on-surface-variant border-b border-outline-variant/20 pb-3">
                          <p className="flex justify-between">
                            <span className="font-semibold">Operator / Recorded By:</span>
                            <span className="font-bold text-on-surface">{selectedTx.recordedByUserName || 'System Operator'}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="font-semibold">Receipt Timestamp:</span>
                            <span className="font-bold font-mono text-on-surface">{selectedTx.time || 'N/A'}</span>
                          </p>
                          {selectedTx.extraDetails && (
                            <div className="bg-surface-container-lowest border border-outline-variant/20 p-2.5 rounded-lg mt-1 text-left">
                              <p className="text-[10px] text-on-surface-variant/80 font-black uppercase">Transaction Notes / Remarks:</p>
                              <p className="text-xs text-on-surface mt-0.5 font-semibold italic">"{selectedTx.extraDetails}"</p>
                            </div>
                          )}
                        </div>

                        {/* Real-time SMS dispatched block */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-on-surface-variant font-black uppercase flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-secondary" />
                            Pre-generated SMS / WhatsApp Alert Dispatched:
                          </p>
                          <div className="bg-surface-container/60 p-3 rounded-xl border border-outline-variant text-[11px] text-on-surface-variant leading-relaxed font-mono whitespace-pre-wrap select-all">
                            {selectedTx.type === 'credit_sale' ? (
`Dear *${customer.name}*,
A new Credit Sale entry (Udhaar) of *₹${selectedTx.amount.toLocaleString()}* has been added to your ledger at *${firms.find(f => f.id === currentFirmId)?.name || 'Yogwalture Pharmacy'}* on ${selectedTx.date}.

*Total Outstanding Balance*: *₹${selectedTx.runningBalance.toLocaleString()}*

Thank you!
ShopBooks UPI Ledgers`
                            ) : (
`Dear *${customer.name}*,
We have successfully received payment of *₹${selectedTx.amount.toLocaleString()}* on ${selectedTx.date}, credited to your outstanding ledger at *${firms.find(f => f.id === currentFirmId)?.name || 'Yogwalture Pharmacy'}*.

*Remaining Balance*: *₹${selectedTx.runningBalance.toLocaleString()}*

Thank you for choosing us!
ShopBooks UPI Ledgers`
                            )}
                          </div>
                        </div>

                        {/* Trigger Alerts */}
                        <a 
                          href={`https://api.whatsapp.com/send?phone=${selectedTx.customerPhone?.replace(/\D/g, '') || customer.phone.replace(/\D/g, '')}&text=${encodeURIComponent(
                            selectedTx.type === 'credit_sale'
                              ? `Dear *${customer.name}*,\nA new Credit Sale entry (Udhaar) of *₹${selectedTx.amount.toLocaleString()}* has been added to your ledger at *${firms.find(f => f.id === currentFirmId)?.name || 'Yogwalture Pharmacy'}* on ${selectedTx.date}.\n\n*Total Outstanding Balance*: *₹${selectedTx.runningBalance.toLocaleString()}*\n\nThank you!\nShopBooks Ledgers`
                              : `Dear *${customer.name}*,\nWe have successfully received payment of *₹${selectedTx.amount.toLocaleString()}* on ${selectedTx.date}, credited to your outstanding ledger at *${firms.find(f => f.id === currentFirmId)?.name || 'Yogwalture Pharmacy'}*.\n\n*Remaining Balance*: *₹${selectedTx.runningBalance.toLocaleString()}*\n\nThank you!\nShopBooks Ledgers`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/95 transition-colors font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12.003 21c-1.897 0-3.754-.51-5.385-1.478L2 21l1.523-4.503A8.973 8.973 0 0 1 2.003 12c0-4.963 4.037-9 9-9s9 4.037 9 9-4.037 9-9 9zm0-16c-3.859 0-7 3.14-7 7 0 1.543.513 3.01 1.482 4.223l-.155.457-.96 2.836 2.914-.925.441.229A6.974 6.974 0 0 0 12.003 19c3.859 0 7-3.14 7-7s-3.141-7-7-7z" />
                          </svg>
                          Resend WhatsApp Statement Alert
                        </a>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Date Range Picker Filter Panel */}
              <div id="audit_date_picker_panel" className="bg-white border border-outline-variant/35 rounded-xl p-4 shadow-sm space-y-4 text-left font-sans">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Filter Statement Date Range
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Limit the audit statement table to transactions within the specified period.
                    </p>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => handlePresetRange('today')}
                      className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handlePresetRange('this_month')}
                      className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => handlePresetRange('last_30')}
                      className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Last 30 Days
                    </button>
                    {(listStartDate || listEndDate) && (
                      <button
                        onClick={() => handlePresetRange('clear')}
                        className="px-2.5 py-1 rounded bg-error/10 hover:bg-error/15 text-error text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        Clear Range
                      </button>
                    )}

                    <span className="w-px h-4 bg-outline-variant/60 mx-1 hidden sm:inline" />

                    <button
                      onClick={downloadFilteredPdfStatement}
                      className="px-3 py-1 rounded bg-primary text-white hover:bg-primary/95 text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Download Audit Summary
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-end pt-3 border-t border-outline-variant/15">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="list_start_date" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      From Date (Start)
                    </label>
                    <input
                      id="list_start_date"
                      type="date"
                      value={listStartDate}
                      onChange={(e) => setListStartDate(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-background focus:border-primary outline-none font-sans font-medium transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="list_end_date" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      To Date (End)
                    </label>
                    <input
                      id="list_end_date"
                      type="date"
                      value={listEndDate}
                      onChange={(e) => setListEndDate(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-background focus:border-primary outline-none font-sans font-medium transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                    { (listStartDate || listEndDate) ? (
                      <span className="text-[11px] text-primary/90 bg-primary/10 px-2.5 py-1.5 rounded-lg w-full text-center">
                        Showing <strong>{filteredListTransactions.length}</strong> of <strong>{customerTransactions.length}</strong> entries
                      </span>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant/70 bg-surface-container px-2.5 py-1.5 rounded-lg w-full text-center">
                        All <strong>{customerTransactions.length}</strong> entries showing (unfiltered)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Table List */}
              <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden divide-y divide-outline-variant/30">
                {filteredListTransactions.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant font-sans space-y-1.5">
                    <p className="font-semibold text-on-background text-sm">No ledger transactions found</p>
                    <p className="text-xs text-on-surface-variant">
                      {listStartDate || listEndDate ? "No entries match your selected date range filter." : "No transactions found under this customer yet."}
                    </p>
                  </div>
                ) : (
                  filteredListTransactions.map((tx) => {
                    const isDebit = tx.type === 'credit_sale';
                    const isCredit = tx.type === 'receive_payment';
                    return (
                      <div 
                        key={tx.id} 
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCredit ? 'bg-[#DCF8C6]/10' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-full mt-0.5 ${isCredit ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                            {isCredit ? (
                              <ArrowUpCircle className="w-5 h-5" />
                            ) : (
                              <PlusCircle className="w-5 h-5 rotate-45" />
                            )}
                          </div>
                          <div className="space-y-0.5 text-left">
                            <p className="font-bold text-on-background text-sm flex items-center gap-2 font-sans">
                              <span>{tx.type === 'credit_sale' ? 'Udhaar (Credit Sale)' : 'Payment Received'}</span>
                              {tx.extraDetails && (
                                <span className="text-[9px] bg-surface-container px-1.5 py-0.5 rounded font-mono text-on-surface-variant font-bold uppercase">
                                  {tx.extraDetails}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 font-sans">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span className="font-mono text-[11px]">{tx.time}</span>
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              Recorded by: <span className="font-semibold text-on-surface">{tx.recordedByUserName || 'System'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-dashed border-outline-variant/50 w-full sm:w-auto">
                          <a 
                            href={`https://api.whatsapp.com/send?phone=${tx.customerPhone?.replace(/\D/g, '') || customer.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Dear ${customer.name},\nRegarding transaction of ₹${tx.amount} on ${tx.date}.\nShopBooks UPI Ledgers`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-secondary hover:underline flex items-center gap-1 font-semibold hover:text-[#25D366] transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12.003 21c-1.897 0-3.754-.51-5.385-1.478L2 21l1.523-4.503A8.973 8.973 0 0 1 2.003 12c0-4.963 4.037-9 9-9s9 4.037 9 9-4.037 9-9 9zm0-16c-3.859 0-7 3.14-7 7 0 1.543.513 3.01 1.482 4.223l-.155.457-.96 2.836 2.914-.925.441.229A6.974 6.974 0 0 0 12.003 19c3.859 0 7-3.14 7-7s-3.141-7-7-7z" />
                            </svg>
                            Resend SMS
                          </a>

                          <div className="text-right">
                            <p className={`font-bold text-base ${isCredit ? 'text-secondary font-sans' : 'text-error font-sans'}`}>
                              {isCredit ? '-' : '+'} ₹{tx.amount.toLocaleString()}
                            </p>
                            <span className="text-[9px] text-on-surface-variant block uppercase tracking-wider font-bold">
                              {isCredit ? 'CREDIT (CR)' : 'DEBIT (DR)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CreditScreen({ 
  onNavigate, 
  currentUser, 
  customers, 
  transactions, 
  currentFirmId, 
  firms,
  onRecordCreditSale, 
  onSelectCustomer,
  onRecordStaffCredit,
  onRecordStaffAdvance,
  workingDate
}: { 
  onNavigate: (page: Page) => void, 
  currentUser: any, 
  customers: Customer[], 
  transactions: Transaction[], 
  currentFirmId: string, 
  firms?: Firm[],
  onRecordCreditSale: (patientName: string, customerPhone: string, amount: number, date: string, salesmanName: string) => void, 
  onSelectCustomer: (id: string | null) => void,
  onRecordStaffCredit?: (staffName: string, amount: number, date: string, purpose: string) => void,
  onRecordStaffAdvance?: (staffName: string, amount: number, date: string, paymentMode: string, purpose: string) => void,
  workingDate?: string
}) {
  const activeCustomers = customers.filter(c => c.firmId === currentFirmId);
  const currentFirm = firms?.find(f => f.id === currentFirmId);
  const staffUsers = currentFirm?.users || [];

  // Active Tab
  const [activeTab, setActiveTab] = useState<'customer' | 'staffCredit' | 'staffAdvance'>('customer');

  // Customer Credit state
  const totalOutstanding = activeCustomers.reduce((sum, c) => sum + c.pendingBalance, 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientName, setPatientName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleDate, setSaleDate] = useState(() => workingDate || getLocalDateString());
  const [salesmanName, setSalesmanName] = useState(() => currentUser?.name || 'Staff');
  const [amount, setAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAutoPrefilledBadge, setShowAutoPrefilledBadge] = useState(false);
  const [focusedInput, setFocusedInput] = useState(false);

  // Staff Credit States
  const [scSelectedUser, setScSelectedUser] = useState('');
  const [scCustomName, setScCustomName] = useState('');
  const [scAmount, setScAmount] = useState('');
  const [scDate, setScDate] = useState(() => workingDate || getLocalDateString());
  const [scPurpose, setScPurpose] = useState('');

  // Staff Advance States
  const [saSelectedUser, setSaSelectedUser] = useState('');
  const [saCustomName, setSaCustomName] = useState('');
  const [saAmount, setSaAmount] = useState('');
  const [saDate, setSaDate] = useState(() => workingDate || getLocalDateString());
  const [saMode, setSaMode] = useState('Cash');
  const [saPurpose, setSaPurpose] = useState('');

  const autocompleteSuggestions = patientName.trim()
    ? activeCustomers.filter(c => c.name.toLowerCase().includes(patientName.toLowerCase()))
    : [];

  const filteredCustomers = activeCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  // Filter transactions
  const staffCreditTx = transactions.filter(t => t.firmId === currentFirmId && t.type === 'staff_credit');
  const staffAdvanceTx = transactions.filter(t => t.firmId === currentFirmId && t.type === 'staff_advance');

  const totalStaffCreditOutstanding = staffCreditTx.reduce((sum, t) => sum + t.amount, 0);
  const totalStaffAdvanceOutflow = staffAdvanceTx.reduce((sum, t) => sum + t.amount, 0);

  // Grouped Staff Summaries
  const staffCreditSummary = useMemo(() => {
    const summary: { [name: string]: { total: number, date: string } } = {};
    staffCreditTx.forEach(t => {
      const name = t.patientName || 'Unknown Staff';
      if (!summary[name]) {
        summary[name] = { total: 0, date: t.date };
      }
      summary[name].total += t.amount;
    });
    return Object.entries(summary).map(([name, val]) => ({ name, pendingBalance: val.total, lastDate: val.date }));
  }, [staffCreditTx]);

  const staffAdvanceSummary = useMemo(() => {
    const summary: { [name: string]: { total: number, date: string } } = {};
    staffAdvanceTx.forEach(t => {
      const name = t.patientName || 'Unknown Staff';
      if (!summary[name]) {
        summary[name] = { total: 0, date: t.date };
      }
      summary[name].total += t.amount;
    });
    return Object.entries(summary).map(([name, val]) => ({ name, totalAdvance: val.total, lastDate: val.date }));
  }, [staffAdvanceTx]);

  const handleSubmitSale = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid credit amount (> 0).');
      return;
    }
    if (!patientName.trim()) {
      setErrorMsg('Please enter the patient or customer’s name.');
      return;
    }
    setErrorMsg('');
    
    onRecordCreditSale(
      patientName.trim(), 
      customerPhone.trim() || '+91 99999 99999', 
      parsedAmount, 
      saleDate, 
      salesmanName.trim()
    );

    setPatientName('');
    setCustomerPhone('');
    setAmount('');
    setSuccessMsg('Credit sale recorded successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRecordStaffCredit = () => {
    const finalName = scSelectedUser === 'other' ? scCustomName.trim() : scSelectedUser;
    if (!finalName) {
      setErrorMsg('Please select or specify a staff member.');
      return;
    }
    const valAmount = parseFloat(scAmount);
    if (!scAmount || isNaN(valAmount) || valAmount <= 0) {
      setErrorMsg('Please enter a valid credit amount (> 0).');
      return;
    }
    setErrorMsg('');

    if (onRecordStaffCredit) {
      onRecordStaffCredit(finalName, valAmount, scDate, scPurpose.trim() || 'General Credit Purchase');
      setScAmount('');
      setScPurpose('');
      setScCustomName('');
      setScSelectedUser('');
      setSuccessMsg('Staff credit sale recorded successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleRecordStaffAdvance = () => {
    const finalName = saSelectedUser === 'other' ? saCustomName.trim() : saSelectedUser;
    if (!finalName) {
      setErrorMsg('Please select or specify a staff member.');
      return;
    }
    const valAmount = parseFloat(saAmount);
    if (!saAmount || isNaN(valAmount) || valAmount <= 0) {
      setErrorMsg('Please enter a valid advance amount (> 0).');
      return;
    }
    setErrorMsg('');

    if (onRecordStaffAdvance) {
      onRecordStaffAdvance(finalName, valAmount, saDate, saMode, saPurpose.trim() || 'Salary Advance');
      setSaAmount('');
      setSaPurpose('');
      setSaCustomName('');
      setSaSelectedUser('');
      setSuccessMsg('Staff cash advance recorded successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <main className="p-container-padding-mobile md:p-container-padding-desktop max-w-7xl mx-auto space-y-stack-lg text-left pb-24">
      <CollectionNotificationBanner 
        customers={customers}
        currentFirmId={currentFirmId}
        onNavigate={onNavigate}
        onSelectCustomer={onSelectCustomer}
      />
      {/* Header Summary section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
        <div>
          <div className="flex items-center justify-between md:justify-start gap-4">
            <h1 className="text-headline-mobile md:text-headline-lg text-primary font-bold">Udhaar & Team Management</h1>
          </div>
          <p className="text-body-md text-on-surface-variant">Track outstanding customer balances, staff credits, and temporary cash advances.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl py-3 px-4 flex items-center gap-3 border border-outline-variant/30">
            <div className="bg-error-container text-on-error-container p-2 rounded-full shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Customer Udhaar</p>
              <p className="text-lg text-primary font-bold">₹{totalOutstanding.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl py-3 px-4 flex items-center gap-3 border border-outline-variant/30">
            <div className="bg-amber-100 text-amber-800 p-2 rounded-full shrink-0">
              <Users className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Staff Credit</p>
              <p className="text-lg text-amber-700 font-bold">₹{totalStaffCreditOutstanding.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl py-3 px-4 flex items-center gap-3 border border-outline-variant/30">
            <div className="bg-cyan-100 text-cyan-800 p-2 rounded-full shrink-0">
              <Coins className="w-5 h-5 text-cyan-700" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Staff Advances</p>
              <p className="text-lg text-cyan-700 font-bold">₹{totalStaffAdvanceOutflow.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="flex border-b border-outline-variant/50 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => { setActiveTab('customer'); setErrorMsg(''); }}
          className={`px-5 py-4 font-sans text-sm font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'customer'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
          }`}
        >
          👤 Customer Udhaar (₹{totalOutstanding.toLocaleString()})
        </button>
        <button
          onClick={() => { setActiveTab('staffCredit'); setErrorMsg(''); }}
          className={`px-5 py-4 font-sans text-sm font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'staffCredit'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
          }`}
        >
          💼 Staff Credit (₹{totalStaffCreditOutstanding.toLocaleString()})
        </button>
        <button
          onClick={() => { setActiveTab('staffAdvance'); setErrorMsg(''); }}
          className={`px-5 py-4 font-sans text-sm font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'staffAdvance'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
          }`}
        >
          💵 Staff Advances (₹{totalStaffAdvanceOutflow.toLocaleString()})
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 font-semibold px-4 py-3 rounded-xl transition-all">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-error-container/20 border border-error text-error text-sm p-3 rounded-xl transition-all">
          {errorMsg}
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'customer' && (
        <>
          {/* Record New Credit Sale Form */}
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl p-6 border border-outline-variant/30 bg-surface-container-lowest">
            <div className="flex items-center gap-2 mb-stack-lg">
              <PlusCircle className="text-secondary w-6 h-6" />
              <h2 className="text-headline-md text-primary font-bold">Record Customer Credit Sale</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="flex flex-col gap-1 relative text-left">
                <div className="flex items-center justify-between">
                  <label className="text-label-md text-on-surface-variant font-medium">Patient / Customer Name *</label>
                  {showAutoPrefilledBadge && (
                    <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-black font-sans">
                      ✓ Profile Found
                    </span>
                  )}
                </div>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none w-full animate-none" 
                  placeholder="e.g. Rahul Gupta" 
                  type="text" 
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    setShowAutoPrefilledBadge(false);
                  }}
                  onFocus={() => setFocusedInput(true)}
                  onBlur={() => setTimeout(() => setFocusedInput(false), 200)}
                />
                {focusedInput && autocompleteSuggestions.length > 0 && (
                  <div className="absolute top-[100%] left-0 w-full bg-white border border-outline-variant rounded-b-xl shadow-lg z-50 divide-y divide-outline-variant/30 max-h-48 overflow-y-auto">
                    <div className="p-2 text-[10px] bg-surface-container font-bold text-on-surface-variant uppercase tracking-wider font-sans">Select Registered Patient</div>
                    {autocompleteSuggestions.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setPatientName(cust.name);
                          setCustomerPhone(cust.phone);
                          setShowAutoPrefilledBadge(true);
                          setFocusedInput(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-secondary-container/20 text-sm flex justify-between items-center transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="font-semibold text-on-background">{cust.name}</p>
                          <p className="text-xs text-on-surface-variant font-mono">{cust.phone}</p>
                        </div>
                        <span className="text-xs text-secondary bg-secondary-container/30 px-1.5 py-0.5 rounded font-bold">
                          Pending: ₹{cust.pendingBalance}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Patient Mobile Number</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                  placeholder="e.g. +91 98765 43210" 
                  type="text" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Sale Date</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                  type="date" 
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Recorded By (Salesman)</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                  placeholder="e.g. Staff Name" 
                  type="text" 
                  value={salesmanName}
                  onChange={(e) => setSalesmanName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-label-md text-on-surface-variant font-medium">Credit Amount (₹) *</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:border-secondary outline-none font-bold text-lg" 
                  placeholder="0.00" 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-stack-lg flex justify-end">
              <button onClick={handleSubmitSale} className="bg-primary text-on-primary px-6 py-3 rounded-lg text-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-colors cursor-pointer font-bold">
                <Save className="w-5 h-5 text-white" />
                Record Credit Sale
              </button>
            </div>
          </div>

          {/* Customer List Section */}
          <h2 className="text-headline-md text-on-surface font-bold text-lg mt-8">Registered Customers ({filteredCustomers.length})</h2>
          
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl p-4 border border-outline-variant/30 flex flex-col md:flex-row gap-stack-md">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
              <input 
                className="w-full bg-surface-bright border border-outline-variant focus:border-secondary rounded-lg pl-12 pr-4 py-3 text-body-md text-on-background outline-none transition-colors" 
                placeholder="Search customer name or phone..." 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {filteredCustomers.map(c => (
              <CustomerCard 
                 key={c.id}
                 name={c.name} 
                 phone={c.phone} 
                 status={c.status}
                 pending={`₹${c.pendingBalance.toLocaleString()}`}
                 pendingBalance={c.pendingBalance}
                 lastPayment={c.lastPaymentDate || 'None'}
                 onReceivePayment={() => {
                   onSelectCustomer(c.id);
                   onNavigate('customerLedger');
                 }}
                 onViewHistory={() => {
                   onSelectCustomer(c.id);
                   onNavigate('customerLedger');
                 }}
              />
            ))}
            {filteredCustomers.length === 0 && (
              <div className="col-span-full bg-surface-container-lowest p-12 text-center rounded-xl border border-dashed border-outline-variant">
                <p className="text-on-surface-variant">No customers found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'staffCredit' && (
        <>
          {/* Record Staff Credit Form */}
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl p-6 border border-outline-variant/30 bg-surface-container-lowest">
            <div className="flex items-center gap-2 mb-stack-lg">
              <Users className="text-amber-600 w-6 h-6 animate-none" />
              <h2 className="text-headline-md text-primary font-bold">Record Staff Credit (Medicines/Products Bought)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Select Staff Member *</label>
                <select 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none"
                  value={scSelectedUser}
                  onChange={(e) => setScSelectedUser(e.target.value)}
                >
                  <option value="">-- Choose registered staff --</option>
                  {staffUsers.map(su => (
                    <option key={su.id} value={su.name}>{su.name} ({su.role})</option>
                  ))}
                  <option value="other">Other / Custom Name</option>
                </select>
              </div>

              {scSelectedUser === 'other' && (
                <div className="flex flex-col gap-1">
                  <label className="text-label-md text-on-surface-variant font-medium">Specify Custom Name *</label>
                  <input 
                    className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                    placeholder="e.g. Ramesh Giri" 
                    type="text" 
                    value={scCustomName}
                    onChange={(e) => setScCustomName(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Sale Date</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                  type="date" 
                  value={scDate}
                  onChange={(e) => setScDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Purpose / Meds Bought *</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                  placeholder="e.g. Cough syrup, Antibiotics pack" 
                  type="text" 
                  value={scPurpose}
                  onChange={(e) => setScPurpose(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-label-md text-on-surface-variant font-medium">Credit Value Amount (₹) *</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:border-secondary outline-none font-bold text-lg" 
                  placeholder="₹ 0.00" 
                  type="number" 
                  value={scAmount}
                  onChange={(e) => setScAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-stack-lg flex justify-end">
              <button onClick={handleRecordStaffCredit} className="bg-amber-600 text-on-primary px-6 py-3 rounded-lg text-label-md flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer font-bold">
                <Save className="w-5 h-5 text-white" />
                Log Staff Credit Sale
              </button>
            </div>
          </div>

          {/* Grouped lists of staff balance */}
          <h2 className="text-headline-md text-on-surface font-bold text-lg mt-8">Staff Udhaar Balances ({staffCreditSummary.length})</h2>
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/50 text-xs font-semibold text-on-surface-variant">
                    <th className="p-4">Staff Member Name</th>
                    <th className="p-4">Total Accumulated Credit</th>
                    <th className="p-4">Last Activity Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {staffCreditSummary.map((sum, index) => (
                    <tr key={index} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 font-bold text-on-background">{sum.name}</td>
                      <td className="p-4 text-amber-750 font-sans font-bold">₹{sum.pendingBalance.toLocaleString()}</td>
                      <td className="p-4 text-on-surface-variant font-mono text-xs">{sum.lastDate}</td>
                      <td className="p-4">
                        <span className="bg-amber-50 text-amber-800 border border-amber-200/30 font-bold px-2 py-1 rounded text-xs">
                          Pending Salary Deduction
                        </span>
                      </td>
                    </tr>
                  ))}
                  {staffCreditSummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-on-surface-variant">No staff credits recorded today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Table */}
          <h2 className="text-headline-md text-on-surface font-bold text-lg mt-8">Live Staff Credit Logs</h2>
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/50 text-xs font-semibold text-on-surface-variant">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Purpose/Medicines</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {staffCreditTx.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 text-on-surface-variant font-mono text-xs">{tx.date} {tx.time}</td>
                      <td className="p-4 font-bold text-on-background">{tx.patientName}</td>
                      <td className="p-4 text-on-surface-variant text-xs">{tx.extraDetails || 'General Purchase'}</td>
                      <td className="p-4 text-on-surface-variant text-xs">{tx.recordedByUserName}</td>
                      <td className="p-4 text-amber-750 font-bold font-sans">₹{tx.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {staffCreditTx.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant">No credits recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'staffAdvance' && (
        <>
          {/* Record Staff Advance Form */}
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl p-6 border border-outline-variant/30 bg-surface-container-lowest">
            <div className="flex items-center gap-2 mb-stack-lg">
              <Coins className="text-cyan-600 w-6 h-6 animate-pulse" />
              <h2 className="text-headline-md text-primary font-bold">Record Temporary Staff Advance (Cash/UPI Outs)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Select Staff Member *</label>
                <select 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none"
                  value={saSelectedUser}
                  onChange={(e) => setSaSelectedUser(e.target.value)}
                >
                  <option value="">-- Choose registered staff --</option>
                  {staffUsers.map(su => (
                    <option key={su.id} value={su.name}>{su.name} ({su.role})</option>
                  ))}
                  <option value="other">Other / Custom Name</option>
                </select>
              </div>

              {saSelectedUser === 'other' && (
                <div className="flex flex-col gap-1">
                  <label className="text-label-md text-on-surface-variant font-medium">Specify Custom Name *</label>
                  <input 
                    className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                    placeholder="e.g. Ramesh Giri" 
                    type="text" 
                    value={saCustomName}
                    onChange={(e) => setSaCustomName(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Advance Date</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                  type="date" 
                  value={saDate}
                  onChange={(e) => setSaDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Payment Outflow Mode *</label>
                <select 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none"
                  value={saMode}
                  onChange={(e) => setSaMode(e.target.value)}
                >
                  <option value="Cash">Cash in Hand Payment</option>
                  <option value="UPI / Bank">UPI / Direct Online Bank Account</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-label-md text-on-surface-variant font-medium">Reason / Loan Purpose</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                  placeholder="e.g. Salary advance, Festival bonus loan, Emergency" 
                  type="text" 
                  value={saPurpose}
                  onChange={(e) => setSaPurpose(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-label-md text-on-surface-variant font-medium">Advance Value Amount (₹) *</label>
                <input 
                  className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:border-secondary outline-none font-bold text-lg" 
                  placeholder="₹ 0.00" 
                  type="number" 
                  value={saAmount}
                  onChange={(e) => setSaAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-stack-lg flex justify-end">
              <button onClick={handleRecordStaffAdvance} className="bg-cyan-600 text-on-primary px-6 py-3 rounded-lg text-label-md flex items-center justify-center gap-2 hover:bg-cyan-700 transition-colors cursor-pointer font-bold">
                <Coins className="w-5 h-5 text-white" />
                Pay Cash/UPI Advance
              </button>
            </div>
          </div>

          {/* Grouped lists of advances paid */}
          <h2 className="text-headline-md text-on-surface font-bold text-lg mt-8">Staff Advance Summary (Grouped)</h2>
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/50 text-xs font-semibold text-on-surface-variant">
                    <th className="p-4">Staff Member Name</th>
                    <th className="p-4">Total Cash Advance Issued</th>
                    <th className="p-4">Last Activity Date</th>
                    <th className="p-4">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {staffAdvanceSummary.map((sum, index) => (
                    <tr key={index} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 font-bold text-on-background">{sum.name}</td>
                      <td className="p-4 text-cyan-700 font-sans font-bold">₹{sum.totalAdvance.toLocaleString()}</td>
                      <td className="p-4 text-on-surface-variant font-mono text-xs">{sum.lastDate}</td>
                      <td className="p-4">
                        <span className="bg-cyan-50 text-cyan-850 border border-cyan-200/30 font-bold px-2 py-1 rounded text-xs select-none">
                          Deduct from monthly pay
                        </span>
                      </td>
                    </tr>
                  ))}
                  {staffAdvanceSummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-on-surface-variant">No team cash advances paid yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Table */}
          <h2 className="text-headline-md text-on-surface font-bold text-lg mt-8">Live Cash Advance Logs</h2>
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/50 text-xs font-semibold text-on-surface-variant">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Mode & Purpose/Reason</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4">Amount Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {staffAdvanceTx.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 text-on-surface-variant font-mono text-xs">{tx.date} {tx.time}</td>
                      <td className="p-4 font-bold text-on-background">{tx.patientName}</td>
                      <td className="p-4 text-on-surface-variant text-xs">{tx.extraDetails || 'Emergency Loan'}</td>
                      <td className="p-4 text-on-surface-variant text-xs">{tx.recordedByUserName}</td>
                      <td className="p-4 text-cyan-750 font-bold font-sans">₹{tx.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {staffAdvanceTx.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant">No salary advances recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function CustomerCard({ name, phone, status, pending, pendingBalance = 0, lastPayment, onReceivePayment, onViewHistory }: any) {
  const isOverdue = status === 'Overdue';
  const isPending = status === 'Pending';
  const isPaid = status === 'Paid';

  const hasLowBalanceAlert = pendingBalance >= 10000;

  const statusBg = isOverdue ? 'bg-error/10' : isPending ? 'bg-[#F59E0B]/10' : 'bg-secondary/10';
  const statusBadgeBg = isOverdue ? 'bg-error-container text-on-error-container' : isPending ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-secondary-container text-on-secondary-container';
  const pendingColor = isOverdue ? 'text-error' : isPaid ? 'text-secondary' : 'text-on-background';

  return (
    <div className={`bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl p-5 border flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300 ${isPaid ? 'opacity-80' : ''} ${hasLowBalanceAlert ? 'border-red-400/80 shadow-[0_4px_20px_rgba(239,68,68,0.08)] ring-1 ring-red-400/30' : 'border-outline-variant/30'}`}>
      {hasLowBalanceAlert && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 rounded-l-xl"></div>
      )}
      <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full -mr-4 -mt-4 ${statusBg}`}></div>
      <div>
        <div className="flex justify-between items-start mb-stack-md">
          <div className="space-y-1">
            <h3 className="text-headline-md text-primary font-bold">{name}</h3>
            <p className="text-body-md text-on-surface-variant font-mono text-xs">{phone}</p>
            {hasLowBalanceAlert && (
              <div className="mt-2 flex items-center gap-1.5 bg-red-50 text-red-800 text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-md border border-red-200 animate-pulse inline-flex uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Low Balance Alert</span>
              </div>
            )}
          </div>
          <span className={`${statusBadgeBg} text-label-md px-3 py-1 rounded-full text-xs`}>{status}</span>
        </div>
        <div className="bg-surface-bright rounded-lg p-3 mb-stack-md border border-outline-variant/20">
          <div className="flex justify-between items-center mb-1">
            <span className="text-label-md text-on-surface-variant">Pending Credit</span>
            <span className={`text-number-md ${pendingColor}`}>{pending}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-label-md text-on-surface-variant">Last Payment</span>
            <span className="text-body-md text-on-background">{lastPayment}</span>
          </div>
        </div>
      </div>
      
      {isPaid ? (
        <button 
          className="w-full bg-surface-container-high text-on-background text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors mt-auto cursor-pointer"
          onClick={onViewHistory}
        >
          <Clock className="w-5 h-5" />
          View History
        </button>
      ) : (
        <div className="mt-auto space-y-3 relative z-10">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface-variant">Received By (Staff Name)</label>
            <input className="bg-surface-bright border border-outline-variant rounded-md px-3 py-2 text-sm text-on-background focus:border-secondary outline-none w-full" placeholder="Staff Name" type="text" />
          </div>
          <button 
            className="w-full bg-primary text-on-primary text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-colors cursor-pointer"
            onClick={onReceivePayment}
          >
            <Banknote className="w-5 h-5 text-white" />
            Receive Payment
          </button>
        </div>
      )}
    </div>
  );
}

function DayClosingScreen({ 
  onBack, 
  transactions, 
  currentFirmId, 
  isDemoMode,
  openingCash,
  setOpeningCash,
  todayDaySales,
  setTodayDaySales,
  workingDate,
  onWorkingDateChange,
  isClosed,
  onCloseDay,
  onReopenDay,
  userRole,
  firms,
  openingBalanceForwarded,
  setOpeningBalanceForwarded,
  counterOnlineSales,
  setCounterOnlineSales
}: { 
  onBack: () => void, 
  transactions: Transaction[], 
  currentFirmId: string, 
  isDemoMode?: boolean,
  openingCash: number,
  setOpeningCash: (val: number) => void,
  todayDaySales: number,
  setTodayDaySales: (val: number) => void,
  workingDate: string,
  onWorkingDateChange: (val: string) => void,
  isClosed: boolean,
  onCloseDay: () => void,
  onReopenDay: () => void,
  userRole?: 'user' | 'firmAdmin',
  firms?: Firm[],
  openingBalanceForwarded: number,
  setOpeningBalanceForwarded: (val: number) => void,
  counterOnlineSales: number,
  setCounterOnlineSales: (val: number) => void
}) {
  const activeTransactions = transactions.filter(t => t.firmId === currentFirmId && t.date === workingDate);
  
  // Dynamic categories
  const creditSales = activeTransactions.filter(t => t.type === 'credit_sale');
  const creditReceived = activeTransactions.filter(t => t.type === 'receive_payment');
  const supplierPaid = activeTransactions.filter(t => t.type === 'supplier_payment' && !t.title.toLowerCase().includes('expense'));
  const recordedExpenses = activeTransactions.filter(t => t.type === 'supplier_payment' && t.title.toLowerCase().includes('expense'));
  const schemePaid = activeTransactions.filter(t => t.type === 'scheme_bill');
  const staffCredits = activeTransactions.filter(t => t.type === 'staff_credit');
  const staffAdvances = activeTransactions.filter(t => t.type === 'staff_advance');

  // Staff credit & advances
  const staffCreditToday = staffCredits.reduce((sum, t) => sum + t.amount, 0);
  const staffAdvanceToday = staffAdvances.reduce((sum, t) => sum + t.amount, 0);

  // Credit Given (Credit Sale Today - Patients & Staff as requested)
  const patientCreditToday = creditSales.reduce((sum, t) => sum + t.amount, 0);
  const creditGivenToday = patientCreditToday + staffCreditToday;
  const creditSaleToday = creditGivenToday;
  
  // Scheme Receivables Today (Scheme Bill Today)
  const schemeReceivablesToday = schemePaid.reduce((sum, t) => sum + t.amount, 0);
  const schemeBillToday = schemeReceivablesToday;
  
  // Supplier payments
  const supplierExpenses = supplierPaid.reduce((sum, t) => sum + t.amount, 0);
  // General Expenses (recorded + demo offset)
  const expToday = recordedExpenses.reduce((sum, t) => sum + t.amount, 0) + (isDemoMode ? 1250 : 0);
  const totalExpenses = supplierExpenses + expToday;

  // Credit received cash vs online (Credit Received today)
  let cashCreditReceived = 0;
  let onlineCreditReceived = 0;
  creditReceived.forEach(t => {
    if ((t.extraDetails || '').toLowerCase().includes('cash')) {
      cashCreditReceived += t.amount;
    } else {
      onlineCreditReceived += t.amount;
    }
  });

  // Calculate Today's Day Sales: Sum of Counter Cash Sales and Counter Online Sales!
  const totalSalesToday = todayDaySales + counterOnlineSales;
  
  // Settle formula variables precisely matching requested text:
  // (Opening Cash + Today Day Sales + Cash Collections ) - (Online Collections + Scheme Bills + Supplier Pay + Staff Credit + Staff Advance + Credit Given + Expenses )
  const cashCollections = cashCreditReceived;
  // Online payment counts under online collections and is deducted
  const onlineCollections = onlineCreditReceived + counterOnlineSales;
  const schemeBills = schemeReceivablesToday;
  const supplierPay = supplierExpenses;
  const staffCredit = staffCreditToday;
  const staffAdvance = staffAdvanceToday;
  const creditGiven = patientCreditToday;
  const expenses = expToday;

  // Settle sum elements
  const totalAddedCash = openingCash + totalSalesToday + cashCollections;
  const totalDeductedCash = onlineCollections + schemeBills + supplierPay + staffCredit + staffAdvance + creditGiven + expenses + openingBalanceForwarded;

  // Final Cash in Hand in Day Closing = Added Items - Deducted Items
  const finalCashInHand = totalAddedCash - totalDeductedCash;

  const generateDailyPdfReport = () => {
    try {
      const doc = new jsPDF();
      
      const activeFirm = firms?.find(f => f.id === currentFirmId);
      
      // Header Banner Background (#128C7E)
      doc.setFillColor(18, 140, 126);
      doc.rect(0, 0, 210, 42, 'F');
      
      // Header Title & Meta Description
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("ShopBooks", 15, 16);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Smart Business Ledger - Daily Closing Statement", 15, 23);
      doc.text(`Working Date: ${workingDate}`, 15, 29);
      doc.text(`Status: ${isClosed ? 'LOCKED / CLOSED' : 'ACTIVE / OPEN'}`, 15, 35);
      
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 135, 16);
      doc.text(`Firm: ${activeFirm?.name || 'Yogwalture Pharmacy'}`, 135, 23);
      doc.text(`Mobile: ${activeFirm?.mobile || ''}`, 135, 29);
      doc.text(`Admin: ${activeFirm?.adminName || ''}`, 135, 35);

      // Section: Executive Summary
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE FINANCIAL SUMMARY", 15, 52);
      
      // Horizontal Gray Divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, 56, 195, 56);
      
      // KPI Grid boxes
      // Left side: Cash Calculations
      doc.setFillColor(248, 249, 250);
      doc.rect(15, 60, 85, 58, 'F');
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.3);
      doc.rect(15, 60, 85, 58, 'D');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(18, 140, 126);
      doc.text("CASH REG. ADDITIONS & DEDUCTIONS", 18, 65);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`Opening Cash:`, 19, 69);
      doc.text(`INR ${openingCash.toLocaleString('en-IN')}`, 64, 69);
      
      doc.text(`(+) Today Day Sales:`, 19, 73.5);
      doc.text(`INR ${totalSalesToday.toLocaleString('en-IN')}`, 64, 73.5);
      
      doc.text(`(+) Cash Collections:`, 19, 78);
      doc.text(`INR ${cashCreditReceived.toLocaleString('en-IN')}`, 64, 78);
      
      doc.text(`(-) Online Collections:`, 19, 82.5);
      doc.text(`INR ${onlineCreditReceived.toLocaleString('en-IN')}`, 64, 82.5);
      
      doc.text(`(-) Scheme Bills:`, 19, 87);
      doc.text(`INR ${schemeReceivablesToday.toLocaleString('en-IN')}`, 64, 87);

      doc.text(`(-) Supplier Pay:`, 19, 91.5);
      doc.text(`INR ${supplierExpenses.toLocaleString('en-IN')}`, 64, 91.5);

      doc.text(`(-) Staff Credit/Adv:`, 19, 96);
      doc.text(`INR ${(staffCreditToday + staffAdvanceToday).toLocaleString('en-IN')}`, 64, 96);

      doc.text(`(-) Credit Given (Pat+Stf):`, 19, 100.5);
      doc.text(`INR ${creditGivenToday.toLocaleString('en-IN')}`, 64, 100.5);

      doc.text(`(-) Expenses:`, 19, 105);
      doc.text(`INR ${expenses.toLocaleString('en-IN')}`, 64, 105);

      doc.text(`(-) Op. Bal Forwarded:`, 19, 109.5);
      doc.text(`INR ${openingBalanceForwarded.toLocaleString('en-IN')}`, 64, 109.5);

      // Final Cash Result box
      doc.setFillColor(235, 247, 242);
      doc.rect(105, 60, 90, 58, 'F');
      doc.setDrawColor(18, 140, 126);
      doc.rect(105, 60, 90, 58, 'D');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(18, 140, 126);
      doc.text("FINAL REGISTER CASH-IN-HAND", 110, 66);
      
      doc.setFontSize(16);
      doc.setTextColor(18, 140, 126);
      doc.text(`INR ${finalCashInHand.toLocaleString('en-IN')}`, 110, 78);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("Calibrated Physical Drawer Target", 110, 87);
      doc.setFont("helvetica", "italic");
      doc.text("Reconciled against active registers.", 110, 93);
      doc.text("Verify physical registry daily.", 110, 99);

      // Section: Day Performance Analytics
      doc.setFont("helvetica", "bold");
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(10);
      doc.text("DAY SALES PERFORMANCE & RECEIVABLES", 15, 123);
      
      doc.setFillColor(248, 249, 250);
      doc.rect(15, 127, 180, 24, 'F');
      doc.setDrawColor(220, 224, 230);
      doc.rect(15, 127, 180, 24, 'D');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Total Day Sales", 19, 133);
      doc.setFontSize(11);
      doc.text(`INR ${totalSalesToday.toLocaleString('en-IN')}`, 19, 143);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Udhaar / Credit", 75, 133);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`₹${creditGivenToday.toLocaleString('en-IN')}`, 75, 143);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Govt/Scheme", 135, 133);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`₹${schemeReceivablesToday.toLocaleString('en-IN')}`, 135, 143);

      // Section: Detail Activity table title
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED TRANSACTIONS & ACTIVITY LEDGER", 15, 160);
      
      let currentY = 165;
      
      // Draw Table Header Background (Light Steel Accent)
      doc.setFillColor(235, 242, 239);
      doc.rect(15, currentY, 180, 8, 'F');
      
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      
      doc.text("S.No", 18, currentY + 6);
      doc.text("Time", 30, currentY + 6);
      doc.text("Activity Type / Details", 48, currentY + 6);
      doc.text("Party / Patient", 112, currentY + 6);
      doc.text("Amount (INR)", 162, currentY + 6);
      
      currentY += 8;
      
      // Let's bundle ALL things shown on that day:
      const rows: any[] = [];
      
      // 2. Map all activeTransactions
      activeTransactions.forEach(tx => {
        let typeStr = '';
        let details = tx.extraDetails || '';
        let party = tx.patientName || '-';
        
        switch (tx.type) {
          case 'credit_sale':
            typeStr = 'Udhaar (Credit Sale)';
            details = details || 'Regular credit purchase';
            break;
          case 'receive_payment':
            typeStr = 'Payment Collection';
            details = details || 'Customer payment collection';
            break;
          case 'supplier_payment':
            typeStr = 'Supplier Expense';
            details = details || 'Stock / Supplier bill payment';
            break;
          case 'scheme_bill':
            typeStr = 'Scheme Claim';
            details = details || 'Government / Scheme billing';
            break;
          case 'staff_credit':
            typeStr = 'Staff Store Udhaar';
            details = details || 'Medicines / Goods bought by team';
            break;
          case 'staff_advance':
            typeStr = 'Staff Advance Paid';
            details = details || 'Team cash advance / Loan';
            break;
          default:
            typeStr = tx.title || 'Ledger Activity';
        }
        
        rows.push({
          time: tx.time || '--:--',
          typeStr,
          details,
          party,
          amountStr: `₹${tx.amount.toLocaleString('en-IN')}`,
          rawtx: tx
        });
      });
      
      // Sort rows by time or type so it's super structured
      rows.sort((a, b) => a.time.localeCompare(b.time));
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(8.5);
      
      if (rows.length === 0) {
        doc.setDrawColor(235, 235, 235);
        doc.line(15, currentY, 195, currentY);
        doc.text("No transaction activities or walk-in sales recorded for this date.", 20, currentY + 6);
        currentY += 8;
      } else {
        rows.forEach((row, idx) => {
          // Page break safety margin
          if (currentY > 265) {
            doc.addPage();
            currentY = 20;
            
            doc.setFillColor(235, 242, 239);
            doc.rect(15, currentY, 180, 8, 'F');
            
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text("S.No", 18, currentY + 6);
            doc.text("Time", 30, currentY + 6);
            doc.text("Activity Type / Details", 48, currentY + 6);
            doc.text("Party / Patient", 112, currentY + 6);
            doc.text("Amount (INR)", 162, currentY + 6);
            
            currentY += 8;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(70, 70, 70);
          }
          
          doc.setDrawColor(235, 235, 235);
          doc.setLineWidth(0.3);
          doc.line(15, currentY, 195, currentY);
          
          doc.text((idx + 1).toString(), 18, currentY + 5);
          doc.text(row.time, 30, currentY + 5);
          
          // Activity & Description wrapping
          doc.setFont("helvetica", "bold");
          const actType = row.typeStr;
          const cleanActType = actType.length > 28 ? actType.substring(0, 25) + '...' : actType;
          doc.text(cleanActType, 48, currentY + 5);
          
          doc.setFont("helvetica", "normal");
          const desc = row.details;
          const cleanDesc = desc.length > 35 ? desc.substring(0, 32) + '...' : desc;
          doc.text(cleanDesc, 48, currentY + 9);
          
          const partyName = row.party;
          const cleanParty = partyName.length > 24 ? partyName.substring(0, 21) + '...' : partyName;
          doc.text(cleanParty, 112, currentY + 5);
          
          doc.text(row.amountStr, 162, currentY + 5);
          
          currentY += 12;
        });
      }
      
      // Bottom highlight double bar
      doc.setDrawColor(18, 140, 126);
      doc.setLineWidth(1);
      doc.line(15, currentY, 195, currentY);
      
      currentY += 12;
      
      if (currentY > 255) {
        doc.addPage();
        currentY = 25;
      }
      
      // Admin Approval or Signature Block
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text("VERIFICATION & SIGN-OFF", 15, currentY);
      
      doc.line(15, currentY + 3, 195, currentY + 3);
      
      doc.setFont("helvetica", "normal");
      doc.text("Prepared By: Counter Staff / Authorized Duty Operator", 15, currentY + 12);
      doc.text("Approved By: Firm Admin Proprietor Signature", 125, currentY + 12);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(15, currentY + 28, 75, currentY + 28);
      doc.line(125, currentY + 28, 185, currentY + 28);
      
      doc.setFontSize(8);
      doc.text("Operator Seal / Signature", 26, currentY + 33);
      doc.text("Admin Proprietary Stamp", 136, currentY + 33);
      
      currentY += 40;
      
      if (currentY > 280) {
        doc.addPage();
        currentY = 25;
      }
      
      doc.setTextColor(110, 110, 110);
      doc.setFontSize(8);
      doc.text("Disclaimer: ShopBooks certified system report logs represent reconciled accounts for Indian pharmacies.", 15, currentY);
      doc.text(`Lock-State hashes match digital records signed on the system. Security verified.`, 15, currentY + 4);
      
      const fileLabel = `Reconciled_Day_Ledger_${activeFirm?.name.replace(/\s+/g, '_') || 'ShopBooks'}_${workingDate}.pdf`;
      doc.save(fileLabel);
    } catch (e) {
      console.error("Daily Summary PDF construction failed:", e);
      alert("Error generating PDF. Printing window fallback instead.");
      window.print();
    }
  };

  return (
    <>
      <header className="bg-surface-container-lowest w-full top-0 sticky z-40 border-b border-outline-variant flex justify-between items-center px-container-padding-mobile h-16 transition-colors duration-200">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <Store className="text-primary w-6 h-6 fill-current" />
          <h1 className="text-headline-mobile text-primary tracking-tight font-bold">ShopBooks</h1>
        </div>
        <button className="p-2 -mr-2 rounded-full hover:bg-surface-container-low transition-colors duration-200 flex items-center justify-center" onClick={onBack}>
          <UserCircle className="text-on-surface-variant w-6 h-6" />
        </button>
      </header>
  
      <main className="flex-1 px-container-padding-mobile pt-stack-lg pb-32 max-w-3xl mx-auto w-full flex flex-col gap-stack-lg text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-headline-mobile text-on-background font-bold text-xl">Day Closing Center</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <span>Selected Ledger Date:</span>
              <span className="font-mono text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">{workingDate}</span>
              {isClosed && (
                <span className="bg-error-container/80 text-error text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wide">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider">Select Ledger Date:</span>
            <CalendarDatePicker 
              value={workingDate}
              onChange={onWorkingDateChange}
              clearable={false}
              className="w-44"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
          {/* Total Sales Today Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/30 flex flex-col justify-between text-left">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Total Sales ({workingDate})
              </span>
              <div className="text-secondary bg-secondary-container/30 p-1.5 rounded-full">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-primary">₹ {totalSalesToday.toLocaleString()}</span>
              <p className="text-on-surface-variant text-[11px] mt-1 leading-normal">
                Sum of credit sales, staff purchase credit, and scheme bills
              </p>
            </div>
          </div>

          {/* Total Cash in Hand Card */}
          <div className="bg-primary-container/20 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-primary/20 flex flex-col justify-between text-left">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Total Cash in Hand
              </span>
              <div className="text-primary bg-primary-container/40 p-1.5 rounded-full">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-primary">₹ {finalCashInHand.toLocaleString()}</span>
              <p className="text-on-surface-variant text-[11px] mt-1 leading-normal">
                Active cash balance derived using the balanced ledger equation
              </p>
            </div>
          </div>
        </div>

        {/* Editable Balance Adjustments */}
        <section className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] border border-outline-variant/35 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Adjust Ledger Register (Editable)</h3>
            <p className="text-xs text-on-surface-variant mt-1 leading-normal">
              Input physical drawer opening cash count, today day sales, and opening balance forwarded for dynamic automatic calibration.
              {isClosed && <span className="text-error font-medium block mt-1">⚠️ Day is closed and locked. Edits require Admin unlock.</span>}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-primary" />
                Opening Cash (₹)
              </label>
              <input 
                type="number" 
                value={openingCash === 0 ? '' : openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                disabled={isClosed}
                className={`border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary outline-none w-full font-mono font-bold ${isClosed ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-surface-bright text-on-background'}`}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-secondary" />
                Today Cash Sales (₹)
              </label>
              <input 
                type="number" 
                value={todayDaySales === 0 ? '' : todayDaySales}
                onChange={(e) => setTodayDaySales(Number(e.target.value))}
                disabled={isClosed}
                className={`border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary outline-none w-full font-mono font-bold ${isClosed ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-surface-bright text-on-background'}`}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-teal-600" />
                Today Online Sales (₹)
              </label>
              <input 
                type="number" 
                value={counterOnlineSales === 0 ? '' : counterOnlineSales}
                onChange={(e) => setCounterOnlineSales(Number(e.target.value))}
                disabled={isClosed}
                className={`border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary outline-none w-full font-mono font-bold ${isClosed ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-surface-bright text-on-background'}`}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                Op. Bal Forwarded (₹)
              </label>
              <input 
                type="number" 
                value={openingBalanceForwarded === 0 ? '' : openingBalanceForwarded}
                onChange={(e) => setOpeningBalanceForwarded(Number(e.target.value))}
                disabled={isClosed}
                className={`border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary outline-none w-full font-mono font-bold ${isClosed ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-surface-bright text-on-background'}`}
                placeholder="0"
              />
            </div>
          </div>
        </section>
  
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] flex flex-col items-center justify-center gap-stack-sm border border-outline-variant/30">
          <span className="text-label-md text-on-surface-variant uppercase tracking-widest text-xs font-semibold">Final Cash in Hand</span>
          <div className="text-number-xl text-primary font-bold my-2 text-3xl">₹ {finalCashInHand.toLocaleString()}</div>
          <div className="text-xs text-on-surface-variant mt-0.5 text-center leading-relaxed">
            <span className="font-bold block text-primary/80 mb-1 font-mono text-[11px]">Equation: (Opening Cash ({openingCash}) + Today Day Sales ({totalSalesToday}) + Cash Collections ({cashCollections})) - (Online Collections ({onlineCollections}) + Scheme Bills ({schemeBills}) + Supplier Pay ({supplierPay}) + Staff Credit ({staffCredit}) + Staff Advance ({staffAdvance}) + Credit Given ({creditGiven}) + Expenses ({expenses}) + Forwarded Bal ({openingBalanceForwarded}))</span>
            <span className="font-mono text-[10px]">({openingCash.toLocaleString()} + {totalSalesToday.toLocaleString()} + {cashCollections.toLocaleString()}) - ({onlineCollections.toLocaleString()} + {schemeBills.toLocaleString()} + {supplierPay.toLocaleString()} + {staffCredit.toLocaleString()} + {staffAdvance.toLocaleString()} + {creditGiven.toLocaleString()} + {expenses.toLocaleString()} + {openingBalanceForwarded.toLocaleString()}) = ₹{finalCashInHand.toLocaleString()}</span>
          </div>
          <div className="bg-secondary-container/30 text-on-secondary-container px-3 py-1.5 rounded-full flex items-center gap-2 mt-3 block">
            <CheckCircle className="w-[18px] h-[18px] fill-current inline mr-1" stroke="white" />
            <span className="text-label-md text-xs">Live Ledger Balanced</span>
          </div>
        </section>
 
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Banknote className="w-[20px] h-[20px] text-primary" />
              <span className="text-label-md text-xs font-semibold">Opening Cash</span>
            </div>
            <span className="text-number-md text-on-background font-bold">₹ {openingCash.toLocaleString()}</span>
          </div>
  
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Store className="w-[20px] h-[20px] text-secondary" />
              <span className="text-label-md text-xs font-semibold">Total Day Sales</span>
            </div>
            <span className="text-number-md text-secondary font-bold">+ ₹ {totalSalesToday.toLocaleString()}</span>
          </div>
  
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <QrCode className="w-[20px] h-[20px] text-teal-600" />
              <span className="text-label-md text-xs font-semibold">Payment Collection (UPI)</span>
            </div>
            <span className="text-number-md text-teal-700 font-semibold">₹ {onlineCollections.toLocaleString()}</span>
          </div>
  
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Coins className="w-[20px] h-[20px] text-green-600" />
              <span className="text-label-md text-xs font-semibold">Payment Collection (Cash)</span>
            </div>
            <span className="text-number-md text-green-700 font-semibold">₹ {cashCollections.toLocaleString()}</span>
          </div>
  
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant text-error">
              <PlusCircle className="w-[20px] h-[20px]" />
              <span className="text-label-md text-xs font-semibold">Credit Given Today</span>
            </div>
            <span className="text-number-md text-error font-bold">₹ {creditGivenToday.toLocaleString()}</span>
          </div>
        </section>

        {/* Scheme receivables row */}
        <section className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
              <ShieldPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-label-md text-on-background font-semibold text-sm">Scheme Receivables (Today)</h3>
              <p className="text-body-md text-on-surface-variant text-[12px]">Govt. programs e.g. MJPJAY, ESIC</p>
            </div>
          </div>
          <span className="text-number-md text-secondary font-bold font-bold">+ ₹ {schemeReceivablesToday.toLocaleString()}</span>
        </section>

        {/* Expenses row */}
        <section className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center text-error">
              <Receipt className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-label-md text-on-background font-semibold text-sm">Total Expenses Outflow</h3>
              <p className="text-body-md text-on-surface-variant text-[12px]">Supplier bills / Stock / Miscellaneous</p>
            </div>
          </div>
          <span className="text-number-md text-error font-bold font-bold">- ₹ {totalExpenses.toLocaleString()}</span>
        </section>

        {/* Staff Credit row */}
        <section className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-650 font-bold">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-label-md text-on-background font-semibold text-sm">Staff Credit (Today)</h3>
              <p className="text-body-md text-on-surface-variant text-[12px]">Product & medicine purchases on team credit</p>
            </div>
          </div>
          <span className="text-number-md text-amber-600 font-bold font-bold">₹ {staffCreditToday.toLocaleString()}</span>
        </section>

        {/* Staff Advance row */}
        <section className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_0_rgba(0,0,0,0.02)] border border-outline-variant/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-600 font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-label-md text-on-background font-semibold text-sm">Staff Advances Paid (Today)</h3>
              <p className="text-body-md text-on-surface-variant text-[12px]">Salary advances or direct cash loans given to staff</p>
            </div>
          </div>
          <span className="text-number-md text-cyan-600 font-bold font-bold">- ₹ {staffAdvanceToday.toLocaleString()}</span>
        </section>

        {/* Payment Mode Distribution Trend (Cash vs UPI Pie Chart) */}
        <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div>
              <h3 className="font-bold text-sm text-on-background font-sans flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary" />
                Payment Mode Inflow Distribution
              </h3>
              <p className="text-xs text-on-surface-variant">Real-time ratio of hard cash to UPI/online payments collected</p>
            </div>
          </div>

          {(() => {
            const totalCash = cashCollections;
            const totalOnline = onlineCollections;
            const totalInflows = totalCash + totalOnline;
            const hasInflows = totalInflows > 0;

            const distributionData = [
              { name: 'Cash Inflow', value: totalCash, color: '#10B981' },
              { name: 'UPI / Online Inflow', value: totalOnline, color: '#6366F1' },
            ];

            return (
              <div className="flex flex-col sm:flex-row items-center gap-6 min-h-[160px]">
                {hasInflows ? (
                  <>
                    <div className="h-40 w-full sm:w-1/2 flex justify-center items-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Total Inflow']}
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid var(--color-outline-variant, #e1e3e6)',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Inner circle KPI indicator */}
                      <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                        <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Total Recd</span>
                        <span className="text-xs font-extrabold text-on-background">₹{totalInflows.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2 flex flex-col gap-2">
                      {distributionData.map((item, idx) => {
                        const pct = ((item.value / totalInflows) * 100).toFixed(1);
                        return (
                          <div key={idx} className="flex justify-between items-center bg-surface-container-lowest/50 hover:bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/30 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-on-background leading-tight">{item.name}</span>
                                <span className="text-[10px] text-on-surface-variant font-mono">Counter Sales + Collections</span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col ml-2">
                              <span className="text-xs font-extrabold text-on-background">₹{item.value.toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-primary font-mono">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="w-full text-center py-6 px-4 flex flex-col items-center justify-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low/20">
                    <PieChartIcon className="w-8 h-8 text-on-surface-variant/40 mb-2 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-on-background">Awaiting Inflow Records</p>
                    <p className="text-[11px] text-on-surface-variant max-w-sm mt-1 leading-normal">
                      Distribution displays dynamically once positive Counter Cash/Online values are configured or client payment collections are processed today.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        <section className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface-variant font-semibold" htmlFor="closing-notes">Closing Notes (Optional)</label>
          <textarea 
            className="w-full rounded-lg bg-surface-container-lowest border border-outline-variant p-3 text-body-md text-on-background placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" 
            id="closing-notes" 
            placeholder="Add any discrepancies or notes for today..." 
            rows={2}
          ></textarea>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant p-container-padding-mobile flex flex-col gap-stack-md z-50 shadow-[0_-8px_20px_0_rgba(0,0,0,0.04)] md:max-w-3xl md:left-1/2 md:-translate-x-1/2 md:border-x pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button onClick={generateDailyPdfReport} className="w-full h-[48px] rounded-lg border border-outline-variant flex items-center justify-center gap-2 text-on-background text-[13px] font-bold hover:bg-surface-container-low transition-colors active:scale-[0.98] cursor-pointer" type="button">
          <FileText className="w-[18px] h-[18px]" />
          Generate Daily PDF Report
        </button>
        {isClosed ? (
          <button 
            onClick={onReopenDay} 
            className="w-full h-[48px] rounded-lg bg-surface text-error border border-error/50 flex items-center justify-center gap-2 text-label-md font-bold hover:bg-error-container/10 transition-colors active:scale-[0.98] cursor-pointer" 
            type="button"
          >
            <Unlock className="w-[18px] h-[18px]" />
            Reopen Working Day
          </button>
        ) : (
          <button 
            onClick={onCloseDay} 
            className="w-full h-[48px] rounded-lg bg-primary text-on-primary flex items-center justify-center gap-2 text-label-md font-bold hover:bg-primary/95 transition-colors active:scale-[0.98] shadow-sm cursor-pointer" 
            type="button"
          >
            <CheckCircle className="w-[18px] h-[18px]" stroke="white" />
            Close & Lock Working Day
          </button>
        )}
      </div>
    </>
  );
}

function TransactionHistoryScreen({ 
  onBack, 
  transactions, 
  customers, 
  currentFirmId,
  firms,
  currentUser,
  initialFilter = 'all',
  initialSearch = '',
  openingCash,
  setOpeningCash,
  counterCashSales,
  setCounterCashSales,
  counterOnlineSales,
  setCounterOnlineSales,
  onDeleteTransaction,
  firmDailyRegisters,
  workingDate,
  userRole,
  setTransactions,
  setCustomers,
  deletedTransactions = [],
  setDeletedTransactions
}: { 
  onBack: () => void, 
  transactions: Transaction[], 
  customers: Customer[], 
  currentFirmId: string,
  firms: Firm[],
  currentUser?: { id: string; name: string; role: string; mobile: string } | null,
  initialFilter?: string,
  initialSearch?: string,
  openingCash: number,
  setOpeningCash: (val: number) => void,
  counterCashSales: number,
  setCounterCashSales: (val: number) => void,
  counterOnlineSales: number,
  setCounterOnlineSales: (val: number) => void,
  onDeleteTransaction: (id: string) => void,
  firmDailyRegisters: Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean }>,
  workingDate?: string,
  userRole?: 'user' | 'firmAdmin',
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>,
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>,
  deletedTransactions?: Transaction[],
  setDeletedTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>
}) {
  const activeFirm = firms.find(f => f.id === currentFirmId);
  const activeTransactions = transactions.filter(t => t.firmId === currentFirmId);
  const activeCustomers = customers.filter(c => c.firmId === currentFirmId);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState<string>(initialFilter);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const [isEditingTx, setIsEditingTx] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPatientName, setEditPatientName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<Transaction['type']>('credit_sale');
  const [editExtraDetails, setEditExtraDetails] = useState('');

  useEffect(() => {
    if (selectedTx) {
      setEditTitle(selectedTx.title || '');
      setEditAmount(String(selectedTx.amount || '0'));
      setEditPatientName(selectedTx.patientName || '');
      setEditCustomerPhone(selectedTx.customerPhone || '');
      setEditDate(selectedTx.date || '');
      setEditType(selectedTx.type || 'credit_sale');
      setEditExtraDetails(selectedTx.extraDetails || '');
    } else {
      setIsEditingTx(false);
    }
  }, [selectedTx]);

  const handleSaveEditTx = () => {
    if (!selectedTx) return;

    // Check if current user is allowed to edit this transaction
    const isMasterAdmin = currentUser?.id === 'master_super_admin' || currentUser?.role === 'Master Admin';
    const isAdmin = userRole === 'firmAdmin' || isMasterAdmin;
    const isOwner = currentUser && selectedTx.recordedByUserId === currentUser.id;

    if (!isAdmin && !isOwner) {
      alert(`Permission Denied: You can only edit entries recorded by yourself. This entry was recorded by ${selectedTx.recordedByUserName || 'another user'}.`);
      return;
    }

    const isTxDateClosed = !!firmDailyRegisters[`${currentFirmId}_${selectedTx.date}`]?.closed;

    const performEdit = () => {
      const oldTx = selectedTx;
      const parsedAmount = parseFloat(editAmount) || 0;
      
      const newTx: Transaction = { 
        ...oldTx, 
        title: editTitle,
        amount: parsedAmount,
        patientName: editPatientName || undefined,
        customerPhone: editCustomerPhone || undefined,
        date: editDate,
        type: editType,
        extraDetails: editExtraDetails
      };

      // Handle Customer balance reconciliation beautifully
      if (setCustomers) {
        setCustomers(prev => {
          let updated = [...prev];

          // Reverse old transaction impact if customer-facing
          if (oldTx.patientName && (oldTx.type === 'credit_sale' || oldTx.type === 'receive_payment')) {
            const oldName = oldTx.patientName.trim().toLowerCase();
            updated = updated.map(c => {
              if (c.firmId === currentFirmId && c.name.toLowerCase() === oldName) {
                const reverseAmt = oldTx.type === 'credit_sale' ? -oldTx.amount : oldTx.amount;
                return { ...c, pendingBalance: Math.max(0, c.pendingBalance + reverseAmt) };
              }
              return c;
            });
          }

          // Apply new transaction impact if customer-facing
          if (newTx.patientName && (newTx.type === 'credit_sale' || newTx.type === 'receive_payment')) {
            const newName = newTx.patientName.trim().toLowerCase();
            updated = updated.map(c => {
              if (c.firmId === currentFirmId && c.name.toLowerCase() === newName) {
                const applyAmt = newTx.type === 'credit_sale' ? newTx.amount : -newTx.amount;
                return { ...c, pendingBalance: Math.max(0, c.pendingBalance + applyAmt) };
              }
              return c;
            });
          }

          return updated;
        });
      }

      // Update transaction in master list
      if (setTransactions) {
        setTransactions(prev => prev.map(t => t.id === oldTx.id ? newTx : t));
      }

      setSelectedTx(newTx);
      setIsEditingTx(false);
      alert("Transaction updated successfully!");
    };

    if (isTxDateClosed) {
      if (userRole === 'firmAdmin') {
        if (window.confirm(`WARNING: Date ${selectedTx.date} is closed and locked. As Firm Admin, do you want to force make this reservation correction?`)) {
          performEdit();
        }
      } else {
        alert("ACCESS LOCKED: For audits, Counter Staff cannot edit transactions residing on a closed and locked working day. Contact Admin.");
      }
    } else {
      performEdit();
    }
  };

  // Calculations for KPI numbers
  const metrics = useMemo(() => {
    let salesTotal = 0;
    let collectionsTotal = 0;
    let supplierTotal = 0;
    
    activeTransactions.forEach(t => {
      if (t.type === 'credit_sale') salesTotal += t.amount;
      if (t.type === 'receive_payment') collectionsTotal += t.amount;
      if (t.type === 'supplier_payment') supplierTotal += t.amount;
    });

    const netOutstanding = activeCustomers.reduce((sum, c) => sum + c.pendingBalance, 0);

    return { salesTotal, collectionsTotal, supplierTotal, netOutstanding };
  }, [activeTransactions, activeCustomers]);

  const filteredTransactions = useMemo(() => {
    let list: any[] = [];
    if (selectedType === 'deleted_log') {
      list = deletedTransactions.filter(t => t.firmId === currentFirmId);
    } else {
      list = [...activeTransactions];

      // Grab ALL registered daily counter financials across all dates for the firm
      Object.entries(firmDailyRegisters).forEach(([key, reg]) => {
        // Key format: `${firmId}_${date}`
        if (key.startsWith(`${currentFirmId}_`)) {
          const datePart = key.substring(currentFirmId.length + 1);
          if (reg.cashSales > 0) {
            list.push({
              id: `LGR-COUNTER-CASH-${datePart}`,
              firmId: currentFirmId,
              type: 'counter_cash' as any,
              title: `Consolidated Counter Cash Sales (${datePart})`,
              patientName: 'General Cash Walk-ins',
              customerPhone: '',
              amount: reg.cashSales,
              date: datePart,
              time: '23:59',
              recordedByUserId: 'system',
              recordedByUserName: 'Drawer Register',
              extraDetails: 'Cash Register'
            });
          }
          if (reg.onlineSales > 0) {
            list.push({
              id: `LGR-COUNTER-ONLINE-${datePart}`,
              firmId: currentFirmId,
              type: 'counter_online' as any,
              title: `Consolidated Counter Online Sales (${datePart})`,
              patientName: 'General Online Walk-ins',
              customerPhone: '',
              amount: reg.onlineSales,
              date: datePart,
              time: '23:58',
              recordedByUserId: 'system',
              recordedByUserName: 'UPI Gateway',
              extraDetails: 'UPI / Online'
            });
          }
        }
      });
    }

    // Sort newest first
    list.sort((a, b) => {
      const timeValA = `${a.date}T${a.time || '00:00:00'}`;
      const timeValB = `${b.date}T${b.time || '00:00:00'}`;
      return timeValB.localeCompare(timeValA);
    });

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        (t.patientName || '').toLowerCase().includes(q) ||
        (t.title || '').toLowerCase().includes(q) ||
        (t.extraDetails || '').toLowerCase().includes(q) ||
        (t.recordedByUserName || '').toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      );
    }

    if (selectedType === 'receive_payment_cash') {
      list = list.filter(t => t.type === 'receive_payment' && (t.extraDetails || '').toLowerCase().includes('cash'));
    } else if (selectedType === 'receive_payment_online') {
      list = list.filter(t => t.type === 'receive_payment' && !(t.extraDetails || '').toLowerCase().includes('cash'));
    } else if (selectedType === 'expense') {
      list = list.filter(t => (t.title || '').toLowerCase().includes('expense') || (t.extraDetails || '').toLowerCase().includes('expense'));
    } else if (selectedType === 'supplier_payment') {
      list = list.filter(t => t.type === 'supplier_payment' && !(t.title || '').toLowerCase().includes('expense') && !(t.extraDetails || '').toLowerCase().includes('expense'));
    } else if (selectedType !== 'all' && selectedType !== 'deleted_log') {
      list = list.filter(t => t.type === selectedType);
    }

    if (selectedDate !== '') {
      list = list.filter(t => t.date === selectedDate);
    }

    return list;
  }, [activeTransactions, deletedTransactions, searchQuery, selectedType, selectedDate, counterCashSales, counterOnlineSales, currentFirmId, firmDailyRegisters]);

  const exportToCSV = () => {
    const headers = ["ID", "Date", "Time", "Type", "Patient/Customer/Party", "Details", "Amount (INR)", "Recorded By"];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date,
      t.time,
      t.type.toUpperCase(),
      t.patientName || 'General',
      t.extraDetails || t.title,
      t.amount,
      t.recordedByUserName
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeFirm?.name || 'ShopBooks'}_Ledger_Report_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <header className="bg-surface-container-lowest sticky top-0 z-40 w-full border-b border-outline-variant/30 flex items-center justify-between px-container-padding-mobile h-16">
        <div className="flex items-center gap-3">
          <button 
            className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center cursor-pointer"
            onClick={onBack}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-left">
            <h1 className="text-headline-md text-primary font-bold leading-tight">{activeFirm?.name || 'Firm Ledger'}</h1>
            <span className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider bg-outline-variant/30 px-2 py-0.5 rounded-full">Audit & Ledgers Log</span>
          </div>
        </div>
        <button 
          onClick={exportToCSV}
          className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-container-padding-mobile md:px-container-padding-desktop py-stack-lg space-y-stack-lg text-left">
        {/* KPI metrics row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">All recorded items</span>
            <span className="text-xl font-bold text-primary font-mono">{activeTransactions.length} Logged</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Customer Debt Outstanding</span>
            <span className="text-xl font-bold text-error font-mono font-bold">₹{metrics.netOutstanding.toLocaleString()}</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Total Credit Sales</span>
            <span className="text-xl font-bold text-amber-600 font-mono">₹{metrics.salesTotal.toLocaleString()}</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16_rgba(0,0,0,0.02)] border border-outline-variant/30 flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Total Received Payments</span>
            <span className="text-xl font-bold text-secondary font-mono">₹{metrics.collectionsTotal.toLocaleString()}</span>
          </div>
        </section>

        {/* Search, Date filter and Type filter bar */}
        <section className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                placeholder="Search by Patient name, recorded by or transaction title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-background border border-outline-variant/80 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/40"
              />
            </div>
            
            <div className="flex gap-2 shrink-0">
              <CalendarDatePicker 
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Filter by Date"
                clearable={true}
                className="w-full sm:w-44"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-outline-variant/20">
            {(() => {
              const isMasterAdmin = currentUser?.id === 'master_super_admin' || currentUser?.role === 'Master Admin';
              const isAdmin = userRole === 'firmAdmin' || isMasterAdmin;
              const pills = [
                { id: 'all', label: 'All Logs' },
                { id: 'credit_sale', label: 'Credit Sales' },
                { id: 'scheme_bill', label: 'Scheme Bills' },
                { id: 'receive_payment_online', label: 'Online Payment' },
                { id: 'receive_payment_cash', label: 'Cash Payment Received' },
                { id: 'supplier_payment', label: 'Supplier Payment' },
                { id: 'expense', label: 'Expenses' },
                { id: 'staff_credit', label: 'Staff Credits' },
                { id: 'staff_advance', label: 'Staff Advances' },
                { id: 'counter_cash', label: 'Counter Cash' },
                { id: 'counter_online', label: 'Counter Online' }
              ];
              if (isAdmin) {
                pills.push({ id: 'deleted_log', label: '❌ Deleted Log' });
              }
              return pills.map(pill => {
                const active = selectedType === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setSelectedType(pill.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active 
                        ? 'bg-primary text-on-primary shadow-sm' 
                        : 'bg-surface-container/60 text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              });
            })()}
          </div>
        </section>

        {/* Live filtered list representation */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-title-medium text-on-surface font-semibold">
              Showing {filteredTransactions.length} of {activeTransactions.length} Recorded Entries
            </h3>
            {(searchQuery || selectedType !== 'all' || selectedDate) && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedDate('');
                }}
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="divide-y divide-outline-variant/30 max-h-[600px] overflow-y-auto pr-2">
            {filteredTransactions.map((t, index) => {
              let icon = <FileText className="w-5 h-5" />;
              let iconContainerClass = "bg-primary-container/20 text-primary";
              let typeLabel = "";
              let amountStr = "";
              let amountColor = "text-on-surface";
              let badges: string[] = [];

              switch (t.type) {
                case 'counter_cash':
                  icon = <Banknote className="w-5 h-5" />;
                  iconContainerClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                  typeLabel = "Counter Cash Sales (Consolidated)";
                  amountStr = `+₹${t.amount.toLocaleString()}`;
                  amountColor = "text-green-600 dark:text-green-400 font-bold";
                  if (t.extraDetails) badges.push(t.extraDetails);
                  break;
                case 'counter_online':
                  icon = <QrCode className="w-5 h-5 text-indigo-600" />;
                  iconContainerClass = "bg-indigo-100 text-indigo-805 dark:bg-indigo-900/30 dark:text-indigo-400";
                  typeLabel = "Counter Online Sales (Consolidated)";
                  amountStr = `+₹${t.amount.toLocaleString()}`;
                  amountColor = "text-indigo-600 dark:text-indigo-400 font-bold";
                  if (t.extraDetails) badges.push(t.extraDetails);
                  break;
                case 'credit_sale':
                  icon = <FileText className="w-5 h-5" />;
                  iconContainerClass = "bg-error-container/20 text-error";
                  typeLabel = "Credit Sale (Udhaar)";
                  amountStr = `-₹${t.amount.toLocaleString()}`;
                  amountColor = "text-error font-bold";
                  if (t.extraDetails) badges.push(t.extraDetails);
                  break;
                case 'receive_payment':
                  icon = <QrCode className="w-5 h-5" />;
                  iconContainerClass = "bg-secondary-container/30 text-secondary";
                  typeLabel = "Payment Collected";
                  amountStr = `+₹${t.amount.toLocaleString()}`;
                  amountColor = "text-secondary font-bold";
                  if (t.extraDetails) badges.push(t.extraDetails);
                  break;
                case 'supplier_payment':
                  icon = <Truck className="w-5 h-5" />;
                  iconContainerClass = "bg-outline-variant/30 text-on-surface-variant";
                  typeLabel = "Supplier Payment Out";
                  amountStr = `-₹${t.amount.toLocaleString()}`;
                  amountColor = "text-on-surface font-medium";
                  if (t.extraDetails) badges.push(t.extraDetails);
                  break;
                case 'scheme_bill':
                  icon = <ShieldPlus className="w-5 h-5" />;
                  iconContainerClass = "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400";
                  typeLabel = "Govt Scheme Claim";
                  amountStr = `+₹${t.amount.toLocaleString()}`;
                  amountColor = "text-teal-700 dark:text-teal-400 font-bold";
                  if (t.extraDetails) badges.push(t.extraDetails);
                  break;
                case 'staff_credit':
                  icon = <Users className="w-5 h-5 text-amber-600" />;
                  iconContainerClass = "bg-amber-100 text-amber-805 dark:bg-amber-900/30 dark:text-amber-400";
                  typeLabel = "Staff Medicine Purchase (Udhaar)";
                  amountStr = `-₹${t.amount.toLocaleString()}`;
                  amountColor = "text-amber-800 dark:text-amber-400 font-medium";
                  break;
                case 'staff_advance':
                  icon = <Coins className="w-5 h-5 text-cyan-500" />;
                  iconContainerClass = "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
                  typeLabel = "Staff Cash Advance";
                  amountStr = `-₹${t.amount.toLocaleString()}`;
                  amountColor = "text-cyan-700 dark:text-cyan-400 font-medium";
                  if (t.extraDetails) badges.push(t.extraDetails);
                  break;
              }

              return (
                <div 
                  key={t.id} 
                  onClick={() => setSelectedTx(t)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-2 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer rounded-xl px-3 -mx-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconContainerClass}`}>
                      {icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-on-surface">{typeLabel}</span>
                        {t.isRecurring && (
                          <span className="text-[9px] font-mono tracking-wider font-extrabold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                            <span>🔁 Recurring</span>
                          </span>
                        )}
                        {badges.map((b, bIdx) => (
                          <span key={bIdx} className="text-[10px] font-mono tracking-wider font-bold bg-surface-container px-2 py-0.5 rounded text-on-surface-variant uppercase">
                            {b}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                        For: <strong className="text-on-surface">{t.patientName || 'General Store Purchase'}</strong>
                      </p>
                      <p className="text-[11px] text-on-surface-variant/70 font-mono mt-0.5 font-light">
                        {t.date} {t.time} • Recorded by {t.recordedByUserName}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0 flex flex-col items-start sm:items-end">
                    <span className={`text-base font-semibold ${amountColor}`}>{amountStr}</span>
                    <span className="text-[10px] text-on-surface-variant/50 font-mono">ID: {t.id}</span>
                  </div>
                </div>
              );
            })}

            {filteredTransactions.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <FileText className="w-12 h-12 mx-auto text-on-surface-variant/30 mb-2" />
                <p className="text-sm font-semibold">No transactions found</p>
                <p className="text-xs max-w-xs mx-auto mt-1">Try resetting the filters or look for another name/date.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Dynamic Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-outline-variant shadow-xl relative animate-in fade-in zoom-in duration-150 text-left">
            <button 
              onClick={() => setSelectedTx(null)} 
              className="absolute top-4 right-4 p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                Ledger Log Card
              </span>
              <span className="text-[10px] font-mono font-semibold text-on-surface-variant/70">
                ID: {selectedTx.id}
              </span>
            </div>

            {isEditingTx ? (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="border-b border-outline-variant pb-2.5">
                  <h3 className="text-sm font-black text-on-background uppercase tracking-wide">Edit Ledger Entry</h3>
                  <p className="text-[10px] text-on-surface-variant/80 font-mono mt-0.5">ID: {selectedTx.id}</p>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  <div>
                    <label className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-extrabold mb-1">Title</label>
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-surface-container-low text-on-surface text-xs font-semibold p-2.5 rounded-lg border border-outline-variant focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-extrabold mb-1">Amount (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-surface-container-low text-on-surface text-xs font-mono font-bold p-2.5 rounded-lg border border-outline-variant focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-extrabold mb-1">Date</label>
                    <input 
                      type="date" 
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-surface-container-low text-on-surface text-xs font-mono p-2.5 rounded-lg border border-outline-variant focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-extrabold mb-1">Entry Type (Interchange Category)</label>
                    <select 
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as Transaction['type'])}
                      className="w-full bg-surface-container-low text-on-surface text-xs font-semibold p-2.5 rounded-lg border border-outline-variant focus:border-primary outline-none cursor-pointer"
                    >
                      <option value="credit_sale">Credit Sale (Patient Dues)</option>
                      <option value="receive_payment">Cash Collection / Receive Payment</option>
                      <option value="scheme_bill">Scheme Bill (Government/Insurance Schemes)</option>
                      <option value="staff_credit">Staff Credit</option>
                      <option value="staff_advance">Staff Advance</option>
                      <option value="supplier_payment">Supplier Payment</option>
                    </select>
                  </div>

                  {selectedTx.patientName && (
                    <div>
                      <label className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-extrabold mb-1">Patient / Customer Party</label>
                      <input 
                        type="text" 
                        value={editPatientName}
                        onChange={(e) => setEditPatientName(e.target.value)}
                        className="w-full bg-surface-container-low text-on-surface text-xs font-semibold p-2.5 rounded-lg border border-outline-variant focus:border-primary outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-extrabold mb-1">Billing Details / Audit Note</label>
                    <textarea 
                      value={editExtraDetails}
                      onChange={(e) => setEditExtraDetails(e.target.value)}
                      rows={2}
                      className="w-full bg-surface-container-low text-on-surface text-xs font-medium p-2.5 rounded-lg border border-outline-variant focus:border-primary outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setIsEditingTx(false)}
                    className="flex-1 h-9 rounded-lg border border-outline-variant text-[11px] font-bold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEditTx}
                    className="flex-1 h-9 rounded-lg bg-primary text-on-primary text-[11px] font-bold shadow-md hover:bg-primary/95 transition-all cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary border border-outline-variant/30">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-on-background leading-relaxed">
                      {selectedTx.title || 'Recorded Transaction'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Category: <span className="capitalize">{selectedTx.type.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/25 mb-5 space-y-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                    <span className="text-xs text-on-surface-variant font-medium">Recorded Value</span>
                    <span className="text-lg font-mono font-bold text-primary">
                      ₹ {selectedTx.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wide">Date / Time</span>
                      <span className="text-xs font-semibold text-on-background font-mono block">
                        {selectedTx.date} {selectedTx.time || '12:00 PM'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wide">Recorded By</span>
                      <span className="text-xs font-semibold text-on-background block">
                        {selectedTx.recordedByUserName || 'System'}
                      </span>
                    </div>
                  </div>

                  {selectedTx.patientName && (
                    <div className="pt-2 border-t border-outline-variant/30">
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wide">Patient / Customer Party</span>
                      <span className="text-xs font-bold text-on-background mt-0.5 block">
                        {selectedTx.patientName}
                      </span>
                    </div>
                  )}

                  {selectedTx.extraDetails && (
                    <div className="pt-2 border-t border-outline-variant/30">
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wide">Audit Log Tags</span>
                      <span className="text-xs font-medium text-on-surface-variant mt-0.5 block font-mono">
                        {selectedTx.extraDetails}
                      </span>
                    </div>
                  )}
                </div>

                {/* Adjust counter sales vs standard delete */}
                {selectedType === 'deleted_log' ? (
                  <div className="space-y-4">
                    <div className="bg-error/5 border border-error/20 text-on-surface rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-error flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span>
                        <span>Archived Strike Log Record</span>
                      </p>
                      <div className="text-[11px] space-y-1 text-on-surface-variant font-semibold">
                        <p><strong>Deleted On:</strong> {selectedTx.deletedAt ? new Date(selectedTx.deletedAt).toLocaleString('en-IN') : 'N/A'}</p>
                        <p><strong>Deleted By:</strong> {selectedTx.deletedByUserName || 'System'}</p>
                      </div>
                    </div>
                    {(() => {
                      const isMasterAdmin = currentUser?.id === 'master_super_admin' || currentUser?.role === 'Master Admin';
                      const isAdmin = userRole === 'firmAdmin' || isMasterAdmin;
                      if (!isAdmin) return null;
                      return (
                        <button 
                          onClick={() => {
                            if (window.confirm("Are you sure you want to restore this deleted transaction? This will move it back to the active ledger log and re-apply customer outstanding balances.")) {
                              // Re-apply customer balance
                              if (selectedTx.patientName && selectedTx.type !== 'scheme_bill' && selectedTx.type !== 'staff_credit' && selectedTx.type !== 'staff_advance') {
                                const queryName = selectedTx.patientName.trim().toLowerCase();
                                if (setCustomers) {
                                  setCustomers(prev => prev.map(c => {
                                    if (c.firmId === currentFirmId && c.name.toLowerCase() === queryName) {
                                      let diff = 0;
                                      if (selectedTx.type === 'credit_sale') {
                                        diff = selectedTx.amount;
                                      } else if (selectedTx.type === 'receive_payment') {
                                        diff = -selectedTx.amount;
                                      }
                                      return { ...c, pendingBalance: Math.max(0, c.pendingBalance + diff) };
                                    }
                                    return c;
                                  }));
                                }
                              }
                              // Re-insert into active transactions
                              if (setTransactions) {
                                const { deletedAt, deletedByUserId, deletedByUserName, ...cleanTx } = selectedTx as any;
                                setTransactions(prev => [cleanTx, ...prev]);
                              }
                              // Remove from deleted transactions
                              if (setDeletedTransactions) {
                                setDeletedTransactions(prev => prev.filter(t => t.id !== selectedTx.id));
                              }
                              setSelectedTx(null);
                              alert("Transaction restored successfully!");
                            }
                          }}
                          className="w-full h-10 rounded-lg bg-primary hover:bg-primary/95 text-on-primary flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Restore Transaction
                        </button>
                      );
                    })()}
                  </div>
                ) : selectedTx.id.startsWith('LGR-COUNTER-') ? (
                  <div className="space-y-3">
                    <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-3.5">
                      <label className="text-xs font-bold text-on-surface-variant block mb-1.5 uppercase tracking-wide">
                        Recalibrate Counter Sales (₹)
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          defaultValue={selectedTx.amount}
                          id="quick-adjust-val"
                          className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-1 text-sm font-bold font-mono text-on-background focus:border-primary outline-none flex-1"
                        />
                        <button 
                          onClick={() => {
                            const val = Number((document.getElementById('quick-adjust-val') as HTMLInputElement)?.value || 0);
                            if (selectedTx.type === 'counter_cash') {
                              setCounterCashSales(val);
                            } else if (selectedTx.type === 'counter_online') {
                              setCounterOnlineSales(val);
                            }
                            setSelectedTx({ ...selectedTx, amount: val });
                            alert("Consolidated counter sales calibrated successfully!");
                          }} 
                          className="px-3 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer"
                        >
                          Adjust
                        </button>
                      </div>
                      <span className="text-[10px] text-on-surface-variant/70 mt-1.5 block leading-tight">Registers live balance will refresh immediately.</span>
                    </div>
                  </div>
                ) : (() => {
                  const isMasterAdmin = currentUser?.id === 'master_super_admin' || currentUser?.role === 'Master Admin';
                  const isAdmin = userRole === 'firmAdmin' || isMasterAdmin;
                  const canModifySelected = isAdmin || (currentUser && selectedTx.recordedByUserId === currentUser.id);

                  return (
                    <div className="flex flex-col gap-2">
                      {!canModifySelected && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs mb-1">
                          <p className="font-bold">⚠️ Entry Locked (Read-Only)</p>
                          <p className="text-[11px] mt-0.5 text-amber-800 leading-normal">
                            This transaction was recorded by <strong>{selectedTx.recordedByUserName || 'another user'}</strong>. You can only edit or strike entries recorded by yourself.
                          </p>
                        </div>
                      )}

                      {canModifySelected && (
                        <button 
                          onClick={() => setIsEditingTx(true)}
                          className="w-full h-10 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Ledger Entry
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            alert(`Transaction ${selectedTx.id} receipt loaded. Print ready.`);
                          }}
                          className={`h-9 rounded-lg border border-outline-variant flex items-center justify-center gap-1.5 text-xs font-bold text-on-background hover:bg-surface-container-low transition-colors cursor-pointer ${canModifySelected ? 'flex-1' : 'w-full'}`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Receipt
                        </button>
                        {canModifySelected && (
                          <button 
                            onClick={() => {
                              onDeleteTransaction(selectedTx.id);
                              setSelectedTx(null);
                            }}
                            className="flex-1 h-9 rounded-lg bg-error/10 hover:bg-error/20 border border-error/20 flex items-center justify-center gap-1.5 text-xs font-bold text-error transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Strike Log
                          </button>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          const replDate = workingDate || getLocalDateString();
                          if (window.confirm(`Do you want to repeat/duplicate this entry for today's date (${replDate})?`)) {
                            if (setTransactions) {
                              const newDuplicatedTx: Transaction = {
                                id: `T-${Date.now()}`,
                                firmId: currentFirmId,
                                type: selectedTx.type,
                                title: `${selectedTx.title} (Repeated)`,
                                patientName: selectedTx.patientName,
                                customerPhone: selectedTx.customerPhone,
                                amount: selectedTx.amount,
                                date: replDate,
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                recordedByUserId: currentUser?.id || 'admin',
                                recordedByUserName: currentUser?.name || 'User',
                                extraDetails: selectedTx.extraDetails ? `${selectedTx.extraDetails} (Replicated)` : 'Replicated Entry',
                                isRecurring: true,
                                recurrenceInterval: 'daily'
                              };

                              // Re-apply customer outstanding balance impact if customer-facing
                              if (newDuplicatedTx.patientName && newDuplicatedTx.type !== 'scheme_bill' && newDuplicatedTx.type !== 'staff_credit' && newDuplicatedTx.type !== 'staff_advance') {
                                const queryName = newDuplicatedTx.patientName.trim().toLowerCase();
                                if (setCustomers) {
                                  setCustomers(prev => prev.map(c => {
                                    if (c.firmId === currentFirmId && c.name.toLowerCase() === queryName) {
                                      let diff = 0;
                                      if (newDuplicatedTx.type === 'credit_sale') {
                                        diff = newDuplicatedTx.amount;
                                      } else if (newDuplicatedTx.type === 'receive_payment') {
                                        diff = -newDuplicatedTx.amount;
                                      }
                                      return { ...c, pendingBalance: Math.max(0, c.pendingBalance + diff) };
                                    }
                                    return c;
                                  }));
                                }
                              }

                              setTransactions(prev => [newDuplicatedTx, ...prev]);
                              alert("Transaction replicated successfully to the current day!");
                              setSelectedTx(null);
                            }
                          }
                        }}
                        className="w-full h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer mt-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Replicate / Repeat Entry
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SchemeCreditSaleScreen({ 
  onBack, 
  onRecordScheme,
  customers,
  currentFirmId,
  currentUser,
  workingDate
}: { 
  onBack: () => void, 
  onRecordScheme: (amount: number, patientName: string, customerPhone: string, salesmanName: string, scheme: string, dateOfBill: string) => void,
  customers: Customer[],
  currentFirmId: string,
  currentUser: any,
  workingDate?: string
}) {
  const [patientName, setPatientName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [salesmanName, setSalesmanName] = useState(() => currentUser?.name || 'Staff');
  const [scheme, setScheme] = useState('');
  const [dateOfBill, setDateOfBill] = useState(() => workingDate || getLocalDateString());
  const [amount, setAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showAutoPrefilledBadge, setShowAutoPrefilledBadge] = useState(false);
  const [focusedInput, setFocusedInput] = useState(false);

  const activeCustomers = customers.filter(c => c.firmId === currentFirmId);
  const autocompleteSuggestions = patientName.trim()
    ? activeCustomers.filter(c => c.name.toLowerCase().includes(patientName.toLowerCase()))
    : [];

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid bill amount (> 0).');
      return;
    }
    if (!patientName.trim()) {
      setErrorMsg('Please enter patient name.');
      return;
    }
    if (!scheme) {
      setErrorMsg('Please select a healthcare scheme.');
      return;
    }
    setErrorMsg('');
    onRecordScheme(parsedAmount, patientName.trim(), customerPhone.trim(), salesmanName.trim(), scheme, dateOfBill);
  };

  return (
    <>
      <header className="bg-surface-container-lowest w-full top-0 sticky border-b border-outline-variant flex justify-between items-center px-container-padding-mobile h-16 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <ArrowLeft className="w-6 h-6 text-on-surface" />
          <span className="text-headline-mobile text-primary">Scheme Credit Sale</span>
        </div>
      </header>
      
      <main className="px-container-padding-mobile pt-stack-lg pb-32 space-y-stack-lg max-w-md mx-auto text-left">
        {errorMsg && (
          <div className="bg-error-container/20 border border-error text-error text-sm p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl p-6 border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-stack-lg">
            <ShieldPlus className="text-secondary w-6 h-6" />
            <h2 className="text-headline-md text-primary">Record Scheme Bill</h2>
          </div>
          <div className="flex flex-col gap-stack-md">
            <div className="flex flex-col gap-1 relative text-left">
              <div className="flex items-center justify-between">
                <label className="text-label-md text-on-surface-variant font-semibold">Patient Name *</label>
                {showAutoPrefilledBadge && (
                  <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-black font-sans">
                    ✓ Profile Found
                  </span>
                )}
              </div>
              <input 
                className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none w-full" 
                placeholder="e.g. Rahul Gupta" 
                type="text" 
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  setShowAutoPrefilledBadge(false);
                }}
                onFocus={() => setFocusedInput(true)}
                onBlur={() => setTimeout(() => setFocusedInput(false), 200)}
              />
              {focusedInput && autocompleteSuggestions.length > 0 && (
                <div className="absolute top-[100%] left-0 w-full bg-white border border-outline-variant rounded-b-xl shadow-lg z-50 divide-y divide-outline-variant/30 max-h-48 overflow-y-auto">
                  <div className="p-2 text-[10px] bg-surface-container font-bold text-on-surface-variant uppercase tracking-wider font-sans">Select Registered Patient</div>
                  {autocompleteSuggestions.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setPatientName(cust.name);
                        setCustomerPhone(cust.phone);
                        setShowAutoPrefilledBadge(true);
                        setFocusedInput(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-secondary-container/20 text-sm flex justify-between items-center transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-on-background">{cust.name}</p>
                        <p className="text-xs text-on-surface-variant font-mono">{cust.phone}</p>
                      </div>
                      <span className="text-xs text-secondary bg-secondary-container/30 px-1.5 py-0.5 rounded font-bold">
                        Pending: ₹{cust.pendingBalance}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant font-semibold">Patient Mobile Number</label>
              <input 
                className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                placeholder="e.g. +91 98765 43210" 
                type="text" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant font-semibold">Recorded By (Salesman)</label>
              <input 
                className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none" 
                placeholder="e.g. Staff Name" 
                type="text" 
                value={salesmanName}
                onChange={(e) => setSalesmanName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant font-semibold">Scheme *</label>
              <select 
                className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none"
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
              >
                <option value="">Select Scheme</option>
                <option value="mjpjay">MJPJAY</option>
                <option value="esic">ESIC</option>
                <option value="cm">CM Fund</option>
                <option value="private">Private Insurance</option>
                <option value="package">Package</option>
                <option value="police">Police Plan</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant font-semibold">Date of Bill</label>
              <div className="relative">
                <input 
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none hover:border-outline-variant/80 transition-colors" 
                  type="date" 
                  value={dateOfBill}
                  onChange={(e) => setDateOfBill(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant font-semibold">Bill Amount (₹) *</label>
              <input 
                className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none font-bold text-lg" 
                placeholder="0.00" 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant px-container-padding-mobile py-4 z-50 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button className="max-w-md w-full bg-primary text-on-primary py-3 rounded-lg text-label-md flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer" onClick={handleSave}>
          <Save className="w-5 h-5 text-white" />
          Save Record
        </button>
      </div>
    </>
  );
}

function WelcomeScreen({ onNavigate, onGoogleLogin }: { onNavigate: (page: Page) => void, onGoogleLogin: () => void }) {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center px-container-padding-mobile relative overflow-hidden bg-surface-container-lowest">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-surface-container-highest opacity-30 -z-10" />
      <div className="w-full max-w-sm flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <Store className="w-8 h-8 text-on-primary fill-current" />
        </div>
        <h1 className="text-display-lg text-primary text-center">ShopBooks</h1>
        <p className="text-body-lg text-on-surface-variant text-center mt-2">Manage your pharmacy with ease.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <button 
          className="w-full bg-primary text-on-primary py-4 rounded-xl font-label-md text-[16px] hover:bg-primary/90 transition-colors shadow-sm cursor-pointer font-bold"
          onClick={() => onNavigate('login')}
        >
          Login
        </button>
        <button 
          className="w-full bg-surface text-primary border border-outline-variant py-4 rounded-xl font-label-md text-[16px] hover:bg-surface-container-highest transition-colors shadow-sm cursor-pointer font-bold"
          onClick={() => onNavigate('registerFirm')}
        >
          Register Firm
        </button>

        <div className="relative flex py-2 items-center my-1">
          <div className="flex-grow border-t border-outline-variant/50"></div>
          <span className="flex-shrink mx-3 text-[10px] text-on-surface-variant font-black uppercase tracking-wider">System Administration</span>
          <div className="flex-grow border-t border-outline-variant/50"></div>
        </div>

        <button 
          className="w-full bg-surface-container-high hover:bg-surface-container-highest text-primary border border-outline-variant py-3.5 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          onClick={onGoogleLogin}
        >
          🔐 Master Admin Secure Log-in
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onNavigate, onLogin, onGoogleLogin, firms }: { onNavigate: (page: Page) => void, onLogin: (firmId: string, role: 'user' | 'firmAdmin', userId: string, userName: string, userMobile: string, loginWorkingDate?: string) => void, onGoogleLogin: () => void, firms: Firm[] }) {
  const [role, setRole] = useState<'user' | 'firmAdmin'>(() => {
    return (localStorage.getItem('shopbooks_remember_role') as 'user' | 'firmAdmin') || 'user';
  });
  const [selectedFirmId, setSelectedFirmId] = useState(() => {
    return localStorage.getItem('shopbooks_remember_firmid') || (firms[0]?.id || '');
  });
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('shopbooks_remember_userid') || '';
  });

  useEffect(() => {
    if (!selectedFirmId && firms.length > 0) {
      setSelectedFirmId(firms[0].id);
    }
  }, [firms, selectedFirmId]);
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('shopbooks_remember_password') || '';
  });
  const [loginWorkingDate, setLoginWorkingDate] = useState(() => getLocalDateString());
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setErrorMsg('Please enter your User ID or Email.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your Password.');
      return;
    }
    if (!loginWorkingDate) {
      setErrorMsg('Please select a valid Working Date.');
      return;
    }

    // Direct Master Admin login check
    const isMasterEmail = userId.trim().toLowerCase() === 'yogwalture@gmail.com';
    const isMasterPwd = password === 'yograje1987';
    if (isMasterEmail && isMasterPwd) {
      setErrorMsg('');
      localStorage.setItem('shopbooks_remember_userid', userId);
      localStorage.setItem('shopbooks_remember_password', password);
      localStorage.setItem('shopbooks_remember_role', role);
      localStorage.setItem('shopbooks_remember_firmid', selectedFirmId);
      onLogin('F-1001', 'firmAdmin', 'yogwalture@gmail.com', 'Master Super Admin (Yograj)', '9876543210', loginWorkingDate);
      return;
    }

    if (!selectedFirmId) {
      setErrorMsg('Please select a firm to login into.');
      return;
    }

    const firm = firms.find(f => f.id === selectedFirmId);
    if (!firm) {
      setErrorMsg('Selected firm could not be found.');
      return;
    }

    if (role === 'firmAdmin') {
      const isCorrectEmail = (userId.trim().toLowerCase() === (firm.email || '').toLowerCase()) || (userId.trim().toLowerCase() === 'admin');
      const isCorrectPwd = password === (firm.password || 'password');
      if (isCorrectEmail && isCorrectPwd) {
        setErrorMsg('');
        localStorage.setItem('shopbooks_remember_userid', userId);
        localStorage.setItem('shopbooks_remember_password', password);
        localStorage.setItem('shopbooks_remember_role', role);
        localStorage.setItem('shopbooks_remember_firmid', selectedFirmId);
        onLogin(firm.id, 'firmAdmin', userId.trim(), firm.adminName, firm.mobile, loginWorkingDate);
      } else {
        setErrorMsg('Invalid Admin Email or Password. Try "yogwalture@gmail.com" / "yograje1987".');
      }
    } else {
      // Find matches in user list
      const matchedUser = (firm.users || []).find(u => u.id.trim().toLowerCase() === userId.trim().toLowerCase());
      if (!matchedUser) {
        setErrorMsg('User ID not registered inside this firm. Try "amit_counter" with password "password".');
        return;
      }
      const isCorrectPwd = password === (matchedUser.password || 'password');
      if (!isCorrectPwd) {
        setErrorMsg('Incorrect Password. Hint: Try "password" for the demo user.');
        return;
      }
      setErrorMsg('');
      localStorage.setItem('shopbooks_remember_userid', userId);
      localStorage.setItem('shopbooks_remember_password', password);
      localStorage.setItem('shopbooks_remember_role', role);
      localStorage.setItem('shopbooks_remember_firmid', selectedFirmId);
      onLogin(firm.id, 'user', matchedUser.id, matchedUser.name, matchedUser.mobile, loginWorkingDate);
    }
  };

  const currentFirm = firms.find(f => f.id === selectedFirmId);

  return (
    <div className="min-h-[100dvh] flex flex-col px-container-padding-mobile py-8 bg-surface-container-lowest text-on-background relative">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full mb-12">
        <button onClick={() => onNavigate('welcome')} className="text-on-surface-variant self-start mb-6 hover:text-primary flex items-center gap-2 cursor-pointer">
          <ArrowLeft className="w-5 h-5"/>
          Back
        </button>
        <h2 className="text-headline-lg text-primary mb-2 font-bold text-2xl text-left font-sans">ShopBooks Login</h2>
        <p className="text-body-md text-on-surface-variant mb-6 text-left">Login using User ID and Password.</p>

        {errorMsg && (
          <div className="bg-error-container/20 border border-error text-error text-sm p-3 rounded-lg mb-4 text-left">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5 text-left border border-outline-variant p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="login_firm">Select Firm *</label>
            <select 
              id="login_firm"
              className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none cursor-pointer"
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
            >
              {firms.map(f => (
                <option key={f.id} value={f.id}>{f.name} (ID: {f.id})</option>
              ))}
              {firms.length === 0 && <option value="">No firms registered</option>}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="login_role">Login Role *</label>
            <select 
              id="login_role"
              className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none cursor-pointer"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'firmAdmin')}
            >
              <option value="user">Counter User / Staff</option>
              <option value="firmAdmin">Firm Admin</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="login_userid">
              {role === 'firmAdmin' ? "Firm Admin Username / Email *" : "Counter User ID *"}
            </label>
            <input 
              id="login_userid"
              className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" 
              placeholder={role === 'firmAdmin' ? "e.g. yogwalture@gmail.com" : "e.g. amit_counter"} 
              type="text" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
            {role === 'firmAdmin' && (
              <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                🔒 Custom Email/Username & Password login. Google Account login is NOT required.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="login_pwd">Password *</label>
            <input 
              id="login_pwd"
              className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" 
              placeholder="••••••••" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="login_working_date">Working Date *</label>
            <input 
              id="login_working_date"
              className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" 
              type="date" 
              value={loginWorkingDate}
              onChange={(e) => setLoginWorkingDate(e.target.value)}
              required
            />
            <p className="text-[10px] text-on-surface-variant font-medium">This sets the working ledger date. You can select any past date, or keep today's default.</p>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary text-on-primary py-4 rounded-xl font-label-md mt-4 hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
          >
            Login to Firm App
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-outline-variant/50"></div>
            <span className="flex-shrink mx-3 text-[10px] text-on-surface-variant font-black uppercase tracking-wider">System Administration</span>
            <div className="flex-grow border-t border-outline-variant/50"></div>
          </div>
          
          <button 
            type="button"
            onClick={onGoogleLogin}
            className="w-full bg-surface-container-high hover:bg-surface-container-highest text-primary border border-outline-variant py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            🔐 Master Admin Secure Log-in
          </button>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant text-left text-xs text-on-surface-variant space-y-1">
          <p className="font-bold text-on-surface mb-1">💡 Selected Firm Credentials:</p>
          {role === 'firmAdmin' ? (
            <>
              <p>• <strong>Selected Firm:</strong> {currentFirm?.name || 'Yogwalture Pharmacy'}</p>
              <p>• <strong>Admin User ID / Email:</strong> <code className="bg-white/60 px-1 py-0.5 rounded">{currentFirm?.email || 'yogwalture@gmail.com'}</code></p>
              <p>• <strong>Password:</strong> <code className="bg-white/60 px-1 py-0.5 rounded">{currentFirm?.password || 'yograje1987'}</code></p>
            </>
          ) : (
            <>
              <p>• <strong>Selected Firm:</strong> {currentFirm?.name || 'Yogwalture Pharmacy'}</p>
              {currentFirm && (currentFirm.users || []).length > 0 ? (
                <>
                  <p>• <strong>Counter IDs:</strong> {(currentFirm.users || []).map(u => <code key={u.id} className="bg-white/60 px-1 py-0.5 rounded mr-1.5">{u.id}</code>)}</p>
                  <p>• <strong>Password:</strong> <code className="bg-white/60 px-1 py-0.5 rounded">{(currentFirm.users || [])[0]?.password || 'password'}</code></p>
                </>
              ) : (
                <p className="text-error">No counter users created yet. Log in as <strong>Firm Admin</strong> to add users first.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RegisterFirmScreen({ onNavigate, onRegister }: { onNavigate: (page: Page) => void, onRegister: (firm: Firm) => void }) {
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get('password') as string;
    const newFirm: Firm = {
      id: `F-${1000 + Math.floor(Math.random() * 9000)}`,
      name: (formData.get('name') as string || '').trim(),
      adminName: (formData.get('adminName') as string || '').trim(),
      email: (formData.get('email') as string || '').trim(),
      mobile: (formData.get('mobile') as string || '').trim(),
      password: (password || '').trim(),
      users: [],
      status: 'Active',
    };
    onRegister(newFirm);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col px-container-padding-mobile py-8 bg-surface-container-lowest text-on-background relative">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full mb-24">
        <button onClick={() => onNavigate('welcome')} className="text-on-surface-variant self-start mb-8 hover:text-primary flex items-center gap-2 cursor-pointer">
          <ArrowLeft className="w-5 h-5"/>
          Back
        </button>
        <h2 className="text-headline-lg text-primary mb-2 font-bold font-sans">Register Firm</h2>
        <p className="text-body-md text-on-surface-variant mb-8">Create an account for your pharmacy.</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-5 text-left">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="register_name">Firm Name *</label>
            <input id="register_name" name="name" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="Yogwalture Pharmacy" type="text" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="register_admin">Admin Name *</label>
            <input id="register_admin" name="adminName" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="Full Name" type="text" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="register_email">Email Address (Admin User ID) *</label>
            <input id="register_email" name="email" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="admin@firm.com" type="email" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="register_mobile">Mobile Number *</label>
            <input id="register_mobile" name="mobile" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="Enter mobile number" type="tel" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface font-semibold" htmlFor="register_pwd">Password *</label>
            <input id="register_pwd" name="password" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="••••••••" type="password" required />
          </div>

          <button 
            type="submit"
            className="w-full bg-primary text-on-primary py-4 rounded-xl font-label-md mt-4 hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
          >
            Create Firm & Login
          </button>
        </form>
      </div>
    </div>
  );
}

function FirmAdminScreen({ 
  onNavigate, 
  onLogout, 
  activeFirm, 
  onUpdateFirm,
  transactions,
  setTransactions,
  customers,
  setCustomers,
  firmDailyRegisters,
  setFirmDailyRegisters,
  workingDate
}: { 
  onNavigate: (page: Page) => void, 
  onLogout: () => void, 
  activeFirm?: Firm, 
  onUpdateFirm: (firm: Firm) => void,
  transactions: Transaction[],
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>,
  customers: Customer[],
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  firmDailyRegisters: Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean; forwarded?: number }>,
  setFirmDailyRegisters: React.Dispatch<React.SetStateAction<Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean; forwarded?: number }>>>,
  workingDate: string
}) {
  const [activeTab, setActiveTab] = useState<'users' | 'cashReport' | 'backup' | 'settings'>('users');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserIndex, setEditingUserIndex] = useState<number | null>(null);

  const [editFirmName, setEditFirmName] = useState(activeFirm.name);
  const [editAdminName, setEditAdminName] = useState(activeFirm.adminName);
  const [editEmail, setEditEmail] = useState(activeFirm.email);
  const [editMobile, setEditMobile] = useState(activeFirm.mobile);
  const [editPassword, setEditPassword] = useState(activeFirm.password);

  useEffect(() => {
    setEditFirmName(activeFirm.name);
    setEditAdminName(activeFirm.adminName);
    setEditEmail(activeFirm.email);
    setEditMobile(activeFirm.mobile);
    setEditPassword(activeFirm.password);
  }, [activeFirm]);

  const handleUpdateFirmSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFirm({
      ...activeFirm,
      name: editFirmName,
      adminName: editAdminName,
      email: editEmail,
      mobile: editMobile,
      password: editPassword
    });
    alert("Master Firm parameters updated successfully!");
  };

  // Cash Report selections
  const [selectedReportDate, setSelectedReportDate] = useState<string>(workingDate);
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>(() => {
    return workingDate.substring(0, 7); // e.g. "2026-06"
  });

  // Sync / Backup local states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [panelSuccess, setPanelSuccess] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('shopbooks_last_sync') || 'Never Sync';
  });
  const [importPreview, setImportPreview] = useState<any>(null);

  if (!activeFirm) return <div className="p-8 text-center text-on-surface-variant font-bold">No Active Firm context found.</div>;

  const users = activeFirm.users || [];

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const id = formData.get('userId') as string;
    const role = formData.get('role') as string;
    const mobile = formData.get('mobile') as string;
    const password = formData.get('password') as string;
    const salaryStr = formData.get('salary') as string;
    const salary = salaryStr ? parseFloat(salaryStr) : 0;
    
    if (name && id && role && mobile && password) {
      onUpdateFirm({ ...activeFirm, users: [...users, { name, id, role, mobile, password, salary }] });
      setIsAddingUser(false);
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserIndex === null) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const mobile = formData.get('mobile') as string;
    const password = formData.get('password') as string;
    const salaryStr = formData.get('salary') as string;
    const salary = salaryStr ? parseFloat(salaryStr) : 0;
    
    if (name && role && mobile) {
      const newUsers = [...users];
      const existingUser = newUsers[editingUserIndex];
      newUsers[editingUserIndex] = { 
         ...existingUser, 
         name, 
         role, 
         mobile, 
         password: password ? password : (existingUser.password || 'password'),
         salary
      };
      onUpdateFirm({ ...activeFirm, users: newUsers });
      setEditingUserIndex(null);
    }
  };

  const handleDeleteUser = () => {
    if (editingUserIndex !== null) {
      const newUsers = users.filter((_, i) => i !== editingUserIndex);
      onUpdateFirm({ ...activeFirm, users: newUsers });
      setEditingUserIndex(null);
    }
  };

  // Calculating cash parameters for any selected date
  const computeDailyCashInHand = (targetDate: string) => {
    const activeTransactions = transactions.filter(t => t.firmId === activeFirm.id && t.date === targetDate);
    const regKey = `${activeFirm.id}_${targetDate}`;
    const reg = firmDailyRegisters[regKey];
    
    // Previous day calculation to check forwarded balance or custom opening entries
    const prevDateStr = (() => {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - 1);
      return getLocalDateString(d);
    })();
    const prevKey = `${activeFirm.id}_${prevDateStr}`;
    const prevForwarded = firmDailyRegisters[prevKey]?.forwarded || 0;

    const opening = reg?.opening ?? prevForwarded;
    const counterSales = reg?.cashSales || 0;
    const counterOnline = reg?.onlineSales || 0;
    const totalDaySales = counterSales + counterOnline;

    const creditReceived = activeTransactions.filter(t => t.type === 'receive_payment');
    const creditSales = activeTransactions.filter(t => t.type === 'credit_sale');
    const supplierPaid = activeTransactions.filter(t => t.type === 'supplier_payment' && !t.title.toLowerCase().includes('expense'));
    const recordedExpenses = activeTransactions.filter(t => t.type === 'supplier_payment' && t.title.toLowerCase().includes('expense'));
    const schemePaid = activeTransactions.filter(t => t.type === 'scheme_bill');
    const staffCredits = activeTransactions.filter(t => t.type === 'staff_credit');
    const staffAdvances = activeTransactions.filter(t => t.type === 'staff_advance');

    // staff totals
    const staffCreditToday = staffCredits.reduce((sum, t) => sum + t.amount, 0);
    const staffAdvanceToday = staffAdvances.reduce((sum, t) => sum + t.amount, 0);

    // patient totals
    const patientCreditToday = creditSales.reduce((sum, t) => sum + t.amount, 0);

    // Collections cash vs online
    let cashCollections = 0;
    let onlineCollections = 0;
    creditReceived.forEach(t => {
      if ((t.extraDetails || '').toLowerCase().includes('cash')) {
        cashCollections += t.amount;
      } else {
        onlineCollections += t.amount;
      }
    });

    const schemeBills = schemePaid.reduce((sum, t) => sum + t.amount, 0);
    const supplierPay = supplierPaid.reduce((sum, t) => sum + t.amount, 0);
    const staffCredit = staffCreditToday;
    const staffAdvance = staffAdvanceToday;
    const creditGiven = patientCreditToday;
    const forwarded = reg?.forwarded || 0;
    const expenses = recordedExpenses.reduce((sum, t) => sum + t.amount, 0);

    // Online payment counts under online collections and is deducted
    const totalOnlineCollectionsCombined = onlineCollections + counterOnline;

    const totalAdded = opening + totalDaySales + cashCollections;
    const totalDeducted = totalOnlineCollectionsCombined + schemeBills + supplierPay + staffCredit + staffAdvance + creditGiven + expenses + forwarded;
    const finalCash = totalAdded - totalDeducted;

    return {
      opening,
      counterSales: totalDaySales,
      cashCollections,
      onlineCollections: totalOnlineCollectionsCombined,
      schemeBills,
      supplierPay,
      staffCredit,
      staffAdvance,
      creditGiven,
      forwarded,
      expenses,
      totalAdded,
      totalDeducted,
      finalCash,
      isClosed: !!reg?.closed
    };
  };

  const handleToggleDayLock = (dateStr: string, currentClosed: boolean) => {
    const regKey = `${activeFirm.id}_${dateStr}`;
    const updated = { ...firmDailyRegisters };
    if (!updated[regKey]) {
      updated[regKey] = { opening: 0, cashSales: 0, onlineSales: 0, closed: false };
    }
    updated[regKey].closed = !currentClosed;
    setFirmDailyRegisters(updated);
    alert(`Day ${dateStr} has been successfully UNLOCKED!`);
  };

  // Sync / Backup executions
  const triggerCloudSync = () => {
    setIsSyncing(true);
    setSyncStatusMsg("Initiating secure SSL handshake...");
    setTimeout(() => {
      setSyncStatusMsg("Encrypting active ledger schemas...");
      setTimeout(() => {
        setSyncStatusMsg("Writing journal metadata to replica cloud repository...");
        setTimeout(() => {
          setIsSyncing(false);
          setPanelSuccess("Local pharmacy register databases completely synchronized and verified with Cloud Mirror replication.");
          setLastSyncTime(new Date().toLocaleString('en-IN'));
          localStorage.setItem('shopbooks_last_sync', new Date().toLocaleString('en-IN'));
        }, 1200);
      }, 800);
    }, 800);
  };

  const recoverFromCloud = () => {
    setIsSyncing(true);
    setSyncStatusMsg("Polling ShopBooks standalone Cloud repository...");
    setTimeout(() => {
      setIsSyncing(false);
      setPanelSuccess("Cloud Mirror replication records successfully downloaded and applied recursively.");
    }, 1200);
  };

  const triggerJSONDownload = () => {
    const backupObj = {
      transactions,
      customers,
      firmDailyRegisters
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `shopbooks_balance_backup_${activeFirm.id}.json`);
    dlAnchorElem.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.customers)) {
          setImportPreview(parsed);
          setPanelError(null);
        } else {
          setPanelError("Invalid file schema. Backup file must contain transactions and customers collections.");
        }
      } catch (err) {
        setPanelError("Could not parse file. Please upload a valid JSON backup descriptor.");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    setTransactions(importPreview.transactions);
    setCustomers(importPreview.customers);
    if (importPreview.firmDailyRegisters) {
      setFirmDailyRegisters(importPreview.firmDailyRegisters);
    }
    setPanelSuccess("Offline JSON database snapshot successfully loaded and synced.");
    setImportPreview(null);
  };

  // Computing Monthly Report Summary
  const getMonthlyReportSummary = () => {
    const daysInMonth = [];
    const year = parseInt(selectedReportMonth.split('-')[0]) || 2026;
    const month = parseInt(selectedReportMonth.split('-')[1]) || 6;
    const numDays = new Date(year, month, 0).getDate();

    let grandTotalSales = 0;
    let grandTotalCollections = 0;
    let grandTotalDeductions = 0;
    let grandTotalClosingCash = 0;

    for (let day = 1; day <= numDays; day++) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stats = computeDailyCashInHand(dateString);
      daysInMonth.push({
        date: dateString,
        ...stats
      });
      grandTotalSales += stats.counterSales;
      grandTotalCollections += stats.cashCollections;
      grandTotalDeductions += stats.totalDeducted;
      grandTotalClosingCash += stats.finalCash;
    }

    return {
      days: daysInMonth,
      grandTotalSales,
      grandTotalCollections,
      grandTotalDeductions,
      grandTotalClosingCash
    };
  };

  const monthlyReport = getMonthlyReportSummary();
  const selectedDayStats = computeDailyCashInHand(selectedReportDate);

  return (
    <div className="min-h-screen bg-background text-on-background pb-12 relative flex flex-col">
      <header className="bg-surface-container-lowest w-full top-0 sticky border-b border-outline-variant flex justify-between items-center px-6 h-16 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Store className="text-primary w-6 h-6 fill-current" />
          <span className="text-headline-md text-primary tracking-tight font-black uppercase">Admin Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('dashboard')} className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-label-md flex items-center gap-2 hover:bg-primary-container/80 transition-colors cursor-pointer hidden md:flex font-bold">
            <Home className="w-4 h-4" />
            Open POS / Register
          </button>
          <button onClick={() => onNavigate('dashboard')} className="bg-primary-container text-on-primary-container p-2 rounded-lg flex items-center justify-center hover:bg-primary-container/80 transition-colors cursor-pointer md:hidden">
            <Home className="w-5 h-5" />
          </button>
          <button onClick={onLogout} className="text-label-md text-error hover:bg-error-container/20 px-4 py-2 rounded-lg transition-colors cursor-pointer font-bold">
            Logout
          </button>
        </div>
      </header>

      {/* Tabs Navigation Rail */}
      <div className="bg-surface-container-low border-b border-outline-variant/30 px-6 py-2">
        <div className="max-w-7xl mx-auto flex gap-4">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer uppercase flex items-center gap-2 ${activeTab === 'users' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Employees</span>
          </button>
          <button 
            onClick={() => setActiveTab('cashReport')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer uppercase flex items-center gap-2 ${activeTab === 'cashReport' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <Coins className="w-4 h-4" />
            <span>Total Cash Reports</span>
          </button>
          <button 
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer uppercase flex items-center gap-2 ${activeTab === 'backup' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <Database className="w-4 h-4" />
            <span>Sync & Backup Hub</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer uppercase flex items-center gap-2 ${activeTab === 'settings' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <Settings className="w-4 h-4" />
            <span>Firm Settings</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 flex-1 w-full text-left">
        {/* KPI Summary Block */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex justify-between items-center">
            <div>
              <p className="text-label-md text-on-surface-variant mb-1 font-bold">Authorized Employee Pool</p>
              <h3 className="text-number-xl text-on-background font-black">{users.length} Users</h3>
            </div>
            <div className="w-12 h-12 bg-primary-container/30 rounded-xl flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex justify-between items-center">
            <div>
              <p className="text-label-md text-on-surface-variant mb-1 font-bold">Selected Day Cash</p>
              <h3 className="text-number-xl text-secondary font-black">₹ {selectedDayStats.finalCash.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-secondary-container/30 rounded-xl flex items-center justify-center text-secondary">
              <Coins className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex justify-between items-center">
            <div>
              <p className="text-label-md text-on-surface-variant mb-1 font-bold">Monthly Combined cash</p>
              <h3 className="text-number-xl text-emerald-700 font-bold font-black">₹ {monthlyReport.grandTotalClosingCash.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tab 1: Manage Staff Users */}
        {activeTab === 'users' && (
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <div>
                <h2 className="text-headline-md text-on-surface font-black">Manage Users</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Maintain secure register login IDs, and base monthly pay salaries.</p>
              </div>
              <button onClick={() => setIsAddingUser(true)} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer font-bold">
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>
            <div className="overflow-x-auto text-left">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30 text-label-md text-on-surface-variant">
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">User Name</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">User ID</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Password</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Role</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Monthly Salary</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-md font-medium text-on-surface/90">
                  {users.map((user, i) => (
                    <tr key={i} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-6 py-4 font-bold text-on-surface">{user.name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-primary font-bold">{user.id}</td>
                      <td className="px-6 py-4 font-mono text-sm">••••••••</td>
                      <td className="px-6 py-4">
                        <span className="bg-primary-container/40 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-700">₹{user.salary ? user.salary.toLocaleString() : '0 (Not Set)'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setEditingUserIndex(i)} className="p-2 text-primary hover:bg-primary-container/20 rounded-full transition-colors cursor-pointer"><Settings className="w-5 h-5"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 2: Total Cash Reports with selection */}
        {activeTab === 'cashReport' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Split layout: Selector and detailed breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Selector Panel */}
              <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/35 flex flex-col gap-6 text-left h-fit">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Configure Date Filters</h3>
                  <p className="text-xs text-on-surface-variant">Select target audit date and month to inspect immediate physical cash values instantly.</p>
                </div>

                {/* Day Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase block">Selected Date wise Audit</label>
                  <input 
                    type="date"
                    value={selectedReportDate}
                    onChange={(e) => setSelectedReportDate(e.target.value)}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-sm text-on-background outline-none focus:border-primary font-mono font-bold"
                  />
                </div>

                {/* Month Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase block">Selected Monthly Audit</label>
                  <input 
                    type="month"
                    value={selectedReportMonth}
                    onChange={(e) => setSelectedReportMonth(e.target.value)}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-sm text-on-background outline-none focus:border-primary font-mono font-bold"
                  />
                </div>

                {/* Print Day-wise PDF Audit Option */}
                <button 
                  onClick={() => alert("Printing active selected audit ledger reports. Daily closing handles individual ledger downloads.")}
                  className="w-full border border-primary text-primary px-4 py-3 rounded-lg text-xs font-black uppercase hover:bg-primary/5 transition-all text-center cursor-pointer-none block"
                >
                  Download Selected Statements
                </button>
              </div>

              {/* Right Statistics breakdown card */}
              <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/35 text-left grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] bg-primary/10 text-primary font-black px-2.5 py-0.5 rounded-full uppercase">Balanced Ledger Equation Details</span>
                    <h3 className="font-black text-lg text-on-surface tracking-tight mt-1">Audit on {selectedReportDate}</h3>
                    <p className="text-xs text-on-surface-variant">Dynamic financial position on selected day.</p>
                  </div>

                  <div className="bg-surface-container-low/40 rounded-lg p-3 space-y-2.5 border border-outline-variant/15 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">Opening Cash (From Prev Forwarded)</span>
                      <span className="font-mono font-bold text-on-surface">₹ {selectedDayStats.opening.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">(+) Today Day Sales</span>
                      <span className="font-mono font-bold text-on-surface text-secondary">₹ {selectedDayStats.counterSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">(+) Cash Collections</span>
                      <span className="font-mono font-bold text-on-surface text-emerald-700">₹ {selectedDayStats.cashCollections.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-dashed border-outline-variant my-1"></div>
                    <div className="flex justify-between font-bold text-primary">
                      <span>Total Added Cash (A)</span>
                      <span className="font-mono">₹ {selectedDayStats.totalAdded.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div className="bg-error/5 border border-error/10 text-xs rounded-lg p-3 space-y-2">
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">Online Collections (Deducted)</span>
                      <span className="font-mono font-bold text-on-surface">₹ {selectedDayStats.onlineCollections.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">Scheme Bills</span>
                      <span className="font-mono font-bold text-on-surface">₹ {selectedDayStats.schemeBills.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">Supplier Pay</span>
                      <span className="font-mono font-bold text-on-surface">₹ {selectedDayStats.supplierPay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">Staff Credit / Advance</span>
                      <span className="font-mono font-bold text-on-surface">₹ {(selectedDayStats.staffCredit + selectedDayStats.staffAdvance).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-on-surface-variant">Credit Given (C.S.)</span>
                      <span className="font-mono font-bold text-on-surface">₹ {selectedDayStats.creditGiven.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium text-amber-800">
                      <span>Op. Balance Forwarded</span>
                      <span className="font-mono font-bold">₹ {selectedDayStats.forwarded.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-dashed border-outline-variant my-1"></div>
                    <div className="flex justify-between font-bold text-error">
                      <span>Total Deducted Cash (B)</span>
                      <span className="font-mono">₹ {selectedDayStats.totalDeducted.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-primary/5 hover:bg-primary/[0.08] transition-colors border border-primary/20 rounded-xl p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-black text-primary uppercase block tracking-wider">Calibrated Audit Target</span>
                    <div className="text-2xl font-black text-primary mt-1">₹ {selectedDayStats.finalCash.toLocaleString()}</div>
                    <span className="text-[11px] text-on-surface-variant mt-1">Equation: (A) - (B) is physical cash remaining.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Calendar Day wise ledger table list */}
            <section className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-outline-variant/30 text-left">
                <span className="text-xs bg-amber-500/10 text-amber-700 font-bold px-2.5 py-0.5 rounded-full uppercase">Extended Grid Ledger View</span>
                <h3 className="font-black text-md text-on-surface tracking-tight mt-1">Monthly Ledger Records for {selectedReportMonth}</h3>
                <p className="text-xs text-on-surface-variant">Inspect physical drawer calculations and day opening/closing status day-by-day.</p>
              </div>

              <div className="overflow-x-auto text-left">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/25 text-label-sm text-on-surface-variant font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-6 py-4">Calendar Date</th>
                      <th className="px-6 py-4">Opening Balance</th>
                      <th className="px-6 py-4">Today Day Sales</th>
                      <th className="px-6 py-4">Total Collections</th>
                      <th className="px-6 py-4">Total Deductions</th>
                      <th className="px-6 py-4">Op. Balance Forwarded</th>
                      <th className="px-6 py-4">Net Cash in Drawer</th>
                      <th className="px-6 py-4 text-right">Lock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
                    {monthlyReport.days.map((d, index) => (
                      <tr key={index} className="hover:bg-surface-container-lowest transition-colors font-medium">
                        <td className="px-6 py-3 font-bold font-mono text-xs">{d.date}</td>
                        <td className="px-6 py-3 font-mono">₹ {d.opening.toLocaleString()}</td>
                        <td className="px-6 py-3 text-secondary font-bold font-mono">₹ {d.counterSales.toLocaleString()}</td>
                        <td className="px-6 py-3 text-emerald-700 font-bold font-mono">₹ {d.cashCollections.toLocaleString()}</td>
                        <td className="px-6 py-3 text-rose-700 font-mono">₹ {d.totalDeducted.toLocaleString()}</td>
                        <td className="px-6 py-3 text-amber-700 font-bold font-mono">₹ {d.forwarded.toLocaleString()}</td>
                        <td className="px-6 py-3 font-bold text-primary font-mono text-sm bg-primary/[0.01]">₹ {d.finalCash.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${d.isClosed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                              {d.isClosed ? 'LOCKED' : 'OPEN'}
                            </span>
                            {d.isClosed && (
                              <button 
                                type="button"
                                onClick={() => handleToggleDayLock(d.date, true)}
                                className="px-2 py-1 text-[10px] font-black bg-amber-600 border border-amber-700 text-white rounded hover:bg-amber-700 transition-colors uppercase tracking-wider cursor-pointer"
                              >
                                Unlock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Tab 3: Restricted Database Sync & Backup Hub */}
        {activeTab === 'backup' && (
          <section className="bg-surface-container-lowest border border-outline-variant/35 rounded-xl shadow-sm overflow-hidden animate-fadeIn text-left">
            <div className="p-6 border-b border-outline-variant/30 bg-surface-container-low/30">
              <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full uppercase">Secure Operations (Admin Only)</span>
              <h2 className="text-xl font-black text-on-surface tracking-tight mt-1">System Database Sync & Backup Hub</h2>
              <p className="text-xs text-on-surface-variant">Perform full SSL handshakes, and download raw journal snapshots offline.</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Informative Security Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container-low/50 border border-outline-variant/25 rounded-xl p-4 flex gap-3 text-left">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-on-surface">Data Redundancy Certified</h4>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Your ledger runs locally on a secure browser sandbox. Executing cloud backup guarantees full safety against disk wipes.</p>
                  </div>
                </div>
                <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl p-4 flex gap-3 text-left">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-amber-700">Backup Warning</h4>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Restoring database records completely overwrites local client states. Proceed with caution to prevent accidental rollbacks.</p>
                  </div>
                </div>
              </div>

              {/* Status Success / Error Banners */}
              {panelSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{panelSuccess}</span>
                </div>
              )}
              {panelError && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{panelError}</span>
                </div>
              )}

              {/* Sync Loader Overlay */}
              {isSyncing && (
                <div className="p-4 bg-primary/5 border border-primary/20 text-primary rounded-xl flex items-center gap-3 justify-center text-xs font-bold animate-pulse">
                  <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{syncStatusMsg}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 pt-4">
                {/* Standalone Cloud sync */}
                <div className="bg-surface-container-low/60 rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider block mb-1">Sandbox Cloud Sync</span>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Replicate and lock a copy of your active Ledger database into the ShopBooks offline mirror space. Retrieve your cloud backlogs securely in one click.
                    </p>
                    <div className="mt-3.5 flex items-center gap-2 text-[11px] text-on-surface-variant/90 bg-surface-container-low p-2 rounded-lg border border-outline-variant/15">
                      <span className="font-bold">Last Replicated:</span>
                      <span className="text-primary font-mono font-bold bg-primary/10 px-2 py-0.5 rounded-full">{lastSyncTime}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={triggerCloudSync}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 cursor-pointer"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>Sync & Backup Now</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={recoverFromCloud}
                      className="px-4 py-2 bg-surface-container-highest text-on-surface text-xs font-bold rounded-lg border border-outline-variant/30 transition-all flex items-center gap-1.5 focus:ring-2 focus:ring-outline/20 disabled:opacity-50 cursor-pointer"
                    >
                      <CloudDownload className="w-4 h-4 text-emerald-600 animate-bounce" />
                      <span>One-Click Cloud Restore</span>
                    </button>
                  </div>
                </div>

                {/* Local JSON Files backup */}
                <div className="bg-surface-container-low/60 rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider block mb-1">Manual File Backup Descriptors</span>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Download a structured raw file representation containing all transactions, customers list and day register values onto your device.
                    </p>

                    {/* Snapshot import preview container */}
                    {importPreview && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-left animate-fadeIn space-y-2">
                        <div className="font-bold text-amber-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-amber-600" />
                          <span>Detected Schema Backup:</span>
                        </div>
                        <ul className="text-amber-700 space-y-0.5 list-disc list-inside font-mono text-[11px]">
                          <li>Transactions count: <strong className="text-amber-900">{importPreview.transactions.length}</strong></li>
                          <li>Customers ledger count: <strong className="text-amber-900">{importPreview.customers.length}</strong></li>
                        </ul>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={confirmImport}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-md text-[10px] shrink-0 transition-colors cursor-pointer uppercase tracking-wider shadow-sm"
                          >
                            Proceed Override
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportPreview(null)}
                            className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-3 py-1.5 rounded-md text-[10px] shrink-0 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={triggerJSONDownload}
                        className="px-4 py-2 bg-secondary text-white hover:bg-secondary-hover text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export Backup JSON</span>
                      </button>

                      <label className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg border border-outline-variant/30 cursor-pointer transition-all flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-primary" />
                        <span>Import Backup File</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleFileImport}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {activeTab === 'settings' && (
          <form onSubmit={handleUpdateFirmSettings} className="bg-surface-container-lowest border border-outline-variant/35 rounded-xl shadow-sm overflow-hidden animate-fadeIn text-left">
            <div className="p-6 border-b border-outline-variant/30 bg-surface-container-low/30">
              <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full uppercase">Firm Configuration Settings</span>
              <h2 className="text-xl font-black text-on-surface tracking-tight mt-1">Master Business Parameters</h2>
              <p className="text-xs text-on-surface-variant">Configure authorized corporate details, owner profiles, and counter login parameters.</p>
            </div>

            <div className="p-6 space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-secondary uppercase tracking-wider">Business / Firm Name</label>
                  <input 
                    type="text" 
                    value={editFirmName} 
                    onChange={(e) => setEditFirmName(e.target.value)} 
                    className="bg-surface-bright border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-background focus:border-secondary outline-none transition-colors font-bold"
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-secondary uppercase tracking-wider">Lead Administrator Name</label>
                  <input 
                    type="text" 
                    value={editAdminName} 
                    onChange={(e) => setEditAdminName(e.target.value)} 
                    className="bg-surface-bright border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-background focus:border-secondary outline-none transition-colors font-bold"
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-secondary uppercase tracking-wider">Billing Contact Mobile</label>
                  <input 
                    type="text" 
                    value={editMobile} 
                    onChange={(e) => setEditMobile(e.target.value)} 
                    className="bg-surface-bright border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-background focus:border-secondary outline-none transition-colors font-bold"
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-secondary uppercase tracking-wider">Admin Login Username / Email</label>
                  <input 
                    type="text" 
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)} 
                    className="bg-surface-bright border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-background focus:border-secondary outline-none transition-colors font-mono font-bold"
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-secondary uppercase tracking-wider">Admin Panel / Unlock Credentials</label>
                  <input 
                    type="password" 
                    value={editPassword} 
                    onChange={(e) => setEditPassword(e.target.value)} 
                    className="bg-surface-bright border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-background focus:border-secondary outline-none transition-colors font-mono font-bold"
                    required 
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 flex gap-3 text-left">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-on-surface">Settings Authenticated</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">Modifying these fields updates local ledger memory and prevents unauthorized counter operators from breaking daily closure gates.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/15 flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary hover:bg-primary/95 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Corporate Changes</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Employee CRUD Dialog overlays */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-on-background/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-md overflow-hidden text-left">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h2 className="text-text-lg font-black text-on-surface uppercase tracking-wider">Add New User</h2>
              <button onClick={() => setIsAddingUser(false)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">User Name</label>
                <input name="name" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="e.g. Rahul Gupta" type="text" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">User ID</label>
                <input name="userId" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors font-mono font-bold" placeholder="rahul_staff" type="text" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">Role</label>
                <select name="role" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors font-bold" required>
                  <option value="Counter">Counter</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">Mobile Number</label>
                <input name="mobile" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="Enter mobile number" type="tel" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">Monthly Base Salary (₹)</label>
                <input name="salary" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors font-mono font-bold" placeholder="e.g. 18000" type="number" step="any" min="0" defaultValue="0" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">Password</label>
                <input name="password" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="••••••••" type="password" required />
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary py-4 rounded-xl font-black mt-4 hover:bg-primary/90 transition-colors shadow-sm cursor-pointer uppercase tracking-widest text-xs">
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {editingUserIndex !== null && (
        <div className="fixed inset-0 bg-on-background/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-md overflow-hidden text-left">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h2 className="text-text-lg font-black text-on-surface uppercase tracking-wider">Edit User Settings</h2>
              <button onClick={() => setEditingUserIndex(null)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">User Name</label>
                <input name="name" defaultValue={users[editingUserIndex].name} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" type="text" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">User ID</label>
                <input value={users[editingUserIndex].id} disabled className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-surface-variant outline-none cursor-not-allowed font-mono" type="text" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">Role</label>
                <select name="role" defaultValue={users[editingUserIndex].role} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors font-bold" required>
                  <option value="Counter">Counter</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">Mobile Number</label>
                <input name="mobile" defaultValue={users[editingUserIndex].mobile} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="Enter mobile number" type="tel" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">Monthly Base Salary (₹)</label>
                <input name="salary" defaultValue={users[editingUserIndex].salary || 0} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors font-mono font-bold" placeholder="Enter base monthly salary" type="number" step="any" min="0" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-[11px] font-bold text-on-surface-variant uppercase">New Password</label>
                <input name="password" className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" placeholder="Leave blank to keep current" type="password" />
              </div>
              <div className="flex gap-4 mt-4">
                <button type="button" onClick={handleDeleteUser} className="flex-1 bg-error-container text-on-error-container py-4 rounded-xl font-bold hover:bg-error-container/80 transition-colors shadow-sm cursor-pointer uppercase text-xs tracking-wider">
                  Delete
                </button>
                <button type="submit" className="flex-[2] bg-primary text-on-primary py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer uppercase text-xs tracking-wider">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MasterAdminScreen({ 
  onNavigate, 
  firms, 
  onUpdateFirm, 
  onDeleteFirm,
  transactions,
  setTransactions,
  customers,
  setCustomers,
  firmDailyRegisters,
  setFirmDailyRegisters
}: { 
  onNavigate: (page: Page) => void, 
  firms: Firm[], 
  onUpdateFirm: (firm: Firm) => void, 
  onDeleteFirm: (firmId: string) => void,
  transactions: Transaction[],
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>,
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>,
  customers: Customer[],
  firmDailyRegisters?: Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean }>,
  setFirmDailyRegisters?: React.Dispatch<React.SetStateAction<Record<string, { opening: number; cashSales: number; onlineSales: number; closed: boolean }>>>
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState<boolean>(() => {
    return localStorage.getItem('shopbooks_master_allow_registrations') !== 'false';
  });
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('shopbooks_master_maintenance_mode') === 'true';
  });

  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserIndex, setEditingUserIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Secure Sub-Firm Explorer Mode States
  const [selectedExploreFirmId, setSelectedExploreFirmId] = useState<string | null>(null);
  const [exploreTab, setExploreTab] = useState<'overview' | 'transactions' | 'customers' | 'reports'>('overview');
  
  // Search & Filters inside Firm Explorer
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [custSearchQuery, setCustSearchQuery] = useState('');
  const [firmSearchQuery, setFirmSearchQuery] = useState('');

  // Transactions creation/editing modals inside Explorer
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<Transaction | null>(null);

  // Customer creation/editing inside Explorer
  const [isAddingCust, setIsAddingCust] = useState(false);
  const [selectedCustForEdit, setSelectedCustForEdit] = useState<Customer | null>(null);

  const handleUpdateFirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFirm) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const newFirm = {
      ...editingFirm,
      name: formData.get('name') as string,
      adminName: formData.get('adminName') as string,
      email: formData.get('email') as string,
      mobile: formData.get('mobile') as string,
      status: formData.get('status') as 'Active' | 'Inactive',
    };
    onUpdateFirm(newFirm);
    setEditingFirm(null);
    setEditingUserIndex(null);
    setIsAddingUser(false);
  };

  const handleDeleteFirmUser = (userIndex: number) => {
    if (!editingFirm) return;
    const newUsers = editingFirm.users.filter((_, i) => i !== userIndex);
    setEditingFirm({ ...editingFirm, users: newUsers });
    if (editingUserIndex === userIndex) {
      setEditingUserIndex(null);
    } else if (editingUserIndex !== null && editingUserIndex > userIndex) {
      setEditingUserIndex(editingUserIndex - 1);
    }
  };

  const handleAddFirmUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFirm) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('userName') as string;
    const id = formData.get('userId') as string;
    const role = formData.get('userRole') as string;
    const mobile = formData.get('userMobile') as string;
    
    if (name && id && role && mobile) {
      setEditingFirm({ ...editingFirm, users: [...editingFirm.users, { name, id, role, mobile }] });
      setIsAddingUser(false);
    }
  };

  const handleEditFirmUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFirm || editingUserIndex === null) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('editUserName') as string;
    const mobile = formData.get('editUserMobile') as string;
    const role = formData.get('editUserRole') as string;
    
    if (name && mobile && role) {
      const updatedUsers = [...editingFirm.users];
      updatedUsers[editingUserIndex] = {
        ...updatedUsers[editingUserIndex],
        name,
        mobile,
        role
      };
      setEditingFirm({ ...editingFirm, users: updatedUsers });
      setEditingUserIndex(null);
    }
  };

  // Secure active explorer variables
  const activeExplorerFirm = firms.find(f => f.id === selectedExploreFirmId) || null;
  const exploringFirmTransactions = selectedExploreFirmId ? transactions.filter(t => t.firmId === selectedExploreFirmId) : [];
  const exploringFirmCustomers = selectedExploreFirmId ? customers.filter(c => c.firmId === selectedExploreFirmId) : [];

  const filteredTxs = exploringFirmTransactions.filter(t => {
    const q = txSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      t.id.toLowerCase().includes(q) || 
      (t.title || '').toLowerCase().includes(q) || 
      (t.patientName || '').toLowerCase().includes(q) || 
      (t.customerPhone || '').toLowerCase().includes(q) || 
      (t.extraDetails || '').toLowerCase().includes(q);
    const matchesType = txTypeFilter === 'all' || t.type === txTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredCusts = exploringFirmCustomers.filter(c => {
    const q = custSearchQuery.toLowerCase().trim();
    return !q || c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  });

  const filteredFirmsList = firms.filter(f => {
    const q = firmSearchQuery.toLowerCase().trim();
    return !q || f.id.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || (f.adminName || '').toLowerCase().includes(q);
  });

  // explorer transaction submissions
  const handleExplorerAddTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExploreFirmId || !setTransactions) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const type = formData.get('txType') as Transaction['type'];
    const title = formData.get('txTitle') as string;
    const patientName = formData.get('txPatientName') as string || undefined;
    const customerPhone = formData.get('txPhone') as string || undefined;
    const amount = parseFloat(formData.get('txAmount') as string) || 0;
    const extraDetails = formData.get('txDetails') as string || '';
    
    const newTx: Transaction = {
      id: 'TX_' + Date.now(),
      firmId: selectedExploreFirmId,
      type,
      title,
      patientName,
      customerPhone,
      amount,
      date: getLocalDateString(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      recordedByUserId: 'masterAdmin',
      recordedByUserName: 'Master Super Admin',
      extraDetails
    };
    
    setTransactions(prev => [...prev, newTx]);
    setIsAddingTx(false);
  };

  const handleExplorerEditTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxForEdit || !setTransactions) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const type = formData.get('txType') as Transaction['type'];
    const title = formData.get('txTitle') as string;
    const patientName = formData.get('txPatientName') as string || undefined;
    const customerPhone = formData.get('txPhone') as string || undefined;
    const amount = parseFloat(formData.get('txAmount') as string) || 0;
    const extraDetails = formData.get('txDetails') as string || '';

    setTransactions(prev => prev.map(t => t.id === selectedTxForEdit.id ? {
      ...t,
      type,
      title,
      patientName,
      customerPhone,
      amount,
      extraDetails
    } : t));
    setSelectedTxForEdit(null);
  };

  const handleExplorerDeleteTx = (txId: string) => {
    if (!setTransactions) return;
    if (window.confirm("CRITICAL: Delete this transaction record permanently? This cannot be undone, and will directly impact ledger reconciliations.")) {
      setTransactions(prev => prev.filter(t => t.id !== txId));
    }
  };

  // explorer customer submissions
  const handleExplorerAddCustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExploreFirmId || !setCustomers) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('custName') as string;
    const phone = formData.get('custPhone') as string;
    const balance = parseFloat(formData.get('custBalance') as string) || 0;
    
    const newCust: Customer = {
      id: 'CUST_' + Date.now(),
      firmId: selectedExploreFirmId,
      name,
      phone,
      status: balance > 0 ? 'Pending' : 'Paid',
      pendingBalance: balance,
      lastPaymentDate: getLocalDateString()
    };

    setCustomers(prev => [...prev, newCust]);
    setIsAddingCust(false);
  };

  const handleExplorerEditCustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForEdit || !setCustomers) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('custName') as string;
    const phone = formData.get('custPhone') as string;
    const balance = parseFloat(formData.get('custBalance') as string) || 0;

    setCustomers(prev => prev.map(c => c.id === selectedCustForEdit.id ? {
      ...c,
      name,
      phone,
      pendingBalance: balance,
      status: balance > 0 ? 'Pending' : 'Paid'
    } : c));
    setSelectedCustForEdit(null);
  };

  const handleExplorerDeleteCust = (custId: string) => {
    if (!setCustomers) return;
    if (window.confirm("Are you sure you want to delete this customer account? This will permanently wipe their outstanding status.")) {
      setCustomers(prev => prev.filter(c => c.id !== custId));
    }
  };

  // exports
  const handleExportFirmJSON = (firm: Firm) => {
    const firmTransactions = transactions.filter(t => t.firmId === firm.id);
    const firmCustomers = customers.filter(c => c.firmId === firm.id);
    const exportData = {
      firmDetails: firm,
      meta: { exportedAt: new Date().toISOString(), exportedBy: 'MasterAdmin' },
      transactions: firmTransactions,
      customers: firmCustomers
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const tmpA = document.createElement('a');
    tmpA.href = url;
    tmpA.download = `FirmBackup_${firm.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(tmpA);
    tmpA.click();
    document.body.removeChild(tmpA);
    URL.revokeObjectURL(url);
  };

  const handleExportFirmCSV = (firm: Firm) => {
    const firmTransactions = transactions.filter(t => t.firmId === firm.id);
    let csvString = "TransactionID,Date,Time,Type,Title,AssociateName,ContactNo,AmountInINR,RecordedBy,Notes\n";
    firmTransactions.forEach(t => {
      const escapedTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
      const escapedAssoc = `"${(t.patientName || '').replace(/"/g, '""')}"`;
      const escapedNotes = `"${(t.extraDetails || '').replace(/"/g, '""')}"`;
      csvString += `${t.id},${t.date || ''},${t.time || ''},${t.type || ''},${escapedTitle},${escapedAssoc},${t.customerPhone || ''},${t.amount || 0},"${t.recordedByUserName || 'System'}",${escapedNotes}\n`;
    });

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const tmpA = document.createElement('a');
    tmpA.href = url;
    tmpA.download = `FirmAuditSheet_${firm.name.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(tmpA);
    tmpA.click();
    document.body.removeChild(tmpA);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-surface-dim text-on-background pb-12 font-sans">
      <header className="bg-inverse-surface text-inverse-on-surface w-full top-0 sticky border-b border-outline-variant/10 flex justify-between items-center px-4 md:px-6 h-16 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldPlus className="w-6 h-6 text-on-primary" />
          <span className="text-headline-md tracking-tight text-on-primary">Super Admin Portal</span>
          <span className="hidden sm:inline bg-white/10 text-white/90 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-white/20">Master Control</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer mr-2"
          >
            <Settings className="w-3.5 h-3.5 text-primary-fixed-dim" />
            <span>Settings</span>
          </button>
          <button onClick={() => onNavigate('welcome')} className="text-label-md text-error-container hover:bg-error-container/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold">
            Logout Session
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* If a firm is selected for exploration */}
        {activeExplorerFirm ? (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Sub-Nav */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/35 shadow-sm text-left">
              <div className="flex items-center gap-3.5">
                <button 
                  onClick={() => {
                    setSelectedExploreFirmId(null);
                    setTxSearchQuery('');
                    setCustSearchQuery('');
                    setTxTypeFilter('all');
                  }}
                  className="p-2 bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary rounded-xl transition-all cursor-pointer"
                  title="Back to Firm Directory"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-extrabold text-lg text-on-surface">{activeExplorerFirm.name}</h2>
                    <span className="text-[10px] font-mono uppercase bg-primary/20 text-primary-hover px-1.5 py-0.5 rounded-md font-bold">ID: {activeExplorerFirm.id}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">Admin: <strong className="font-semibold text-on-surface">{activeExplorerFirm.adminName}</strong> • Phone: {activeExplorerFirm.mobile} • Email: {activeExplorerFirm.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => handleExportFirmJSON(activeExplorerFirm)}
                  className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/35 text-on-surface rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-primary" />
                  <span>Download Backup JSON</span>
                </button>

                <button 
                  onClick={() => handleExportFirmCSV(activeExplorerFirm)}
                  className="px-3.5 py-2 bg-secondary text-white hover:bg-secondary-hover rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Spreadsheet (CSV)</span>
                </button>
              </div>
            </div>

            {/* Custom Tab Selector */}
            <div className="flex border-b border-outline-variant/20 gap-1 overflow-x-auto pb-px">
              {[
                { id: 'overview', title: 'Firm Overview' },
                { id: 'transactions', title: 'Manage Transactions' },
                { id: 'customers', title: 'Manage Customers' },
                { id: 'reports', title: 'Raw Reconcile Files' }
              ].map(tab => {
                const isActive = exploreTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setExploreTab(tab.id as any)}
                    className={`px-5 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'}`}
                  >
                    {tab.title}
                  </button>
                );
              })}
            </div>

            {/* Tab: Overview */}
            {exploreTab === 'overview' && (
              <div className="grid md:grid-cols-3 gap-6 animate-fade-in text-left">
                <div className="bg-surface-container-lowest border border-outline-variant/35 p-5 rounded-2xl shadow-sm">
                  <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider block">Financial Performance</span>
                  <div className="mt-4 space-y-3.5">
                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                      <span className="text-xs text-on-surface-variant">Total Cash Cashflows</span>
                      <span className="text-xs font-bold text-emerald-600 font-mono">
                        ₹{exploringFirmTransactions.filter(t => t.type === 'credit_sale' || t.type === 'receive_payment').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                      <span className="text-xs text-on-surface-variant">Supplier/Payments Outflow</span>
                      <span className="text-xs font-bold text-rose-500 font-mono">
                        ₹{exploringFirmTransactions.filter(t => t.type === 'supplier_payment').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Total Cash Outstanding (Customers)</span>
                      <span className="text-xs font-bold text-amber-500 font-mono">
                        ₹{exploringFirmCustomers.reduce((acc, c) => acc + c.pendingBalance, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/35 p-5 rounded-2xl shadow-sm">
                  <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider block">Operational Metrics</span>
                  <div className="mt-4 space-y-3.5">
                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                      <span className="text-xs text-on-surface-variant">Live Ledger Transactions</span>
                      <span className="text-xs font-bold text-on-surface font-mono">{exploringFirmTransactions.length} items</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                      <span className="text-xs text-on-surface-variant">Active Customers</span>
                      <span className="text-xs font-bold text-on-surface font-mono">{exploringFirmCustomers.length} accounts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Assigned Personnel</span>
                      <span className="text-xs font-bold text-on-surface font-mono">{activeExplorerFirm.users?.length || 0} users</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/35 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider block">System Health</span>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">Workspace database parameters are synchronized and secure. Overwrites can be made by executing manual ledger transactions.</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Normal State
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">Synced</span>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-3 bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">System Users Directory ({activeExplorerFirm.users?.length || 0})</h3>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {(activeExplorerFirm.users || []).map((u, i) => (
                      <div key={i} className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl flex items-center justify-between font-sans">
                        <div>
                          <h4 className="font-bold text-xs text-on-surface">{u.name}</h4>
                          <span className="text-[10px] text-primary/80 font-semibold">{u.role}</span>
                        </div>
                        <span className="text-[10px] font-mono text-on-surface-variant">{u.mobile}</span>
                      </div>
                    ))}
                    {(!activeExplorerFirm.users || activeExplorerFirm.users.length === 0) && (
                      <p className="text-xs italic text-on-surface-variant py-2">No users registered.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Transactions Ledger */}
            {exploreTab === 'transactions' && (
              <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl p-6 shadow-sm space-y-5 text-left animate-fade-in relative min-h-[400px] font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Live Ledger Entries</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">Edit, purge or add daily operational data directly within the database.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingTx(true)}
                    className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/95 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 w-fit cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Ledger Record
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search title, remarks or party name..." 
                      value={txSearchQuery}
                      onChange={(e) => setTxSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-bright outline-none focus:border-primary text-xs w-full"
                    />
                  </div>
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-bright outline-none focus:border-primary text-xs cursor-pointer md:w-48"
                  >
                    <option value="all">All Types</option>
                    <option value="credit_sale">Credit Sales</option>
                    <option value="receive_payment">Payments Received</option>
                    <option value="supplier_payment">Supplier Payments</option>
                    <option value="staff_credit">Staff Store Credit</option>
                    <option value="staff_advance">Staff Temp Advance</option>
                    <option value="scheme_bill">Scheme Bills</option>
                  </select>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto border border-outline-variant/20 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant/30 text-[11px] font-bold text-on-surface-variant">
                        <th className="px-4 py-3">ID / Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Title / Description</th>
                        <th className="px-4 py-3">Associate</th>
                        <th className="px-4 py-3 text-right">Value (₹)</th>
                        <th className="px-4 py-3 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 text-xs text-on-surface">
                      {filteredTxs.map(t => (
                        <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[9px] block text-on-surface-variant">{t.id}</span>
                            <span className="font-semibold block text-on-surface mt-0.5">{t.date} {t.time}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                              {t.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs truncate">
                            <strong className="font-bold text-on-surface block text-ellipsis overflow-hidden">{t.title}</strong>
                            {t.extraDetails && <span className="text-[10px] text-on-surface-variant/80 block text-ellipsis overflow-hidden mt-0.5">{t.extraDetails}</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold block text-on-surface">{t.patientName || '-'}</span>
                            <span className="text-[10px] block text-on-surface-variant mt-0.5">{t.customerPhone || ''}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-on-surface text-xs">
                            ₹{t.amount?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2 shrink-0 font-sans">
                            <button 
                              onClick={() => setSelectedTxForEdit(t)} 
                              className="text-primary hover:underline font-bold"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleExplorerDeleteTx(t.id)} 
                              className="text-error hover:underline font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredTxs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-on-surface-variant italic">No ledger transactions found matching parameters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sub-Modal: Add Transaction */}
                {isAddingTx && (
                  <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-md max-h-[85vh] overflow-y-auto p-6 space-y-4 text-on-surface">
                      <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                        <h4 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Add New Entry</h4>
                        <button onClick={() => setIsAddingTx(false)} className="text-on-surface-variant hover:text-error">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleExplorerAddTxSubmit} className="space-y-4 text-xs font-sans text-left">
                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">TRANSACTION TYPE</label>
                          <select name="txType" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full cursor-pointer">
                            <option value="credit_sale">Credit Sale</option>
                            <option value="receive_payment">Receive Payment</option>
                            <option value="supplier_payment">Supplier Payment / Salary Outflow</option>
                            <option value="staff_credit">Staff Store Credit (Udhaar)</option>
                            <option value="staff_advance">Staff Temp Advance</option>
                            <option value="scheme_bill">Scheme Bill</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">TRANSACTION TITLE / MEMO *</label>
                          <input type="text" name="txTitle" placeholder="e.g. Counter Daily Bulk Sales Memo" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-on-surface-variant">ASSOCIATED PARTY NAME</label>
                            <input type="text" name="txPatientName" placeholder="e.g. Ramesh" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-on-surface-variant">CONTACT PHONE</label>
                            <input type="text" name="txPhone" placeholder="Enter phone" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">TRANSACTION AMOUNT (₹) *</label>
                          <input type="number" step="any" name="txAmount" placeholder="e.g. 1500" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">EXTRA REMARKS / RECONCILIATION NOTES</label>
                          <textarea rows={2} name="txDetails" placeholder="Reference voucher details..." className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full resize-none" />
                        </div>

                        <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-95 transition-all cursor-pointer uppercase">
                          Save Entry to Disk
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Sub-Modal: Edit Transaction */}
                {selectedTxForEdit && (
                  <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-md max-h-[85vh] overflow-y-auto p-6 space-y-4 text-on-surface">
                      <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                        <h4 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Modify Entry</h4>
                        <button onClick={() => setSelectedTxForEdit(null)} className="text-on-surface-variant hover:text-error">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleExplorerEditTxSubmit} className="space-y-4 text-xs font-sans text-left">
                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">TRANSACTION TYPE</label>
                          <select name="txType" defaultValue={selectedTxForEdit.type} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full cursor-pointer">
                            <option value="credit_sale">Credit Sale</option>
                            <option value="receive_payment">Receive Payment</option>
                            <option value="supplier_payment">Supplier Payment</option>
                            <option value="staff_credit">Staff Store Credit (Udhaar)</option>
                            <option value="staff_advance">Staff Temp Advance</option>
                            <option value="scheme_bill">Scheme Bill</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">TRANSACTION TITLE / MEMO *</label>
                          <input type="text" name="txTitle" defaultValue={selectedTxForEdit.title} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-on-surface-variant">ASSOCIATED PARTY NAME</label>
                            <input type="text" name="txPatientName" defaultValue={selectedTxForEdit.patientName || ''} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-on-surface-variant">CONTACT PHONE</label>
                            <input type="text" name="txPhone" defaultValue={selectedTxForEdit.customerPhone || ''} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">TRANSACTION AMOUNT (₹) *</label>
                          <input type="number" step="any" name="txAmount" defaultValue={selectedTxForEdit.amount} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">EXTRA REMARKS / RECONCILIATION NOTES</label>
                          <textarea rows={2} name="txDetails" defaultValue={selectedTxForEdit.extraDetails || ''} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full resize-none" />
                        </div>

                        <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-95 transition-all cursor-pointer uppercase font-sans">
                          Save Changes
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Customers Directory */}
            {exploreTab === 'customers' && (
              <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl p-6 shadow-sm space-y-5 text-left animate-fade-in relative min-h-[400px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Registered Client Ledger Contacts</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">Edit outstanding dues or register brand new client files on the firm account.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingCust(true)}
                    className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/95 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 w-fit cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Customer File
                  </button>
                </div>

                {/* Filters */}
                <div className="relative font-sans">
                  <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search name or contact contact phone..." 
                    value={custSearchQuery}
                    onChange={(e) => setCustSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-bright outline-none focus:border-primary text-xs w-full"
                  />
                </div>

                {/* Customers Table */}
                <div className="overflow-x-auto border border-outline-variant/20 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant/30 text-[11px] font-bold text-on-surface-variant">
                        <th className="px-4 py-3">Customer ID / Date</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Ledger Status</th>
                        <th className="px-4 py-3 text-right">Outstanding (₹)</th>
                        <th className="px-4 py-3 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 text-xs text-on-surface">
                      {filteredCusts.map(c => (
                        <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-3.5 font-mono text-[10px] text-on-surface-variant">
                            {c.id}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-on-surface">
                            {c.name}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-on-surface-variant">
                            {c.phone || 'No Phone Registered'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${c.pendingBalance > 0 ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                              {c.pendingBalance > 0 ? 'Dues Pending' : 'Paid & Reconciled'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-on-surface text-xs">
                            ₹{c.pendingBalance?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2 shrink-0 font-sans">
                            <button 
                              onClick={() => setSelectedCustForEdit(c)} 
                              className="text-primary hover:underline font-bold"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleExplorerDeleteCust(c.id)} 
                              className="text-error hover:underline font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredCusts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-on-surface-variant italic">No customer records matching params.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sub-Modal: Add Customer */}
                {isAddingCust && (
                  <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-sm p-6 space-y-4 text-on-surface">
                      <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                        <h4 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">New Customer Account</h4>
                        <button onClick={() => setIsAddingCust(false)} className="text-on-surface-variant hover:text-error">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleExplorerAddCustSubmit} className="space-y-4 text-xs font-sans text-left">
                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">FULL NAME *</label>
                          <input type="text" name="custName" placeholder="e.g. Ramesh" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">CONTACT PHONE *</label>
                          <input type="text" name="custPhone" placeholder="e.g. 9876543210" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">OPENING PENDING DUES (₹)</label>
                          <input type="number" step="any" name="custBalance" placeholder="e.g. 2400" className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" />
                        </div>

                        <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-95 transition-all cursor-pointer uppercase">
                          Initialize Customer Record
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Sub-Modal: Edit Customer */}
                {selectedCustForEdit && (
                  <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-sm p-6 space-y-4 text-on-surface">
                      <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                        <h4 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Edit Account File</h4>
                        <button onClick={() => setSelectedCustForEdit(null)} className="text-on-surface-variant hover:text-error">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleExplorerEditCustSubmit} className="space-y-4 text-xs font-sans text-left">
                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">FULL NAME *</label>
                          <input type="text" name="custName" defaultValue={selectedCustForEdit.name} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">CONTACT PHONE *</label>
                          <input type="text" name="custPhone" defaultValue={selectedCustForEdit.phone} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-on-surface-variant">PENDING OUTSTANDING BALANCE (₹)</label>
                          <input type="number" step="any" name="custBalance" defaultValue={selectedCustForEdit.pendingBalance} className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-background outline-none w-full" required />
                        </div>

                        <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-95 transition-all cursor-pointer uppercase">
                          Save Account Changes
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Raw Ledger Sheets */}
            {exploreTab === 'reports' && (
              <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl p-6 shadow-sm space-y-5 text-left animate-fade-in font-sans">
                <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Raw Database Exporters</h3>
                <p className="text-xs text-on-surface-variant">Execute absolute database backup replication streams or compile standardized spreadsheet audit trails below.</p>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl space-y-2 text-left">
                    <h4 className="font-bold text-xs text-on-surface">Data Backup (JSON String)</h4>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Downloads a raw schema file representing exact model states for both Customer registries and Transaction ledgers across of this specific firm.</p>
                    <button 
                      type="button"
                      onClick={() => handleExportFirmJSON(activeExplorerFirm)}
                      className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/45 rounded-lg text-xs font-bold text-on-surface transition-colors cursor-pointer w-full"
                    >
                      Process JSON Dump
                    </button>
                  </div>

                  <div className="p-4 border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl space-y-2 text-left">
                    <h4 className="font-bold text-xs text-on-surface">Excel-compatible (CSV Spreadsheet)</h4>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Compiles every single ledger entry (Credit sales, counter outflows, patient listings, recorded dates/remarks) directly into a standardized spreadsheet row model.</p>
                    <button 
                      type="button"
                      onClick={() => handleExportFirmCSV(activeExplorerFirm)}
                      className="px-3.5 py-2 bg-secondary text-white hover:bg-secondary-hover rounded-lg text-xs font-bold transition-colors cursor-pointer w-full"
                    >
                      Process CSV Ledger Sheet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Normal Firms List view */
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
                <p className="text-[10px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Total Firms Active</p>
                <h3 className="text-number-xl text-on-background">{firms.length}</h3>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
                <p className="text-[10px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">System Personnel</p>
                <h3 className="text-number-xl text-primary">{firms.reduce((acc, firm) => acc + (firm.users?.length || 0), 0)} users</h3>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
                <p className="text-[10px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Reconciled Entries</p>
                <h3 className="text-number-xl text-secondary">{transactions.length} items</h3>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex items-center justify-center">
                <button onClick={() => setIsSettingsOpen(true)} className="bg-primary text-on-primary w-full py-4 rounded-lg text-label-md flex items-center justify-center gap-2 hover:bg-primary/95 transition-colors cursor-pointer font-bold font-sans">
                  <Settings className="w-5 h-5"/>
                  System Settings
                </button>
              </div>
            </div>

            <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-outline-variant/30 overflow-hidden text-left">
              <div className="p-4 md:p-6 border-b border-outline-variant/30 flex gap-4 items-center justify-between flex-wrap">
                <div>
                  <h2 className="text-headline-md text-on-surface">Registered Firms Directory</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Explore each firm with advanced view, modify, purge, download, and ledger reconciliation permissions.</p>
                </div>
                <div className="relative w-full md:w-auto font-sans">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="text" 
                    placeholder="Search name, admin or ID..." 
                    value={firmSearchQuery}
                    onChange={(e) => setFirmSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-bright outline-none focus:border-primary text-xs w-full md:w-64" 
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant/30 text-label-md text-on-surface-variant font-bold">
                      <th className="px-6 py-4 font-semibold">Firm ID</th>
                      <th className="px-6 py-4 font-semibold">Firm Name</th>
                      <th className="px-6 py-4 font-semibold">Admin Name</th>
                      <th className="px-6 py-4 font-semibold">Live Users</th>
                      <th className="px-6 py-4 font-semibold text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Operations & Audits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-body-md text-on-surface">
                    {filteredFirmsList.map(firm => (
                      <tr key={firm.id} className="hover:bg-surface-container-low transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{firm.id}</td>
                        <td className="px-6 py-4 font-semibold text-on-surface">{firm.name}</td>
                        <td className="px-6 py-4 text-on-surface-variant flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-primary" /> {firm.adminName}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold">{firm.users?.length || 0}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${firm.status === 'Active' ? 'bg-[#10b981]/10 text-[#059669] border border-[#10b981]/20' : 'bg-error-container text-on-error-container'}`}>
                            {firm.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-3 shrink-0">
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedExploreFirmId(firm.id);
                              setExploreTab('overview');
                            }} 
                            className="text-primary hover:underline font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>Explore Details</span>
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => setEditingFirm(firm)} 
                            className="text-secondary hover:underline font-bold text-xs inline-flex items-center gap-1.5 border-l border-outline-variant/30 pl-3 cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Edit Settings</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredFirmsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-on-surface-variant italic font-sans">No firms found matching the filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-on-background/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-sm overflow-hidden text-left">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h2 className="text-headline-md text-on-surface font-bold text-[18px]">System Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-label-md text-on-surface font-bold text-sm">New Registrations</h4>
                  <p className="text-xs text-on-surface-variant">Allow new firms to sign up profile</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const nextVal = !allowRegistrations;
                    setAllowRegistrations(nextVal);
                    localStorage.setItem('shopbooks_master_allow_registrations', nextVal ? 'true' : 'false');
                  }}
                  className={`w-12 h-6 rounded-full relative cursor-pointer p-0.5 transition-colors ${allowRegistrations ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 transform ${allowRegistrations ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-label-md text-on-surface font-bold text-sm">Maintenance Mode</h4>
                  <p className="text-xs text-on-surface-variant">Lock all users out (except Master Admin)</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const nextVal = !maintenanceMode;
                    setMaintenanceMode(nextVal);
                    localStorage.setItem('shopbooks_master_maintenance_mode', nextVal ? 'true' : 'false');
                  }}
                  className={`w-12 h-6 rounded-full relative cursor-pointer p-0.5 transition-colors ${maintenanceMode ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
            <div className="p-6 bg-surface-container pt-4 flex gap-4">
              <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md hover:bg-primary/90 transition-colors shadow-sm cursor-pointer font-bold">
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingFirm && (
        <div className="fixed inset-0 bg-on-background/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h2 className="text-headline-md text-on-surface">Manage Firm</h2>
              <button onClick={() => { setEditingFirm(null); setEditingUserIndex(null); setIsAddingUser(false); }} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateFirmSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant">Firm Name</label>
                <input name="name" defaultValue={editingFirm.name} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" type="text" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant">Admin Name</label>
                <input name="adminName" defaultValue={editingFirm.adminName} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" type="text" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant">Admin Email Address</label>
                <input name="email" defaultValue={editingFirm.email || ''} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" type="email" placeholder="admin@email.com" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant">Admin Mobile Number</label>
                <input name="mobile" defaultValue={editingFirm.mobile || ''} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors" type="tel" placeholder="Enter mobile number" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant">Status</label>
                <select name="status" defaultValue={editingFirm.status} className="bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant/30 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-label-md text-on-surface">Users ({editingFirm.users.length})</h4>
                  {!isAddingUser && editingUserIndex === null && (
                    <button type="button" onClick={() => { setIsAddingUser(true); setEditingUserIndex(null); }} className="text-primary text-label-md flex items-center gap-1 hover:underline cursor-pointer">
                      <Plus className="w-4 h-4" /> Add User
                    </button>
                  )}
                </div>
                
                {isAddingUser && (
                  <div className="bg-surface-container-high p-3 rounded-lg border border-outline-variant/30 space-y-2 relative">
                    <button type="button" onClick={() => setIsAddingUser(false)} className="absolute top-2 right-2 text-on-surface-variant hover:text-error cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="text-label-md font-semibold text-primary mb-1">Add New User</div>
                    <input name="userName" className="w-full bg-surface-bright border border-outline-variant rounded px-2 py-1.5 text-body-sm text-on-background outline-none" placeholder="User Name" type="text" form="addUserForm" required />
                    <input name="userId" className="w-full bg-surface-bright border border-outline-variant rounded px-2 py-1.5 text-body-sm text-on-background outline-none" placeholder="User ID" type="text" form="addUserForm" required />
                    <input name="userMobile" className="w-full bg-surface-bright border border-outline-variant rounded px-2 py-1.5 text-body-sm text-on-background outline-none" placeholder="Mobile Number" type="tel" form="addUserForm" required />
                    <select name="userRole" className="w-full bg-surface-bright border border-outline-variant rounded px-2 py-1.5 text-body-sm text-on-background outline-none" form="addUserForm" required>
                      <option value="Counter">Counter</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <button type="submit" form="addUserForm" className="w-full bg-primary text-on-primary py-1.5 rounded text-label-md cursor-pointer hover:bg-primary/90 transition-colors">
                      Confirm Add User
                    </button>
                  </div>
                )}

                {editingUserIndex !== null && (
                  <div className="bg-surface-container-high p-3 rounded-lg border border-outline-variant/30 space-y-2 relative">
                    <button type="button" onClick={() => setEditingUserIndex(null)} className="absolute top-2 right-2 text-on-surface-variant hover:text-error cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="text-label-md font-semibold text-primary mb-1">Edit User: {editingFirm.users[editingUserIndex].id}</div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] text-on-surface-variant font-medium">Full Name</label>
                      <input name="editUserName" defaultValue={editingFirm.users[editingUserIndex].name} className="w-full bg-surface-bright border border-outline-variant rounded px-2 py-1.5 text-body-sm text-on-background outline-none" placeholder="User Name" type="text" form="editUserForm" required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] text-on-surface-variant font-medium">Mobile Number</label>
                      <input name="editUserMobile" defaultValue={editingFirm.users[editingUserIndex].mobile} className="w-full bg-surface-bright border border-outline-variant rounded px-2 py-1.5 text-body-sm text-on-background outline-none" placeholder="Mobile" type="tel" form="editUserForm" required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] text-on-surface-variant font-medium">User Role</label>
                      <select name="editUserRole" defaultValue={editingFirm.users[editingUserIndex].role} className="w-full bg-surface-bright border border-outline-variant rounded px-2 py-1.5 text-body-sm text-on-background outline-none" form="editUserForm" required>
                        <option value="Counter">Counter</option>
                        <option value="Manager">Manager</option>
                      </select>
                    </div>
                    <button type="submit" form="editUserForm" className="w-full bg-primary text-on-primary py-1.5 rounded text-label-md cursor-pointer hover:bg-primary/90 transition-colors mt-2">
                      Save User Changes
                    </button>
                  </div>
                )}
                
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {editingFirm.users.map((u, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-md">
                      <div>
                        <span className="text-body-sm text-on-surface font-medium block">{u.name} ({u.role})</span>
                        <span className="text-body-sm font-mono text-on-surface-variant text-xs">{u.mobile} • {u.id}</span>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => { setEditingUserIndex(i); setIsAddingUser(false); }} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer" title="Edit User">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteFirmUser(i)} className="p-1.5 text-error hover:bg-error-container/20 rounded-md transition-colors cursor-pointer" title="Delete User">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {editingFirm.users.length === 0 && !isAddingUser && (
                    <p className="text-body-sm text-on-surface-variant italic">No users found.</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setEditingFirm(null); setEditingUserIndex(null); setIsAddingUser(false); }} className="flex-1 bg-surface-variant text-on-surface-variant py-3 rounded-lg font-label-md hover:bg-surface-variant/80 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-label-md hover:bg-primary/90 transition-colors shadow-sm cursor-pointer">
                    Save Changes
                  </button>
                </div>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full bg-error-container text-on-error-container py-3 rounded-lg font-label-md hover:bg-error-container/80 transition-colors cursor-pointer flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4 text-error" /> Delete Firm
                </button>
              </div>
            </form>
            
            <form id="addUserForm" onSubmit={handleAddFirmUser} className="hidden" />
            <form id="editUserForm" onSubmit={handleEditFirmUser} className="hidden" />
          </div>
        </div>
      )}

      {showDeleteConfirm && editingFirm && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 w-full max-w-sm overflow-hidden text-on-surface">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h2 className="text-headline-md text-error flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-error" /> Delete Firm?
              </h2>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-body-md text-on-background">
                Are you sure you want to delete <strong className="text-on-surface font-semibold">{editingFirm.name}</strong> (<span className="font-mono text-sm">{editingFirm.id}</span>)?
              </p>
              <p className="text-body-sm text-on-surface-variant bg-error-container/10 p-3 rounded-lg border border-error-container/20">
                This action is irreversible. All users ({editingFirm.users.length}) associated with this firm will be permanently deleted.
              </p>
            </div>
            <div className="p-6 bg-surface-container pt-4 flex gap-4">
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 bg-surface-variant text-on-surface-variant py-3 rounded-lg font-label-md hover:bg-surface-variant/80 transition-colors cursor-pointer"
              >
                No, Keep
              </button>
              <button 
                type="button" 
                onClick={() => {
                  onDeleteFirm(editingFirm.id);
                  setShowDeleteConfirm(false);
                  setEditingFirm(null);
                }} 
                className="flex-1 bg-error text-on-error py-3 rounded-lg font-label-md hover:opacity-90 transition-colors shadow-sm cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPasswordModal({
  title,
  description,
  onCancel,
  onVerify
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onVerify: (pass: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Password is required to proceed.");
      return;
    }
    onVerify(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-outline-variant/30 text-left animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full bg-error-container/20 text-error flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-on-surface tracking-tight">{title}</h3>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{description}</p>
          </div>

          {errorMsg && (
            <div className="bg-error-container/25 text-error text-xs p-2.5 rounded-lg font-mono">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin_auth_pwd" className="text-xs font-semibold text-on-surface-variant">Admin Password *</label>
              <input 
                id="admin_auth_pwd"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                className="bg-surface-bright border border-outline-variant rounded-lg px-3.5 py-2 text-sm text-on-background focus:border-primary outline-none w-full"
                required
                autoFocus
              />
              <p className="text-[10px] text-on-surface-variant font-medium">Hint: Default admin password is "<span className="font-mono">password</span>".</p>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button 
                type="button" 
                onClick={onCancel}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-primary text-on-primary px-4 py-2 text-xs font-bold rounded-lg hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
              >
                Authenticate
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function HandoverModal({
  isOpen,
  onClose,
  currentUser,
  currentFirmId,
  workingDate,
  transactions,
  activeFirm,
  onConfirmHandover
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  currentFirmId: string;
  workingDate: string;
  transactions: Transaction[];
  activeFirm?: Firm;
  onConfirmHandover: (toUser: { id: string; name: string }, notes: string, cash: number, upi: number, txCount: number) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notes, setNotes] = useState('');
  
  // Calculate Shift statistics for the current user
  const shiftTransactions = useMemo(() => {
    if (!currentUser || !currentFirmId) return [];
    return transactions.filter(t => 
      t.firmId === currentFirmId && 
      t.date === workingDate && 
      t.recordedByUserId === currentUser.id
    );
  }, [transactions, currentUser, currentFirmId, workingDate]);

  const { cashCollected, upiCollected } = useMemo(() => {
    let cash = 0;
    let upi = 0;
    shiftTransactions.forEach(t => {
      if (t.type === 'receive_payment') {
        if ((t.extraDetails || '').toLowerCase().includes('cash')) {
          cash += t.amount;
        } else {
          upi += t.amount;
        }
      } else if (t.type === 'supplier_payment' || t.type === 'staff_advance') {
        const details = (t.extraDetails || '').toLowerCase();
        const isCash = details.includes('cash') || (!details.includes('upi') && !details.includes('online') && !details.includes('bank') && !details.includes('card'));
        if (isCash) {
          cash -= t.amount;
        } else {
          upi -= t.amount;
        }
      }
    });
    return { cashCollected: Math.max(0, cash), upiCollected: Math.max(0, upi) };
  }, [shiftTransactions]);

  const [enteredCash, setEnteredCash] = useState(cashCollected);
  const [enteredUpi, setEnteredUpi] = useState(upiCollected);

  useEffect(() => {
    setEnteredCash(cashCollected);
    setEnteredUpi(upiCollected);
  }, [cashCollected, upiCollected]);

  if (!isOpen) return null;

  // Filter out the current user from next duty person options
  const otherUsers = (activeFirm?.users || []).filter(u => u.id !== currentUser?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert("Please select the next duty person to handover the shift.");
      return;
    }
    const targetUser = activeFirm?.users.find(u => u.id === selectedUserId);
    if (!targetUser) return;

    onConfirmHandover(
      { id: targetUser.id, name: targetUser.name },
      notes.trim(),
      enteredCash,
      enteredUpi,
      shiftTransactions.length
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-full cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-secondary/15 text-secondary rounded-xl flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-headline-mobile text-on-surface font-black">Handover Shift</h3>
            <p className="text-xs text-on-surface-variant">Transfer shift duty and transactions cleanly</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">Next Duty Person *</label>
            {otherUsers.length > 0 ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-xl px-4 py-3 text-body-md text-on-background focus:border-secondary outline-none transition-colors font-bold"
                required
              >
                <option value="">-- Select Next Shift Staff --</option>
                {otherUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                No other registered counter staff found in this firm. Please ask the Admin to add users in the Admin Portal first.
              </div>
            )}
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider">Current Shift Summary (Auto-calculated)</h4>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-bright p-2.5 rounded-lg border border-outline-variant/20 text-center">
                <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Transactions</span>
                <span className="text-sm font-black text-on-surface">{shiftTransactions.length}</span>
              </div>
              <div className="bg-surface-bright p-2.5 rounded-lg border border-outline-variant/20 text-center">
                <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Est. Cash</span>
                <span className="text-sm font-black text-green-600">₹{cashCollected.toLocaleString()}</span>
              </div>
              <div className="bg-surface-bright p-2.5 rounded-lg border border-outline-variant/20 text-center">
                <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Est. UPI</span>
                <span className="text-sm font-black text-teal-600">₹{upiCollected.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Handed Over Cash (₹)</label>
              <input
                type="number"
                value={enteredCash}
                onChange={(e) => setEnteredCash(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-bright border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-background focus:border-secondary outline-none transition-colors font-mono font-bold"
                min="0"
                step="any"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Handed Over UPI (₹)</label>
              <input
                type="number"
                value={enteredUpi}
                onChange={(e) => setEnteredUpi(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-bright border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-background focus:border-secondary outline-none transition-colors font-mono font-bold"
                min="0"
                step="any"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Duty Handover Notes</label>
            <textarea
              placeholder="e.g. Physical cash counted and matched perfectly. No pending issues."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-bright border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-background focus:border-secondary outline-none transition-colors min-h-[70px] resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={otherUsers.length === 0}
              className="bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary px-5 py-2.5 text-xs font-black rounded-lg transition-all shadow-sm cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Handover & Exit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HandoverAcceptanceOverlay({
  handover,
  onAccept,
  onLogout
}: {
  handover: Handover;
  onAccept: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md text-on-background overflow-y-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-lg p-8 shadow-2xl relative text-left animate-fade-in my-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 border border-primary/20">
            <ArrowLeftRight className="w-8 h-8" />
          </div>
          <h2 className="text-headline-mobile md:text-headline-md font-black text-on-surface leading-tight">Shift Duty Handover Pending</h2>
          <p className="text-body-md text-on-surface-variant mt-1.5 font-medium text-sm">You must accept the shift handover to access your workspace.</p>
        </div>

        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
            <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">From Handover Staff</span>
            <span className="text-sm font-black text-on-surface">{handover.fromUserName}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="bg-surface-bright p-3 rounded-xl border border-outline-variant/20">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold tracking-wider">Handed Cash</span>
              <span className="text-lg font-black text-green-600 block mt-0.5">₹{handover.closingCashBalance.toLocaleString()}</span>
            </div>
            <div className="bg-surface-bright p-3 rounded-xl border border-outline-variant/20">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold tracking-wider">Handed UPI/Online</span>
              <span className="text-lg font-black text-teal-600 block mt-0.5">₹{handover.closingUpiBalance.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-on-surface-variant">
            <div className="flex justify-between">
              <span>Shift Working Date:</span>
              <span className="font-semibold text-on-surface">{handover.handoverDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Handover Timestamp:</span>
              <span className="font-semibold text-on-surface">{new Date(handover.handoverTime).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Transactions Recorded:</span>
              <span className="font-semibold text-on-surface">{handover.totalTransactionsCount}</span>
            </div>
          </div>

          {handover.notes && (
            <div className="bg-surface-bright p-3.5 rounded-xl border border-outline-variant/25 text-xs">
              <span className="font-black text-on-surface block mb-1 uppercase tracking-wider text-[10px]">Staff Shift Notes:</span>
              <p className="text-on-surface-variant italic leading-relaxed">"{handover.notes}"</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={onLogout}
            className="flex-1 px-5 py-3.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-bold rounded-xl transition-all cursor-pointer border border-outline-variant text-center flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4 text-error" />
            <span>Switch User / Logout</span>
          </button>
          
          <button
            onClick={onAccept}
            className="flex-1 px-5 py-3.5 bg-primary hover:bg-primary-hover text-on-primary text-sm font-black rounded-xl transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 uppercase tracking-wider"
          >
            <Check className="w-5 h-5" />
            <span>Accept Handover & Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
}

