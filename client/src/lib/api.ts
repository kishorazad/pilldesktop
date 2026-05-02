// 🔐 API Base URL
const API = import.meta.env.VITE_API_URL || "https://api.pillnow.in";

// 🔐 Safe fetch wrapper
const safeFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("❌ API Error:", res.status, url);
      return null;
    }

    return await res.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("⏱️ Timeout:", url);
    } else {
      console.error("❌ Fetch failed:", error);
    }
    return null;
  }
};

// 🚀 API SERVICE
export const api = {
  // ✅ Get all products
  getProducts: async () => {
    const data = await safeFetch(`${API}/api/products`);
    return data || { products: [] };
  },

  // ✅ Get categories
  getCategories: async () => {
    const data = await safeFetch(`${API}/api/categories`);
    return data || { categories: [] };
  },

  // ⚠️ FIXED: Get product by ID (NO API CALL)
  getProductById: async (id: number | string) => {
    const data = await safeFetch(`${API}/api/products`);
    const products = Array.isArray(data?.products) ? data.products : [];

    return products.find((p: any) => String(p.id) === String(id)) || null;
  },

  // ✅ Search products (frontend filtering)
  searchProducts: async (query: string) => {
    if (!query.trim()) return [];

    const data = await safeFetch(`${API}/api/products`);
    const products = Array.isArray(data?.products) ? data.products : [];

    return products.filter((item: any) =>
      item?.name?.toLowerCase().includes(query.toLowerCase().trim())
    );
  },
};
