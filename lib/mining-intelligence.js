/**
 * Mining Intelligence API
 * Labs, drillers, jobs, equipment, prices, announcements
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/mining');

function loadJSON(filename) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error loading ${filename}:`, e.message);
  }
  return null;
}

// Cache data in memory
let cache = {
  labs: null,
  drillers: null,
  jobs: null,
  equipment: null,
  prices: null,
  announcements: null
};

function getLabs() {
  if (!cache.labs) cache.labs = loadJSON('labs.json');
  return cache.labs;
}

function getDrillers() {
  if (!cache.drillers) cache.drillers = loadJSON('drillers.json');
  return cache.drillers;
}

function getJobs() {
  if (!cache.jobs) cache.jobs = loadJSON('jobs.json');
  return cache.jobs;
}

function getEquipment() {
  if (!cache.equipment) cache.equipment = loadJSON('equipment.json');
  return cache.equipment;
}

function getPrices() {
  if (!cache.prices) cache.prices = loadJSON('commodity_prices.json');
  return cache.prices;
}

function getAnnouncements() {
  if (!cache.announcements) cache.announcements = loadJSON('asx_data.json');
  return cache.announcements;
}

function clearCache() {
  cache = {
    labs: null,
    drillers: null,
    jobs: null,
    equipment: null,
    prices: null,
    announcements: null
  };
}

module.exports = {
  getLabs,
  getDrillers,
  getJobs,
  getEquipment,
  getPrices,
  getAnnouncements,
  clearCache
};
