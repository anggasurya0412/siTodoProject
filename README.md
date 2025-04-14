# 🚀 siTodoProject
This is part of an integration project that simplifies repetitive activities.

## 🛠️ Setup

### 🔹 Import Submodule Locally
To add the submodule to your local project, run:
```sh
git submodule add https://github.com/anggasurya0412/siTodoProject.git ${directory}
```
Example:
```sh
git submodule add https://github.com/anggasurya0412/siTodoProject.git submodule
```

### 🔹 Import Submodule in GitHub Actions
To integrate the submodule in a GitHub Action, create a `.yml` file under `.github/workflows/` and add the following steps:
```yaml
      - name: Checkout code
        uses: actions/checkout@v2
        with:
          fetch-depth: 0
          submodules: true

      - name: Import submodule
        run: |
          git submodule foreach git pull origin master
```

## 📌 How To Use

- **Database Integration**: [Documentation Guide](integration-script/database/Readme.md)
- **GitHub Interaction**: [Documentation Guide](integration-script/github/Readme.md)
- **Robot Framework**: [Documentation Guide](integration-script/robotframework/Readme.md)
- **Testrail Integration**: [Documentation Guide](integration-script/testrail/Readme.md)

## Tips
Please follow this guidance if wanna use all feature
- **Best Practices for Robot Framework UI Testing: A Guide to Clean Automation** : [Robot Framework UI Testing](https://medium.com/@anggasuryautama041295/best-practices-for-robot-framework-ui-testing-a-guide-to-clean-automation-d5feb872afdc)

