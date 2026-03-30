import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCSyuvUQGV3Ua2hp5sVBsRXX06F4uNvFEI",
  authDomain: "revizbot.firebaseapp.com",
  projectId: "revizbot",
  storageBucket: "revizbot.firebasestorage.app",
  messagingSenderId: "254109344178",
  appId: "1:254109344178:web:deb49dbe4dda93717644ab",
  measurementId: "G-5CK8W2E0J2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
export const registerWithEmail = (email, password, name) =>
  createUserWithEmailAndPassword(auth, email, password).then(async (cred) => {
    await updateProfile(cred.user, { displayName: name });
    return cred;
  });
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
