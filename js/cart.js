export function getCart() {
  return JSON.parse(localStorage.getItem("swl_cart") || "[]");
}

export function saveCart(cart) {
  localStorage.setItem("swl_cart", JSON.stringify(cart));
  updateCartCount();
}

export function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((i) => i.id === product.id);

  if (existing) {
    if (existing.qty >= product.stock) {
      showToast(`Only ${product.stock} available`, "error");
      return false;
    }
    existing.qty++;
  } else {
    if (product.stock <= 0) {
      showToast("Out of stock", "error");
      return false;
    }
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      imageAsset: product.imageAsset || null,
      stock: product.stock,
      qty: 1,
    });
  }

  saveCart(cart);
  showToast(
    `${product.name} added to cart <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6"/></svg>`,
    "success",
  );
  return true;
}

export function removeFromCart(productId) {
  const cart = getCart().filter((i) => i.id !== productId);
  saveCart(cart);
}

export function updateQty(productId, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (qty > item.stock) {
    showToast(`Only ${item.stock} available`, "error");
    return;
  }

  item.qty = qty;
  saveCart(cart);
}

export function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

export function clearCart() {
  localStorage.removeItem("swl_cart");
  updateCartCount();
}

export function updateCartCount() {
  const count = getCartCount();
  document.querySelectorAll(".cart-count").forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

export function getWishlist() {
  return JSON.parse(localStorage.getItem("swl_wishlist") || "[]");
}

export function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

export function toggleWishlist(productId) {
  let list = getWishlist();
  const inList = list.includes(productId);
  if (inList) {
    list = list.filter((id) => id !== productId);
  } else {
    list.push(productId);
  }
  localStorage.setItem("swl_wishlist", JSON.stringify(list));
  return !inList;
}

export function getImageUrl(imageAsset) {
  if (!imageAsset) return null;
  const filename = imageAsset.split("/").pop();
  return "images/" + filename;
}

export function formatMoney(amount) {
  return (
    "₵" +
    Number(amount).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function showToast(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.innerHTML = message;
  toast.className = `toast ${type} show`;

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
