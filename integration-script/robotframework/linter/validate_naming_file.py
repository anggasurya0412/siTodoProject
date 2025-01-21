import os
import re

def validate_file_naming_conventions(filename):
    basename = os.path.basename(filename)
    folder_name = os.path.dirname(filename).split(os.sep)[-1]

    if folder_name == 'SchemaObject':
        expected_pattern = r'.*_schema\.json$'
    elif folder_name == 'StepDefinition':
        expected_pattern = r'.*_steps\.robot$'
    elif folder_name == 'TestSuite':
        expected_pattern = r'.*_tests\.robot$'
    elif folder_name == 'PageObject':
        expected_pattern = r'.*_page\.robot$'
    else:
        # If the folder is not one of the specified ones, no need to validate
        return
    
    if not re.match(expected_pattern, basename):
        print(f"Naming-Warning: File '{filename}' does not match expected naming convention '{expected_pattern}'")

def main():
    with open('changed_files.txt', 'r') as file:
        changed_files = [line.strip() for line in file if line.strip()]

    if not changed_files:
        print("No files modified or added.")
        return

    for relative_filename in changed_files:
        if os.path.exists(relative_filename):
            validate_file_naming_conventions(relative_filename)
        else:
            print(f"File not found: {relative_filename}")

if __name__ == "__main__":
    main()
