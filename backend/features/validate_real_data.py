"""
Validate real PAIMANA observations data against validation layer.

Loads observations.json and runs batch validation with project grouping
to detect temporal anomalies like progress regression.

Reports:
1. Overall validation statistics
2. Invalid observations (hard domain violations)
3. Suspicious observations (threshold anomalies)
4. Top 10 projects by issue count
5. Detailed breakdown of issue types

Run: python3 features/validate_real_data.py
"""

import json
import sys
from collections import defaultdict
from data_validation import validate_observations, summarize_validation


def load_observations(filepath):
    """Load observations from JSON."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            # Handle nested structure
            if isinstance(data, dict) and "observations" in data:
                return data["observations"]
            return data if isinstance(data, list) else []
    except FileNotFoundError:
        print(f"ERROR: File not found: {filepath}")
        return []
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON: {e}")
        return []


def validate_real_data():
    """Validate real observations and report findings."""
    observations_file = "data/historical/observations.json"
    
    print(f"\n{'='*70}")
    print(f"{'PAIMANA Real Data Validation Report':^70}")
    print(f"{'='*70}\n")
    
    # Load observations
    print(f"Loading observations from {observations_file}...")
    observations = load_observations(observations_file)
    
    if not observations:
        print("No observations loaded. Exiting.")
        return False
    
    print(f"Loaded {len(observations)} observations\n")
    
    # Validate with project grouping to detect regression
    print("Running batch validation with project grouping...")
    results = validate_observations(observations, group_by_project=True)
    
    # Summary
    summary = summarize_validation(results)
    print("\n" + "="*70)
    print("VALIDATION SUMMARY")
    print("="*70)
    print(f"Total observations: {summary['total_observations']}")
    print(f"Valid: {summary['valid']}")
    print(f"Invalid: {summary['invalid']}")
    print(f"Suspicious (anomalies): {summary['suspicious']}")
    print(f"Sufficient evidence: {summary['sufficient_evidence']}")
    print(f"Insufficient evidence: {summary['insufficient_evidence']}")
    
    # Issues distribution
    print("\n" + "="*70)
    print("ISSUE DISTRIBUTION (Top 15)")
    print("="*70)
    sorted_issues = sorted(
        summary["issues_distribution"].items(),
        key=lambda x: x[1],
        reverse=True
    )
    for issue_code, count in sorted_issues[:15]:
        percentage = 100 * count / len(observations)
        print(f"{issue_code:40s}: {count:5d} ({percentage:5.2f}%)")
    
    # Invalid observations (hard violations)
    invalid_obs = [r for r in results if r["validity"] == "invalid"]
    if invalid_obs:
        print("\n" + "="*70)
        print(f"INVALID OBSERVATIONS ({len(invalid_obs)})")
        print("="*70)
        
        # Group by issue
        invalid_by_issue = defaultdict(list)
        for obs in invalid_obs:
            for issue in obs["issues"]:
                invalid_by_issue[issue].append(obs)
        
        for issue, obs_list in sorted(invalid_by_issue.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"\n{issue} ({len(obs_list)} observations):")
            for obs in obs_list[:3]:
                proj = obs["observation_id"].get("projectCode", "N/A")
                month = obs["observation_id"].get("observationMonth", "N/A")
                print(f"  - Project {proj}, Month {month}")
            if len(obs_list) > 3:
                print(f"  ... and {len(obs_list) - 3} more")
    
    # Suspicious observations (anomalies)
    suspicious_obs = [r for r in results if r["anomaly"] == "suspicious"]
    if suspicious_obs:
        print("\n" + "="*70)
        print(f"SUSPICIOUS OBSERVATIONS ({len(suspicious_obs)})")
        print("="*70)
        
        # Group by issue
        suspicious_by_issue = defaultdict(list)
        for obs in suspicious_obs:
            for issue in obs["issues"]:
                suspicious_by_issue[issue].append(obs)
        
        for issue, obs_list in sorted(suspicious_by_issue.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"\n{issue} ({len(obs_list)} observations):")
            for obs in obs_list[:3]:
                proj = obs["observation_id"].get("projectCode", "N/A")
                month = obs["observation_id"].get("observationMonth", "N/A")
                cost_ratio = obs["observation_id"].get("costRatio", "N/A")
                exp_ratio = obs["observation_id"].get("expenditureRatio", "N/A")
                if issue == "extreme_cost_reduction" or issue == "extreme_cost_increase":
                    print(f"  - Project {proj}, Month {month}, costRatio={cost_ratio}")
                elif issue == "high_expenditure_low_progress":
                    progress = obs["observation_id"].get("physicalProgress", "N/A")
                    print(f"  - Project {proj}, Month {month}, progress={progress}%, expenditure={exp_ratio}")
                else:
                    print(f"  - Project {proj}, Month {month}")
            if len(obs_list) > 3:
                print(f"  ... and {len(obs_list) - 3} more")
    
    # Projects with most issues
    project_issues = defaultdict(list)
    for result in results:
        if result["issues"]:
            proj = result["observation_id"].get("projectCode", "N/A")
            project_issues[proj].extend(result["issues"])
    
    if project_issues:
        print("\n" + "="*70)
        print("TOP 15 PROJECTS BY ISSUE COUNT")
        print("="*70)
        sorted_projects = sorted(
            project_issues.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )
        for proj, issues in sorted_projects[:15]:
            unique_issues = len(set(issues))
            print(f"Project {proj:10s}: {len(issues):3d} issues ({unique_issues} unique types)")
    
    # Validate specific projects mentioned in earlier analysis
    print("\n" + "="*70)
    print("KNOWN EXTREME PROJECTS")
    print("="*70)
    
    extreme_projects = {
        "618886": "Extreme cost reduction (costRatio 0.000419), high expenditure",
        "618737": "0% progress, very low cost ratio",
        "619070": "100% complete, low spend"
    }
    
    for proj_code, description in extreme_projects.items():
        proj_results = [r for r in results if r["observation_id"].get("projectCode") == proj_code]
        if proj_results:
            print(f"\nProject {proj_code}: {description}")
            print(f"  Total observations: {len(proj_results)}")
            
            valid_count = sum(1 for r in proj_results if r["validity"] == "valid")
            invalid_count = sum(1 for r in proj_results if r["validity"] == "invalid")
            suspicious_count = sum(1 for r in proj_results if r["anomaly"] == "suspicious")
            
            print(f"  Valid: {valid_count}, Invalid: {invalid_count}, Suspicious: {suspicious_count}")
            
            # Show issues
            all_issues = set()
            for r in proj_results:
                all_issues.update(r["issues"])
            if all_issues:
                print(f"  Issues: {', '.join(sorted(all_issues))}")
    
    print("\n" + "="*70)
    print("VALIDATION COMPLETE - No observations were modified or deleted")
    print("="*70 + "\n")
    
    return True


if __name__ == "__main__":
    success = validate_real_data()
    sys.exit(0 if success else 1)
