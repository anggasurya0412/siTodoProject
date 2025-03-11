# 🤦‍♂️ Robot Framework - Test ID Checker  

This repository includes scripts to ensure test cases in the Robot Framework have unique and properly assigned test IDs.  

## 📌 Available Scripts  

### 1⃣ Duplicate Test ID Checker  
Scans all files to detect duplicate test IDs.  

#### ✅ Usage  
1. Install required modules:  
   ```sh
   npm install glob @actions/github
   ```
2. Run the script:  
   ```sh
   node ./submodule/integration-script/checker/checkForDuplicateTestIds.js
   ```

---

### 2⃣ Missing Test ID Checker  
Scans a specific target file to detect test cases missing test IDs.  

#### ✅ Usage  
1. Install required modules:  
   ```sh
   npm install @actions/core @actions/github
   ```
2. Run the script:  
   ```sh
   node ./submodule/integration-script/checker/checkForMissingTestIds.js <targetFile>
   ```
   Example:  
   ```sh
   node ./submodule/integration-script/checker/checkForMissingTestIds.js automation-web/TestSuite/login_tests.robot
   ```

---

### 3⃣ Custom Linter  
Scans files to verify code conventions to ensure they follow format guidelines and minimizing duplicate keywords.  

#### ✅ Usage  
1. Install required modules:  
   ```sh
   npm install @actions/core @actions/github
   ```
2. Run the script:  
   ```sh
   node ./submodule/integration-script/linter/custome-linter.js
   ```

---

### 4⃣ Validate Filename  
Scans filenames to ensure they follow format guidelines.  

#### ✅ Usage  
Run the script:  
   ```sh
   python ./submodule/integration-script/linter/validate_naming_file.py
   ```

---