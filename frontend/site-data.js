const FALLBACK_PRODUCTS = [
  {
    id: 'demo-1',
    title: 'Aurora Lamp',
    description: 'Minimal desk lamp for modern interiors.',
    price: 49
  },
  {
    id: 'demo-2',
    title: 'Nimbus Chair',
    description: 'Comfortable ergonomic chair for focused work.',
    price: 129
  },
  {
    id: 'demo-3',
    title: 'Terra Backpack',
    description: 'Everyday backpack with a clean, practical design.',
    price: 79
  }
];

function getStoredProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem('demo-products') || 'null');
    if (Array.isArray(stored) && stored.length) {
      return stored;
    }
  } catch (error) {
    console.warn('Unable to read demo products from storage', error);
  }

  return FALLBACK_PRODUCTS;
}

function saveProducts(products) {
  localStorage.setItem('demo-products', JSON.stringify(products));
}

async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        return data;
      }
    }
  } catch (error) {
    console.warn('API unavailable, using demo products', error);
  }

  return getStoredProducts();
}

function findProductById(products, id) {
  return products.find((product) => product.id === id) || null;
}
