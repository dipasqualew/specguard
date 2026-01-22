#!/usr/bin/env bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Options
VERBOSE=0
SPECGUARD_FOLDER_NAME="specguard"

# Counters
TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0
MISSING_FILES=0

# Function to extract specguard codeblocks and steps
extract_steps() {
    local file="$1"
    local in_codeblock=0
    local steps=()
    
    while IFS= read -r line; do
        # Check for specguard codeblock start
        if [[ "$line" =~ ^\`\`\`specguard ]]; then
            in_codeblock=1
            continue
        fi
        
        # Check for codeblock end
        if [[ "$line" =~ ^\`\`\` ]] && [[ $in_codeblock -eq 1 ]]; then
            in_codeblock=0
            continue
        fi
        
        # Capture steps inside codeblock
        if [[ $in_codeblock -eq 1 ]] && [[ -n "${line// /}" ]]; then
            steps+=("$line")
        fi
    done < "$file"
    
    printf '%s\n' "${steps[@]}"
}

# Function to extract levels from markdown
extract_levels() {
    local file="$1"
    local levels=""
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^levels:[:space:]*(.*) ]]; then
            levels="${BASH_REMATCH[1]}"
            # Remove surrounding whitespace and split by comma
            levels=$(echo "$levels" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            break
        fi
    done < "$file"
    
    echo "$levels"
}

# Function to find step markers in test file
find_steps_in_test() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    
    # Extract step markers: // step("...") or # step("...")
    grep -E '^[[:space:]]*(#|//)[[:space:]]*step\(' "$file" | sed -E 's/^[[:space:]]*(#|\/\/)[[:space:]]*step\("(.+)"\).*$/\2/' || true
}

# Function to verify steps in order (with detailed output in verbose mode)
verify_steps_verbose() {
    local test_file="$1"
    shift
    local expected_steps=("$@")
    
    if [[ ! -f "$test_file" ]]; then
        if [[ $VERBOSE -eq 1 ]]; then
            echo -e "  ${YELLOW}File does not exist${NC}"
            for step in "${expected_steps[@]}"; do
                local trimmed_step=$(echo "$step" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
                echo -e "    ${YELLOW}○${NC} $trimmed_step"
            done
        fi
        return 2  # File doesn't exist
    fi
    
    # Get actual steps from test file
    local actual_steps=()
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ -n "$line" ]]; then
            actual_steps+=("$line")
        fi
    done < <(find_steps_in_test "$test_file" || true)
    
    local all_match=1
    local max_steps=${#expected_steps[@]}
    
    # In verbose mode, show each step with its status
    if [[ $VERBOSE -eq 1 ]]; then
        for i in "${!expected_steps[@]}"; do
            local expected="${expected_steps[$i]}"
            local actual="${actual_steps[$i]:-}"
            
            # Trim whitespace for comparison
            expected=$(echo "$expected" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            actual=$(echo "$actual" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            
            if [[ -z "$actual" ]]; then
                echo -e "    ${RED}✗${NC} $expected ${RED}(missing)${NC}"
                all_match=0
            elif [[ "$expected" == "$actual" ]]; then
                echo -e "    ${GREEN}✓${NC} $expected"
            else
                echo -e "    ${RED}✗${NC} $expected"
                echo -e "      ${RED}Found:${NC} $actual"
                all_match=0
            fi
        done
        
        # Show extra steps if any
        if [[ ${#actual_steps[@]} -gt ${#expected_steps[@]} ]]; then
            for ((i=${#expected_steps[@]}; i<${#actual_steps[@]}; i++)); do
                local extra="${actual_steps[$i]}"
                extra=$(echo "$extra" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
                echo -e "    ${YELLOW}+${NC} $extra ${YELLOW}(extra)${NC}"
            done
            all_match=0
        fi
    fi
    
    # Check if we have the right number of steps
    if [[ ${#actual_steps[@]} -ne ${#expected_steps[@]} ]]; then
        return 1  # Step count mismatch
    fi
    
    # Check steps in order with exact matching
    for i in "${!expected_steps[@]}"; do
        local expected="${expected_steps[$i]}"
        local actual="${actual_steps[$i]:-}"
        
        # Trim whitespace for comparison
        expected=$(echo "$expected" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        actual=$(echo "$actual" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        if [[ "$expected" != "$actual" ]]; then
            return 1  # Step mismatch
        fi
    done
    
    return 0
}

# Function to verify steps in order
verify_steps() {
    local expected_steps=("$@")
    local test_file="$1"
    shift
    expected_steps=("$@")
    
    if [[ ! -f "$test_file" ]]; then
        return 2  # File doesn't exist
    fi
    
    # Get actual steps from test file
    local actual_steps=()
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ -n "$line" ]]; then
            actual_steps+=("$line")
        fi
    done < <(find_steps_in_test "$test_file" || true)
    
    # Check if we have the right number of steps
    if [[ ${#actual_steps[@]} -ne ${#expected_steps[@]} ]]; then
        return 1  # Step count mismatch
    fi
    
    # Check steps in order with exact matching
    for i in "${!expected_steps[@]}"; do
        local expected="${expected_steps[$i]}"
        local actual="${actual_steps[$i]:-}"
        
        # Trim whitespace for comparison
        expected=$(echo "$expected" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        actual=$(echo "$actual" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        if [[ "$expected" != "$actual" ]]; then
            return 1  # Step mismatch
        fi
    done
    
    return 0
}

# Function to process a single specguard file
process_specguard_file() {
    local specguard_file="$1"
    local base_dir="$2"
    
    # Extract levels
    local levels_str=$(extract_levels "$specguard_file")
    if [[ -z "$levels_str" ]]; then
        echo -e "${YELLOW}⚠${NC}  $specguard_file: No levels defined, skipping"
        return
    fi
    
    # Extract steps
    local steps=()
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ -n "$line" ]]; then
            steps+=("$line")
        fi
    done < <(extract_steps "$specguard_file" || true)
    if [[ ${#steps[@]} -eq 0 ]]; then
        echo -e "${YELLOW}⚠${NC}  $specguard_file: No steps defined, skipping"
        return
    fi
    
    # Parse levels (comma-separated)
    IFS=',' read -ra levels <<< "$levels_str"
    
    # Get relative path from specguard folder (without extension)
    local rel_path="${specguard_file#*/${SPECGUARD_FOLDER_NAME}/}"
    local rel_path_no_ext="${rel_path%.md}"
    
    # Process each level
    for level in "${levels[@]}"; do
        # Trim whitespace from level
        level=$(echo "$level" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Construct test file path pattern (look for any extension)
        local test_file_pattern="${base_dir}/${level}/${rel_path_no_ext}.*"
        
        # Find the actual test file
        local test_file=""
        for file in $test_file_pattern; do
            if [[ -f "$file" ]]; then
                test_file="$file"
                break
            fi
        done
        
        # If no file found, use the pattern for error reporting
        if [[ -z "$test_file" ]]; then
            test_file="${base_dir}/${level}/${rel_path_no_ext}.*"
        fi
        
        ((TOTAL_FILES++))
        
        # Verify steps
        if [[ $VERBOSE -eq 1 ]]; then
            # Use verbose verification
            local exit_code=0
            verify_steps_verbose "$test_file" "${steps[@]}" || exit_code=$?
            
            if [[ $exit_code -eq 0 ]]; then
                echo -e "${GREEN}✓${NC} $test_file"
                ((PASSED_FILES++))
            elif [[ $exit_code -eq 2 ]]; then
                echo -e "${RED}✗${NC} $test_file (not implemented)"
                ((MISSING_FILES++))
                ((FAILED_FILES++))
            else
                echo -e "${RED}✗${NC} $test_file (steps mismatch)"
                ((FAILED_FILES++))
            fi
        else
            # Use simple verification
            local exit_code=0
            verify_steps "$test_file" "${steps[@]}" || exit_code=$?
            
            if [[ $exit_code -eq 0 ]]; then
                echo -e "${GREEN}✓${NC} $test_file"
                ((PASSED_FILES++))
            elif [[ $exit_code -eq 2 ]]; then
                echo -e "${RED}✗${NC} $test_file (not implemented)"
                ((MISSING_FILES++))
                ((FAILED_FILES++))
            else
                echo -e "${RED}✗${NC} $test_file (steps mismatch)"
                ((FAILED_FILES++))
            fi
        fi
    done
}

# Main execution
main() {
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                VERBOSE=1
                shift
                ;;
            --specguard-folder-name)
                if [[ -z "${2:-}" ]]; then
                    echo "Error: --specguard-folder-name requires an argument"
                    exit 1
                fi
                SPECGUARD_FOLDER_NAME="$2"
                shift 2
                ;;
            --help|-h)
                echo "Usage: specguard.sh [OPTIONS] [DIRECTORY]"
                echo ""
                echo "Options:"
                echo "  -v, --verbose                    Show detailed step-by-step output"
                echo "  --specguard-folder-name NAME     Use NAME instead of 'specguard' as folder name"
                echo "  -h, --help                       Show this help message"
                echo ""
                echo "Arguments:"
                echo "  DIRECTORY                        Directory to search (default: current directory)"
                exit 0
                ;;
            -*)
                echo "Error: Unknown option $1"
                echo "Run 'specguard.sh --help' for usage information"
                exit 1
                ;;
            *)
                break
                ;;
        esac
    done
    
    local search_dir="${1:-.}"
    
    echo "Searching for $SPECGUARD_FOLDER_NAME files in: $search_dir"
    if [[ $VERBOSE -eq 1 ]]; then
        echo "(verbose mode enabled)"
    fi
    echo ""
    
    # Find all specguard directories
    while IFS= read -r -d '' specguard_file; do
        # Get the base directory (parent of specguard folder)
        local specguard_dir=$(dirname "$specguard_file")
        local base_dir="${specguard_dir%/${SPECGUARD_FOLDER_NAME}*}"
        
        process_specguard_file "$specguard_file" "$base_dir" || true
    done < <(find "$search_dir" -type f -path "*/${SPECGUARD_FOLDER_NAME}/*.md" -print0)
    
    # Print summary
    echo ""
    echo "========================================"
    echo "Summary:"
    echo "========================================"
    echo -e "Total test files:    $TOTAL_FILES"
    echo -e "${GREEN}Passed:${NC}              $PASSED_FILES"
    echo -e "${RED}Failed:${NC}              $FAILED_FILES"
    echo -e "${YELLOW}Not implemented:${NC}     $MISSING_FILES"
    echo ""
    
    # Exit with error if any failures
    if [[ $FAILED_FILES -gt 0 ]]; then
        exit 1
    fi
}

main "$@"
