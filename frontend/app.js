const catalog = document.getElementById('catalog');
const cartEl = document.getElementById('cart');
const openCart = document.getElementById('openCart');
const adminBtn = document.getElementById('admin');
const searchInput = document.getElementById('search');
const categoryFilter = document.getElementById('categoryFilter');

let savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
let allProducts = [];

function renderSavedItems() {
  cartEl.style.display = 'block';
  if (!savedItems.length) {
    cartEl.innerHTML = '<h3>Obserwowane (0)</h3><p>Brak zapisanych ogłoszeń.</p>';
    return;
  }
  cartEl.innerHTML = `<h3>Obserwowane (${savedItems.length})</h3>` +
    savedItems.map((item) => `<div class="cart-item">${item.title} — ${item.price} USD</div>`).join('');
}

openCart.addEventListener('click', () => { renderSavedItems(); });
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
    return `<div class="card"><img class="card-image" src="${imageUrl}" alt="${p.title}" /><div class="card-body"><h3>${p.title}</h3><p>${p.description}</p><div class="meta">${p.category || 'Elektronika'} • ${p.location || 'Lublin'}</div><div class="price">${p.price} USD</div><div class="card-actions"><a class="btn" href="product.html?id=${p.id}">Zobacz</a><button class="save-btn" data-id="${p.id}">Obserwuj</button></div></div></div>`;
  }).join('')}</div>`;
  catalog.querySelectorAll('button.save-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const prod = list.find((x) => x.id === id);
      if (!savedItems.find((item) => item.id === id)) {
        savedItems.push(prod);
        localStorage.setItem('savedItems', JSON.stringify(savedItems));
        renderSavedItems();
        alert('Dodano do obserwowanych');
      }
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
