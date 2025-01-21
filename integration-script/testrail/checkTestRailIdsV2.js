const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const usernameTestrail = process.env.USERNAME
const passwordTestrail = process.env.PASSWORD
const baseUrl = process.env.BASEURL
const pathGetCase = "/index.php?/api/v2/get_case/"
const SUITE_ID = 5378;

// Function to get TestRail case by ID
async function getTestRailCase(testId) {
  try {
    const url = `${baseUrl}${pathGetCase}${testId}`;
    const response = await axios.get(url, {
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
    console.error(`Error fetching TestRail case ${testId}: `, error.response ? error.response.status : error.message);
    return null;
  }
}

// Function to process added test cases from code_changes.json
async function processAddedTestCases() {
  const filePath = process.env.TARGETFILE;
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const changes = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const change of changes) {
    const { file, added_lines = [] } = change;

    console.log(`Processing added lines in file: ${file}`);

    if (added_lines.length === 0) {
      console.log("No added lines found.");
      continue;
    }

    for (const line of added_lines) {
      const match = line.content.match(/%(FE-C|BE-C|AD-C|IOS-C)(\d+)/);
      if (match) {
        const testId = match[2];
        console.log(`Checking Test ID: ${match[1]}${testId} from added lines.`);
        const exists = await getTestRailCase(testId);
        if (!exists) {
          console.error(`TestRail case ${testId} does not exist or could not be verified.`);
          process.exit(1);
        }
      }
    }
  }
}

// Run the script
processAddedTestCases();