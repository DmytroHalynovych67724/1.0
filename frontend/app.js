const catalog = document.getElementById('catalog');
const cartEl = document.getElementById('cart');
const openCart = document.getElementById('openCart');
const adminBtn = document.getElementById('admin');

let cart = JSON.parse(localStorage.getItem('cart') || '[]');

function renderCart() {
  cartEl.style.display = 'block';
  cartEl.innerHTML = `<h3>Koszyk (${cart.length})</h3>` +
    cart.map(c=>`<div>${c.title} — ${c.price} USD</div>`).join('') +
    `<div style="margin-top:1rem;"><button id="checkout">Checkout (sim)</button></div>`;
  const chk = document.getElementById('checkout');
  if (chk) chk.addEventListener('click', ()=>{ alert('Checkout simulated'); cart = []; localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); });
}

openCart.addEventListener('click', () => {
  renderCart();
});

adminBtn.addEventListener('click', () => {
  window.open('/admin.html', '_blank');
});

async function loadProducts() {
  const res = await fetch('/api/products');
  const list = await res.json();
  catalog.innerHTML = `<div class="card-grid">${list.map(p=>`<div class="card"><h3>${p.title}</h3><p>${p.description}</p><div class="price">${p.price} USD</div><div class="card-actions"><a class="btn" href="/product.html?id=${p.id}">View</a><button data-id="${p.id}">Add to cart</button></div></div>`).join('')}</div>`;
  catalog.querySelectorAll('button[data-id]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      const prod = list.find(x=>x.id===id);
      cart.push(prod);
      localStorage.setItem('cart', JSON.stringify(cart));
      alert('Added to cart');
    });
  });
}

loadProducts();
