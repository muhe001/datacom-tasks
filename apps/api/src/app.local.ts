import app from './app'

run()

async function run() {
  const server = await app();

  server.listen(4911)
}


