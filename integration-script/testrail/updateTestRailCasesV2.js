const fs = require('fs');
const axios = require('axios');
const usernameTestrail = process.env.USERNAME
const passwordTestrail = process.env.PASSWORD
const baseUrl = process.env.BASEURL
const pathUpdateCase = '/index.php?/api/v2/update_case/'

// Function to get the request body based on the prefix
function getRequestBodyAdding(prefix) {
  switch (prefix) {
    case 'FE-C':
      return {
        custom_type_automation: 0,     // 0 = done 1 = None, 2 = Can't Create Automation (Field Automation)
        custom_obsolete_flag: false,  
      };
    case 'BE-C':
      return {
        custom_type_automation: 0,     // 0 = done 1 = None, 2 = Can't Create Automation (Field Automation)
        custom_obsolete_flag: false,  
      };
    case 'AD-C':
      return {
        custom_automation_type: 1,        // 0 = none 1 = no need, 2 = done (automation api)
        custom_automation_web: 1,         // 0 = none 1 = no need, 2 = done
        custom_automation_mobile: 2,      // 0 = none 1 = no need, 2 = done (automation android)
        custom_automation_ios: 1,          // 0 = none 1 = no need, 2 = done
        custom_type_automation: 0,     // 0 = done 1 = None, 2 = Can't Create Automation (Field Automation)
        custom_obsolete_flag: false,   
      };
    case 'IOS-C':
      return {
        custom_automation_type: 1,        // 0 = none 1 = no need, 2 = done (automation api)
        custom_automation_web: 1,         // 0 = none 1 = no need, 2 = done
        custom_automation_mobile: 2,      // 0 = none 1 = no need, 2 = done (automation android)
        custom_automation_ios: 1,          // 0 = none 1 = no need, 2 = done
        custom_type_automation: 0,     // 0 = done 1 = None, 2 = Can't Create Automation (Field Automation)
        custom_obsolete_flag: false,   
      };
    default:
      return null;
  }
}

function getRequestBodyDeleting() {
  return {
    custom_type_automation: 0,     // 0 = done 1 = None, 2 = Can't Create Automation (Field Automation)
    custom_obsolete_flag: true,
  }
}

// Function to update TestRail case by ID
async function updateTestRailCase(testId, prefix, isAdding) {
  try {
    const requestBody = isAdding ? getRequestBodyAdding(prefix) : getRequestBodyDeleting();
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
    const { file, added_lines = [], deleted_lines = [] } = change;

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
          await updateTestRailCase(testId, prefix, false);
        }
      }
    }

    if (added_lines.length === 0) {
      console.log("No Adding New Testcase");
    } else {
      for (const line of added_lines) {
        const match = line.content.match(/%(FE-C|BE-C|AD-C|IOS-C)(\d+)/);
        if (match) {
          const prefix = match[1];
          const testId = match[2];
          console.log(`Adding Test ID: ${prefix}${testId}`);
          await updateTestRailCase(testId, prefix, true);
        }
      }
    }
  }
}

processCodeChanges();
