require("dotenv").config();

const { createApp } = require("./app");
const { validateEnvironment } = require("./config");
const dataService = require("./data-service");
const userService = require("./user-service");

let config;

try {
  config = validateEnvironment();
} catch (error) {
  console.error(`Startup configuration error: ${error.message}`);
  throw error;
}

const app = createApp(config);
const servicesReady = Promise.all([dataService.initialize(), userService.connect()]);

if (!process.env.VERCEL) {
  servicesReady
    .then(() => {
      app.listen(config.port, () => {
        console.log(`Server listening on port ${config.port}`);
      });
    })
    .catch(() => {
      console.error("Unable to initialize application services");
      process.exitCode = 1;
    });
} else {
  servicesReady.catch(() => {
    console.error("Unable to initialize application services");
  });
}

module.exports = app;
