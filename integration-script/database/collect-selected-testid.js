require('dotenv').config(); // Load environment variables from .env
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { prefixTestID } = require(`${process.env.TESTIDCONFIG}`);

// Function to parse command-line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--branch':
                options.branch = args[++i];
                break;
            case '--squad':
                options.squad = args[++i];
                break;
            case '--target':
                options.target = args[++i];
                break;
            default:
                console.error(`Unknown option: ${args[i]}`);
                process.exit(1);
        }
    }

    if (!options.branch || !options.squad || !options.target) {
        console.error('Error: Missing required arguments --branch, --squad, or --target.');
        process.exit(1);
    }

    return options;
}

function extractTestDetails(jsonPath) {
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`File not found: ${jsonPath}`);
    }

    const changes = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); // Parse JSON file

    const testDetails = {
        added: [],
        deleted: [],
    };

    // Test ID regex pattern
    const testIdPattern = /(FE-C|BE-C|AD-C|IOS-C)(\d+)/;

    changes.forEach((change) => {
        const { added_lines, deleted_lines, file } = change;

        // Process added lines
        added_lines.forEach((line) => {
            const match = line.content.match(testIdPattern);
            if (match) {
                const platformName = prefixTestID[match[1]];
                testDetails.added.push({
                    testid: match[2],
                    platformName: platformName,
                    location: file
                });
            }
        });

        // Process deleted lines
        deleted_lines.forEach((line) => {
            const match = line.content.match(testIdPattern);
            if (match) {
                const platformName = prefixTestID[match[1]];
                testDetails.deleted.push({
                    testid: match[2],
                    platformName: platformName,
                    location: file
                });
            }
        });
    });

    return testDetails;
}

async function saveToDatabase(testDetails, branch, squad) {
    const client = new Client({
        user: process.env.RobotDbUser,
        host: process.env.RobotDbHost,
        database: process.env.RobotDbName,
        password: process.env.RobotDbPass,
        port: process.env.RobotDbPort,
    });

    await client.connect();
    const prAuthorEmail = process.env.PR_AUTHOR || '';
    let env
    if (branch === 'master' || branch === 'main') {
        env = "Staging"
        }
    else {
        env = "Dev"
        }

    console.log(`Author Name: ${prAuthorEmail}`)

    for (const test of testDetails.added) {
        const query = `
            INSERT INTO test_case (tc_squad_name, tc_test_id, tc_platform_name, tc_branch_name, tc_env_name, tc_author_name, tc_fp_name, tc_created_at, tc_isobsolate)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), false)
            ON CONFLICT (tc_test_id)
            DO UPDATE SET
                tc_squad_name = EXCLUDED.tc_squad_name,
                tc_platform_name = EXCLUDED.tc_platform_name,
                tc_branch_name = EXCLUDED.tc_branch_name,
                tc_env_name = EXCLUDED.tc_env_name,
                tc_fp_name = EXCLUDED.tc_fp_name,
                tc_updated_by = EXCLUDED.tc_author_name,
                tc_updated_at = NOW(),
                tc_isobsolate = false
        `;
        const values = [squad, test.testid, test.platformName, branch, env, prAuthorEmail, test.location];
        try {
            await client.query(query, values);
        } catch (err) {
            console.error(`Error inserting/updating added test ID ${test.testid}:`, err);
        }
    }

    for (const test of testDetails.deleted) {
        const query = `
            UPDATE test_case
            SET tc_updated_at = NOW(),
                tc_isobsolate = true,
                tc_updated_by = $1
            WHERE tc_test_id = $2
        `;
        const values = [prAuthorEmail, test.testid];
        try {
            const res = await client.query(query, values);
            if (res.rowCount === 0) {
                console.log(`Deleted test ID ${test.testid} not found in the database. Skipping.`);
            }
        } catch (err) {
            console.error(`Error updating deleted test ID ${test.testid}:`, err);
        }
    }
    

    console.log('Data saved to database.');
    await client.end();
}

async function main() {
    try {
        const options = parseArgs();
        const testDetails = extractTestDetails(options.target);

        console.log('Extracted Test Details:', JSON.stringify(testDetails, null, 2));

        await saveToDatabase(testDetails, options.branch, options.squad);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

// Execute the script
main();
