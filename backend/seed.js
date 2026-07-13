const { setup } = require('./app');
const { getDB } = require('./db');

async function seed() {
  await setup();
  const db = getDB();
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (count === 0) {
    db.prepare('INSERT INTO products (id,title,description,price,createdAt) VALUES (?,?,?,?,?)').run('p1', 'Smartphone Model A', 'Compact smartphone', 399, Date.now());
    db.prepare('INSERT INTO products (id,title,description,price,createdAt) VALUES (?,?,?,?,?)').run('p2', 'Wireless Earbuds', 'Noise-cancelling', 79, Date.now());
    db.prepare('INSERT INTO products (id,title,description,price,createdAt) VALUES (?,?,?,?,?)').run('p3', 'Protective Case', 'Shockproof case', 19, Date.now());
    console.log('Seeded products');
  } else {
    console.log('Products already exist, skipping seed');
  }

  // ensure admin user exists
  const u = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!u) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    const id = 'admin1';
    db.prepare('INSERT INTO users (id,username,password,role) VALUES (?,?,?,?)').run(id, 'admin', hash, 'admin');
    console.log('Seeded admin user (username: admin, password: admin123)');
  } else {
    console.log('Admin user exists, skipping');
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
