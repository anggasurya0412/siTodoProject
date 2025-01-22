const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const usernameTestrail = process.env.USERNAME;
const passwordTestrail = process.env.PASSWORD;
const baseUrl = process.env.BASEURL;
const pathUpdateTestrail = '/index.php?/api/v2/update_case/'

// Function to get the request body based on the prefix
function getRequestBody(prefix) {
  switch (prefix) {
    case 'FE-C':
      return {
        custom_type_automation: 0,     // 0 = none 1 = no need, 2 = done (Field Automation)
      };
    case 'BE-C':
      return {
        custom_type_automation: 0,     // 0 = none 1 = no need, 2 = done (Field Automation)
      };
    case 'AD-C':
      return {
        custom_automation_type: 1,        // 0 = none 1 = no need, 2 = done (automation api)
        custom_automation_web: 1,         // 0 = none 1 = no need, 2 = done
        custom_automation_mobile: 2,      // 0 = none 1 = no need, 2 = done (automation android)
        custom_automation_ios: 1,          // 0 = none 1 = no need, 2 = done
        custom_type_automation: 0,     // 0 = none 1 = no need, 2 = done (Field Automation)
      };
    case 'IOS-C':
      return {
        custom_automation_type: 1,        // 0 = none 1 = no need, 2 = done (automation api)
        custom_automation_web: 1,         // 0 = none 1 = no need, 2 = done
        custom_automation_mobile: 2,      // 0 = none 1 = no need, 2 = done (automation android)
        custom_automation_ios: 1,          // 0 = none 1 = no need, 2 = done
        custom_type_automation: 0,     // 0 = none 1 = no need, 2 = done (Field Automation)
      };
    default:
      return null;
  }
}

// Function to update TestRail case by ID
async function updateTestRailCase(testId, prefix) {
  try {
    const requestBody = getRequestBody(prefix);
    if (!requestBody) {
      console.error(`No request body for prefix ${prefix}.`);
      return;
    }

    const response = await axios.post(`${baseUrl}${pathUpdateTestrail}${testId}`, requestBody, {
      auth: {
        username: usernameTestrail,
        password: passwordTestrail
      }
    });

    if (response.status === 200) {
      console.log(`TestRail case ${testId} updated successfully.`);
    }
    return response.status;
  } catch (error) {
    console.error(`Error updating TestRail case ${testId}:`, error.response ? error.response.status : error.message);
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
      const prefix = match[1];
      const testId = match[2];
      console.log(`Found Test ID: ${prefix}${testId} at line ${lineNumber} in file ${file}`);
      const status = await updateTestRailCase(testId, prefix);
      if (status !== 200) {
        console.error(`TestRail case ${testId} could not be updated.`);
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
