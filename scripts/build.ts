import packageJson from '../package.json'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const appBaseName = packageJson.appConfig.appBaseName

// All supported Bun targets:
// const bun_targets: string[] = [
// 	'bun-linux-x64',
// 	'bun-linux-arm64',
// 	'bun-windows-x64',
// 	'bun-windows-arm64',
// 	'bun-darwin-x64',
// 	'bun-darwin-arm64',
// 	'bun-linux-x64-musl',
// 	'bun-linux-arm64-musl',
// ]

const targetTripleMap: { [key: string]: string } = {
	'bun-linux-x64': `${appBaseName}-x86_64-unknown-linux-gnu`,
	'bun-darwin-x64': `${appBaseName}-x86_64-apple-darwin`,
	'bun-darwin-arm64': `${appBaseName}-aarch64-apple-darwin`,
	'bun-windows-x64': `${appBaseName}-x86_64-pc-windows-msvc`,
}

function isValidTarget(target: string): boolean {
	return Object.keys(targetTripleMap).includes(target)
}

function cleanup() {
	// Remove stray Bun build artifact files like:
	// .187ce59bd6ea5ff8-00000002.bun-build
	// Pattern: dot + hex hash + dash + numeric id + .bun-build
	const rootDir = join(import.meta.dir, '..')
	const pattern = /^\.[0-9a-f]+-\d+\.bun-build$/
	for (const name of readdirSync(rootDir)) {
		if (pattern.test(name)) {
			try {
				unlinkSync(join(rootDir, name))
				console.log(`Removed build artifact: ${name}`)
			} catch (err) {
				console.warn(`Failed to remove artifact ${name}:`, err)
			}
		}
	}
}

// Parse CLI options
const argv = yargs(hideBin(process.argv))
	.option('target', {
		alias: 't',
		type: 'string',
		description: `Build only a specific target. Valid keys: ${Object.keys(targetTripleMap).join(', ')}`,
		demandOption: false,
	})
	.option('outdir', {
		alias: 'o',
		type: 'string',
		description: 'Output directory for build artifacts',
		default: './dist',
	})
	.help()
	.parseSync() as { target?: string; outdir: string }

// Determine targets to build
const appTargets: string[] = argv.target
	? [argv.target]
	: (packageJson.appConfig.appTargets as string[])

for (const target of appTargets) {
	if (!isValidTarget(target)) {
		console.warn(`Error: Target '${target}' is not a valid Bun target.`)
		// process.exit(1)
		continue
	} else {
		console.log(`Building for target: ${target}`)

		const config = {
			entrypoints: ['./index.ts', './package.json'],
			outdir: `${argv.outdir}/${targetTripleMap[target]}`,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			target: target as any,
			compile: true,
		}

		// console.log("config", config);

		await Bun.build(config)
	}
}

// Clean up bun build artifacts in project root
cleanup()
