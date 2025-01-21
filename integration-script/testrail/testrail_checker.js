const axios = require('axios');

// Configuration
const API_URL = process.env.BASEURL;
const PATH_GET_TEST_RUN = '/index.php?/api/v2/get_plan/';
const TESTPLAN_ID = process.argv[2];  // Get test run name from command-line argument
const usernameTestrail = process.env.USERNAME;
const passwordTestrail = process.env.PASSWORD;
const ID_PROJECT = process.env.PROJECTID;  // Genesis
let response

// Get existing test runs
async function getTestRuns() {
    try {
        response = await axios.get(`${API_URL}${PATH_GET_TEST_RUN}${TESTPLAN_ID}`, {
            auth: {
                username: usernameTestrail,
                password: passwordTestrail
            }
        });
        resGetTestRuns=response.data.entries
        resGetProjectId = resGetTestRuns[0].runs[0].project_id
        console.log(JSON.stringify(response.data.entries[0].runs[0].project_id))
        if (resGetProjectId == ID_PROJECT){
            console.log(`Test Plan ID ${ID_PROJECT} is exist`)
            return resGetTestRuns;
        }
        else{
            console.error(`Test Plan ID ${TESTPLAN_ID} not match with Project ID ${ID_PROJECT}`);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error fetching test runs:', error.response.data);
        process.exit(1);
    }
}

getTestRuns()