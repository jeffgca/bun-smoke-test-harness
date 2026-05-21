#!/usr/bin/env bun

/**
 * Prints the version from package.json and validates format X.Y.Z.
 * Exits with non-zero code if missing or invalid.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

try {
	const root = join(import.meta.dir, '..')
	const pkgPath = join(root, 'package.json')
	const raw = readFileSync(pkgPath, 'utf-8')
	const pkg = JSON.parse(raw)
	const version: unknown = pkg.version

	if (typeof version !== 'string' || version.length === 0) {
		console.error('Error: Failed to extract version from package.json')
		process.exit(1)
	}

	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		console.error(
			`Error: Version '${version}' is not in the correct format (expected: X.Y.Z)`,
		)
		process.exit(1)
	}

	console.log(version)
} catch (err) {
	console.error('Error: Unable to read package.json:', err)
	process.exit(1)
}
