const FALLBACK_PRODUCTS = [
  {
    id: 'demo-1',
    title: 'Aurora Lamp',
    description: 'Minimal desk lamp for modern interiors.',
    price: 49,
    category: 'Akcesoria',
    location: 'Lublin',
    images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80']
  },
  {
    id: 'demo-2',
    title: 'Nimbus Chair',
    description: 'Comfortable ergonomic chair for focused work.',
    price: 129,
    category: 'Gaming',
    location: 'Kraków',
    images: ['https://images.unsplash.com/photo-1519947486511-46149fa0a254?auto=format&fit=crop&w=800&q=80']
  },
  {
    id: 'demo-3',
    title: 'Terra Backpack',
    description: 'Everyday backpack with a clean, practical design.',
    price: 79,
    category: 'Akcesoria',
    location: 'Warszawa',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80']
  }
];

function normalizeProduct(product) {
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
      ];

  return {
    ...product,
    id: product.id || `demo-${Date.now()}`,
    title: product.title || 'Nowe ogłoszenie',
    description: product.description || 'Brak opisu.',
    price: Number(product.price) || 0,
    category: product.category || 'Elektronika',
    location: product.location || 'Lublin',
    images
  };
}

function getStoredProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem('demo-products') || 'null');
    if (Array.isArray(stored) && stored.length) {
      return stored.map(normalizeProduct);
    }
  } catch (error) {
    console.warn('Unable to read demo products from storage', error);
  }

  return FALLBACK_PRODUCTS.map(normalizeProduct);
}

function saveProducts(products) {
  localStorage.setItem('demo-products', JSON.stringify(products.map(normalizeProduct)));
}

function addProduct(product) {
  const list = getStoredProducts();
  const newProduct = normalizeProduct({ ...product, id: product.id || `demo-${Date.now()}` });
  list.unshift(newProduct);
  saveProducts(list);
  return newProduct;
}

function removeProduct(id) {
  const list = getStoredProducts().filter((product) => product.id !== id);
  saveProducts(list);
  return list;
}

async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        return data.map(normalizeProduct);
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
