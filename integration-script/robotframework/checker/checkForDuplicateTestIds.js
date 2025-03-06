const fs = require('fs');
const glob = require('glob');
const readline = require('readline');
const github = require('@actions/github');

async function checkForDuplicateTestIds() {
  const files = glob.sync('**/TestSuite/**/*.robot');
  const testIds = new Map();
  
  const token = process.env.GITHUB_TOKEN;
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const pull_number = github.context.issue.number;

  // Get the latest commit ID from the PR
  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number
  });
  const latestCommitId = pullRequest.head.sha;

  for (const file of files) {
    const fileStream = fs.createReadStream(file);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      if (line.trim().startsWith('[Documentation]')) {
        const match = line.match(/%(?:FE-C|BE-C|AD-C|IOS-C|C)(\d+)/);
        if (match) {
          const testIdNumeric = match[1];
          if (testIds.has(testIdNumeric)) {
            const { file: prevFile, lineNumber: prevLineNumber } = testIds.get(testIdNumeric);
            const errorMessage = `Duplicate Test ID ${match[0]} found at line ${lineNumber}. Previous occurrence in ${prevFile}:${prevLineNumber}`;
            console.log(`${file}:${lineNumber}:${errorMessage}`);

            // Use 'line' instead of 'position' for the review comment
            await octokit.rest.pulls.createReviewComment({
              owner,
              repo,
              pull_number,
              body: errorMessage,
              commit_id: latestCommitId,
              path: file,
              line: lineNumber,
              side: 'RIGHT'
            }).catch(error => {
              console.error(`Failed to create comment on ${file} at line ${lineNumber}: ${error.message}`);
            });

            process.exitCode = 1;
          } else {
            testIds.set(testIdNumeric, { file, lineNumber });
          }
        }
      }
    }
  }
}

checkForDuplicateTestIds().catch(err => console.error(err.message));
