

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PAYSTACK_CONFIG = {
  publicKey: "pk_test_e834b66e91d78396a162552e8d3af770ac932269",
  baseUrl: "https://js.paystack.co/v1/inline.js",
};

export function validateCustomerDetails(customerData) {
  const errors = {};

  if (!customerData.firstName || customerData.firstName.trim() === "") {
    errors.firstName = "First name is required!";
  }

  if (!customerData.lastName || customerData.lastName.trim() === "") {
    errors.lastName = "Last name is required!";
  }

  if (!customerData.email || customerData.email.trim() === "") {
    errors.email = "Email is required!";
  } else if (!isValidEmail(customerData.email)) {
    errors.email = "Please enter a valid email!";
  }

  if (!customerData.phone || customerData.phone.trim() === "") {
    errors.phone = "Phone number is required!";
  } else if (!isValidPhone(customerData.phone)) {
    errors.phone = "Please enter a valid phone number!";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateDeliveryAddress(deliveryData) {
  const errors = {};

  if (!deliveryData.address || deliveryData.address.trim() === "") {
    errors.address = "Delivery address is required";
  }

  if (!deliveryData.city || deliveryData.city.trim() === "") {
    errors.city = "City is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone) {
  const phoneRegex = /^(\+233|0)[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

export function createOrderData(orderData) {
  return {
    customerName: `${orderData.firstName} ${orderData.lastName}`,
    firstName: orderData.firstName,
    lastName: orderData.lastName,
    email: orderData.email,
    phone: orderData.phone,

    deliveryMethod: orderData.deliveryMethod || "pickup",
    address: orderData.address || "Store Pickup",
    city: orderData.city || "",
    landmark: orderData.landmark || "",

    cartItems: orderData.cartItems || [],
    itemCount: orderData.cartItems?.length || 0,

    subtotal: orderData.subtotal || 0,
    deliveryFee: orderData.deliveryFee || 0,
    totalAmount: orderData.totalAmount || 0,
    paymentMethod: orderData.paymentMethod || "paystack",
    paymentReference: orderData.paymentReference || "",
    paymentStatus: orderData.paymentStatus || "Paid",

    notes: orderData.notes || "",

    createdAt: serverTimestamp(),
    estimatedDelivery: calculateEstimatedDelivery(orderData.deliveryMethod),
  };
}

export function calculateEstimatedDelivery(deliveryMethod) {
  const now = new Date();

  if (deliveryMethod === "pickup") {
    now.setMinutes(now.getMinutes() + 30);
  } else {
    now.setHours(now.getHours() + 1);
  }

  return now;
}

export async function saveOrderToFirestore(orderData) {
  try {
    const formattedOrder = createOrderData(orderData);
    const docRef = await addDoc(collection(db, "orders"), formattedOrder);
    return docRef.id;
  } catch (error) {
    console.error("Error saving order to Firestore:", error);
    throw new Error("Failed to save order. Please contact support.");
  }
}

export function initializePaystack(paystackConfig) {
  if (typeof window.PaystackPop === "undefined") {
    console.error("Paystack script not loaded");
    throw new Error("Payment service not available");
  }
}

export function processPaystackPayment(paymentData, onSuccess, onError) {
  if (typeof window.PaystackPop === "undefined") {
    onError(new Error("Payment service not available"));
    return;
  }

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_CONFIG.publicKey,
    email: paymentData.email,
    amount: Math.round(paymentData.amount * 100),
    currency: "GHS",
    ref: generatePaymentReference(),
    metadata: {
      custom_fields: [
        {
          display_name: "Customer Name",
          variable_name: "customer_name",
          value: paymentData.customerName,
        },
        {
          display_name: "Phone",
          variable_name: "phone",
          value: paymentData.phone,
        },
        {
          display_name: "Delivery Method",
          variable_name: "delivery_method",
          value: paymentData.deliveryMethod,
        },
      ],
    },
    onClose: () => {
      onError(new Error("Payment cancelled"));
    },
    callback: (response) => {
      onSuccess(response);
    },
  });

  handler.openIframe();
}

export function generatePaymentReference() {
  return "SWL-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}

export async function verifyPaystackPayment(reference) {
  try {
    return {
      verified: true,
      reference: reference,
    };
  } catch (error) {
    console.error("Payment verification error:", error);
    throw error;
  }
}

export function calculateOrderTotal(subtotal, deliveryFee = 0, tax = 0) {
  return subtotal + deliveryFee + tax;
}

export function formatCurrency(amount) {
  return (
    "₵" +
    Number(amount).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function getDeliveryFee(deliveryMethod) {
  const fees = {
    pickup: 0,
    delivery: 15,
  };

  return fees[deliveryMethod] || 0;
}

export function validateCart(cartItems) {
  if (!cartItems || !Array.isArray(cartItems)) {
    return {
      isValid: false,
      error: "Invalid cart data",
    };
  }

  if (cartItems.length === 0) {
    return {
      isValid: false,
      error: "Cart is empty",
    };
  }

  const allValid = cartItems.every(
    (item) => item.id && item.name && item.price && item.qty,
  );

  if (!allValid) {
    return {
      isValid: false,
      error: "Some cart items have missing information",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

export function createOrderSummary(cartItems, subtotal, deliveryFee) {
  return {
    items: cartItems,
    itemCount: cartItems.length,
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    total: subtotal + deliveryFee,
    summary: {
      formattedSubtotal: formatCurrency(subtotal),
      formattedDeliveryFee: formatCurrency(deliveryFee),
      formattedTotal: formatCurrency(subtotal + deliveryFee),
    },
  };
}

export function generateOrderReceipt(order) {
  const itemsList = order.cartItems
    .map(
      (item) =>
        `<tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(item.price * item.qty)}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="text-align: center; color: #2563eb;">Order Receipt</h2>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${order.customerName}</p>
        <p><strong>Email:</strong> ${order.email}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Item</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">Qty</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">Price</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <div style="text-align: right; margin-bottom: 20px;">
        <p><strong>Subtotal:</strong> ${formatCurrency(order.subtotal)}</p>
        <p><strong>Delivery Fee:</strong> ${formatCurrency(order.deliveryFee)}</p>
        <p style="font-size: 18px; color: #2563eb;"><strong>Total: ${formatCurrency(order.totalAmount)}</strong></p>
      </div>

      <hr style="border: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #666;">Payment Reference: ${order.paymentReference}</p>
    </div>
  `;
}

export default {
  validateCustomerDetails,
  validateDeliveryAddress,
  isValidEmail,
  isValidPhone,
  createOrderData,
  saveOrderToFirestore,
  calculateOrderTotal,
  formatCurrency,
  getDeliveryFee,
  validateCart,
  createOrderSummary,
  generateOrderReceipt,
  processPaystackPayment,
  generatePaymentReference,
  verifyPaystackPayment,
};
