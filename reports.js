const owner = "angelarhsantos";
const repo = "pages";
const branch = "reports";
const reportsPath = "reports/main";
const maxReports = 25;
const pagesBaseUrl = "https://angelarhsantos.github.io/pages";

const statusElement = document.querySelector("#status");
const reportsElement = document.querySelector("#reports");

loadReports();

async function loadReports() {
    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${reportsPath}?ref=${branch}`;
        const response = await fetch(apiUrl, {
            headers: { Accept: "application/vnd.github+json" },
        });

        if (!response.ok) {
            throw new Error(`GitHub returned ${response.status}`);
        }

        const items = await response.json();
        const runs = items
            .filter((item) => item.type === "dir")
            .map(parseRunFolder)
            .filter(Boolean)
            .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
            .slice(0, maxReports);

        renderReports(runs);
    } catch (error) {
        statusElement.textContent = "";
        reportsElement.replaceChildren(createMessage("error", "Latest reports could not be loaded. Try again later or open the reports/main folder directly."));
    }
}

function parseRunFolder(item) {
    const match = item.name.match(/^run-(\d+)-(\d{14})$/);

    if (!match) {
        return null;
    }

    const [, runNumber, timestamp] = match;

    return {
        name: item.name,
        runNumber,
        timestamp,
        href: `${pagesBaseUrl}/${reportsPath}/${item.name}/index.html`,
        resultsHref: `${reportsPath}/${item.name}/results.json`,
    };
}

function renderReports(runs) {
    reportsElement.replaceChildren();

    if (runs.length === 0) {
        statusElement.textContent = "";
        reportsElement.append(createMessage("empty", "No reports have been found for main yet."));
        return;
    }

    statusElement.textContent = `Showing the latest ${runs.length} reports from main.`;

    runs.forEach((run, index) => {
        const item = createReportItem(run, index);
        reportsElement.append(item);
        updateReportStatus(item, run);
    });
}

function createReportItem(run, index) {
    const item = document.createElement("li");
    item.className = "report";

    const content = document.createElement("div");

    const link = document.createElement("a");
    link.href = run.href;
    link.textContent = `Run ${run.runNumber}`;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatTimestamp(run.timestamp);

    content.append(link, meta);
    item.append(content);

    const badges = document.createElement("div");
    badges.className = "report-badges";

    const statusBadge = document.createElement("span");
    statusBadge.className = "result-badge";
    statusBadge.textContent = "Checking...";
    badges.append(statusBadge);

    if (index === 0) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "Latest";
        badges.append(badge);
    }

    item.append(badges);

    return item;
}

async function updateReportStatus(item, run) {
    const statusBadge = item.querySelector(".result-badge");

    try {
        const response = await fetch(run.resultsHref);

        if (!response.ok) {
            throw new Error(`Results returned ${response.status}`);
        }

        const results = await response.json();
        const status = summarizeResults(results);

        item.dataset.status = status.name;
        statusBadge.className = `result-badge result-${status.name}`;
        statusBadge.textContent = status.label;
        statusBadge.title = status.summary;
    } catch (error) {
        statusBadge.textContent = "Status unavailable";
    }
}

function summarizeResults(results) {
    const summary = countResults(results);
    const labelParts = getResultLabelParts(summary);

    return {
        name: getReportStatusName(summary),
        label: labelParts.join(" / ") || "No tests",
        summary: `${summary.total} total: ${getSummaryLabelParts(summary).join(", ") || "no results"}`,
    };
}

function getResultLabelParts(summary) {
    if (summary.failed === 0 && summary.skipped === 0 && summary.flaky > 0) {
        return [`All passed`, `${summary.flaky} flaky`];
    }

    return getSummaryLabelParts(summary);
}

function getSummaryLabelParts(summary) {
    const labelParts = [];

    if (summary.passed > 0) {
        labelParts.push(`${summary.passed} passed`);
    }

    if (summary.failed > 0) {
        labelParts.push(`${summary.failed} failed`);
    }

    if (summary.flaky > 0) {
        labelParts.push(`${summary.flaky} flaky`);
    }

    if (summary.skipped > 0) {
        labelParts.push(`${summary.skipped} skipped`);
    }

    return labelParts;
}

function countResults(results) {
    const stats = results.stats ?? {};
    const passed = stats.expected ?? 0;
    const failed = stats.unexpected ?? 0;
    const flaky = stats.flaky ?? 0;
    const skipped = stats.skipped ?? 0;

    return {
        total: passed + failed + flaky + skipped,
        passed,
        failed,
        flaky,
        skipped,
    };
}

function getReportStatusName(summary) {
    if (summary.failed > 0) {
        return "failed";
    }

    if (summary.flaky > 0) {
        return "flaky";
    }

    if (summary.passed > 0) {
        return "passed";
    }

    return "skipped";
}

function createMessage(className, message) {
    const item = document.createElement("li");
    item.className = className;
    item.textContent = message;
    return item;
}

function formatTimestamp(timestamp) {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hour = timestamp.slice(8, 10);
    const minute = timestamp.slice(10, 12);
    const second = timestamp.slice(12, 14);
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);

    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}