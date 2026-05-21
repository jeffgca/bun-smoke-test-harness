import { describe, expect, test } from 'bun:test'
import { summarizeTestDifferences } from '../lib/bun-version-compare'

describe('summarizeTestDifferences', () => {
test('returns no differences when test outputs are effectively equal', () => {
const stable = {
label: 'stable',
bunVersion: '1.2.0',
test: {
exitCode: 0,
stdout: 'ok\n',
stderr: '',
},
}
const canary = {
label: 'canary',
bunVersion: '1.2.0',
test: {
exitCode: 0,
stdout: 'ok\r\n',
stderr: '',
},
}

expect(summarizeTestDifferences(stable, canary)).toEqual({
hasDifferences: false,
differences: [],
})
})

test('detects exit code and output differences', () => {
const stable = {
label: 'stable',
bunVersion: '1.2.0',
test: {
exitCode: 0,
stdout: 'passed',
stderr: '',
},
}
const canary = {
label: 'canary',
bunVersion: '1.3.0-canary.123',
test: {
exitCode: 1,
stdout: 'failed',
stderr: 'stack',
},
}

expect(summarizeTestDifferences(stable, canary)).toEqual({
hasDifferences: true,
differences: [
'Exit code differs (stable=0, canary=1)',
'stdout differs',
'stderr differs',
'Bun versions differ (stable=1.2.0, canary=1.3.0-canary.123)',
],
})
})
})
