const axios = require('axios');
const fs = require('fs');
const xml2js = require('xml2js');

const TARGET_FILE = process.env.TARGET_FILE || "output.xml";
// Function to extract test case IDs and status from XML file
async function parseTestCaseIdsFromXML(xmlFile) {
    const xml = fs.readFileSync(xmlFile, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);
    
    // Define prefixes to look for
    const prefixes = ["%BE-C", "%FE-C"];
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
                                    const caseId = trimmedText.split(' ')[0].substring('C' + prefix.length);
                                    // Convert status to TestRail status_id (assuming FAIL is 5 and PASS is 1)
                                    const statusId = status === 'FAIL' ? 5 : 1;
                                    caseDetails.push({ id: caseId, status: statusId, statusName:status });
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

// Main function
(async function() {
    try {
        // Parse the output.xml file
        const caseDetails = await parseTestCaseIdsFromXML(TARGET_FILE);
        console.log(caseDetails)

    } catch (error) {
        console.error('An error occurred:', error.message);
    }
})();
