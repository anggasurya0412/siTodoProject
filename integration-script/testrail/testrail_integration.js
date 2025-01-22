const axios = require('axios');
const fs = require('fs');
const xml2js = require('xml2js');

// Configuration
const API_URL = process.env.BASEURL;
const PATH_GET_TEST_RUN = '/index.php?/api/v2/get_plan/';
const PATH_CREATE_TEST_RUN = '/add_plan_entry/';
const PATH_UPDATE_TEST_RUN = '/update_plan_entry/';
const PATH_TEST_RESULT = '/add_results_for_cases/';
const usernameTestrail = process.env.USERNAME;
const passwordTestrail = process.env.PASSWORD;
const SUITE_ID = process.env.SUITEID;  // Replace with your suite ID

// Simple flag parsing from process.argv
let RUN_NAME = null;
let TESTPLAN_ID = null;
let TARGET_FILE = process.env.TARGETFILE || "output.xml";

process.argv.forEach((arg, index) => {
    if (arg === '--run-name' && process.argv[index + 1]) {
        RUN_NAME = process.argv[index + 1];
    }
    if (arg === '--testplan-id' && process.argv[index + 1]) {
        TESTPLAN_ID = process.argv[index + 1];
    }
    if (arg === '--target-file' && process.argv[index + 1]) {
        TARGET_FILE = process.argv[index + 1];
    }
    
});

// Check if both flags are provided
if (!RUN_NAME) {
    console.error('Error: --run-name is required.');
    process.exit(1);
}
if (!TESTPLAN_ID) {
    console.error('Error: --testplan-id is required.');
    process.exit(1);
}
if (!TARGET_FILE) {
    console.error('Error: --target-file is required.');
    process.exit(1);
}

let resGetTestRuns;
let runId;
let entryId;

// Function to extract test case IDs and status from XML file
async function parseTestCaseIdsFromXML(xmlFile) {
    const xml = fs.readFileSync(xmlFile, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);
    
    // Define prefixes to look for
    const prefixes = ["%BE-C", "%FE-C", '%AD-C', '%IOS-C'];
    const caseDetails = [];

    // Function to recursively search for test case IDs and status in XML structure
    function findCaseDetails(obj) {
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (key === 'test') {
                    obj[key].forEach(test => {
                        const docs = test.doc || [];
                        const status = test.status ? test.status[0].$.status : 'UNKNOWN';
                        docs.forEach(docText => {
                            const trimmedText = docText.trim();

                            // Check for each prefix
                            prefixes.forEach(prefix => {
                                if (trimmedText.startsWith(prefix)) {
                                    // Extract the ID after the prefix, including the first letter
                                    const caseId = trimmedText.split(' ')[0].substring(prefix.length);
                                    // Convert status to TestRail status_id (assuming FAIL is 5 and PASS is 1)
                                    const statusId = status === 'FAIL' ? 5 : 1;
                                    caseDetails.push({ id: caseId, status: statusId });
                                }
                            });
                        });
                    });
                } else {
                    findCaseDetails(obj[key]);
                }
            }
        }
    }

    findCaseDetails(result);
    return caseDetails;
}

// Get existing test runs
async function getTestRuns() {
    try {
        const response = await axios.get(`${API_URL}${PATH_GET_TEST_RUN}${TESTPLAN_ID}`, {
            auth: {
                username: usernameTestrail,
                password: passwordTestrail
            }
        });
        resGetTestRuns = response.data.entries;
        return resGetTestRuns;
    } catch (error) {
        console.error('Error fetching test runs:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Create a new test run
async function createTestRun(name, caseDetails) {
    try {
        const response = await axios.post(`${API_URL}${PATH_CREATE_TEST_RUN}${TESTPLAN_ID}`, {
            suite_id: SUITE_ID,
            include_all: false,
            case_ids: caseDetails.map(tc => tc.id),
            name: name
        }, {
            auth: {
                username: usernameTestrail,
                password: passwordTestrail
            },
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data.runs[0].id;
    } catch (error) {
        console.error('Error creating test run:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Update an existing test run
async function updateTestRun(entryId, name, caseDetails) {
    try {
        const response = await axios.post(`${API_URL}${PATH_UPDATE_TEST_RUN}${TESTPLAN_ID}/${entryId}`, {
            suite_id: SUITE_ID,
            description: `${name} retry n+1`,
            include_all: false,
            case_ids: caseDetails.map(tc => tc.id),
            name: name,
        }, {
            auth: {
                username: usernameTestrail,
                password: passwordTestrail
            },
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`Test Run ${entryId} Updated`, response.data );
    } catch (error) {
        console.error('Error updating test run:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Add or update test results
async function addTestResults(runId, results) {
    try {
        await axios.post(`${API_URL}${PATH_TEST_RESULT}${runId}`, { results: results }, {
            auth: {
                username: usernameTestrail,
                password: passwordTestrail
            },
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error adding test results:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Main function
(async function() {
    try {
        // Parse the output.xml file
        const caseDetails = await parseTestCaseIdsFromXML(TARGET_FILE);

        // Get existing test runs
        const testRuns = await getTestRuns();
        
        // Find the existing run by name
        const existingRun = testRuns.find(run => run.name === RUN_NAME);

        if (existingRun) {
            // Update the existing test run
            runId = existingRun.runs[0].id;
            entryId = existingRun.runs[0].entry_id;
            await updateTestRun(entryId, RUN_NAME, caseDetails);
        } else {
            // Create a new test run
            runId = await createTestRun(RUN_NAME, caseDetails);
        }

        // Add or update test results
        const results = caseDetails.map(tc => ({
            case_id: tc.id,
            status_id: tc.status,
            comment: tc.status === 5 ? "Test failed due to an unexpected error." : "Test passed successfully."
        }));
        await addTestResults(runId, results);

        console.log('Test results have been updated.');

    } catch (error) {
        console.error('An error occurred:', error.message);
    }
})();
