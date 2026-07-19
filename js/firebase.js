import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmCp7BxLGDrCpffS5Y5X355z6Z4ErY3vs",
  authDomain: "shop-management-system-e67d8.firebaseapp.com",
  projectId: "shop-management-system-e67d8",
  storageBucket: "shop-management-system-e67d8.firebasestorage.app",
  messagingSenderId: "456374654862",
  appId: "1:456374654862:web:bcd3d45ee8f6f346dcf6df",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
