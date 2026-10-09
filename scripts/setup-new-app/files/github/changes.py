import os
import subprocess
from pathlib import PurePosixPath

kind = os.environ['SCAFFOLD_TYPE']
base = os.environ.get('BASE_SHA', '')
head = os.environ['HEAD_SHA']
event = os.environ['EVENT_NAME']
full = event == 'workflow_dispatch' or not base or set(base) == {'0'}

if full:
    paths = []
else:
    comparison = f'{base}...{head}' if event == 'pull_request' else f'{base}..{head}'
    paths = subprocess.check_output(['git', 'diff', '--name-only', '-z', comparison]).decode().split('\0')

def relevant(name):
    path = PurePosixPath(name)
    return bool(name) and path.suffix.lower() not in {'.md', '.rst'} and not name.startswith('docs/')

paths = [name for name in paths if relevant(name)]
common = full or any(name.startswith('.github/') for name in paths)
bun = kind not in {'swift', 'empty'} and (
    common or any(not name.startswith('app-ios/') for name in paths)
)
swift = kind in {'swift', 'monorepo-swift'} and (
    common or any(
        kind == 'swift' or name.startswith(('app-ios/', '.env', '.bun-version'))
        or name in {'package.json', 'bun.lock', 'bun.lockb'}
        for name in paths
    )
)

with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
    output.write(f'bun={str(bun).lower()}\nswift={str(swift).lower()}\n')
