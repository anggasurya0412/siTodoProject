# Code Change Analysis & GitHub PR Commenting

## Overview
This repository contains two scripts for robot framework code analysis and GitHub PR commenting:

1. **collect_code_changes.py**: A Python script that analyzes code changes in `.robot` files by comparing different Git branches.
2. **post-pr-comment.js**: A Node.js script that posts automated comments to GitHub pull requests based on analysis results.

---

## 1. collect_code_changes.py

### Description
This Python script:
- Compares `.robot` files between two Git branches.
- Extracts added and deleted lines from the diff.
- Filters changes based on specific options (`syntax` or `testid`).
- Outputs the results as a JSON file.

### Prerequisites
Ensure you have the following installed:
- Python 3.x
- Git

### Environment Variables
Create a `.env` file and define:
```ini
BASE_BRANCH=main  # Base branch to compare against
HEAD_BRANCH=feature-branch  # Branch with new changes
```

### Installation
1. Install required dependencies:
   ```sh
   pip install python-dotenv
   ```
2. Ensure the `.env` file is properly configured.

### Usage
Run the script with:
```sh
python collect_code_changes.py <options> <changed_files.txt>
```

#### Arguments
- `<options>`: Choose either `syntax` (filter general syntax changes) or `testid` (extract test case IDs).
- `<changed_files.txt>`: A text file listing modified `.robot` files.

#### Example
```sh
python collect_code_changes.py syntax changed_files.txt
```

### Functionality
1. Reads changed file paths from `changed_files.txt`.
2. Fetches `git diff` output between `BASE_BRANCH` and `HEAD_BRANCH`.
3. Extracts and filters added/deleted lines based on the specified option.
4. Outputs results in `code_changes.json`.

#### Sample Output (JSON)
```json
[
    {
        "file": "tests/sample.robot",
        "added_lines": [{"line": 12, "content": "[Documentation] Test Case 1234"}],
        "deleted_lines": [{"line": 15, "content": "[Documentation] Test Case 5678"}]
    }
]
```

---

## 2. post-pr-comment.js

### Description
This Node.js script:
- Reads test analysis results from a file.
- Posts comments to a GitHub pull request using the GitHub API.

### Prerequisites
Ensure you have the following installed:
- Node.js
- A GitHub personal access token with repository access.

### Environment Variables
Define these variables in your `.env` file:
```ini
GITHUB_TOKEN=your_github_token
PR_NUMBER=123  # Pull request number
GITHUB_REPOSITORY=owner/repo  # Repository in owner/repo format
RESULTS_FILE_PATH=path/to/results.txt  # File containing analysis results
```

### Installation
1. Install dependencies:
   ```sh
   npm install @octokit/rest dotenv
   ```
2. Ensure the `.env` file is properly configured.

### Usage
Run the script with:
```sh
node post-pr-comment.js
```

### Functionality
1. Reads the test results from `RESULTS_FILE_PATH`.
2. Retrieves PR details from environment variables.
3. Posts the test results as a comment on the pull request.
4. Implements retry logic if GitHub API rate limits are hit.

#### Example Comment Posted
```
path/to/results.txt results:

- Test Case 1234: PASSED
- Test Case 5678: FAILED
```

---

## Error Handling
- If required arguments or environment variables are missing, the script exits with an error.
- If a GitHub API rate limit occurs, the script retries after a short delay.
- If the results file is missing, the script will not post a comment.

---