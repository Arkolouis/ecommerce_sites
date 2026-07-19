import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function fetchAllProducts() {
  try {
    const q = query(collection(db, "products"));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

export async function fetchProductsByCategory(category) {
  try {
    const q = query(
      collection(db, "products"),
      where("category", "==", category),
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }
}

export async function fetchProductById(productId) {
  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error("Product not found");
    }
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
}

export async function fetchFeaturedProducts() {
  try {
    const q = query(collection(db, "products"), limit(8));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching featured products:", error);
    throw error;
  }
}

export function searchProducts(searchTerm, products) {
  if (!searchTerm || searchTerm.trim() === "") {
    return products;
  }

  const term = searchTerm.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term),
  );
}

export function filterByCategory(category, products) {
  if (!category || category === "") {
    return products;
  }
  return products.filter((p) => p.category === category);
}

export function sortProducts(products, sortBy) {
  const sorted = [...products];

  switch (sortBy) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);

    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);

    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case "newest":
      return sorted.sort((a, b) => {
        const aDate = a.createdAt?.seconds || 0;
        const bDate = b.createdAt?.seconds || 0;
        return bDate - aDate;
      });

    default:
      return sorted;
  }
}

export function getCategories(products) {
  const categories = new Set(products.map((p) => p.category));
  return Array.from(categories).sort();
}

export async function getRelatedProducts(
  category,
  currentProductId,
  limitNum = 4,
) {
  try {
    const q = query(
      collection(db, "products"),
      where("category", "==", category),
      limit(limitNum + 1),
    );
    const snap = await getDocs(q);
    const products = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((p) => p.id !== currentProductId)
      .slice(0, limitNum);

    return products;
  } catch (error) {
    console.error("Error fetching related products:", error);
    return [];
  }
}

export function checkStockStatus(product) {
  if (product.stock <= 0) {
    return {
      available: false,
      status: "Out of Stock",
      icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>`,
      class: "stock-out",
    };
  }

  if (product.stock < 5) {
    return {
      available: true,
      status: `Only ${product.stock} left`,
      icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="0.75" fill="currentColor" stroke="none"/></svg>`,
      class: "stock-low",
    };
  }

  return {
    available: true,
    status: `${product.stock} in stock`,
    icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5.5"/></svg>`,
    class: "stock-ok",
  };
}

export function renderProductsGrid(products, containerId, onProductClick) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Container with ID ${containerId} not found`);
    return;
  }

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; padding: 60px 24px; text-align: center;">
        <div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg></div>
        <h3>No products found</h3>
        <p>Try adjusting your filters or search</p>
      </div>`;
    return;
  }

  container.innerHTML = "";

  products.forEach((product) => {
    const card = createProductCard(product, onProductClick);
    container.appendChild(card);
  });
}

export function createProductCard(product, onProductClick) {
  const stock = checkStockStatus(product);
  const packageIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>`;
  const card = document.createElement("div");
  card.className = "product-card";
  card.innerHTML = `
    <div class="product-card-image">
      ${
        product.imageAsset
          ? `<img src="${product.imageAsset}" alt="${product.name}">`
          : packageIcon
      }
    </div>
    <div class="product-card-body">
      <div class="product-card-name">${product.name}</div>
      <div class="product-card-price">
        ₵${product.price.toFixed(2)}
      </div>
      <div class="product-card-stock ${stock.class}">
        ${stock.icon} ${stock.status}
      </div>
      <button class="btn btn-primary" style="width:100%;padding:8px;font-size:13px;" 
        ${!stock.available ? "disabled" : ""}>
        ${!stock.available ? "Out of Stock" : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/><path d="M2 3h2l2.6 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg> Add to Cart`}
      </button>
    </div>`;

  const img = card.querySelector("img");
  if (img) {
    img.addEventListener("error", () => {
      img.parentElement.innerHTML = packageIcon;
    });
  }

  card.addEventListener("click", () => {
    if (onProductClick) {
      onProductClick(product);
    }
  });

  return card;
}

export function getDiscountInfo(product) {
  if (product.originalPrice && product.originalPrice > product.price) {
    const discount = Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100,
    );
    return {
      hasDiscount: true,
      originalPrice: product.originalPrice,
      discount: discount,
    };
  }

  return {
    hasDiscount: false,
    originalPrice: null,
    discount: 0,
  };
}

export function paginateProducts(products, currentPage = 1, itemsPerPage = 12) {
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  return {
    products: products.slice(startIndex, endIndex),
    currentPage,
    totalPages,
    totalItems: products.length,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
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

export function processProducts(
  products,
  options = {
    search: "",
    category: "",
    sortBy: "newest",
  },
) {
  let result = [...products];

  if (options.search) {
    result = searchProducts(options.search, result);
  }

  if (options.category) {
    result = filterByCategory(options.category, result);
  }

  if (options.sortBy) {
    result = sortProducts(result, options.sortBy);
  }

  return result;
}

export default {
  fetchAllProducts,
  fetchProductsByCategory,
  fetchProductById,
  fetchFeaturedProducts,
  searchProducts,
  filterByCategory,
  sortProducts,
  getCategories,
  getRelatedProducts,
  checkStockStatus,
  renderProductsGrid,
  createProductCard,
  getDiscountInfo,
  paginateProducts,
  formatCurrency,
  processProducts,
};
