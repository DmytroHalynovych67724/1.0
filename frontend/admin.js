const loginBtn = document.getElementById('login');
const registerBtn = document.getElementById('registerBtn');
const controls = document.getElementById('controls');
const adForm = document.getElementById('adForm');
let token = null;

loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const body = await res.json();
    token = body.token;
    controls.style.display = 'block';
    loadProducts();
    return;
  } catch (error) {
    token = 'demo';
    controls.style.display = 'block';
    alert('Backend jest niedostępny, więc uruchomiono tryb demo.');
    loadProducts();
  }
});

registerBtn.addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Rejestracja nieudana');
    }

    alert('Konto utworzone. Teraz zaloguj się tymi samymi danymi.');
  } catch (error) {
    alert(error.message || 'Rejestracja nieudana. Spróbuj użyć demo mode.');
  }
});

async function loadProducts() {
  const container = document.getElementById('productList');
  const list = await fetchProducts();

  if (!list.length) {
    container.innerHTML = '<p class="hint">Brak ogłoszeń. Dodaj swoje pierwsze ogłoszenie.</p>';
    return;
  }

  container.innerHTML = list.map((p) => `<div class="admin-ad" data-id="${p.id}"><div><strong>${p.title}</strong><br /><span>${p.category || 'General'} • ${p.location || 'Unknown'}</span></div><div>${p.price} USD <button data-action="del" data-id="${p.id}">Delete</button></div></div>`).join('');
  container.querySelectorAll('button[data-action="del"]').forEach((b) => b.addEventListener('click', async (e) => {
    const id = e.target.getAttribute('data-id');
    try {
      await fetch('/api/products/' + id, {
        method: 'DELETE',
        headers: { authorization: 'Bearer ' + token }
      });
    } catch (error) {
      removeProduct(id);
    }
    loadProducts();
  }));
}

adForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = document.getElementById('title').value;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const desc = document.getElementById('desc').value;
  const images = document.getElementById('images').value.split(',').map((item) => item.trim()).filter(Boolean);
  const category = document.getElementById('category').value;
  const location = document.getElementById('location').value;

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ title, price, description: desc, images, category, location })
    });

    if (!res.ok) {
      throw new Error('API rejected the ad');
    }
  } catch (error) {
    addProduct({ title, price, description: desc, images, category, location });
  }

  adForm.reset();
  loadProducts();
});
