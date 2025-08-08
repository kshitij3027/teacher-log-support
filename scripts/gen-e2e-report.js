/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(raw);
}

function* walkSuites(suites) {
  for (const suite of suites || []) {
    yield suite;
    if (suite.suites) {
      yield* walkSuites(suite.suites);
    }
  }
}

function buildTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return [headerLine, separatorLine, rowLines].join('\n');
}

function sanitizeForTableCell(text) {
  if (!text) return '';
  // Remove ANSI sequences and escape pipe
  const ansiRegex = /\x1B\[[0-9;]*m/g;
  return String(text).replace(ansiRegex, '').replace(/\|/g, '\\|').trim();
}

function main() {
  const jsonPath = path.join('e2e', 'test-results', 'e2e-results.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Missing report: ${jsonPath}`);
    process.exit(1);
  }

  const data = readJson(jsonPath);

  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;

  const byFile = {};
  const byProject = {};
  const errorMap = new Map();
  const uniqueFailSpecs = new Map();
  const perFileFailingSpecs = new Map();

  for (const suite of walkSuites(data.suites)) {
    for (const spec of suite.specs || []) {
      let specFailedAny = false;
      let failedProjectsCount = 0;
      for (const t of spec.tests || []) {
        const project = t.projectName || t.projectId || 'unknown';
        for (const r of t.results || []) {
          total += 1;
          if (r.status === 'passed') passed += 1;
          else if (r.status === 'failed') failed += 1;
          else if (r.status === 'skipped') skipped += 1;
          else if (r.status === 'flaky') flaky += 1;

          byFile[suite.file] = byFile[suite.file] || { total: 0, failed: 0 };
          byFile[suite.file].total += 1;
          if (r.status !== 'passed') byFile[suite.file].failed += 1;

          byProject[project] = byProject[project] || { total: 0, failed: 0 };
          byProject[project].total += 1;
          if (r.status !== 'passed') byProject[project].failed += 1;

          if (r.status === 'failed') {
            specFailedAny = true;
            failedProjectsCount += 1;
          }

          if (Array.isArray(r.errors) && r.errors.length) {
            const first = r.errors[0];
            const raw = first.message || first.value || JSON.stringify(first);
            const firstLine = sanitizeForTableCell(String(raw).split('\n')[0]).slice(0, 300);
            errorMap.set(firstLine, (errorMap.get(firstLine) || 0) + 1);
          }
        }
      }
      if (specFailedAny) {
        const key = `${suite.file}|${spec.title}`;
        uniqueFailSpecs.set(key, (uniqueFailSpecs.get(key) || 0) + failedProjectsCount);
        if (!perFileFailingSpecs.has(suite.file)) perFileFailingSpecs.set(suite.file, []);
        perFileFailingSpecs.get(suite.file).push({ title: spec.title, failedProjectsCount });
      }
    }
  }

  const topErrors = Array.from(errorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const byFileArr = Object.entries(byFile).sort((a, b) => b[1].failed - a[1].failed);
  const byProjectArr = Object.entries(byProject).sort((a, b) => a[0].localeCompare(b[0]));

  const mdParts = [];
  mdParts.push(`# E2E Failure Analysis`);
  mdParts.push('');
  mdParts.push(`Generated: ${new Date().toISOString()}`);
  mdParts.push('');

  mdParts.push(`## Overall`);
  mdParts.push(`- **Total test runs**: ${total}`);
  mdParts.push(`- **Passed runs**: ${passed}`);
  mdParts.push(`- **Failed runs**: ${failed}`);
  mdParts.push(`- **Skipped runs**: ${skipped}`);
  mdParts.push(`- **Flaky runs**: ${flaky}`);
  if (data.stats) {
    mdParts.push(`- **Playwright expected**: ${data.stats.expected} | **unexpected**: ${data.stats.unexpected}`);
    mdParts.push(`- **Suite duration (ms)**: ${Math.round(data.stats.duration)}`);
  }
  mdParts.push('');

  mdParts.push('## Failures by spec file (aggregated across projects)');
  mdParts.push(
    buildTable(
      ['Spec file', 'Total runs', 'Failed runs'],
      byFileArr.map(([file, v]) => [file, String(v.total), String(v.failed)])
    )
  );
  mdParts.push('');

  mdParts.push('## Failures by project');
  mdParts.push(
    buildTable(
      ['Project', 'Total runs', 'Failed runs'],
      byProjectArr.map(([project, v]) => [project, String(v.total), String(v.failed)])
    )
  );
  mdParts.push('');

  mdParts.push('## Top error messages');
  mdParts.push(
    buildTable(
      ['Error (first line)', 'Count'],
      topErrors.map(([msg, count]) => [sanitizeForTableCell(msg), String(count)])
    )
  );
  mdParts.push('');

  mdParts.push('## Most affected spec files (top 5)');
  const topFiles = byFileArr.slice(0, 5);
  for (const [file, v] of topFiles) {
    mdParts.push(`### ${file}`);
    mdParts.push(`- Failed runs: ${v.failed} / ${v.total}`);
    const failing = (perFileFailingSpecs.get(file) || [])
      .sort((a, b) => b.failedProjectsCount - a.failedProjectsCount)
      .slice(0, 10);
    mdParts.push(`- Failing specs (title with failing project count):`);
    for (const s of failing) {
      mdParts.push(`  - ${s.title} (${s.failedProjectsCount})`);
    }
    mdParts.push('');
  }

  const outputPath = path.join('tasks', 'e2e-failed-tests.md');
  const output = mdParts.join('\n');
  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log(`Report written to ${outputPath}`);
}

main();


