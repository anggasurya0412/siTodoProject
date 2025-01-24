const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { prefixSuiteID } = require(`${process.env.SUITEIDCONFIG}`);

// TestRail API configuration
const usernameTestrail = process.env.USERNAME;
const passwordTestrail = process.env.PASSWORD;
const baseUrl = process.env.BASEURL;
const pathGetCases = '/index.php?/api/v2/get_case/';

// Function to determine suite ID based on file location
function determineSuiteId(filePath) {
    // Normalize the path to handle different OS path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Regular expression to match the pattern /TestSuite/suiteName/
    const suitePathRegex = /\/TestSuite\/([^\/]+)\//;
    
    // Extract suite name from path
    const match = normalizedPath.match(suitePathRegex);
    if (match) {
        const suiteName = match[1];
        
        // Check if the suite name exists in suiteConfig.js
        for (const [configSuiteName, suiteId] of Object.entries(prefixSuiteID)) {
            if (suiteName === configSuiteName) {
                return suiteId;
            }
        }
    }
    
    return null; // Return null for files outside of configured suites
}

async function validateTestRailId(testId, filePath) {
    try {
        const response = await axios.get(
            `${baseUrl}${pathGetCases}${testId}`,
            {
                auth: {
                    username: usernameTestrail,
                    password: passwordTestrail
                }
            }
        );

        let expectedSuiteId = determineSuiteId(filePath);
        const suitePath = filePath.match(/\/TestSuite\/([^\/]+)/)?.[1] || 'root';
        
        // If expectedSuiteId is null, use Master suite ID
        if (expectedSuiteId === null) {
            expectedSuiteId = prefixSuiteID['Master'];
        }

        // Validate both status and suite_id
        if (response.status === 200 && response.data.suite_id === parseInt(expectedSuiteId)) {
            return {
                valid: true,
                message: `Test ID ${testId} exists and belongs to the correct suite`,
                suite: suitePath
            };
        } else if (response.status !== 200) {
            return {
                valid: false,
                message: `Test ID ${testId} request failed with status ${response.status}`,
                suite: suitePath
            };
        } else {
            return {
                valid: false,
                message: `Test ID ${testId} exists but belongs to suite ${response.data.suite_id} instead of expected suite ${expectedSuiteId}`,
                suite: suitePath
            };
        }
    } catch (error) {
        return {
            valid: false,
            message: `Error validating test ID ${testId}: ${error.message}`,
            suite: filePath.match(/\/TestSuite\/([^\/]+)/)?.[1] || 'root'
        };
    }
}

async function checkTestRailIds() {
    try {
        const filePath = process.env.TARGETFILE;
        console.log(filePath)
        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          process.exit(1);
        }
        const codeChanges = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const testCases = extractTestCases(codeChanges);
        if (testCases.length === 0) {
            console.log('No test cases found in the changes.');
            return true;
        }
        
        const results = [];
        for (const testCase of testCases) {
            console.log(`Checking Test ID: ${testCase.testId} from file: ${testCase.filePath}`);
            const result = await validateTestRailId(testCase.testId, testCase.filePath);
            results.push({
                testId: testCase.testId,
                filePath: testCase.filePath,
                ...result
            });
        }

        // Group results by suite
        const groupedResults = results.reduce((acc, result) => {
            const suite = result.suite;
            if (!acc[suite]) {
                acc[suite] = [];
            }
            acc[suite].push(result);
            return acc;
        }, {});

        // Log results grouped by suite
        console.log('\nValidation Results:');
        Object.entries(groupedResults).forEach(([suite, suiteResults]) => {
            console.log(`\n${suite}:`);
            suiteResults.forEach(result => {
                console.log(`  ${result.testId}: ${result.valid ? '✅' : '❌'} ${result.message}`);
            });
        });
        // Return false if any validation failed
        return !results.some(result => !result.valid);
    } catch (error) {
        console.error('Error checking TestRail IDs:', error);
        return false;
    }
}

// Helper function to extract test IDs and their file paths from code_changes.json
function extractTestCases(codeChanges) {
    const testCases = [];
    try {
        // Iterate over each file in codeChanges
        codeChanges.forEach(fileChange => {
            if (fileChange.added_lines) {
                fileChange.added_lines.forEach(line => {
                    if (line.content) {
                        const match = line.content.match(/%(FE-C|BE-C|AD-C|IOS-C)(\d+)/);
                        if (match) {
                            const prefix = match[1]; // E.g., FE-C
                            const numericTestId = match[2]; // E.g., 123124
                            const testId = `${numericTestId}`; // Numeric ID only
                            testCases.push({
                                testId,
                                prefix, // Optional: For additional validation if needed
                                filePath: fileChange.file || 'Unknown'
                            });
                        }
                    }
                });
            }
        });

        // Remove duplicates
        return Array.from(
            new Map(testCases.map(item => [item.testId, item])).values()
        );
    } catch (error) {
        console.error('Error extracting test cases:', error);
        return [];
    }
}

// Execute the check
checkTestRailIds().then(success => {
    process.exit(success ? 0 : 1);
});

module.exports = { validateTestRailId, checkTestRailIds };