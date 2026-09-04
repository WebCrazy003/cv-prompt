#!/bin/zsh -l
set -eu

script_path="${0:A}"
project_directory="${script_path:h:h}"
cd "$project_directory"
exec node scripts/project-control.mjs toggle
