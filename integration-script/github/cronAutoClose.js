const axios = require('axios');
const github = require('@actions/github');
const minimist = require('minimist');

async function closePullRequest(octokit, owner, repo, pullNumber) {
  await octokit.pulls.update({
    owner: owner,
    repo: repo,
    pull_number: pullNumber,
    state: 'closed'
  });
}

async function main() {
  try {
    const args = minimist(process.argv.slice(2));
    const daysOpenThreshold = args.daysopen ? parseInt(args.daysopen, 10) : 2; // Default to 2 if not provided

    if (isNaN(daysOpenThreshold) || daysOpenThreshold < 0) {
      throw new Error("Invalid daysOpen value. It must be a non-negative number.");
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const owner = github.context.payload.repository.owner.login;
    const repo = github.context.payload.repository.name;

    // Dynamically import the Octokit module
    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit({ auth: githubToken });

    const response = await octokit.pulls.list({
      owner: owner,
      repo: repo,
      state: 'all'
    });

    const currentDate = new Date();

    for (const pullRequest of response.data) {
      // Check if the pull request is closed
      if (pullRequest.state === 'closed') {
        continue; // Skip processing closed pull requests
      }

      const createdAt = new Date(pullRequest.created_at);
      let daysOpen = 0;
      let currentDateCopy = new Date(currentDate);
      
      while (currentDateCopy > createdAt) {
        if (currentDateCopy.getDay() !== 0 && currentDateCopy.getDay() !== 7) { // Exclude weekends
          daysOpen++;
        }
        currentDateCopy.setDate(currentDateCopy.getDate() - 1);
      }
      
      if (daysOpen >= daysOpenThreshold) { // Close PRs open for 2 or more working days
        // Close the pull request
        await closePullRequest(octokit, owner, repo, pullRequest.number);
      }
    }
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

main();
