import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDocFromServer,
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Silence verbose SDK warning logs (like "Could not reach Cloud Firestore backend")
setLogLevel('error');

// Authentication helper
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isIgnorableOrQuotaError = 
    errMsg.includes('offline') || 
    errMsg.includes('Backend didn\'t respond') || 
    errMsg.includes('Could not reach Cloud Firestore') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('network') ||
    errMsg.includes('deadline-exceeded') ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('quota') ||
    errMsg.includes('PERMISSION_DENIED') ||
    errMsg.includes('permission-denied');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isIgnorableOrQuotaError) {
    console.warn(`Firestore operating in fallback/offline mode [${operationType} on ${path}]:`, errMsg);
    return;
  }

  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}

// 1. Connection Validation check with graceful timeout
export async function testFirestoreConnection() {
  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection check timed out')), 4000)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeout
    ]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("Firestore connection check notice (operating in offline/cached mode):", msg);
  }
}

// 2. Auth State bootstrap: Make sure everyone is authenticated (at least anonymously) so we always have a valid session matching Firestore permissions
export function setupSessionAutologin(onUserChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn("Anonymous login is disabled or restricted in this Firebase environment. Operating as unauthenticated guest.");
        onUserChange(null);
      }
    } else {
      onUserChange(user);
    }
  });
}

// 3. Database CRUD Helpers
export async function dbFetchFirms(): Promise<any[]> {
  const path = 'firms';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function dbSaveFirm(firm: any): Promise<void> {
  const path = `firms/${firm.id}`;
  try {
    await setDoc(doc(db, 'firms', firm.id), firm);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteFirm(firmId: string): Promise<void> {
  const path = `firms/${firmId}`;
  try {
    await deleteDoc(doc(db, 'firms', firmId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function dbFetchTransactions(): Promise<any[]> {
  const path = 'transactions';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function dbSaveTransaction(tx: any): Promise<void> {
  const path = `transactions/${tx.id}`;
  try {
    await setDoc(doc(db, 'transactions', tx.id), tx);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteTransaction(txId: string): Promise<void> {
  const path = `transactions/${txId}`;
  try {
    await deleteDoc(doc(db, 'transactions', txId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function dbFetchCustomers(): Promise<any[]> {
  const path = 'customers';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function dbSaveCustomer(cust: any): Promise<void> {
  const path = `customers/${cust.id}`;
  try {
    await setDoc(doc(db, 'customers', cust.id), cust);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteCustomer(custId: string): Promise<void> {
  const path = `customers/${custId}`;
  try {
    await deleteDoc(doc(db, 'customers', custId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function dbFetchDailyRegisters(): Promise<Record<string, any>> {
  const path = 'firmDailyRegisters';
  try {
    const snap = await getDocs(collection(db, path));
    const result: Record<string, any> = {};
    snap.docs.forEach(doc => {
      result[doc.id] = doc.data();
    });
    return result;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return {};
  }
}

export async function dbSaveDailyRegister(recordId: string, data: any): Promise<void> {
  const path = `firmDailyRegisters/${recordId}`;
  try {
    await setDoc(doc(db, 'firmDailyRegisters', recordId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteDailyRegister(recordId: string): Promise<void> {
  const path = `firmDailyRegisters/${recordId}`;
  try {
    await deleteDoc(doc(db, 'firmDailyRegisters', recordId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Google Sign In trigger
export async function triggerGoogleSignIn() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err) {
    console.error("Google Sign In failed:", err);
    throw err;
  }
}

// Sign Out trigger
export async function triggerSignOut() {
  try {
    await signOut(auth);
    try {
      await signInAnonymously(auth);
    } catch {
      // Ignored if anonymous authentication is disabled on the project
    }
  } catch (err) {
    console.error("Sign out failed:", err);
  }
}

// 4. Real-time Subscription Help Functions
export function dbSubscribeFirms(onUpdate: (firms: any[]) => void, onError?: (err: Error) => void) {
  const path = 'firms';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

export function dbSubscribeTransactions(onUpdate: (txs: any[]) => void, onError?: (err: Error) => void) {
  const path = 'transactions';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

export function dbSubscribeCustomers(onUpdate: (custs: any[]) => void, onError?: (err: Error) => void) {
  const path = 'customers';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

export function dbSubscribeDailyRegisters(onUpdate: (registers: Record<string, any>) => void, onError?: (err: Error) => void) {
  const path = 'firmDailyRegisters';
  return onSnapshot(collection(db, path), (snap) => {
    const result: Record<string, any> = {};
    snap.docs.forEach(doc => {
      result[doc.id] = doc.data();
    });
    onUpdate(result);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

export async function dbSaveHandover(handover: any): Promise<void> {
  const path = `handovers/${handover.id}`;
  try {
    await setDoc(doc(db, 'handovers', handover.id), handover);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function dbSubscribeHandovers(onUpdate: (handovers: any[]) => void, onError?: (err: Error) => void) {
  const path = 'handovers';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

export async function dbSaveBackup(backupId: string, backupData: any): Promise<void> {
  const path = `backups/${backupId}`;
  try {
    await setDoc(doc(db, 'backups', backupId), backupData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbFetchDeletedTransactions(): Promise<any[]> {
  const path = 'deletedTransactions';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function dbSaveDeletedTransaction(tx: any): Promise<void> {
  const path = `deletedTransactions/${tx.id}`;
  try {
    await setDoc(doc(db, 'deletedTransactions', tx.id), tx);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteDeletedTransaction(txId: string): Promise<void> {
  const path = `deletedTransactions/${txId}`;
  try {
    await deleteDoc(doc(db, 'deletedTransactions', txId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function dbSubscribeDeletedTransactions(onUpdate: (txs: any[]) => void, onError?: (err: Error) => void) {
  const path = 'deletedTransactions';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

// 5. Cashless Claims (MJPJAY & Insurance) DB Helpers
export async function dbFetchCashlessClaims(): Promise<any[]> {
  const path = 'cashlessClaims';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function dbSaveCashlessClaim(claim: any): Promise<void> {
  const path = `cashlessClaims/${claim.id}`;
  try {
    await setDoc(doc(db, 'cashlessClaims', claim.id), claim);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteCashlessClaim(claimId: string): Promise<void> {
  const path = `cashlessClaims/${claimId}`;
  try {
    await deleteDoc(doc(db, 'cashlessClaims', claimId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function dbSubscribeCashlessClaims(onUpdate: (claims: any[]) => void, onError?: (err: Error) => void) {
  const path = 'cashlessClaims';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

// 6. Credit Reminders & Follow-ups DB Helpers
export async function dbSaveCreditReminder(reminder: any): Promise<void> {
  const path = `creditReminders/${reminder.id}`;
  try {
    await setDoc(doc(db, 'creditReminders', reminder.id), reminder);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function dbSubscribeCreditReminders(onUpdate: (reminders: any[]) => void, onError?: (err: Error) => void) {
  const path = 'creditReminders';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}

// 7. Staff Attendance & Shift Tracking DB Helpers
export async function dbFetchStaffAttendance(): Promise<any[]> {
  const path = 'staffAttendance';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function dbSaveStaffAttendance(attendance: any): Promise<void> {
  const path = `staffAttendance/${attendance.id}`;
  try {
    await setDoc(doc(db, 'staffAttendance', attendance.id), attendance);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteStaffAttendance(attendanceId: string): Promise<void> {
  const path = `staffAttendance/${attendanceId}`;
  try {
    await deleteDoc(doc(db, 'staffAttendance', attendanceId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function dbSubscribeStaffAttendance(onUpdate: (records: any[]) => void, onError?: (err: Error) => void) {
  const path = 'staffAttendance';
  return onSnapshot(collection(db, path), (snap) => {
    const data = snap.docs.map(doc => doc.data());
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  });
}


