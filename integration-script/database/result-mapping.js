const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { Client } = require('pg'); // Import PostgreSQL client
require('dotenv').config(); // Load environment variables from .env file

const args = require('minimist')(process.argv.slice(2), {
    string: ['env', 'file', 'plan-id', 'release-tag'],
});

const xmlFile = args.file || 'output.xml'; // Default to 'output.xml' if not provided
const planId = args['plan-id'] || 'Unknown Plan ID';
const releaseTag = args['release-tag'] || 'Unknown Release Tag';

// Normalize envName based on the provided argument, case-insensitive
const envMap = {
    dev: 'Dev',
    staging: 'Staging',
};

const envInput = args['env'] || 'Staging'; // Default if not provided
const envName = envMap[envInput.toLowerCase()] || 'Staging';

// PostgreSQL connection configuration
const client = new Client({
    user: process.env.RobotDbUser,
    host: process.env.RobotDbHost,
    database: process.env.RobotDbName,
    password: process.env.RobotDbPass,
    port: process.env.RobotDbPort
});

// Function to insert test result into the PostgreSQL database
async function insertIntoDatabase(result) {
    const query = `
        INSERT INTO test_result (
            tr_fp_name,
            tr_tc_test_id,
            tr_platform_name,
            tr_plan_id,
            tr_env_name,
            tr_release_tag,
            tr_test_result,
            tr_time_execution,
            tr_update_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    const values = [
        result.filename,
        result.testId,
        result.platform,
        result.planId,
        result.envName,
        result.releaseTag,
        result.statusTest,
        result.timeExecution,
        result.updateAt // Add the timestamp value
    ];

    try {
        await client.query(query, values);
        console.log(`Inserted test result for testId ${result.testId}`);
    } catch (err) {
        console.error(`Error inserting test result for testId ${result.testId}:`, err);
        process.exit(1); // Exit the process with an error code
    }
}

// Helper function to extract test ID and platform based on prefix
function extractTestIdAndPlatform(doc) {
    const prefixes = {
        '%BE-C': 'BE',
        '%FE-C': 'FE',
        '%AD-C': 'Android',
        '%IOS-C': 'IOS'
    };

    for (const [prefix, platform] of Object.entries(prefixes)) {
        if (doc && doc.startsWith(prefix)) {
            const testId = doc.replace(prefix, '').split(' ')[0]; // Replace prefix and extract the numeric part
            return { testId, platform };
        }
    }
    return { testId: 'No Test ID Found', platform: 'Unknown Platform' };
}

// Helper function to format the timestamp (ISO to PostgreSQL format)
function formatTimestamp(isoString) {
    return new Date(isoString).toISOString().replace('T', ' ').split('.')[0]; // Converts ISO format to "YYYY-MM-DD HH:MM:SS"
}

// Helper function to extract relative path dynamically
function getRelativePath(fullPath) {
    return path.relative(process.cwd(), fullPath);
}

async function main() {
    try {
        await client.connect(); // Connect to the database
        console.log("Connected to PostgreSQL database");

        // Read the XML file
        const data = fs.readFileSync(xmlFile, 'utf8');

        // Parse XML
        xml2js.parseString(data, { mergeAttrs: true, explicitArray: false }, async (err, result) => {
            if (err) {
                console.error(`Error parsing XML: ${err}`);
                return;
            }

            const suite = result.robot.suite;
            const generatedTimestamp = result.robot.generated; // Get the robot.generated timestamp
            const fullPath = suite.source;
            const filename = getRelativePath(fullPath);

            function collectTests(suite) {
                if (!suite) return [];
                let tests = suite.test ? (suite.test instanceof Array ? suite.test : [suite.test]) : [];
                if (suite.suite) {
                    const nestedSuites = suite.suite instanceof Array ? suite.suite : [suite.suite];
                    for (const nestedSuite of nestedSuites) {
                        tests = tests.concat(collectTests(nestedSuite));
                    }
                }
                return tests;
            }

            const tests = collectTests(suite);

            // Insert all test results into the database
            const insertPromises = tests.map(async (test) => {
                const doc = test.doc || '';
                const { testId, platform } = extractTestIdAndPlatform(doc); // Extract testId and platform
                const statusValue = test.status.status; // Get status value (FAIL, PASS, etc.)
                const elapsed = parseFloat(test.status.elapsed).toFixed(2); // Convert elapsed to float and format

                await insertIntoDatabase({
                    filename: filename,
                    testId: testId || 'No Test ID Found',
                    platform: platform || 'Unknown Platform',
                    planId: planId,
                    envName: envName,
                    releaseTag: releaseTag,
                    statusTest: statusValue,
                    timeExecution: elapsed,
                    updateAt: formatTimestamp(generatedTimestamp) // Format and assign the timestamp
                });
            });

            // Wait for all inserts to complete
            await Promise.all(insertPromises);
            console.log("All test results inserted.");

            // Close the database connection
            await client.end();
            console.log("Disconnected from PostgreSQL database.");
            process.exit(0); // Exit the process successfully
        });
    } catch (err) {
        console.error(`Error: ${err}`);
        process.exit(1); // Exit the process with an error code
    }
}

main(); // Execute the main function
