const axios = require('axios');
const fs = require('fs');
const path = require('path');

const usernameJira = process.env.USERNAME;
const passwordJira = process.env.PASSWORD;
const baseUrl = process.env.BASE_URL;
const filename = process.env.FILENAME;
const rootPath = process.env.ROOT_PATH || __dirname;

// Load transition mappings from JSON file
const configPath = path.join(rootPath, filename);
const transitions = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Define the function to extract Jira issue key from pull request title
function extractJiraIssueKey(title) {
  const regex = /([A-Z]+-\d+)/;
  const match = title.match(regex);
  return match ? match[0] : null;
}

// Function to determine the project prefix (e.g., "GQA" or "PRIN")
function getProjectKey(issueKey) {
  return issueKey.split('-')[0]; // Extracts "GQA" from "GQA-123"
}

// Define the function to update Jira issue status
async function updateJiraIssueStatus(prTitle, status) {
  try {
    const issueKey = extractJiraIssueKey(prTitle);
    if (!issueKey) {
      throw new Error("❌ No Jira issue key found in PR title.");
    }

    const projectKey = getProjectKey(issueKey);
    const projectTransitions = transitions[projectKey];

    if (!projectTransitions) {
      throw new Error(`❌ No transition configuration found for project: ${projectKey}`);
    }

    const transitionId = projectTransitions[status];
    if (!transitionId) {
      throw new Error(`❌ No transition ID found for status: ${status} in project ${projectKey}`);
    }
    
    // Replace 'your-jira-domain' with the actual domain of your Jira instance
    const url = `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`;
    
    // Replace 'username' and 'password' with your Jira username and API token or password
    const auth = {
      username: usernameJira,
      password: passwordJira
    };

    // Define the request body to update the issue status
    const requestBody = {
      transition: {
        id: transitionId
      }
    };

    // Make a PUT request to update the issue status
    const response = await axios.post(url, requestBody, { auth });

     // Log the response data
     console.log(`Jira issue ${issueKey} status updated to transition ID ${transitionId}:`, response.data);
    } catch (error) {
      console.error('Error updating Jira issue status:', error.message);
      throw error;
    }
}

// Handle command-line arguments
if (require.main === module) {
  const [, , prTitle, status] = process.argv;

  if (!prTitle || !status) {
    console.error("❌ Usage: node utils.js '<PR_TITLE>' <STATUS>");
    process.exit(1);
  }

  updateJiraIssueStatus(prTitle, status);
}

module.exports = { extractJiraIssueKey, updateJiraIssueStatus };
