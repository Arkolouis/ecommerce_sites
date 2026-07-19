import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function getOrderById(orderId) {
  try {
    const docRef = doc(db, "orders", orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting order:", error);
    return null;
  }
}

export async function getOrdersByEmail(email) {
  try {
    const q = query(
      collection(db, "orders"),
      where("email", "==", email),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting orders:", error);
    return [];
  }
}

export function getStatusBadge(status) {
  const config = {
    pending: { label: "Pending", color: "#f59e0b", bg: "#fef9c3" },
    confirmed: { label: "Confirmed", color: "#2563eb", bg: "#eff6ff" },
    processing: { label: "Processing", color: "#7c3aed", bg: "#f5f3ff" },
    ready: { label: "Ready", color: "#16a34a", bg: "#dcfce7" },
    delivered: { label: "Delivered", color: "#16a34a", bg: "#dcfce7" },
    cancelled: { label: "Cancelled", color: "#dc2626", bg: "#fee2e2" },
  };

  const s = config[status] || config.pending;
  return `<span style="
    display:inline-block;
    padding:3px 12px;
    border-radius:20px;
    font-size:12px;
    font-weight:700;
    color:${s.color};
    background:${s.bg};
  ">${s.label}</span>`;
}

export default { getOrderById, getOrdersByEmail, getStatusBadge };
