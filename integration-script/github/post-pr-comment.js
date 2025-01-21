const fs = require('fs');
const { Octokit } = require("@octokit/rest");

// Load GitHub token from environment variable
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Read the Robocop results from the file
const resultsFilePath = process.env.RESULTS_FILE_PATH;
const results = fs.existsSync(resultsFilePath) ? fs.readFileSync(resultsFilePath, 'utf8') : 'No results found.';

// Get the Pull Request number from the environment variable
const prNumber = process.env.PR_NUMBER;
const repoOwner = process.env.GITHUB_REPOSITORY.split('/')[0];
const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];

async function postComment() {
  try {
    if (results.trim()) {
      // Use a delay to avoid rate limit
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      await delay(1000); // Delay by 1 second before posting the comment
      await octokit.rest.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: prNumber,
        body: `${resultsFilePath} results:\n\n${results}`,
      });
      console.log('Comment posted successfully.');
    } else {
      console.log('No Robocop results to post.');
    }
  } catch (error) {
    console.error('Error posting comment:', error);

    // Retry if rate limit error occurs
    if (error.status === 403 && error.response.data.message.includes("secondary rate limit")) {
      console.log("Retrying after delay due to secondary rate limit...");
      await delay(5000); // Wait for 5 seconds before retrying
      return postComment(); // Recursive call to retry
    }

    process.exit(1);
  }
}

postComment();
