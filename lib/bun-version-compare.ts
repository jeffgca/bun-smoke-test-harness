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

export interface TestComparisonSummary {
hasDifferences: boolean
differences: string[]
}

function normalizeOutput(value: string): string {
return value.replace(/\r\n/g, '\n').trim()
}

export function summarizeTestDifferences(
stable: BunTestRunResult,
canary: BunTestRunResult,
): TestComparisonSummary {
const differences: string[] = []

if (stable.test.exitCode !== canary.test.exitCode) {
differences.push(
`Exit code differs (stable=${stable.test.exitCode}, canary=${canary.test.exitCode})`,
)
}

if (normalizeOutput(stable.test.stdout) !== normalizeOutput(canary.test.stdout)) {
differences.push('stdout differs')
}

if (normalizeOutput(stable.test.stderr) !== normalizeOutput(canary.test.stderr)) {
differences.push('stderr differs')
}

if (stable.bunVersion !== canary.bunVersion) {
differences.push(
`Bun versions differ (stable=${stable.bunVersion}, canary=${canary.bunVersion})`,
)
}

return {
hasDifferences: differences.length > 0,
differences,
}
}
