require('dotenv').config(); // Load environment variables from .env
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { prefixTestID } = require(`${process.env.CONFIGFILE}`);

// Function to parse command-line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = { target: [] };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--branch':
                options.branch = args[++i];
                break;
            case '--squad':
                options.squad = args[++i];
                break;
            case '--target':
                while (++i < args.length && !args[i].startsWith('--')) {
                    options.target.push(args[i]);
                }
                i--;
                break;
            default:
                console.error(`Unknown option: ${args[i]}`);
                process.exit(1);
        }
    }

    if (!options.branch || !options.squad || options.target.length === 0) {
        console.error('Error: Missing required arguments --branch, --squad, or --target.');
        process.exit(1);
    }

    return options;
}

function getAllFiles(inputPath, filePattern) {
    let fileList = [];
    if (fs.statSync(inputPath).isDirectory()) {
        let files = fs.readdirSync(inputPath);
        files.forEach((file) => {
            const filePath = path.join(inputPath, file);
            if (fs.statSync(filePath).isDirectory()) {
                fileList = fileList.concat(getAllFiles(filePath, filePattern));
            } else if (filePath.endsWith(filePattern)) {
                fileList.push(filePath);
            }
        });
    } else if (inputPath.endsWith(filePattern)) {
        fileList.push(inputPath);
    }
    return fileList;
}

function extractTestIds(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    let isTestCaseSection = false;
    const testDetails = [];
    const testIdPattern = /(FE-C|BE-C|AD-C|IOS-C)(\d+)/;

    lines.forEach((line) => {
        line = line.trim();
        if (line.startsWith('*** Test Cases ***')) {
            isTestCaseSection = true;
        } else if (line.startsWith('***') && isTestCaseSection) {
            isTestCaseSection = false;
        } else if (isTestCaseSection && line.startsWith('[Documentation]')) {
            const match = line.match(testIdPattern);
            if (match) {
                const platformName = prefixTestID[match[1]];
                testDetails.push({
                    location: filePath,
                    testid: match[2],
                    platformName: platformName
                });
            }
        }
    });

    return testDetails;
}

async function saveToDatabase(testDetails) {
    const client = new Client({
        user: process.env.RobotDbUser,
        host: process.env.RobotDbHost,
        database: process.env.RobotDbName,
        password: process.env.RobotDbPass,
        port: process.env.RobotDbPort,
    });

    await client.connect();
    const prAuthorEmail = process.env.PR_AUTHOR || '';

    console.log(`Author Name: ${prAuthorEmail}`)

    for (const test of testDetails) {
        const query = `
            INSERT INTO test_case (tc_squad_name, tc_test_id, tc_platform_name, tc_branch_name, tc_env_name, tc_author_name, tc_fp_name, tc_created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (tc_test_id)
            DO UPDATE SET
                tc_platform_name = EXCLUDED.tc_platform_name,
                tc_branch_name = EXCLUDED.tc_branch_name,
                tc_env_name = EXCLUDED.tc_env_name,
                tc_fp_name = EXCLUDED.tc_fp_name,
                tc_updated_by = EXCLUDED.tc_author_name,
                tc_updated_at = NOW()
        `;
        const values = [test.squad, test.testid, test.platformName, test.branch, test.env, prAuthorEmail, test.location];
        try {
            await client.query(query, values);
        } catch (err) {
            console.error(`Error inserting/updating test case ${test.testid}:`, err);
        }
    }

    console.log('Data saved to database.');
    await client.end();
}

async function collectAndSave() {
    const options = parseArgs();
    const targetFiles = options.target;
    if (targetFiles.length === 0) {
        console.log('No target files provided.');
        return;
    }

    const testDetails = collectTestIds(options.branch, options.squad, options.target);

    console.log('Collected Test Details:', JSON.stringify(testDetails, null, 2));

    await saveToDatabase(testDetails);
}

function collectTestIds(branch, squad, targets) {
    let allTestDetails = [];
    targets.forEach((target) => {
        const files = getAllFiles(target, '_tests.robot');
        files.forEach((file) => {
            const testDetails = extractTestIds(file);
            allTestDetails = allTestDetails.concat(
                testDetails.map((test) => ({
                    squad: squad,
                    location: test.location,
                    testid: test.testid,
                    platformName: test.platformName,
                    branch: branch,
                    env: branch === 'master' || branch === 'main' ? 'Staging' : 'Dev'
                }))
            );
        });
    });
    return allTestDetails;
}

// Run the script
    try{
        collectAndSave()
    }
    catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
