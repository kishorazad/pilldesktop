const API = import.meta.env.VITE_API_URL;

// 🔐 Safe fetch wrapper (handles errors)
const safeFetch = async (url: string) => {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error("API Error:", res.status, url);
      throw new Error("API request failed");
    }

    return await res.json();
  } catch (error) {
    console.error("Fetch failed:", error);
    return null;
  }
};

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

  // ✅ Search products (frontend filtering)
  searchProducts: async (query: string) => {
    const data = await safeFetch(`${API}/api/products`);

    const products = Array.isArray(data?.products) ? data.products : [];

    return products.filter((item: any) =>
      item?.name?.toLowerCase().includes(query.toLowerCase())
    );
  }
};
