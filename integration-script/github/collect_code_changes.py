import os
import subprocess
import json
import re

def get_diff(file_path, base_branch, head_branch):
    """Get the git diff for a specific file between two branches."""
    diff_cmd = f"git diff -U0 origin/{base_branch}...origin/{head_branch} -- {file_path}"
    result = subprocess.run(diff_cmd, shell=True, capture_output=True, text=True)
    return result.stdout

def parse_diff(diff_output):
    """Parse the diff output and extract added and deleted lines with line numbers."""
    added_lines = []
    deleted_lines = []

    base_line = 0
    head_line = 0

    for line in diff_output.split("\n"):
        if line.startswith("@@"):
            # Extract line numbers from chunk header
            match = re.search(r"@@ -(\d+)(?:,\d+)? \+(\d+)", line)
            if match:
                base_line = int(match.group(1))  # Start of base branch changes
                head_line = int(match.group(2))  # Start of head branch changes
        elif line.startswith("+") and not line.startswith("+++"):
            # Added line
            added_lines.append((head_line, line[1:].strip()))
            head_line += 1
        elif line.startswith("-") and not line.startswith("---"):
            # Deleted line
            deleted_lines.append((base_line, line[1:].strip()))
            base_line += 1
        elif not line.startswith("+") and not line.startswith("-"):
            # Context lines (unchanged lines)
            base_line += 1
            head_line += 1

    return added_lines, deleted_lines
 
def filter_lines(lines, options):
    """Filter out unwanted lines based on their content."""
    filtered_lines = []
    if options == "syntax": 
        for line_num, content in lines:
            if not content.strip():  # Ignore empty lines
                continue
            if content.startswith("[Documentation]") or content.startswith("[Tags]"):
                continue
            if content.startswith("#"):
                continue
            filtered_lines.append((line_num, content))
    elif options == "testid":
        for line_num, content in lines:
            if content.startswith("[Documentation]") :
                filtered_lines.append((line_num, content))
            else : 
                continue
    return filtered_lines

def analyze_file(file_path, base_branch, head_branch, options):
    """Analyze a single .robot file for changes."""
    diff_output = get_diff(file_path, base_branch, head_branch)
    added_lines, deleted_lines = parse_diff(diff_output)

    # Filter unwanted lines
    added_lines = filter_lines(added_lines, options)
    deleted_lines = filter_lines(deleted_lines, options)

    # Adjust added line numbers to match the actual file content
    for i, (line_num, content) in enumerate(added_lines):
        if content.strip():
            line_num_adjustment = next((ln for ln, c in deleted_lines if c == content), None)
            if line_num_adjustment is not None:
                added_lines[i] = (line_num_adjustment, content)

    return {
        "file": file_path,
        "added_lines": [{"line": line[0], "content": line[1]} for line in added_lines],
        "deleted_lines": [{"line": line[0], "content": line[1]} for line in deleted_lines],
    }

def main(changed_files_path, options):
    base_branch = os.getenv("BASE_BRANCH", "main")
    head_branch = os.getenv("HEAD_BRANCH", "feature-branch")
    output_file = "code_changes.json"

    with open(changed_files_path, "r") as f:
        changed_files = [line.strip() for line in f.readlines() if line.strip()]

    results = []
    for file_path in changed_files:
        print(f"Processing file: {file_path}")
        analysis_result = analyze_file(file_path, base_branch, head_branch, options)
        results.append(analysis_result)

    # Write results to JSON
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Analysis results written to {output_file}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python analysist_syntax_robot.py <options> <changed_files.txt>")
        sys.exit(1)

options = sys.argv[1]
changed_files_path = sys.argv[2]
main(changed_files_path, options)

