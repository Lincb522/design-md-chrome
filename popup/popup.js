const state = {
  markdown: "",
  filename: "",
  mode: "design",
  busy: false,
  lastResult: null
};

const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const refreshBtn = document.getElementById("refreshBtn");
const downloadBtn = document.getElementById("downloadBtn");
const exportIdeSelect = document.getElementById("exportIdeSelect");
const copyBtn = document.getElementById("copyBtn");
const helpBtn = document.getElementById("helpBtn");
const helpPanel = document.getElementById("helpPanel");
const helpContentEl = document.getElementById("helpContent");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const previewEl = document.getElementById("preview");
const statusEl = document.getElementById("status");
const issuesEl = document.getElementById("issues");

refreshBtn.addEventListener("click", () => {
  runExtraction().catch((error) => setStatus(toErrorText(error), true));
});

for (const button of modeButtons) {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    if (!mode || mode === state.mode) {
      return;
    }
    state.mode = mode;
    syncModeUi();
    runExtraction().catch((error) => setStatus(toErrorText(error), true));
  });
}

downloadBtn.addEventListener("click", () => {
  downloadCurrent().catch((error) => setStatus(toErrorText(error), true));
});
exportIdeSelect.addEventListener("change", (e) => {
  const filename = e.target.value;
  if (!filename) return;
  downloadCurrent(filename).catch((error) => setStatus(toErrorText(error), true));
  e.target.value = "";
});

helpBtn.addEventListener("click", () => {
  const shouldOpen = helpPanel.hidden;
  helpPanel.hidden = !shouldOpen;
  if (shouldOpen) {
    renderGenerationExplanation();
  }
});

closeHelpBtn.addEventListener("click", () => {
  helpPanel.hidden = true;
});

copyBtn.addEventListener("click", async () => {
  try {
    if (!state.markdown) {
      setStatus(chrome.i18n.getMessage("statusNothingToCopy"), true);
      return;
    }
    await navigator.clipboard.writeText(state.markdown);
    
    copyBtn.classList.add("copied");
    const copyIcon = copyBtn.querySelector(".icon-copy");
    const successIcon = copyBtn.querySelector(".icon-success");
    if (copyIcon && successIcon) {
      copyIcon.style.display = "none";
      successIcon.style.display = "block";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyIcon.style.display = "block";
        successIcon.style.display = "none";
      }, 2000);
    }
  } catch (error) {
    setStatus(chrome.i18n.getMessage("statusCopyFailed", [toErrorText(error)]), true);
  }
});

init().catch((error) => setStatus(chrome.i18n.getMessage("statusInitFailed", [toErrorText(error)]), true));

async function init() {
  const data = await chrome.storage.local.get(["outputMode"]);
  state.mode = data.outputMode === "skill" ? "skill" : "design";
  syncModeUi();
  await runExtraction();
}

async function runExtraction() {
  if (state.busy) {
    return;
  }
  setBusy(true);
  clearStatus();
  issuesEl.innerHTML = "";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "RUN_EXTRACTION",
      mode: state.mode
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || chrome.i18n.getMessage("statusExtractionFailed"));
    }

    state.markdown = response.markdown;
    state.filename = response.filename;
    state.lastResult = response;

    previewEl.value = response.markdown;
    downloadBtn.disabled = false;
    exportIdeSelect.disabled = false;
    copyBtn.disabled = false;

    renderValidationIssues(response.validation);
    clearStatus();
    if (!helpPanel.hidden) {
      renderGenerationExplanation();
    }
  } finally {
    setBusy(false);
  }
}

async function downloadCurrent(overrideFilename) {
  if (!state.markdown || !state.filename) {
    setStatus(chrome.i18n.getMessage("statusNothingToDownload"), true);
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "DOWNLOAD_MARKDOWN",
    mode: state.mode,
    filename: overrideFilename || state.filename,
    markdown: state.markdown
  });

  if (!response || !response.ok) {
    throw new Error(response?.error || chrome.i18n.getMessage("statusDownloadFailed"));
  }
  clearStatus();
}

function setBusy(isBusy) {
  state.busy = isBusy;
  refreshBtn.disabled = isBusy;
  for (const button of modeButtons) {
    button.disabled = isBusy;
  }
}

function renderValidationIssues(validation) {
  issuesEl.innerHTML = "";
  if (!validation) {
    return;
  }

  const issues = [
    ...(validation.errors || []),
    ...(validation.warnings || [])
  ];

  if (issues.length === 0) {
    return;
  }

  for (const issue of issues) {
    const item = document.createElement("li");
    item.textContent = issue;
    issuesEl.appendChild(item);
  }
}

function setStatus(text, isError = false) {
  const value = String(text || "").trim();
  if (!value) {
    clearStatus();
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = value;
  statusEl.style.color = isError ? "#b91c1c" : "#1f1f1f";
}

function toErrorText(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "Unknown error");
}

function syncModeUi() {
  for (const button of modeButtons) {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", isActive);
  }
  if (!helpPanel.hidden) {
    renderGenerationExplanation();
  }
}

function renderGenerationExplanation() {
  const modeLabel = state.mode === "skill" ? "SKILL.md" : "DESIGN.md";
  const result = state.lastResult;

  if (!result) {
    helpContentEl.innerHTML = `
      <p>${chrome.i18n.getMessage("helpNoResult")}</p>
      <p>${chrome.i18n.getMessage("helpRunExtractionHint")}</p>
      <p>
        ${chrome.i18n.getMessage("helpFormatBasedOn")}
        <a href="https://www.typeui.sh/design-md" target="_blank" rel="noopener noreferrer">https://www.typeui.sh/design-md</a>
      </p>
    `;
    return;
  }

  const normalized = result.normalized || {};
  const siteProfile = normalized.siteProfile || {};
  const checks = result.validation?.checks || [];
  const passedChecks = checks.filter((item) => item.ok).length;

  const summary = {
    sampledElements: normalized.sampledElements ?? "n/a",
    totalElements: normalized.totalElements ?? "n/a",
    typographyTokens: (normalized.typographyScale || []).length,
    colorTokens: (normalized.colorPalette || []).length,
    spacingTokens: (normalized.spacingScale || []).length,
    radiusTokens: (normalized.radiusTokens || []).length,
    shadowTokens: (normalized.shadowTokens || []).length,
    motionTokens: (normalized.motionDurationTokens || []).length + (normalized.motionEasingTokens || []).length
  };

  const componentHints = (normalized.componentHints || [])
    .slice(0, 5)
    .map((item) => `${item.type}: ${item.count}`)
    .join(", ");

  const inferenceEvidence = (siteProfile.evidence || []).slice(0, 5).join("; ");
  const evidenceText = inferenceEvidence ? chrome.i18n.getMessage("helpInferenceEvidence", [escapeHtml(inferenceEvidence)]) : "";
  const inferenceText = siteProfile.audience || siteProfile.productSurface
    ? chrome.i18n.getMessage("helpInferenceTextWithSignals", [escapeHtml(siteProfile.audience || "n/a"), escapeHtml(siteProfile.productSurface || "n/a"), escapeHtml(siteProfile.confidence || "unknown")])
    : chrome.i18n.getMessage("helpInferenceFallbackText");

  const componentSignalsText = componentHints ? chrome.i18n.getMessage("helpComponentSignalsDetected", [escapeHtml(componentHints)]) : chrome.i18n.getMessage("helpComponentSignalsNone");

  helpContentEl.innerHTML = `
    <p>${chrome.i18n.getMessage("helpGenerationIntro", [escapeHtml(modeLabel)])}</p>
    <ol>
      <li>${chrome.i18n.getMessage("helpStep1Prefix", [escapeHtml(String(summary.sampledElements)), escapeHtml(String(summary.totalElements))])}</li>
      <li>${chrome.i18n.getMessage("helpStep2Prefix", [escapeHtml(String(summary.typographyTokens)), escapeHtml(String(summary.colorTokens)), escapeHtml(String(summary.spacingTokens)), escapeHtml(String(summary.radiusTokens)), escapeHtml(String(summary.shadowTokens)), escapeHtml(String(summary.motionTokens))])}</li>
      <li>${chrome.i18n.getMessage("helpStep3Prefix", [inferenceText, evidenceText])}</li>
      <li>${chrome.i18n.getMessage("helpStep4Prefix", [escapeHtml(modeLabel)])}</li>
      <li>${chrome.i18n.getMessage("helpStep5Prefix", [escapeHtml(String(passedChecks)), escapeHtml(String(checks.length))])}</li>
    </ol>
    <p>${chrome.i18n.getMessage("helpPipelineBasedOn")}</p>
    <p><a href="https://www.typeui.sh/design-md" target="_blank" rel="noopener noreferrer">https://www.typeui.sh/design-md</a></p>
    <p>${componentSignalsText}</p>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.hidden = true;
}
