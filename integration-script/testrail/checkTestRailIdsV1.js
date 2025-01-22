const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const usernameTestrail = process.env.USERNAME;
const passwordTestrail = process.env.PASSWORD;
const baseUrl = process.env.BASEURL;
const pathGetCase = "/index.php?/api/v2/get_case/";

// Function to get TestRail case by ID
async function getTestRailCase(testId) {
  try {
    const response = await axios.get(`${baseUrl}${pathGetCase}${testId}`, {
      auth: {
        username: usernameTestrail,
        password: passwordTestrail
      }
    });
    if (response.status === 200 && response.data.suite_id === SUITE_ID) {
      console.log(`TestRail case ${testId} exists.`);
    }
    else {
      return false
    }
    return response.status;
  } catch (error) {
    console.error(`Error fetching TestRail case ${testId}:`, error.response ? error.response.status : error.message);
    return null;
  }
}

// Function to process test cases in a file
async function processTestCases(file) {
  const fileStream = fs.createReadStream(file);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;

    const match = line.match(/%(FE-C|BE-C|AD-C|IOS-C)(\d+)/);
    if (match) {
      const testId = match[2];
      console.log(`Found Test ID: ${match[1]}${testId} at line ${lineNumber} in file ${file}`);
      const status = await getTestRailCase(testId);
      if (status !== 200) {
        console.error(`TestRail case ${testId} does not exist or could not be verified.`);
        process.exit(1);
      }
    }
  }
}

async function processChangedFiles() {
  const changedFiles = fs.readFileSync('changed_files.txt', 'utf-8').split('\n').filter(Boolean);
  for (const file of changedFiles) {
    console.log(`Processing file: ${file}`);
    await processTestCases(file);
  }
}

processChangedFiles();
