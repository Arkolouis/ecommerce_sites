

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function enableSessionPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("Session persistence enabled");
  } catch (error) {
    console.error("Error enabling session persistence:", error);
  }
}

export async function registerUser(email, password, name) {
  try {
    const validation = validateRegistration(email, password, name);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: name,
    });

    await createUserProfile(user.uid, {
      name: name,
      email: email,
      createdAt: new Date(),
    });

    return {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      success: true,
    };
  } catch (error) {
    console.error("Registration error:", error);
    throw new Error(error.message || "Registration failed");
  }
}

export async function loginUser(email, password) {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    const userProfile = await getUserProfile(user.uid);

    return {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      profile: userProfile,
      success: true,
    };
  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Login failed";

    if (error.code === "auth/user-not-found") {
      errorMessage = "User not found";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address";
    }

    throw new Error(errorMessage);
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem("swl_user");
    console.log("User logged out");
  } catch (error) {
    console.error("Logout error:", error);
    throw new Error("Logout failed");
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userProfile = await getUserProfile(user.uid);
      callback({
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        profile: userProfile,
      });
    } else {
      callback(null);
    }
  });
}

export async function createUserProfile(uid, profileData) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      await addDoc(collection(db, "users"), {
        uid: uid,
        ...profileData,
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
}

export async function getUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

export async function updateUserProfile(uid, updates) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    if (updates.name && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updates.name,
      });
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

export function isAuthenticated() {
  return auth.currentUser !== null;
}

export async function isEmailVerified() {
  const user = auth.currentUser;
  if (!user) return false;

  await user.reload();
  return user.emailVerified;
}

export async function sendPasswordResetEmail(email) {
  try {
    await auth.sendPasswordResetEmail(email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

export function validateRegistration(email, password, name) {
  if (!email || !password || !name) {
    return {
      isValid: false,
      error: "All fields are required",
    };
  }

  if (!isValidEmail(email)) {
    return {
      isValid: false,
      error: "Invalid email address",
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: "Password must be at least 6 characters",
    };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: "Name must be at least 2 characters",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function saveUserSession(user) {
  localStorage.setItem("swl_user", JSON.stringify(user));
}

export function getUserSession() {
  const session = localStorage.getItem("swl_user");
  return session ? JSON.parse(session) : null;
}

export function clearUserSession() {
  localStorage.removeItem("swl_user");
}

export async function getUserOrders(uid) {
  try {
    const { collection, getDocs, query, where } =
      await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

    const q = query(collection(db, "orders"), where("uid", "==", uid));
    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting user orders:", error);
    return [];
  }
}

export async function getUserAddresses(uid) {
  try {
    const userProfile = await getUserProfile(uid);
    return userProfile?.addresses || [];
  } catch (error) {
    console.error("Error getting user addresses:", error);
    return [];
  }
}

export async function saveUserAddress(uid, address) {
  try {
    const userProfile = await getUserProfile(uid);
    const addresses = userProfile?.addresses || [];
    addresses.push({
      ...address,
      id: Date.now().toString(),
      savedAt: new Date(),
    });

    await updateUserProfile(uid, { addresses });
  } catch (error) {
    console.error("Error saving address:", error);
    throw error;
  }
}

export default {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  watchAuthState,
  getUserProfile,
  updateUserProfile,
  isAuthenticated,
  isEmailVerified,
  sendPasswordResetEmail,
  validateRegistration,
  isValidEmail,
  saveUserSession,
  getUserSession,
  clearUserSession,
  getUserOrders,
  getUserAddresses,
  saveUserAddress,
  enableSessionPersistence,
};
