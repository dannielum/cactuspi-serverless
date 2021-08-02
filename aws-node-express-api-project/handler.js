const fs = require('fs');
const serverless = require('serverless-http');
const express = require('express');

const { Publisher, Plugins } = require('cactuspi-service');
const CommandManager = require('./controllers/command-manager');

const configFile = fs.readFileSync('./config.json');
const config = JSON.parse(configFile);
const { plugins } = config;

const pluginServices = [];
Object.entries(plugins).forEach(([plugin, options = {}]) => {
  if (options.enabled) {
    try {
      pluginServices.push({
        name: plugin,
        service: Plugins[plugin],
        options,
      });
    } catch ({ message }) {
      console.error(`Plugin Error: ${plugin}`, message);
    }
  }
});

const publisher = new Publisher(config);
const commandManager = new CommandManager(publisher);

const app = express();

pluginServices.forEach(({ name, service, options }) => {
  const plugin = new service(options);
  if (plugin.init) {
    plugin.init();
  }

  app.get(`/${name}/:param?`, async (req, res) => {
    const { message, metadata } = await plugin.fetch(req, res);
    publisher.publish(message, metadata);
    return res.status(200).json({ message });
  });
});

app.get('/hello', (req, res) => {
  publisher.publish('Hello World!', {
    repeat: false,
    name: 'hello',
    duration: 5,
    priority: true,
  });
  return res.status(200).json({ message: 'Hello World!' });
});

app.get('/message/:message', (req, res) => {
  const message = req.params.message;
  publisher.publish(`Message: ${message}`, {
    repeat: req.param('repeat') || false,
    name: req.param('name') || 'message',
    duration: req.param('duration') || 10,
    priority: req.param('message') || true,
  });
  return res.status(200).json({ message });
});

app.get('/clear', (req, res) => {
  commandManager.command('clear');
  return res.status(200).json({ message: 'Clear' });
});

app.get('/stop', (req, res) => {
  commandManager.command('stop');
  return res.status(200).json({ message: 'Stop' });
});

app.get('/start', (req, res) => {
  commandManager.command('start');
  return res.status(200).json({ message: 'Start' });
});

app.get('/end', (req, res) => {
  commandManager.command('end');
  return res.status(200).json({ message: 'End' });
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: 'Not Found',
  });
});

module.exports.handler = serverless(app);
