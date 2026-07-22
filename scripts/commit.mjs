#!/usr/bin/env node
// Commit helper using isomorphic-git (system git is unavailable on this
// machine — missing Xcode CLT; see DECISIONS.md). Usage:
//   node scripts/commit.mjs "commit message"
// Stages everything (respecting .gitignore) and commits.
import fs from 'node:fs'
import path from 'node:path'
import git from 'isomorphic-git'

const dir = path.resolve(import.meta.dirname, '..')
const message = process.argv[2]
if (!message) {
  console.error('usage: node scripts/commit.mjs "message"')
  process.exit(1)
}

const author = {
  name: 'Claude (Island Shopping Companion build)',
  email: 'noreply@anthropic.com',
}

if (!fs.existsSync(path.join(dir, '.git'))) {
  await git.init({ fs, dir, defaultBranch: 'main' })
  console.log('initialized repo on main')
}

// Stage all working-tree changes (adds, modifications, deletions).
const status = await git.statusMatrix({ fs, dir })
for (const [filepath, head, workdir] of status) {
  if (workdir === 0 && head !== 0) {
    await git.remove({ fs, dir, filepath })
  } else if (workdir === 2) {
    await git.add({ fs, dir, filepath })
  }
}

const sha = await git.commit({ fs, dir, message, author })
console.log(`committed ${sha.slice(0, 8)} ${message}`)
