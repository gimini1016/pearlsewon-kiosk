#!/bin/zsh
task_script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$task_script_dir" || exit 1
python3 scripts/build.py || exit 1
python3 -m backend.server --open
