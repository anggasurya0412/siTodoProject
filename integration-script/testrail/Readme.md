# TestRail Integration Scripts

This directory contains scripts for integrating and managing test cases with TestRail.

## Overview

These scripts help with:
- Validating test case IDs in TestRail.
- Updating test case statuses.
- Parsing test results and syncing them with TestRail.
- Managing test plans and test runs.

## Installation

### Prerequisites
- Node.js (latest LTS recommended)
- Access to TestRail API
- Configuration of environment variables

### Setup
1. Clone the repository.
2. Install dependencies:
   ```sh
   npm install axios dotenv fs path pg xml2js
   ```
3. Create a `.env` file and configure it:
   ```ini
   USERNAME=your_testrail_username
   PASSWORD=your_testrail_password
   BASEURL=https://yourtestrailurl.com
   TARGETFILE=path/to/code_changes.json
   SUITEIDCONFIG=path/to/suiteConfig.js
   PROJECTID=your_project_id
   SUITEID=your_suite_id
   TESTRAILBASEURL=https://yourtestrailurl.com
   TESTRAILUSERNAME=your_testrail_username
   TESTRAILPASSWORD=your_testrail_password
   TESTPLANID=your_testplan_id
   TESTRUNID=your_testrun_id
   OUTPUTFILE=path/to/output.xml
   ```

## How It Works

1. **Check TestRail IDs**: Validates test case IDs against TestRail.
2. **Update TestRail Cases**: Updates test case statuses based on results.
3. **Manage Test Plans and Runs**: Helps create and update test plans.

## Available Scripts

### 1. `check-testrail-multiplesuite.js`
Validates test case IDs against multiple suites in TestRail.
```sh
node check-testrail-multiplesuite.js
```

### 2. `checkTestRailIdsV1.js`
Checks if test case IDs exist in TestRail.
```sh
node checkTestRailIdsV1.js
```

### 3. `checkTestRailIdsV2.js`
Validates added test case IDs using a JSON file.
```sh
node checkTestRailIdsV2.js
```

### 4. `testrail_checker.js`
Validates a test plan ID against a project ID in TestRail.
```sh
node testrail_checker.js <testplan_id>
```

### 5. `testrail_integration.js`
Parses test results from XML and updates TestRail.
```sh
node testrail_integration.js --run-name <run_name> --testplan-id <testplan_id>
```

### 6. `testrail_integrationV2.js`
Same as above but supports multiple suites.
```sh
node testrail_integrationV2.js --run-name <run_name> --testplan-id <testplan_id>
```

### 7. `testrail_result.js`
Parses XML test results and logs extracted test case IDs.
```sh
node testrail_result.js
```

### 8. `updateTestRailCasesV1.js`
Updates TestRail cases based on changed files.
```sh
node updateTestRailCasesV1.js
```

### 9. `updateTestRailCasesV2.js`
Updates TestRail cases using a JSON file.
```sh
node updateTestRailCasesV2.js
```

### 10. `update-testrail-cases-obsolate.js`
Marks obsolete TestRail cases.
```sh
node update-testrail-cases-obsolate.js
```

### 11. `update-testrail-cases-progress.js`
Marks TestRail cases as in progress.
```sh
node update-testrail-cases-progress.js
```

## Example Output

### `check-testrail-multiplesuite.js`
```sh
Extracted Test Details: {
  "added": [
    { "testid": "1234", "platformName": "Web", "location": "path/to/file.js" }
  ]
}
Data saved to database.
```

### `testrail_integration.js`
```sh
Test results parsed from XML:
{
  "testCases": [
    { "id": "C1234", "status": "passed" },
    { "id": "C5678", "status": "failed" }
  ]
}
TestRail updated with test results.
```

## Sample `suiteConfig.js`
```js
module.exports = {
  prefixSuiteID: {
    "SuiteA": 101,
    "SuiteB": 102,
    "SuiteC": 103,
    "Master": 100
  }
};
```

## Error Handling
- Missing arguments or environment variables cause script failure.
- API failures log errors before exiting.
- Missing results files prevent updates.

For more details, check script comments.

