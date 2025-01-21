const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');
const path = require('path');

// Function to create a review comment on GitHub
async function createReviewComment(owner, repo, pull_number, commit_id, file, line, message, token) {
    const octokit = github.getOctokit(token);

    try {
        await octokit.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number,
            body: message,
            commit_id: commit_id,
            path: file,
            line: line,
            side: 'RIGHT'
        });
        console.log(`Created review comment on ${file} at line ${line}: ${message}`);
    } catch (error) {
        core.warning(`Failed to create comment on ${file} at line ${line}: ${error.message}`);
    }
}

// Function to check keyword naming conventions
async function checkKeywordNamingConvention(filename, content, folderType, owner, repo, pullNumber, commitId, token) {
    const basename = path.basename(filename, '.robot');

    const lines = content.split('\n');
    let inKeywordBlock = false;
    let lineNumber = 0;

    for (const line of lines) {
        lineNumber++;
        const strippedLine = line.trim();

        // Detect the start of `*** Keywords ***` section
        if (strippedLine === '*** Keywords ***') {
            inKeywordBlock = true;
            continue;
        }

        // Detect the end of `*** Keywords ***` section
        if (inKeywordBlock && strippedLine.startsWith('***')) {
            inKeywordBlock = false;
        }

        // If within the `*** Keywords ***` block, process keyword lines
        if (inKeywordBlock && strippedLine && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('#')) {
            const match = strippedLine.match(/^(.*?)\s*(\$\{.*?\})?\s*$/);
            if (match) {
                let keywordName = match[1].trim();

                let expectedFormat;

                if (folderType === 'StepDefinition' || folderType === 'PageObject') {
                    if (keywordName.startsWith(basename)) {
                        expectedFormat = keywordName; // Avoid duplicating basename
                    } else {
                        expectedFormat = `${basename}.${keywordName}`;
                    }
                } else if (folderType === 'resources') {
                    if (keywordName.startsWith('resources')) {
                        expectedFormat = keywordName; // Avoid duplicating 'resources'
                    } else {
                        expectedFormat = `resources.${keywordName}`;
                    }
                }

                if (keywordName !== expectedFormat) {
                    const message = `Warning: Keyword '${keywordName}' in '${filename}' does not match expected format '${expectedFormat}'`;
                    console.log(message);

                    // Create a review comment on the PR
                    await createReviewComment(owner, repo, pullNumber, commitId, filename, lineNumber, message, token);
                }
            }
        }
    }
}

// Main function to read changed files and run the checks
async function main() {
    const token = process.env.GITHUB_TOKEN;
    const { owner, repo } = github.context.repo;
    const pull_number = github.context.issue.number;

    // Fetch pull request details to get the latest commit ID
    try {
        const { data: pullRequest } = await github.getOctokit(token).rest.pulls.get({
            owner,
            repo,
            pull_number
        });
        const latestCommitId = pullRequest.head.sha;
        
        const changedFiles = fs.readFileSync('changed_files.txt', 'utf-8').split('\n').filter((file) => file.endsWith('.robot') && (file.includes('StepDefinition') || file.includes('PageObject') || file.includes('resources')));

        if (changedFiles.length === 0) {
            console.log('No .robot files in StepDefinition, PageObject, or resources folders modified or added.');
            return;
        }

        for (const relativeFilename of changedFiles) {
            if (fs.existsSync(relativeFilename)) {
                const content = fs.readFileSync(relativeFilename, 'utf-8');
                let folderType;
                if (relativeFilename.includes('StepDefinition')) {
                    folderType = 'StepDefinition';
                } else if (relativeFilename.includes('PageObject')) {
                    folderType = 'PageObject';
                } else if (relativeFilename.includes('resources')) {
                    folderType = 'resources';
                }
                await checkKeywordNamingConvention(relativeFilename, content, folderType, owner, repo, pull_number, latestCommitId, token);
            } else {
                console.log(`File not found: ${relativeFilename}`);
            }
        }
    } catch (error) {
        core.setFailed(`Failed to fetch pull request details: ${error.message}`);
    }
}

main().catch(err => core.setFailed(err.message));
