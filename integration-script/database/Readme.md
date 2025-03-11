# Test Case Management Scripts

## Overview
This repository contains Node.js scripts for managing test cases and test results in a PostgreSQL database. The scripts help extract test case IDs from Robot Framework test files, track test case progress, mark obsolete test cases, and store test results.

### Available Scripts:
- **`collect_testid.js`**: Extracts test case IDs from Robot Framework test files (`_tests.robot`) and stores them in the database.
- **`collect-selected-testid.js`**: Extracts test case IDs from a JSON file and updates the database with added and deleted test cases.
- **`update-testid-progress.js`**: Updates the database with new or modified test case IDs that are in progress.
- **`update-testid-obsolate.js`**: Marks deleted test case IDs as obsolete in the database.
- **`result-mapping.js`**: Parses Robot Framework XML result files, extracts test case details, and inserts the results into the database.

---

## Prerequisites
Ensure you have the following installed before running the scripts:
- **Node.js** (v12 or later)
- **PostgreSQL** database
- **A `.env` file** with the required environment variables
- **XML test result file** (e.g., `output.xml` for `result-mapping.js`)

---

## Environment Variables
Create a `.env` file in the root directory and define the following variables:

```ini
CONFIGFILE=path/to/config.js
TESTIDCONFIG=<path_to_testid_config>
PR_AUTHOR=author_email@example.com

RobotDbUser=your_db_user
RobotDbHost=your_db_host
RobotDbName=your_db_name
RobotDbPass=your_db_password
RobotDbPort=your_db_port
```

---

## Configuration File
The `CONFIGFILE` should point to a JavaScript file that exports an object containing `prefixTestID` mapping, e.g.:

```js
module.exports = {
    prefixTestID: {
        'FE-C': 'FE',
        'BE-C': 'BE',
        'AD-C': 'Android',
        'IOS-C': 'iOS'
    }
};
```

---

## Installation
1. Install dependencies:
   ```sh
   npm install pg dotenv xml2js minimist
   ```
2. Set up your `.env` file with the required database connection details.

---

## Usage

### `collect_testid.js`
Extracts test case IDs from test files and updates the database.

#### Arguments:
- `--branch <branch_name>`: The branch name (e.g., `main`, `dev`).
- `--squad <squad_name>`: The squad responsible for the test cases.
- `--target <paths>`: One or more directories or files to scan for test cases.

#### Example:
```sh
node collect_testid.js --branch dev --squad alpha --target ./TestSuite/*a.robot ./TestSuite/*c.robot
```

#### Functionality:
1. Recursively scans directories for Robot Framework test files (`_tests.robot`).
2. Extracts test case IDs from `[Documentation]` lines.
3. Maps extracted test IDs to platform names using `prefixTestID`.
4. Updates or inserts test case details into the PostgreSQL database.

---

### `collect-selected-testid.js`
Extracts test case IDs from a JSON file and updates the database.

#### Example:
```sh
node collect-selected-testid.js --branch dev --squad beta --target changes.json
```

#### Functionality:
1. Extracts test case IDs from added and deleted lines in a JSON file.
2. Updates the database:
   - Adds new test case IDs.
   - Marks deleted test case IDs as obsolete.

---

### `update-testid-progress.js`
Updates the database with new or modified test case IDs that are in progress.

#### Example:
```sh
node update-testid-progress.js --branch dev --squad beta --target changes.json
```

#### Functionality:
1. Parses a JSON file to find added test case IDs.
2. Inserts new test case IDs into the database or updates existing ones.

---

### `update-testid-obsolate.js`
Marks deleted test case IDs as obsolete in the database.

#### Example:
```sh
node update-testid-obsolate.js --branch dev --squad beta --target changes.json
```

#### Functionality:
1. Parses a JSON file to find deleted test case IDs.
2. Updates the database to set `tc_isobsolate = true` for deleted test cases.

---

### `result-mapping.js`
Parses XML test result files and inserts test results into the database.

#### Arguments:
- `--env <env_name>`: Environment name (`dev` or `staging`, default: `staging`).
- `--file <path_file>`: Path to the test result XML file (default: `output.xml`).
- `--plan-id <testplan_id>`: TestRail Test Plan ID.
- `--release-tag <date>`: Release tag identifier in `yyyy-mm-dd` format.
- `--retry <true/false>`: Boolean indicating if it's a retry run (default: `false`).

#### Example:
```sh
node result-mapping.js --env dev --file results.xml --plan-id 3324 --release-tag "2025-03-07" --retry false
```

#### Functionality:
1. Connects to the PostgreSQL database using `.env` credentials.
2. Reads and parses the Robot Framework XML result file.
3. Extracts test case IDs, platform names, and execution results.
4. Inserts test results into the `test_result` table.
5. Closes the database connection after processing.

---

## Database Structure
The scripts interact with `test_case` and `test_result` tables.

### `test_case` Table:
```sql
CREATE TABLE test_case (
    tc_id serial PRIMARY KEY,
    tc_test_id BIGINT,
    tc_platform_name VARCHAR,
    tc_squad_name VARCHAR,
    tc_author_name VARCHAR,
    tc_branch_name VARCHAR,
    tc_env_name VARCHAR,
    tc_isobsolate BOOLEAN,
    tc_created_at TIMESTAMP,
    tc_updated_at TIMESTAMP,
    tc_fp_name VARCHAR,
    tc_updated_by VARCHAR
);
```

### `test_result` Table:
```sql
CREATE TABLE test_result (
    tr_id serial PRIMARY KEY,
    tr_fp_name VARCHAR,
    tr_platform_name VARCHAR,
    tr_plan_id BIGINT,
    tr_release_tag DATE,
    tr_tc_test_id BIGINT,
    tr_test_result VARCHAR,
    tr_time_execution FLOAT,
    tr_update_at TIMESTAMP,
    tr_env_name VARCHAR,
    tr_is_retry BOOLEAN
);
```

---

## Error Handling
- If required arguments are missing, the script terminates with an error.
- Errors during database insertion/update are logged to the console.
- Invalid file paths or missing XML files trigger an error message.
- If a deleted test ID is not found in the database, a warning is logged.
- If database insertion fails, the script exits with an error code.

---