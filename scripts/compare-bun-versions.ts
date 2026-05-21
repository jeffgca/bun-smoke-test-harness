#!/usr/bin/env bun

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import {
	summarizeTestDifferences,
	type BunTestRunResult,
	type CommandRunResult,
} from '../lib/bun-version-compare'

interface CliArgs {
	workspace: string
	testsRepo: string
	testsDir: string
	installArg: string[]
	testArg: string[]
	reportFile: string
}

const argv = yargs(hideBin(process.argv))
	.option('workspace', {
		type: 'string',
		default: '.bun-compare-workspace',
		description:
			'Working directory used for Bun installations and test checkout',
	})
	.option('testsRepo', {
		type: 'string',
		default: 'https://github.com/jeffgca/bun-functional-tests.git',
		description: 'Repository URL containing functional tests',
	})
	.option('testsDir', {
		type: 'string',
		description: 'Path where bun-functional-tests is checked out',
	})
	.option('installArg', {
		type: 'string',
		array: true,
		default: ['install'],
		description: 'Arguments passed to Bun for dependency installation',
	})
	.option('testArg', {
		type: 'string',
		array: true,
		default: ['test'],
		description: 'Arguments passed to Bun for test execution',
	})
	.option('reportFile', {
		type: 'string',
		description: 'Where to write the comparison JSON report',
	})
	.strict()
	.parseSync() as CliArgs

const workspace = resolve(argv.workspace)
const testsDir = resolve(
	argv.testsDir ?? join(workspace, 'bun-functional-tests'),
)
const reportFile = resolve(
	argv.reportFile ?? join(workspace, 'comparison-report.json'),
)

mkdirSync(workspace, { recursive: true })

function decodeOutput(output: string | Uint8Array): string {
	if (typeof output === 'string') {
		return output
	}

	return new TextDecoder().decode(output)
}

function runCommand(
	cmd: string[],
	cwd: string,
	env?: Record<string, string>,
): CommandRunResult {
	const proc = Bun.spawnSync(cmd, {
		cwd,
		env: {
			...process.env,
			...env,
		},
		stdout: 'pipe',
		stderr: 'pipe',
	})

	return {
		exitCode: proc.exitCode,
		stdout: decodeOutput(proc.stdout),
		stderr: decodeOutput(proc.stderr),
	}
}

function ensureSuccess(step: string, result: CommandRunResult): void {
	if (result.exitCode !== 0) {
		console.error(`[${step}] failed`)
		if (result.stdout.trim()) {
			console.error(result.stdout)
		}
		if (result.stderr.trim()) {
			console.error(result.stderr)
		}
		process.exit(result.exitCode)
	}
}

function resolveBunBinary(baseDir: string): string {
	const candidates = [
		join(baseDir, 'node_modules', '.bin', 'bun'),
		join(baseDir, 'node_modules', '.bin', 'bun.exe'),
		join(baseDir, 'node_modules', '.bin', 'bun.cmd'),
		join(baseDir, 'node_modules', 'bun', 'bin', 'bun.exe'),
	]

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate
		}
	}

	throw new Error(`Unable to find Bun binary under ${baseDir}`)
}

function installStableBun(targetDir: string): string {
	mkdirSync(targetDir, { recursive: true })
	const installResult = runCommand(
		[
			'npm',
			'install',
			'--prefix',
			targetDir,
			'--no-package-lock',
			'--no-save',
			'bun@latest',
		],
		workspace,
	)
	ensureSuccess('install stable bun', installResult)
	return resolveBunBinary(targetDir)
}

function installCanaryBun(targetDir: string): string {
	mkdirSync(targetDir, { recursive: true })
	const installResult = runCommand(
		[
			'npm',
			'install',
			'--prefix',
			targetDir,
			'--no-package-lock',
			'--no-save',
			'bun@canary',
		],
		workspace,
	)
	ensureSuccess('install canary bun', installResult)
	return resolveBunBinary(targetDir)
}

function prepareFunctionalTests(repoUrl: string, checkoutDir: string): void {
	const gitDir = join(checkoutDir, '.git')
	if (existsSync(gitDir)) {
		const pullResult = runCommand(
			['git', '-C', checkoutDir, 'pull', '--ff-only'],
			workspace,
		)
		ensureSuccess('update bun-functional-tests', pullResult)
		return
	}

	mkdirSync(dirname(checkoutDir), { recursive: true })
	const cloneResult = runCommand(
		['git', 'clone', repoUrl, checkoutDir],
		workspace,
	)
	ensureSuccess('clone bun-functional-tests', cloneResult)
}

function runFunctionalTests(
	label: string,
	bunBinary: string,
	bunInstallDir?: string,
): BunTestRunResult {
	const env = bunInstallDir ? { BUN_INSTALL: bunInstallDir } : undefined
	const versionResult = runCommand([bunBinary, '--version'], testsDir, env)
	ensureSuccess(`${label} bun version`, versionResult)

	const installResult = runCommand(
		[bunBinary, ...argv.installArg],
		testsDir,
		env,
	)
	ensureSuccess(`${label} test dependencies install`, installResult)

	const testResult = runCommand([bunBinary, ...argv.testArg], testsDir, env)

	return {
		label,
		bunVersion: versionResult.stdout.trim(),
		test: testResult,
	}
}

const stableDir = join(workspace, 'bun-stable')
const canaryDir = join(workspace, 'bun-canary')

console.log(`Workspace: ${workspace}`)
console.log(`Functional tests directory: ${testsDir}`)

prepareFunctionalTests(argv.testsRepo, testsDir)

const stableBinary = installStableBun(stableDir)
const canaryBinary = installCanaryBun(canaryDir)

const stableResult = runFunctionalTests('stable', stableBinary)
const canaryResult = runFunctionalTests('canary', canaryBinary)

const summary = summarizeTestDifferences(stableResult, canaryResult)
const report = {
	generatedAt: new Date().toISOString(),
	repository: argv.testsRepo,
	testsDir,
	stable: stableResult,
	canary: canaryResult,
	summary,
}

mkdirSync(dirname(reportFile), { recursive: true })
writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', 'utf8')

console.log(`Stable Bun version: ${stableResult.bunVersion}`)
console.log(`Canary Bun version: ${canaryResult.bunVersion}`)
console.log(`Stable test exit code: ${stableResult.test.exitCode}`)
console.log(`Canary test exit code: ${canaryResult.test.exitCode}`)

if (summary.hasDifferences) {
	console.log('Differences detected:')
	for (const diff of summary.differences) {
		console.log(`- ${diff}`)
	}
	console.log(`Full report written to ${reportFile}`)
	process.exit(1)
}

console.log('No differences detected between stable and canary test results.')
console.log(`Full report written to ${reportFile}`)
