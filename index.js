#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const prompt = require('prompt-sync')({ sigint: true });
require('dotenv').config({ quiet: true });

// File Paths
const hostsFilePath =
  process.env.NODE_ENV === 'development'
    ? path.join(__dirname, 'test.txt')
    : '/etc/hosts';
const backupFilePath = hostsFilePath + '.backup';

// Markers
const beginMarker = '# BEGIN Distraction Blocker';
const endMarker = '# END Distraction Blocker';
const redirectTo = '127.0.0.1';

let blockedSites = [];
let isRestoring = false;

// Find needed content
function findBlockerSection(content) {
  if (!content) return null;

  const regex = new RegExp(`${beginMarker}([\\s\\S]*?)${endMarker}`);
  const match = content.match(regex);

  if (!match) return null;

  // Remove the markers
  const lines = match[0].split('\n');
  return lines.slice(1, -1).join('\n');
}
function getUrlsFromSection(content) {
  // Handle empty content
  if (!content) return [];

  let links = content.split('\n');

  // get only the link part
  links = links
    .filter((link) => link.includes('127.0.0.1'))
    .map((link) => link.match(/(?<=127.0.0.1 ).*/)[0]);

  // only get the links that don't start with www.
  links = links.filter((link) => !link.includes('www.'));

  return links;
}

// Create a new blocker section
function createBlockerSection(sites) {
  // This will prevent duplicate entries
  let sitesInBlock = [];

  // Add the www. duplicates
  sites.forEach((site) => {
    sitesInBlock.push(site);
    sitesInBlock.push('www.' + site);
  });

  // Add the redirect link
  sitesInBlock = sitesInBlock.map((site) => redirectTo + ' ' + site);

  // Join the sites with a line break
  return sitesInBlock.join('\n');
}

// Replace or append content in the hosts file
function updateHostsContent(original, newContent) {
  const regex = new RegExp(`${beginMarker}([\\s\\S]*?)${endMarker}`);

  // if the section already exists
  if (regex.test(original)) {
    return original.replace(
      regex,
      beginMarker + '\n' + newContent + '\n' + endMarker,
    );
  }

  return (
    original.trimEnd() +
    '\n\n' +
    beginMarker +
    '\n' +
    newContent +
    '\n' +
    endMarker
  );
}

// Read and write files
async function readFile(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    console.error(`Error reading : ${file}`, error);
    process.exit(1);
  }
}
async function writeFile(file, content) {
  try {
    await fs.writeFile(file, content, 'utf8');
  } catch (error) {
    console.error(`Error writing ${file}: `, error);
    process.exit(1);
  }
}

// Write hosts safely
async function safeWriteHosts(newContent) {
  // save current to backup in case of failure
  await fs.copyFile(hostsFilePath, backupFilePath);

  const tmpFilePath = hostsFilePath + '.tmp';

  await writeFile(tmpFilePath, newContent);
  await fs.rename(tmpFilePath, hostsFilePath);
}

// User input validation
function normalizeUserInput(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}
function isValidUserInput(input) {
  return /^[a-z0-9.-]+$/i.test(input);
}

// Putting it together
async function setHostsFile(sitesToBlock) {
  try {
    // Read current hosts file
    const originalContent = await readFile(hostsFilePath);

    // Create new section to replace old section
    const newSection = createBlockerSection(sitesToBlock);
    const updated = updateHostsContent(originalContent, newSection);

    // Update hosts file
    await safeWriteHosts(updated);
  } catch (error) {
    console.error(`Error writing hosts: `, error);
    process.exit(1);
  }
}

// Break timer, default break is 10 mins
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function tempUnblockSites(blockedSites, duration = 10 * 60 * 1000) {
  // Remove the site block
  await setHostsFile([]);

  // Handle time left
  let minsRemaining = Math.floor(duration / (60 * 1000));
  console.clear();
  console.log(
    '\u001b[0;36m' +
      `Started break for ${minsRemaining} min ` +
      '\u001b[0m' +
      '\u001b[2m' +
      '(Press Ctrl+C to end the break early)',
  );

  try {
    while (minsRemaining > 0) {
      console.log(`    Time left: ${minsRemaining} mins`);
      await sleep(60 * 1000);
      minsRemaining--;
    }
  } finally {
    console.log(
      '\u001b[0m' +
        '\u001b[0;36m' +
        'Your break is done, time to' +
        '\u001b[1;36m' +
        ' lock back in',
    );
    isRestoring = true;
    await setHostsFile(blockedSites);
  }
}

// Interface
async function terminalInterface() {
  const welcomeText =
    '\u001b[1;36m' +
    'Site Blocker:\n' +
    '\u001b[0;36m' +
    '  Current Blocked Sites are:\n' +
    '\u001b[0m' +
    '\u001b[2m' +
    blockedSites.map((site) => '    ' + site + '\n').join('');
  console.log(welcomeText);

  // keep asking user until a correct input is given
  let userIsDone = false;
  while (!userIsDone) {
    // ask if the user wants to add or remove a url
    console.log(
      '\u001b[0;36m' +
        '  Available commands\n' +
        '\u001b[0m' +
        '\u001b[2m' +
        '    (a) Add a site\n' +
        '    (r) Remove a site\n' +
        '    (b) Take a break\n' +
        '    (f) to finish',
    );
    const addRemovePrompt = prompt('\u001b[0m' + '  Type command: ');

    if (addRemovePrompt === 'a') {
      // push the inputted url
      const data = prompt('\u001b[0m' + '  Write a URL to block: ');
      const toAdd = normalizeUserInput(data);

      if (data.includes('/')) {
        prompt(
          '\u001b[0;31m' +
            "  Note: Specific paths can't be blocked, the entire domain will be blocked instead",
        );
      }

      isValidUserInput(toAdd)
        ? blockedSites.push(toAdd)
        : console.log('\n\u001b[2m' + 'Invalid Input');
    }

    if (addRemovePrompt == 'r') {
      // find and remove the inputted url
      const toRemove = prompt('\u001b[0m' + '  Write a URL to unblock: ');
      const index = blockedSites.indexOf(toRemove);
      // if index exists
      if (index > -1) blockedSites.splice(index, 1);
    }

    if (addRemovePrompt == 'b') {
      // Check for a valid input
      let duration = parseInt(
        prompt('\u001b[0m' + '  Duration of your break (default is 10min): '),
      );
      if (isNaN(duration) || duration <= 0) duration = 10;

      // Run break
      await tempUnblockSites(blockedSites, duration * 60 * 1000);
    }

    if (addRemovePrompt === 'f') {
      // exit loop
      userIsDone = true;
    }

    // show list of blocked sites
    console.log(
      '\n\u001b[0m' +
        '  Current Blocked Sites are:' +
        '\n\u001b[2m' +
        blockedSites.map((site) => '    ' + site + '\n').join(''),
    );
  }
}

async function main() {
  // Get current blocked sites
  const originalContent = await readFile(hostsFilePath);
  const originalBlock = findBlockerSection(originalContent);
  blockedSites = getUrlsFromSection(originalBlock);

  // Make sure all sites are blocked on exit, can't have people cheating the system can we ;)
  process.on('SIGINT', async () => {
    if (isRestoring) process.exit(0);
    isRestoring = true;
    await setHostsFile(blockedSites);
    process.exit(0);
  });

  // Run terminal interface
  await terminalInterface();

  // Set Hosts
  await setHostsFile(blockedSites);
}

main();
