const loginBtn = document.getElementById('login');
const controls = document.getElementById('controls');
const adForm = document.getElementById('adForm');
let token = null;

loginBtn.addEventListener('click', async ()=>{
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/auth/login', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username,password}) });
  if (!res.ok) { alert('Login failed'); return; }
  const body = await res.json();
  token = body.token;
  controls.style.display='block';
  loadProducts();
});

async function loadProducts(){
  const res = await fetch('/api/products');
  const list = await res.json();
  const container = document.getElementById('productList');
  container.innerHTML = list.map((p) => `<div class="admin-ad" data-id="${p.id}"><strong>${p.title}</strong> — ${p.price} USD <span>${p.category || 'General'} • ${p.location || 'Unknown'}</span><button data-action="del" data-id="${p.id}">Delete</button></div>`).join('');
  container.querySelectorAll('button[data-action="del"]').forEach((b) => b.addEventListener('click', async (e) => {
    const id = e.target.getAttribute('data-id');
    await fetch('/api/products/' + id, { method:'DELETE', headers:{ 'authorization':'Bearer ' + token } });
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
  await fetch('/api/products', { method:'POST', headers:{ 'content-type':'application/json', 'authorization':'Bearer ' + token }, body: JSON.stringify({ title, price, description: desc, images, category, location }) });
  adForm.reset();
  loadProducts();
});
