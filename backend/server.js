const { app, setup } = require('./app');

const PORT = process.env.PORT || 3000;

async function start() {
  await setup();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
