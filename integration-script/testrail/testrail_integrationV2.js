require('dotenv').config(); // Load environment variables from .env
const axios = require('axios');
const fs = require('fs');
const xml2js = require('xml2js');
const readline = require('readline');
const { prefixSuiteID } = require(`${process.env.SUITEIDCONFIG}`);

// Configuration
const API_URL = process.env.TESTRAILBASEURL;
const PATH_GET_TEST_RUN = '/index.php?/api/v2/get_plan/';
const PATH_CREATE_TEST_RUN = '/index.php?/api/v2/add_plan_entry/';
const PATH_UPDATE_TEST_RUN = '/index.php?/api/v2/update_plan_entry/';
const PATH_TEST_RESULT = '/index.php?/api/v2/add_results_for_cases/';
const usernameTestrail = process.env.TESTRAILUSERNAME;
const passwordTestrail = process.env.TESTRAILPASSWORD;

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

async function getUniqueSuiteNames(xmlFile) {
    try {
        const xml = fs.readFileSync(xmlFile, 'utf-8');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xml);
        const suiteNames = new Set();

        function findSuites(obj) {
            if (obj && typeof obj === 'object') {
                // Check if the object has a source property that matches our pattern
                if (typeof obj === 'object' && obj.$ && obj.$.source) {
                    const source = obj.$.source;
                    // Using regex to find suite name from the path pattern
                    const match = source.match(/TestSuite\/([^/]+)\/.*\.robot$/);
                    if (match && match[1]) {
                        suiteNames.add(match[1]);
                    }
                }

                // Recursively search through all properties
                for (const key in obj) {
                    if (obj[key] && typeof obj[key] === 'object') {
                        findSuites(obj[key]);
                    } else if (Array.isArray(obj[key])) {
                        obj[key].forEach(item => findSuites(item));
                    }
                }
            }
        }

        findSuites(result);
        
        // Convert Set to Array and sort
        const uniqueSuites = Array.from(suiteNames).sort();
        console.log('Found suites:', uniqueSuites);
        
        if (uniqueSuites.length === 0) {
            console.warn('Warning: No suites found in the XML file');
        }
        
        return uniqueSuites;
    } catch (error) {
        console.error('Error reading or parsing XML file:', error);
        throw error;
    }
}

// Function to extract test case IDs and status from XML file
async function parseTestCaseIdsFromXML(xmlFile) {
    const xml = fs.readFileSync(xmlFile, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);

    const prefixes = ["%BE-C", "%FE-C", "%AD-C", "%IOS-C"];
    const caseDetailsBySuite = {};

    function getSuiteFromPath(path) {
        const match = path.match(/\/TestSuite\/([^/]+)\//);
        if (match && match[1]) {
            return match[1]; // Extract $SuiteName
        }
        return 'Master'; // Default to "Master" if no specific suite name is found
    }

    function findTestCases(obj) {
        if (obj && typeof obj === 'object') {
            if (obj.test && Array.isArray(obj.test)) {
                obj.test.forEach(test => {
                    if (test.doc && Array.isArray(test.doc)) {
                        test.doc.forEach(docText => {
                            const trimmedText = docText.trim();
                            prefixes.forEach(prefix => {
                                if (trimmedText.startsWith(prefix)) {
                                    const caseId = trimmedText.split(' ')[0].substring(prefix.length);
                                    const source = obj.$.source || '';
                                    const suiteName = getSuiteFromPath(source);
                                    const status = test.status?.[0]?.$?.status || 'UNKNOWN';
                                    const statusId = status === 'FAIL' ? 5 : 1;

                                    if (!caseDetailsBySuite[suiteName]) {
                                        caseDetailsBySuite[suiteName] = [];
                                    }

                                    caseDetailsBySuite[suiteName].push({
                                        id: caseId,
                                        status: statusId,
                                        name: test.$.name || 'Unknown Test'
                                    });
                                }
                            });
                        });
                    }
                });
            }

            // Recursively search through all properties
            for (const key in obj) {
                if (obj[key] && typeof obj[key] === 'object') {
                    findTestCases(obj[key]);
                } else if (Array.isArray(obj[key])) {
                    obj[key].forEach(item => findTestCases(item));
                }
            }
        }
    }

    findTestCases(result);

    // Log cases per suite
    for (const suite in caseDetailsBySuite) {
        console.log(`Suite "${suite}" has ${caseDetailsBySuite[suite].length} test cases`);
    }

    return caseDetailsBySuite;
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
async function createTestRun(name, caseDetails, suiteId) {
    console.log('Test Run Created', `${API_URL}${PATH_CREATE_TEST_RUN}${TESTPLAN_ID} - ${suiteId} and test case ${caseDetails.map(tc => tc.id)}`);
    try {
        const response = await axios.post(`${API_URL}${PATH_CREATE_TEST_RUN}${TESTPLAN_ID}`, {
            suite_id: suiteId,
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
async function updateTestRun(entryId, name, caseDetails, suiteId) {
    try {
        const response = await axios.post(`${API_URL}${PATH_UPDATE_TEST_RUN}${TESTPLAN_ID}/${entryId}`, {
            suite_id: suiteId,
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
(async function () {
    try {
        const caseDetailsBySuite = await parseTestCaseIdsFromXML(TARGET_FILE);

        for (const suiteName in caseDetailsBySuite) {
            const caseDetails = caseDetailsBySuite[suiteName];
            const suiteId = parseInt(prefixSuiteID[suiteName] || prefixSuiteID['Master']);
            console.log(`Processing suite "${suiteName}" with ID ${suiteId}`);

            if (caseDetails.length === 0) {
                console.log(`No test cases found under suite "${suiteName}".`);
                continue;
            }

            const runName = `${RUN_NAME} - ${suiteName}`;
            const testRuns = await getTestRuns();
            const existingRun = testRuns.find(run => run.name === runName);

            let runId;
            if (existingRun) {
                runId = await updateTestRun(
                    existingRun.runs[0].entry_id,
                    runName,
                    caseDetails,
                    suiteId
                );
            } else {
                runId = await createTestRun(runName, caseDetails, suiteId);
            }

            if (runId) {
                const results = caseDetails.map(tc => ({
                    case_id: tc.id,
                    status_id: tc.status,
                    comment: tc.status === 5 
                        ? `Test "${tc.name}" failed`
                        : `Test "${tc.name}" passed`
                }));
                await addTestResults(runId, results);
                console.log(`Updated results for suite "${suiteName}"`);
            }
        }
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
})();




