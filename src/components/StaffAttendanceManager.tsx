import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  LogIn, 
  LogOut, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Timer, 
  Coffee, 
  FileSpreadsheet,
  Briefcase,
  Phone,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import { Firm, FirmUser, getLocalDateString } from '../App';

export type ShiftType = 'Morning' | 'Evening' | 'Night' | 'Full Day';
export type AttendanceStatus = 'Present' | 'Half Day' | 'Absent' | 'On Leave';

export interface StaffAttendanceRecord {
  id: string;
  firmId: string;
  staffId: string;
  staffName: string;
  staffMobile?: string;
  role?: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  status: AttendanceStatus;
  checkInTime: string; // e.g. "09:00"
  checkOutTime?: string; // e.g. "18:00"
  totalHours?: number;
  overtimeHours?: number;
  notes?: string;
  recordedByUserId?: string;
  recordedByUserName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface StaffAttendanceManagerProps {
  activeFirm: Firm;
  currentUser?: { id: string; name: string; role: string; mobile?: string };
  attendanceRecords: StaffAttendanceRecord[];
  onSaveAttendance: (record: StaffAttendanceRecord) => void;
  onDeleteAttendance: (recordId: string) => void;
  workingDate: string;
}

export function StaffAttendanceManager({
  activeFirm,
  currentUser,
  attendanceRecords,
  onSaveAttendance,
  onDeleteAttendance,
  workingDate
}: StaffAttendanceManagerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(workingDate || getLocalDateString());
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'history'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  
  // Modal states
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaffForAction, setSelectedStaffForAction] = useState<FirmUser | null>(null);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<StaffAttendanceRecord | null>(null);

  // Form states
  const [formShiftType, setFormShiftType] = useState<ShiftType>('Morning');
  const [formStatus, setFormStatus] = useState<AttendanceStatus>('Present');
  const [formCheckInTime, setFormCheckInTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formCheckOutTime, setFormCheckOutTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formNotes, setFormNotes] = useState<string>('');
  const [formStaffId, setFormStaffId] = useState<string>('');

  // Monthly summary selection
  const [selectedMonth, setSelectedMonth] = useState<string>(() => (workingDate || getLocalDateString()).substring(0, 7));
  const [selectedStaffForMonthly, setSelectedStaffForMonthly] = useState<string>('all');

  const firmUsers = useMemo(() => activeFirm.users || [], [activeFirm]);

  // Records for the selected firm
  const firmAttendance = useMemo(() => {
    return attendanceRecords.filter(r => r.firmId === activeFirm.id);
  }, [attendanceRecords, activeFirm.id]);

  // Records for selected date
  const dateRecords = useMemo(() => {
    return firmAttendance.filter(r => r.date === selectedDate);
  }, [firmAttendance, selectedDate]);

  // Map of staffId -> AttendanceRecord for selectedDate
  const staffRecordMap = useMemo(() => {
    const map = new Map<string, StaffAttendanceRecord>();
    dateRecords.forEach(r => {
      map.set(r.staffId, r);
    });
    return map;
  }, [dateRecords]);

  // Statistics for selected date
  const stats = useMemo(() => {
    let present = 0;
    let onDuty = 0;
    let checkedOut = 0;
    let halfDay = 0;
    let absent = 0;
    let totalHours = 0;

    dateRecords.forEach(r => {
      if (r.status === 'Present' || r.status === 'Half Day') {
        present++;
        if (r.status === 'Half Day') halfDay++;
        if (r.checkOutTime) {
          checkedOut++;
          totalHours += (r.totalHours || 0);
        } else {
          onDuty++;
        }
      } else {
        absent++;
      }
    });

    const unrecorded = Math.max(0, firmUsers.length - dateRecords.length);

    return {
      totalStaff: firmUsers.length,
      present,
      onDuty,
      checkedOut,
      halfDay,
      absent,
      unrecorded,
      totalHours: Number(totalHours.toFixed(1))
    };
  }, [firmUsers.length, dateRecords]);

  // Helper to compute hours difference
  const calculateHours = (inTime: string, outTime: string): number => {
    if (!inTime || !outTime) return 0;
    try {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMinutes < 0) {
        // Crossed midnight
        diffMinutes += 24 * 60;
      }
      return Number((diffMinutes / 60).toFixed(1));
    } catch (e) {
      return 0;
    }
  };

  // Quick Date Navigation
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateString(d));
  };

  // Open Check-In for specific user
  const openCheckInForUser = (user?: FirmUser) => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (user) {
      setSelectedStaffForAction(user);
      setFormStaffId(user.id);
    } else if (firmUsers.length > 0) {
      setSelectedStaffForAction(firmUsers[0]);
      setFormStaffId(firmUsers[0].id);
    }
    
    setFormShiftType('Morning');
    setFormStatus('Present');
    setFormCheckInTime(currentTimeStr);
    setFormNotes('');
    setIsCheckInModalOpen(true);
  };

  // Open Check-Out for specific user
  const openCheckOutForUser = (record: StaffAttendanceRecord) => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setSelectedRecordForEdit(record);
    setFormCheckOutTime(currentTimeStr);
    setFormNotes(record.notes || '');
    setIsCheckOutModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (record: StaffAttendanceRecord) => {
    setSelectedRecordForEdit(record);
    setFormStaffId(record.staffId);
    setFormShiftType(record.shiftType);
    setFormStatus(record.status);
    setFormCheckInTime(record.checkInTime || '09:00');
    setFormCheckOutTime(record.checkOutTime || '');
    setFormNotes(record.notes || '');
    setIsEditModalOpen(true);
  };

  // Save Check-In Handler
  const handleSaveCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = firmUsers.find(u => u.id === formStaffId);
    if (!staff) {
      alert('Please select a valid staff member');
      return;
    }

    const newRecord: StaffAttendanceRecord = {
      id: `ATT_${activeFirm.id}_${staff.id}_${selectedDate.replace(/-/g, '')}`,
      firmId: activeFirm.id,
      staffId: staff.id,
      staffName: staff.name,
      staffMobile: staff.mobile,
      role: staff.role,
      date: selectedDate,
      shiftType: formShiftType,
      status: formStatus,
      checkInTime: formCheckInTime,
      notes: formNotes,
      recordedByUserId: currentUser?.id || 'admin',
      recordedByUserName: currentUser?.name || 'Manager / Admin',
      createdAt: new Date().toISOString()
    };

    onSaveAttendance(newRecord);
    setIsCheckInModalOpen(false);
  };

  // Save Check-Out Handler
  const handleSaveCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForEdit) return;

    const totalHrs = calculateHours(selectedRecordForEdit.checkInTime, formCheckOutTime);
    const overtimeHrs = Math.max(0, Number((totalHrs - 8.0).toFixed(1)));

    const updated: StaffAttendanceRecord = {
      ...selectedRecordForEdit,
      checkOutTime: formCheckOutTime,
      totalHours: totalHrs,
      overtimeHours: overtimeHrs,
      notes: formNotes,
      updatedAt: new Date().toISOString()
    };

    onSaveAttendance(updated);
    setIsCheckOutModalOpen(false);
    setSelectedRecordForEdit(null);
  };

  // Quick 1-Click Check In with Defaults
  const handleQuickCheckIn = (user: FirmUser, shift: ShiftType = 'Morning') => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: StaffAttendanceRecord = {
      id: `ATT_${activeFirm.id}_${user.id}_${selectedDate.replace(/-/g, '')}`,
      firmId: activeFirm.id,
      staffId: user.id,
      staffName: user.name,
      staffMobile: user.mobile,
      role: user.role,
      date: selectedDate,
      shiftType: shift,
      status: 'Present',
      checkInTime: currentTimeStr,
      notes: 'Quick check-in via Admin Portal',
      recordedByUserId: currentUser?.id || 'admin',
      recordedByUserName: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString()
    };

    onSaveAttendance(newRecord);
  };

  // Quick Mark Absent
  const handleQuickMarkAbsent = (user: FirmUser, reason: 'Absent' | 'On Leave' = 'Absent') => {
    const newRecord: StaffAttendanceRecord = {
      id: `ATT_${activeFirm.id}_${user.id}_${selectedDate.replace(/-/g, '')}`,
      firmId: activeFirm.id,
      staffId: user.id,
      staffName: user.name,
      staffMobile: user.mobile,
      role: user.role,
      date: selectedDate,
      shiftType: 'Full Day',
      status: reason,
      checkInTime: '-',
      checkOutTime: '-',
      totalHours: 0,
      notes: `Marked ${reason} by Admin`,
      recordedByUserId: currentUser?.id || 'admin',
      recordedByUserName: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString()
    };

    onSaveAttendance(newRecord);
  };

  // Update Existing Record
  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForEdit) return;

    const staff = firmUsers.find(u => u.id === formStaffId) || {
      id: selectedRecordForEdit.staffId,
      name: selectedRecordForEdit.staffName,
      role: selectedRecordForEdit.role,
      mobile: selectedRecordForEdit.staffMobile
    };

    let totalHrs = 0;
    let overtimeHrs = 0;
    if (formCheckInTime && formCheckOutTime && formCheckInTime !== '-' && formCheckOutTime !== '-') {
      totalHrs = calculateHours(formCheckInTime, formCheckOutTime);
      overtimeHrs = Math.max(0, Number((totalHrs - 8.0).toFixed(1)));
    }

    const updatedRecord: StaffAttendanceRecord = {
      ...selectedRecordForEdit,
      staffId: staff.id,
      staffName: staff.name,
      staffMobile: staff.mobile,
      role: staff.role,
      date: selectedDate,
      shiftType: formShiftType,
      status: formStatus,
      checkInTime: formCheckInTime,
      checkOutTime: formCheckOutTime || undefined,
      totalHours: totalHrs,
      overtimeHours: overtimeHrs,
      notes: formNotes,
      updatedAt: new Date().toISOString()
    };

    onSaveAttendance(updatedRecord);
    setIsEditModalOpen(false);
    setSelectedRecordForEdit(null);
  };

  // Print Muster Roll / Daily Sheet
  const handlePrintDailyRoster = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    const recordsToExport = viewMode === 'history' ? firmAttendance : dateRecords;
    if (recordsToExport.length === 0) {
      alert('No attendance records to export.');
      return;
    }

    const headers = [
      'Date',
      'Staff Name',
      'Staff ID',
      'Role',
      'Shift Type',
      'Status',
      'Check-In Time',
      'Check-Out Time',
      'Total Hours',
      'Overtime Hours',
      'Notes',
      'Recorded By'
    ];

    const csvRows = [
      headers.join(','),
      ...recordsToExport.map(r => [
        `"${r.date}"`,
        `"${r.staffName}"`,
        `"${r.staffId}"`,
        `"${r.role || ''}"`,
        `"${r.shiftType}"`,
        `"${r.status}"`,
        `"${r.checkInTime}"`,
        `"${r.checkOutTime || 'On Duty'}"`,
        `"${r.totalHours || 0}"`,
        `"${r.overtimeHours || 0}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        `"${r.recordedByUserName || ''}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_attendance_${activeFirm.id}_${selectedDate}.csv`;
    link.click();
  };

  // Monthly summary calculations
  const monthlySummary = useMemo(() => {
    const monthPrefix = selectedMonth; // e.g. "2026-08"
    const monthRecords = firmAttendance.filter(r => r.date.startsWith(monthPrefix));

    const staffStats: Record<string, {
      user: FirmUser;
      presentDays: number;
      halfDays: number;
      absentDays: number;
      totalHours: number;
      overtimeHours: number;
      records: StaffAttendanceRecord[];
    }> = {};

    firmUsers.forEach(u => {
      staffStats[u.id] = {
        user: u,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        totalHours: 0,
        overtimeHours: 0,
        records: []
      };
    });

    monthRecords.forEach(r => {
      if (!staffStats[r.staffId]) {
        staffStats[r.staffId] = {
          user: { id: r.staffId, name: r.staffName, role: r.role || 'Staff', mobile: r.staffMobile || '' },
          presentDays: 0,
          halfDays: 0,
          absentDays: 0,
          totalHours: 0,
          overtimeHours: 0,
          records: []
        };
      }

      staffStats[r.staffId].records.push(r);
      if (r.status === 'Present') {
        staffStats[r.staffId].presentDays++;
        staffStats[r.staffId].totalHours += (r.totalHours || 0);
        staffStats[r.staffId].overtimeHours += (r.overtimeHours || 0);
      } else if (r.status === 'Half Day') {
        staffStats[r.staffId].halfDays++;
        staffStats[r.staffId].totalHours += (r.totalHours || 0);
      } else if (r.status === 'Absent' || r.status === 'On Leave') {
        staffStats[r.staffId].absentDays++;
      }
    });

    return Object.values(staffStats);
  }, [firmAttendance, firmUsers, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Top Header & View Modes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Shift & Roster Management
            </span>
            <span className="text-xs text-on-surface-variant font-semibold">
              Firm: {activeFirm.name}
            </span>
          </div>
          <h2 className="text-headline-md font-black text-on-background tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-primary" />
            Staff Attendance & Daily Shift Logs
          </h2>
          <p className="text-body-md text-on-surface-variant text-xs mt-0.5">
            Log shift check-ins, check-outs, duty hours, and track employee roster attendance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-surface-container-low p-1 rounded-xl flex items-center border border-outline-variant/30">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'daily' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              Daily Shift Log
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'monthly' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Monthly Timesheets
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'history' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              All Logs
            </button>
          </div>

          <button
            onClick={() => openCheckInForUser()}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Log Shift Check-In
          </button>
        </div>
      </div>

      {/* Daily Mode View */}
      {viewMode === 'daily' && (
        <>
          {/* Date Selector Banner & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Date Navigator Card */}
            <div className="lg:col-span-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                  Select Working Shift Date
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleShiftDate(-1)}
                    className="p-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors cursor-pointer text-on-surface"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1 bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-sm font-black text-on-background focus:border-primary outline-none text-center"
                  />
                  <button 
                    onClick={() => handleShiftDate(1)}
                    className="p-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors cursor-pointer text-on-surface"
                    title="Next Day"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/20">
                <button
                  onClick={() => setSelectedDate(workingDate || getLocalDateString())}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Jump to Today ({workingDate || getLocalDateString()})
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintDailyRoster}
                    className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
                    title="Print Daily Sheet"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
                    title="Export CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Present Today</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.present} <span className="text-xs font-normal text-on-surface-variant">/ {stats.totalStaff}</span>
                  </h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {stats.halfDay > 0 ? `${stats.halfDay} half-day` : 'All regular shifts'}
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">On Duty Now</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-black animate-pulse">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {stats.onDuty}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    Checked in, shift active
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
                    <LogOut className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {stats.checkedOut}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    Shift check-outs logged
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Logged Hours</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
                    <Timer className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {stats.totalHours} <span className="text-xs font-normal text-on-surface-variant">hrs</span>
                  </h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {stats.absent > 0 ? `${stats.absent} Absent/Leave` : 'Full team attendance'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Staff Roster Grid */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-on-background flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Staff Duty Roster ({selectedDate})
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Showing all {firmUsers.length} registered pharmacy staff members for the selected date.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff name or role..."
                    className="bg-surface-bright border border-outline-variant/40 rounded-xl pl-9 pr-3 py-1.5 text-xs text-on-background focus:border-primary outline-none w-56"
                  />
                </div>
              </div>
            </div>

            {firmUsers.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant">
                <Users className="w-12 h-12 mx-auto text-on-surface-variant/40 mb-3" />
                <h4 className="text-base font-bold text-on-background">No Staff Members Registered</h4>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
                  Add staff members in the "Manage Employees" tab first to start tracking their daily shift attendance.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {firmUsers
                  .filter(u => {
                    const matchQuery = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       (u.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                       u.id.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchQuery;
                  })
                  .map(user => {
                    const record = staffRecordMap.get(user.id);
                    const isCheckedIn = record && (record.status === 'Present' || record.status === 'Half Day');
                    const hasCheckedOut = !!(record && record.checkOutTime && record.checkOutTime !== '-');
                    const isAbsent = record && (record.status === 'Absent' || record.status === 'On Leave');

                    return (
                      <div key={user.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-high/30 transition-colors">
                        {/* Staff Profile & Info */}
                        <div className="flex items-center gap-3.5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border ${
                            isCheckedIn && !hasCheckedOut
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 ring-2 ring-emerald-500/20'
                              : hasCheckedOut
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : isAbsent
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
                          }`}>
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-on-background">{user.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/20">
                                {user.role || 'Staff'}
                              </span>
                              {user.salary ? (
                                <span className="text-[10px] font-mono text-on-surface-variant">
                                  ₹{user.salary.toLocaleString()}/mo
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1">
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                ID: {user.id}
                              </span>
                              {user.mobile && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {user.mobile}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Shift Status & Timing Block */}
                        <div className="flex items-center gap-6">
                          {record ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-container-low/80 px-4 py-2.5 rounded-xl border border-outline-variant/30">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  {isCheckedIn && !hasCheckedOut ? (
                                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                      ON DUTY ({record.shiftType})
                                    </span>
                                  ) : hasCheckedOut ? (
                                    <span className="flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      COMPLETED ({record.shiftType})
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400">
                                      <XCircle className="w-3.5 h-3.5" />
                                      {record.status.toUpperCase()}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-xs font-mono font-bold text-on-background">
                                  {record.status === 'Present' || record.status === 'Half Day' ? (
                                    <>
                                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                        <LogIn className="w-3 h-3" /> In: {record.checkInTime}
                                      </span>
                                      <span className="text-on-surface-variant/40">|</span>
                                      <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                                        <LogOut className="w-3 h-3" /> Out: {record.checkOutTime || 'Active'}
                                      </span>
                                      {record.totalHours ? (
                                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-black">
                                          {record.totalHours} hrs
                                        </span>
                                      ) : null}
                                    </>
                                  ) : (
                                    <span className="text-rose-600 text-xs italic font-normal">
                                      {record.notes || 'Marked as absent/leave'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-on-surface-variant italic px-3 py-1.5 rounded-lg bg-surface-container-high/40">
                              No shift logged yet for today
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {record ? (
                              <>
                                {!hasCheckedOut && (record.status === 'Present' || record.status === 'Half Day') ? (
                                  <button
                                    onClick={() => openCheckOutForUser(record)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                                  >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Log Check-Out
                                  </button>
                                ) : null}

                                <button
                                  onClick={() => openEditModal(record)}
                                  className="p-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                                  title="Edit Attendance Entry"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove attendance log for ${user.name} on ${selectedDate}?`)) {
                                      onDeleteAttendance(record.id);
                                    }
                                  }}
                                  className="p-2 rounded-xl border border-outline-variant/40 hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                  title="Delete Entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleQuickCheckIn(user, 'Morning')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                                >
                                  <LogIn className="w-3.5 h-3.5" />
                                  Check In
                                </button>
                                <button
                                  onClick={() => openCheckInForUser(user)}
                                  className="border border-outline-variant/40 hover:bg-surface-container-high text-on-surface px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                                  title="Custom Shift Check-In"
                                >
                                  Custom...
                                </button>
                                <button
                                  onClick={() => handleQuickMarkAbsent(user, 'Absent')}
                                  className="border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                                >
                                  Absent
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Monthly Timesheets Mode */}
      {viewMode === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-on-background flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Monthly Staff Timesheets & Shift Breakdown
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Aggregated monthly shift hours, present days, and shift statistics for payroll and duty auditing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-black text-on-background focus:border-primary outline-none"
              />
              <button
                onClick={handleExportCSV}
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-outline-variant/30 transition-all"
              >
                <Download className="w-4 h-4" />
                Export Timesheets
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlySummary.map(summary => (
              <div key={summary.user.id} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                        {summary.user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-on-background">{summary.user.name}</h4>
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          Role: {summary.user.role || 'Staff'}
                        </span>
                      </div>
                    </div>
                    {summary.user.salary ? (
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                        ₹{summary.user.salary.toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 text-center">
                    <div>
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Present</span>
                      <span className="text-base font-black text-emerald-600">{summary.presentDays}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Half Days</span>
                      <span className="text-base font-black text-amber-600">{summary.halfDays}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Absent</span>
                      <span className="text-base font-black text-rose-600">{summary.absentDays}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant px-1">
                    <span>Total Hours Logged:</span>
                    <span className="text-on-background font-mono">{summary.totalHours} hrs</span>
                  </div>
                  {summary.overtimeHours > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-primary px-1 mt-1">
                      <span>Overtime (&gt;8h/shift):</span>
                      <span className="font-mono">+{summary.overtimeHours} hrs</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Logged Records: {summary.records.length}</span>
                  <button 
                    onClick={() => {
                      setViewMode('history');
                      setSearchQuery(summary.user.name);
                    }}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    View Shift Logs &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Mode View */}
      {viewMode === 'history' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-on-background flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Comprehensive Staff Attendance History
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Total {firmAttendance.length} attendance events logged across all dates.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by staff name, date, role..."
                  className="bg-surface-bright border border-outline-variant/40 rounded-xl pl-9 pr-3 py-1.5 text-xs text-on-background focus:border-primary outline-none w-60"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-bright border border-outline-variant/40 rounded-xl px-3 py-1.5 text-xs font-bold text-on-background focus:border-primary outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-outline-variant/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30 text-[11px] font-black uppercase text-on-surface-variant tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Shift Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Hours</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {firmAttendance
                  .filter(r => {
                    const matchQuery = r.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                       r.date.includes(searchQuery) ||
                                       (r.role || '').toLowerCase().includes(searchQuery.toLowerCase());
                    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
                    return matchQuery && matchStatus;
                  })
                  .map(record => (
                    <tr key={record.id} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-on-background">
                        {record.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-on-background">{record.staffName}</div>
                        <div className="text-[10px] text-on-surface-variant font-mono">{record.staffId} • {record.role || 'Staff'}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-on-surface">
                        {record.shiftType}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          record.status === 'Present' 
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : record.status === 'Half Day'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                        {record.checkInTime}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-700 dark:text-blue-300 font-bold">
                        {record.checkOutTime || (
                          <span className="text-amber-600 italic font-sans font-normal">Active (Pending)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-on-background">
                        {record.totalHours ? `${record.totalHours}h` : '-'}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant max-w-xs truncate">
                        {record.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-1.5 rounded-lg border border-outline-variant/30 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete attendance record for ${record.staffName} on ${record.date}?`)) {
                                onDeleteAttendance(record.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-outline-variant/30 hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Check-In */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h3 className="text-base font-black text-on-background flex items-center gap-2">
                <LogIn className="w-5 h-5 text-emerald-600" />
                Log Staff Shift Check-In
              </h3>
              <button 
                onClick={() => setIsCheckInModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCheckIn} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Select Staff Member</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm font-bold text-on-background focus:border-primary outline-none"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {firmUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role || 'Staff'}) - ID: {u.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Duty Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-background focus:border-primary outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={formCheckInTime}
                    onChange={(e) => setFormCheckInTime(e.target.value)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-on-background focus:border-primary outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Shift Type</label>
                  <select
                    value={formShiftType}
                    onChange={(e) => setFormShiftType(e.target.value as ShiftType)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-background focus:border-primary outline-none"
                  >
                    <option value="Morning">Morning Shift (09:00 - 17:00)</option>
                    <option value="Evening">Evening Shift (14:00 - 22:00)</option>
                    <option value="Night">Night Shift (20:00 - 08:00)</option>
                    <option value="Full Day">Full Day Shift</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Attendance Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-background focus:border-primary outline-none"
                  >
                    <option value="Present">Present (Regular)</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Duty Notes / Shift Handover Remark</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Counter 1 Billing, Store Inventory Duty"
                  className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-background focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsCheckInModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Check-Out */}
      {isCheckOutModalOpen && selectedRecordForEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h3 className="text-base font-black text-on-background flex items-center gap-2">
                <LogOut className="w-5 h-5 text-indigo-600" />
                Log Staff Shift Check-Out
              </h3>
              <button 
                onClick={() => setIsCheckOutModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high"
              >
                ✕
              </button>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
              <div className="text-sm font-black text-on-background">{selectedRecordForEdit.staffName}</div>
              <div className="text-xs text-on-surface-variant font-mono mt-0.5">
                Check-In Time: <span className="text-emerald-600 font-bold">{selectedRecordForEdit.checkInTime}</span> ({selectedRecordForEdit.shiftType})
              </div>
            </div>

            <form onSubmit={handleSaveCheckOut} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Check-Out Time</label>
                <input
                  type="time"
                  value={formCheckOutTime}
                  onChange={(e) => setFormCheckOutTime(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-on-background focus:border-primary outline-none"
                  required
                />
              </div>

              {formCheckOutTime && selectedRecordForEdit.checkInTime && (
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-bold">Estimated Shift Duration:</span>
                  <span className="text-primary font-black font-mono">
                    {calculateHours(selectedRecordForEdit.checkInTime, formCheckOutTime)} hours
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">End of Shift Notes / Handover</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Handed over counter cash, closed day shift"
                  className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-background focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsCheckOutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Save Shift Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Attendance */}
      {isEditModalOpen && selectedRecordForEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h3 className="text-base font-black text-on-background flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                Edit Attendance Record
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Staff Member</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-background focus:border-primary outline-none"
                  required
                >
                  {firmUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={formCheckInTime}
                    onChange={(e) => setFormCheckInTime(e.target.value)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-on-background focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={formCheckOutTime}
                    onChange={(e) => setFormCheckOutTime(e.target.value)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-on-background focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Shift Type</label>
                  <select
                    value={formShiftType}
                    onChange={(e) => setFormShiftType(e.target.value as ShiftType)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-background focus:border-primary outline-none"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="Full Day">Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                    className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-background focus:border-primary outline-none"
                  >
                    <option value="Present">Present</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Remarks / Reason</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Adjusted check-out time"
                  className="w-full bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-background focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
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
