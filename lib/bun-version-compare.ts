export interface CommandRunResult {
	exitCode: number
	stdout: string
	stderr: string
}

export interface BunTestRunResult {
	label: string
	bunVersion: string
	test: CommandRunResult
}

export interface ParsedTestOutput {
	passing: string[]
	failing: string[]
	total: number
	passCount: number
	failCount: number
}

export interface TestComparisonSummary {
	hasDifferences: boolean
	differences: string[]
	stable: ParsedTestOutput
	canary: ParsedTestOutput
	/** Tests that passed in stable but fail in canary */
	regressions: string[]
	/** Tests that failed in stable but pass in canary */
	improvements: string[]
	/** Tests failing in canary that were not present in stable at all */
	newFailures: string[]
	/** Tests present in stable (pass or fail) that are absent from canary */
	removedTests: string[]
}

const ANSI_RE = /\x1b\[[0-9;]*m/g

function stripAnsi(s: string): string {
	return s.replace(ANSI_RE, '')
}

function normalizeOutput(value: string): string {
	return value.replace(/\r\n/g, '\n').trim()
}

export function parseTestOutput(result: CommandRunResult): ParsedTestOutput {
	// bun test may write to stdout or stderr depending on version
	const combined = stripAnsi(result.stdout + '\n' + result.stderr)
	const passingSet = new Set<string>()
	const failingSet = new Set<string>()
	let passCount = 0
	let failCount = 0

	for (const rawLine of combined.split('\n')) {
		const line = rawLine.trim()
		if (!line) continue

		// ✓ / ✔  test name [Xms]
		let m = line.match(/^[✓✔]\s+(.+?)(?:\s+\[\d[\d.]*(?:ms|s)\])?$/)
		if (m) {
			passingSet.add(m[1].trim())
			continue
		}

		// (pass) test name [Xms]
		m = line.match(/^\(pass\)\s+(.+?)(?:\s+\[\d[\d.]*(?:ms|s)\])?$/)
		if (m) {
			passingSet.add(m[1].trim())
			continue
		}

		// ✗ / × / ✘  test name [Xms]
		m = line.match(/^[✗×✘]\s+(.+?)(?:\s+\[\d[\d.]*(?:ms|s)\])?$/)
		if (m) {
			failingSet.add(m[1].trim())
			continue
		}

		// (fail) test name [Xms]
		m = line.match(/^\(fail\)\s+(.+?)(?:\s+\[\d[\d.]*(?:ms|s)\])?$/)
		if (m) {
			failingSet.add(m[1].trim())
			continue
		}

		// "X pass"  (standalone summary line)
		m = line.match(/^(\d+)\s+pass$/)
		if (m) {
			passCount = parseInt(m[1])
			continue
		}

		// "X fail"  (standalone summary line)
		m = line.match(/^(\d+)\s+fail$/)
		if (m) {
			failCount = parseInt(m[1])
			continue
		}

		// "X tests, Y pass[, Z fail]"
		m = line.match(/^(\d+)\s+tests?,\s+(\d+)\s+pass(?:,\s+(\d+)\s+fail)?$/)
		if (m) {
			passCount = parseInt(m[2])
			failCount = m[3] ? parseInt(m[3]) : 0
		}
	}

	const passing = [...passingSet]
	const failing = [...failingSet]

	// Fall back to per-line counts when no summary line was found
	if (passCount === 0) passCount = passing.length
	if (failCount === 0) failCount = failing.length

	return {
		passing,
		failing,
		total: passCount + failCount,
		passCount,
		failCount,
	}
}

export function summarizeTestDifferences(
	stable: BunTestRunResult,
	canary: BunTestRunResult,
): TestComparisonSummary {
	const differences: string[] = []
	const stableParsed = parseTestOutput(stable.test)
	const canaryParsed = parseTestOutput(canary.test)

	if (stable.test.exitCode !== canary.test.exitCode) {
		differences.push(
			`Exit code differs (stable=${stable.test.exitCode}, canary=${canary.test.exitCode})`,
		)
	}

	const hasParsedTests = stableParsed.total > 0 || canaryParsed.total > 0
	const canaryPassSet = new Set(canaryParsed.passing)
	const canaryFailSet = new Set(canaryParsed.failing)
	const allStable = new Set([...stableParsed.passing, ...stableParsed.failing])
	const allCanary = new Set([...canaryParsed.passing, ...canaryParsed.failing])

	const regressions = stableParsed.passing.filter((t) => canaryFailSet.has(t))
	const improvements = stableParsed.failing.filter((t) => canaryPassSet.has(t))
	const newFailures = canaryParsed.failing.filter((t) => !allStable.has(t))
	const removedTests = [...allStable].filter((t) => !allCanary.has(t))

	if (hasParsedTests) {
		if (regressions.length > 0)
			differences.push(
				`${regressions.length} regression(s): tests newly failing in canary`,
			)
		if (improvements.length > 0)
			differences.push(
				`${improvements.length} improvement(s): tests newly passing in canary`,
			)
		if (newFailures.length > 0)
			differences.push(
				`${newFailures.length} new failure(s) in canary (not present in stable)`,
			)
		if (removedTests.length > 0)
			differences.push(
				`${removedTests.length} test(s) no longer present in canary`,
			)
	} else {
		// No individual tests parsed — fall back to raw output comparison
		if (
			normalizeOutput(stable.test.stdout) !==
			normalizeOutput(canary.test.stdout)
		)
			differences.push('stdout differs')
		if (
			normalizeOutput(stable.test.stderr) !==
			normalizeOutput(canary.test.stderr)
		)
			differences.push('stderr differs')
	}

	return {
		hasDifferences: differences.length > 0,
		differences,
		stable: stableParsed,
		canary: canaryParsed,
		regressions,
		improvements,
		newFailures,
		removedTests,
	}
}
