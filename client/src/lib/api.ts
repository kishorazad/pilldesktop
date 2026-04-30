const API = import.meta.env.VITE_API_URL;

export const api = {
  getProducts: async () => {
    const res = await fetch(`${API}/api/products`);
    return res.json();
  },

  searchProducts: async (query: string) => {
    const res = await fetch(`${API}/api/products`);
    const data = await res.json();

    return (data.products || []).filter((item: any) =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  }
};
