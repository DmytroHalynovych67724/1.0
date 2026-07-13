const catalog = document.getElementById('catalog');
const cartEl = document.getElementById('cart');
const openCart = document.getElementById('openCart');
const adminBtn = document.getElementById('admin');
const searchInput = document.getElementById('search');
const categoryFilter = document.getElementById('categoryFilter');

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let allProducts = [];

function renderCart() {
  cartEl.style.display = 'block';
  cartEl.innerHTML = `<h3>Koszyk (${cart.length})</h3>` +
    cart.map(c=>`<div class="cart-item">${c.title} — ${c.price} USD</div>`).join('') +
    `<div style="margin-top:1rem;"><button id="checkout">Checkout (sim)</button></div>`;
  const chk = document.getElementById('checkout');
  if (chk) chk.addEventListener('click', ()=>{ alert('Checkout simulated'); cart = []; localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); });
}

openCart.addEventListener('click', () => { renderCart(); });
adminBtn.addEventListener('click', () => { window.open('admin.html', '_blank'); });

function filterProducts() {
  const query = searchInput.value.toLowerCase();
  const category = categoryFilter.value;
  return allProducts.filter((product) => {
    const matchesQuery = !query || `${product.title} ${product.description} ${product.location}`.toLowerCase().includes(query);
    const matchesCategory = !category || product.category === category;
    return matchesQuery && matchesCategory;
  });
}

function renderProducts(list) {
  catalog.innerHTML = `<div class="card-grid">${list.map((p) => {
    const images = Array.isArray(p.images) && p.images.length ? p.images : ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80'];
    const imageUrl = images[0];
    return `<div class="card"><img class="card-image" src="${imageUrl}" alt="${p.title}" /><div class="card-body"><h3>${p.title}</h3><p>${p.description}</p><div class="meta">${p.category || 'General'} • ${p.location || 'Unknown'}</div><div class="price">${p.price} USD</div><div class="card-actions"><a class="btn" href="product.html?id=${p.id}">Szczegóły</a><button data-id="${p.id}">Do koszyka</button></div></div></div>`;
  }).join('')}</div>`;
  catalog.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const prod = list.find((x) => x.id === id);
      cart.push(prod);
      localStorage.setItem('cart', JSON.stringify(cart));
      alert('Dodano do koszyka');
    });
  });
}

async function loadProducts() {
  allProducts = await fetchProducts();
  renderProducts(filterProducts());
}

searchInput.addEventListener('input', () => renderProducts(filterProducts()));
categoryFilter.addEventListener('change', () => renderProducts(filterProducts()));

loadProducts();
