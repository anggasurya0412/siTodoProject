const fs = require('fs');
const axios = require('axios');
const usernameTestrail = process.env.USERNAME
const passwordTestrail = process.env.PASSWORD
const baseUrl = process.env.BASEURL
const pathUpdateCase = '/index.php?/api/v2/update_case/'

function getRequestBodyDeleting() {
  return {
    custom_type_automation: 0,     // 0 = done 1 = None, 2 = Can't Create Automation (Field Automation)
    custom_obsolete_flag: true,
  }
}

// Function to update TestRail case by ID
async function updateTestRailCase(testId, prefix) {
  try {
    const requestBody = getRequestBodyDeleting();
    if (!requestBody) {
      console.error(`No request body for prefix ${prefix}.`);
      return;
    }

    const response = await axios.post(`${baseUrl}${pathUpdateCase}${testId}`, requestBody, {
      auth: {
        username: usernameTestrail,
        password: passwordTestrail
      }
    });

    if (response.status === 200) {
      console.log(`TestRail case ${testId} updated successfully.`);
    }
    return response;
  } catch (error) {
    console.error(`Error updating TestRail case ${testId}: `, error.response ? error.response.status : error.message);
    return null;
  }
}

// Function to process test cases in code_changes.json
async function processCodeChanges() {
  const filePath = process.env.TARGETFILE;
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const changes = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const change of changes) {
    const { file, deleted_lines = [] } = change;

    console.log(`Processing file: ${file}`);

    if (deleted_lines.length === 0) {
      console.log("No Delete Existing Testcase");
    } else {
      for (const line of deleted_lines) {
        const match = line.content.match(/%(FE-C|BE-C|AD-C|IOS-C)(\d+)/);
        if (match) {
          const prefix = match[1];
          const testId = match[2];
          console.log(`Deleting Test ID: ${prefix}${testId}`);
          await updateTestRailCase(testId, prefix);
        }
      }
    }
  }
}

processCodeChanges();
