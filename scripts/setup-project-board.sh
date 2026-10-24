#!/usr/bin/env bash
# Creates (or updates) the "QA Agent Roadmap" GitHub Project: a kanban board of this
# repo's issues, ranked by Priority so contributors pick the top of "Ready" first.
# Safe to re-run: it reuses the project and fields it finds and only resets the values
# of the issues listed in ITEMS.
#
# Needs: jq, gh >= 2.40, logged in with the project scope (gh auth refresh -s project).
# Usage: scripts/setup-project-board.sh [owner] [repo]
set -euo pipefail

OWNER="${1:-GhassenAZZOUZ}"
REPO="${2:-claude-qa-agent}"
TITLE="QA Agent Roadmap"

# issue | priority | effort | status. Ranking rules are in CONTRIBUTING.md ("Picking work").
ITEMS=(
  "42|P0|L|Needs info"   # US-05 plan it: test design separate from story enhancement
  "38|P0|M|Needs info"   # US-01 containerised local runner
  "39|P0|M|Needs info"   # US-02 evals for decision skills
  "9|P1|S|Ready"         # field-test the provider adapters (umbrella of #27-#30)
  "27|P1|S|Ready"        # live-run GitLab adapter
  "28|P1|S|Ready"        # live-run Jira adapter
  "29|P1|S|Ready"        # live-run Azure DevOps adapter
  "30|P1|S|Ready"        # live-run Bitbucket adapter
  "32|P1|XL|Ready"       # run WAYs from Cursor and other hosts
  "40|P2|S|Needs info"   # US-03 run telemetry
  "33|P2|XL|Ready"       # native mobile tests (Maestro)
  "34|P2|L|Blocked"      # mobile suite in CI, depends on #33
  "41|P3|S|Needs info"   # US-04 project knowledge file
)

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh is not logged in: run gh auth login -s project" >&2; exit 1; }

# Project
NUMBER=$(gh project list --owner "$OWNER" --format json --limit 100 \
  --jq ".projects[] | select(.title == \"$TITLE\") | .number" | head -n1)
if [[ -z "$NUMBER" ]]; then
  NUMBER=$(gh project create --owner "$OWNER" --title "$TITLE" --format json --jq '.number')
  echo "Created project #$NUMBER"
else
  echo "Reusing project #$NUMBER"
fi
PROJECT_ID=$(gh project view "$NUMBER" --owner "$OWNER" --format json --jq '.id')
gh project link "$NUMBER" --owner "$OWNER" --repo "$OWNER/$REPO" >/dev/null 2>&1 || true
gh project edit "$NUMBER" --owner "$OWNER" \
  --description "Prioritised backlog for $OWNER/$REPO. Work the top of Ready, P0 first." >/dev/null

# Board columns: replace the default Todo / In Progress / Done of the built-in Status field
STATUS_ID=$(gh project field-list "$NUMBER" --owner "$OWNER" --format json \
  --jq '.fields[] | select(.name == "Status") | .id')
gh api graphql -f query='
mutation($field: ID!) {
  updateProjectV2Field(input: {fieldId: $field, singleSelectOptions: [
    {name: "Needs info",  color: GRAY,   description: "Open questions in Missing Information; answer them before coding"},
    {name: "Ready",       color: BLUE,   description: "Decisions made; pick from the top (highest Priority first)"},
    {name: "Blocked",     color: RED,    description: "Waits on another issue (named in the issue body)"},
    {name: "In progress", color: YELLOW, description: "Assigned and being worked on"},
    {name: "In review",   color: PURPLE, description: "PR open"},
    {name: "Done",        color: GREEN,  description: "Merged or closed"}
  ]}) { projectV2Field { ... on ProjectV2SingleSelectField { id } } }
}' -f field="$STATUS_ID" >/dev/null

# Custom fields
field_id() {
  gh project field-list "$NUMBER" --owner "$OWNER" --format json \
    --jq ".fields[] | select(.name == \"$1\") | .id"
}
ensure_field() { # name, comma-separated options
  [[ -n "$(field_id "$1")" ]] && return
  gh project field-create "$NUMBER" --owner "$OWNER" --name "$1" \
    --data-type SINGLE_SELECT --single-select-options "$2" >/dev/null
  echo "Created field $1"
}
ensure_field Priority "P0,P1,P2,P3"
ensure_field Effort "S,M,L,XL"

FIELDS_JSON=$(gh project field-list "$NUMBER" --owner "$OWNER" --format json)
option_id() { # field, option
  jq -r --arg f "$1" --arg o "$2" \
    '.fields[] | select(.name == $f) | .options[] | select(.name == $o) | .id' <<<"$FIELDS_JSON"
}
fid() { jq -r --arg f "$1" '.fields[] | select(.name == $f) | .id' <<<"$FIELDS_JSON"; }

set_option() { # item, field, option
  local f o
  f=$(fid "$2"); o=$(option_id "$2" "$3")
  [[ -n "$o" ]] || { echo "  no option '$3' in field $2" >&2; return 1; }
  gh project item-edit --id "$1" --project-id "$PROJECT_ID" \
    --field-id "$f" --single-select-option-id "$o" >/dev/null
}

# Items
for row in "${ITEMS[@]}"; do
  IFS='|' read -r issue prio effort status <<<"$row"
  item=$(gh project item-add "$NUMBER" --owner "$OWNER" \
    --url "https://github.com/$OWNER/$REPO/issues/$issue" --format json --jq '.id')
  set_option "$item" Priority "$prio"
  set_option "$item" Effort "$effort"
  set_option "$item" Status "$status"
  echo "  #$issue  $prio  $effort  $status"
done

URL=$(gh project view "$NUMBER" --owner "$OWNER" --format json --jq '.url')
cat <<EOF

Done: $URL
Views can't be set from the API. In the project, once:
  1. View 1 > Layout: Board  (columns = Status)
  2. Sort by: Priority ascending, then Effort ascending
  3. Save, and rename the view "Kanban"
Then set the repo variable QA_PROJECT_URL=$URL and the secret ADD_TO_PROJECT_PAT
so .github/workflows/project-board.yml adds new issues automatically.
EOF
