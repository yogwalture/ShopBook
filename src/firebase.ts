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
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection Validation check as per skills
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
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
