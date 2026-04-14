const state = {
  markdown: "",
  filename: "",
  mode: "design",
  busy: false
};

const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const refreshBtn = document.getElementById("refreshBtn");
const downloadBtn = document.getElementById("downloadBtn");
const copyBtn = document.getElementById("copyBtn");
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

copyBtn.addEventListener("click", async () => {
  try {
    if (!state.markdown) {
      setStatus("Nothing to copy yet.", true);
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
    setStatus(`Copy failed: ${toErrorText(error)}`, true);
  }
});

init().catch((error) => setStatus(`Init failed: ${toErrorText(error)}`, true));

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
  setStatus(`Generating ${state.mode === "skill" ? "SKILL.md" : "DESIGN.md"} from active tab...`);
  issuesEl.innerHTML = "";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "RUN_EXTRACTION",
      mode: state.mode
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || "Extraction request failed.");
    }

    state.markdown = response.markdown;
    state.filename = response.filename;

    previewEl.value = response.markdown;
    downloadBtn.disabled = false;
    copyBtn.disabled = false;

    renderValidationIssues(response.validation);
    setStatus(
      response.validation?.isValid
        ? `Generated ${response.filename} from ${response.normalized.sampledElements} sampled elements.`
        : `Generated ${response.filename} with validation issues.`,
      !response.validation?.isValid
    );
  } finally {
    setBusy(false);
  }
}

async function downloadCurrent() {
  if (!state.markdown || !state.filename) {
    setStatus("Nothing to download yet.", true);
    return;
  }

  setStatus(`Preparing ${state.filename} download...`);
  const response = await chrome.runtime.sendMessage({
    type: "DOWNLOAD_MARKDOWN",
    filename: state.filename,
    markdown: state.markdown
  });

  if (!response || !response.ok) {
    throw new Error(response?.error || "Download failed.");
  }

  setStatus(`Download started for ${state.filename}.`);
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
  statusEl.textContent = text;
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
}
