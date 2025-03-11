const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');
const readline = require('readline');

async function checkForMissingTestIds() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const pull_number = github.context.issue.number;

  // Fetch the list of changed files in the PR
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number
  });

  // Filter to only include files with '_test' in the filename

  const testFiles = files.filter(file => file.filename.includes('_tests'));

  // Get the latest commit ID from the PR
  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number
  });
  const latestCommitId = pullRequest.head.sha;

  let hasMissingTestIds = false;

  for (const file of testFiles) {
    const filePath = file.filename;
    if (!fs.existsSync(filePath)) {
      const errorMessage = `${filePath} not found`;
      console.log(errorMessage);
      // Append to log file
      fs.appendFileSync('check_missing_output.log', `${errorMessage}\n`);
      continue; // Skip this file and move to the next one
    }
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    let inTestCasesSection = false;

    for await (const line of rl) {
      lineNumber++;

      // Check if we are entering the *** Test Cases *** section
      if (line.trim() === '*** Test Cases ***') {
        inTestCasesSection = true;
        continue;
      }

      // Check if we are exiting the *** Test Cases *** section
      if (line.trim().startsWith('***') && inTestCasesSection) {
        inTestCasesSection = false;
      }

      // If we're in the *** Test Cases *** section, check for [Documentation] lines
      if (inTestCasesSection && line.trim().startsWith('[Documentation]')) {
        const documentationLine = line.trim();
        if (!/%(FE-C|BE-C|AD-C|IOS-C)\d+/.test(documentationLine)) {
          const errorMessage = `Missing Test ID in [Documentation] from ${filePath} line number ${lineNumber}`;
          console.log(`${filePath}:${lineNumber}:${errorMessage}`);
          
          // Append to log file
          fs.appendFileSync('check_missing_output.log', `${filePath}:${lineNumber}:${errorMessage}\n`);
          
          // Create a comment on the PR
          await octokit.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number,
            body: errorMessage,
            commit_id: latestCommitId, // Use the latest commit ID from the PR
            path: filePath,
            line: lineNumber,
            side: 'RIGHT',
          }).catch(error => {
            core.warning(`Failed to create comment on ${filePath} at line ${lineNumber}: ${error.message}`);
          });

          hasMissingTestIds = true;
        }
      }
    }
  }

  // Exit with non-zero code if missing test IDs were found
  if (hasMissingTestIds) {
    core.setFailed('Missing test IDs detected in the changed files.');
  }
}

checkForMissingTestIds().catch(err => core.setFailed(err.message));
