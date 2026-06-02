const apiBaseUrl = window.location.origin;

const demoSuggestions = [
  {
    name: "Zesty Avocado Toast",
    match: 96,
    missing: [],
    description:
      "Creamy avocado mashed with lime and sea salt, topped with vibrant cherry tomatoes on crusty toast.",
    tags: ["Avocado", "Tomato"],
    time: "15 min",
    icon: "fork",
  },
  {
    name: "Summer Caprese Bowl",
    match: 88,
    missing: ["balsamic"],
    description:
      "A fresh mix of garden tomatoes and creamy avocado chunks drizzled with a bright finish.",
    tags: ["Tomato", "Balsamic"],
    time: "10 min",
    icon: "soup",
  },
  {
    name: "Poached Avocado Skillet",
    match: 82,
    missing: ["egg"],
    description:
      "Warm tomatoes sauteed until bursting, served alongside poached eggs and sliced avocado.",
    tags: ["Egg", "Tomato"],
    time: "25 min",
    icon: "egg",
  },
];

const state = {
  selectedFile: null,
  ingredients: [],
  suggestions: [],
  currentDish: "",
  currentRecipeContext: "",
};

const elements = {
  pantryScreen: document.querySelector("#pantry-screen"),
  resultsScreen: document.querySelector("#results-screen"),
  assistantScreen: document.querySelector("#assistant-screen"),
  uploadForm: document.querySelector("#upload-form"),
  uploadTrigger: document.querySelector("#upload-trigger"),
  pdfInput: document.querySelector("#pdf-input"),
  dropzone: document.querySelector("#dropzone"),
  uploadFileName: document.querySelector("#upload-file-name"),
  uploadStatus: document.querySelector("#upload-status"),
  uploadButton: document.querySelector("#upload-button"),
  suggestForm: document.querySelector("#suggest-form"),
  ingredientsInput: document.querySelector("#ingredients-input"),
  addIngredientButton: document.querySelector("#add-ingredient"),
  ingredientChips: document.querySelector("#ingredient-chips"),
  suggestStatus: document.querySelector("#suggest-status"),
  suggestButton: document.querySelector("#suggest-button"),
  suggestionsGrid: document.querySelector("#suggestions-grid"),
  backToPantry: document.querySelector("#back-to-pantry"),
  backToResults: document.querySelector("#back-to-results"),
  assistantTitle: document.querySelector("#assistant-title"),
  assistantSubtitle: document.querySelector("#assistant-subtitle"),
  recipeModal: document.querySelector("#recipe-modal"),
  modalClose: document.querySelector("#modal-close"),
  modalTitle: document.querySelector("#modal-title"),
  modalIngredients: document.querySelector("#modal-ingredients"),
  modalInstructions: document.querySelector("#modal-instructions"),
  chatForm: document.querySelector("#chat-form"),
  chatInput: document.querySelector("#chat-input"),
  chatMessages: document.querySelector("#chat-messages"),
};

function showScreen(screenName) {
  const target = {
    pantry: elements.pantryScreen,
    results: elements.resultsScreen,
    assistant: elements.assistantScreen,
  }[screenName];

  [elements.pantryScreen, elements.resultsScreen, elements.assistantScreen].forEach(
    (screen) => {
      screen.classList.remove("visible-screen");
    },
  );

  target.classList.add("visible-screen");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("success", "error");
  if (type) {
    element.classList.add(type);
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok) {
    const message = data?.error?.message || "Request failed.";
    throw new Error(message);
  }

  return data;
}

function updateSelectedFile(file) {
  state.selectedFile = file;
  elements.uploadFileName.textContent = file ? file.name : "Upload PDF";
}

function addIngredient(rawValue) {
  const pieces = rawValue
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  pieces.forEach((piece) => {
    const exists = state.ingredients.some(
      (ingredient) => ingredient.toLowerCase() === piece.toLowerCase(),
    );
    if (!exists) {
      state.ingredients.push(piece);
    }
  });

  elements.ingredientsInput.value = "";
  renderIngredientChips();
}

function removeIngredient(index) {
  state.ingredients.splice(index, 1);
  renderIngredientChips();
}

function renderIngredientChips() {
  elements.ingredientChips.innerHTML = "";
  state.ingredients.forEach((ingredient, index) => {
    const chip = document.createElement("span");
    chip.className = "ingredient-chip";
    chip.innerHTML = `
      ${escapeHtml(ingredient)}
      <button type="button" aria-label="Remove ${escapeHtml(ingredient)}">x</button>
    `;
    chip.querySelector("button").addEventListener("click", () => {
      removeIngredient(index);
    });
    elements.ingredientChips.append(chip);
  });
}

async function handleUpload(event) {
  event.preventDefault();
  const file = state.selectedFile || elements.pdfInput.files[0];
  if (!file) {
    setStatus(elements.uploadStatus, "Choose a PDF first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("pdf", file);
  elements.uploadButton.disabled = true;
  elements.uploadButton.textContent = "Indexing";
  setStatus(elements.uploadStatus, "Reading...");

  try {
    const result = await requestJson("/upload-pdf", {
      method: "POST",
      body: formData,
    });
    setStatus(elements.uploadStatus, `${result.chunks} chunks indexed`, "success");
    setStatus(elements.suggestStatus, "Recipe book indexed.", "success");
  } catch (error) {
    setStatus(elements.uploadStatus, error.message, "error");
    setStatus(elements.suggestStatus, error.message, "error");
  } finally {
    elements.uploadButton.disabled = false;
    elements.uploadButton.textContent = "Index";
  }
}

async function handleSuggest(event) {
  event.preventDefault();
  if (elements.ingredientsInput.value.trim()) {
    addIngredient(elements.ingredientsInput.value);
  }

  const ingredients = state.ingredients.join(" ");
  if (!ingredients.trim()) {
    setStatus(elements.suggestStatus, "Add at least one ingredient.", "error");
    return;
  }

  elements.suggestButton.disabled = true;
  elements.suggestButton.innerHTML = "<span>Finding Recipes</span><span aria-hidden=\"true\">...</span>";
  setStatus(elements.suggestStatus, "");

  try {
    const suggestions = await requestJson("/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients }),
    });
    state.suggestions = suggestions.length ? suggestions : demoSuggestions;
  } catch (_error) {
    state.suggestions = demoSuggestions;
  } finally {
    renderSuggestions(state.suggestions);
    elements.suggestButton.disabled = false;
    elements.suggestButton.innerHTML = "<span>Find Recipes</span><span aria-hidden=\"true\">✣</span>";
    showScreen("results");
  }
}

function renderSuggestions(suggestions) {
  elements.suggestionsGrid.innerHTML = "";

  if (!suggestions.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No recipes found. Add more ingredients or upload a recipe book.";
    elements.suggestionsGrid.append(empty);
    return;
  }

  suggestions.slice(0, 6).forEach((suggestion, index) => {
    const tags = tagsForSuggestion(suggestion);
    const card = document.createElement("article");
    card.className = "recipe-card";
    card.innerHTML = `
      <div class="recipe-visual">
        <span class="time-pill">${escapeHtml(suggestion.time || timeForIndex(index))}</span>
        <span aria-hidden="true">${iconForSuggestion(suggestion, index)}</span>
      </div>
      <div class="recipe-body">
        <h3>${escapeHtml(suggestion.name)}</h3>
        <p>${escapeHtml(descriptionForSuggestion(suggestion))}</p>
        <div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <button class="select-button" type="button">View Recipe</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      startAssistant(suggestion);
    });

    elements.suggestionsGrid.append(card);
  });
}

function tagsForSuggestion(suggestion) {
  if (suggestion.tags?.length) {
    return suggestion.tags.slice(0, 3);
  }
  if (suggestion.missing?.length) {
    return suggestion.missing.slice(0, 3);
  }
  return state.ingredients.slice(0, 3);
}

function descriptionForSuggestion(suggestion) {
  if (suggestion.description) {
    return suggestion.description;
  }
  const missing = suggestion.missing?.length
    ? ` Missing: ${suggestion.missing.join(", ")}.`
    : " You have the core ingredients ready.";
  return `${suggestion.match || 80}% match from your recipe book.${missing}`;
}

function timeForIndex(index) {
  return ["15 min", "10 min", "25 min", "20 min", "30 min", "12 min"][index % 6];
}

function iconForSuggestion(suggestion, index) {
  if (suggestion.icon === "soup") {
    return "♨";
  }
  if (suggestion.icon === "egg") {
    return "◉";
  }
  return ["♨", "◉", "♜", "♢", "♧", "♤"][index % 6];
}

async function startAssistant(suggestion) {
  state.currentDish = suggestion.name;
  elements.assistantTitle.textContent = suggestion.name;
  elements.assistantSubtitle.textContent = "Live Instruction Active";
  elements.chatMessages.innerHTML = "";
  appendInstructionCard(
    suggestion.name,
    stepsFromSuggestion(suggestion),
    tipForSuggestion(suggestion),
  );
  showScreen("assistant");

  try {
    const recipe = await requestJson("/recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish: suggestion.name }),
    });
    state.currentRecipeContext = recipe.instructions || "";
    elements.assistantTitle.textContent = recipe.name || suggestion.name;
    elements.chatMessages.innerHTML = "";
    appendInstructionCard(
      recipe.name || suggestion.name,
      stepsFromRecipe(recipe, suggestion),
      tipForSuggestion(suggestion),
    );
  } catch (_error) {
    state.currentRecipeContext = descriptionForSuggestion(suggestion);
  }
}

function appendInstructionCard(dishName, steps, tip) {
  const row = document.createElement("div");
  row.className = "chat-row assistant-row";
  row.innerHTML = `
    <span class="chat-avatar" aria-hidden="true">AI</span>
    <div class="instruction-card">
      <p>Great choice! Let's cook ${escapeHtml(dishName)} together. Follow these steps:</p>
      <div class="step-list">
        ${steps
          .map(
            (step, index) => `
              <div class="step-item">
                <span class="step-number">${index + 1}</span>
                <span class="step-text">${escapeHtml(step)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
  elements.chatMessages.append(row);

  if (tip) {
    const tipNode = document.createElement("div");
    tipNode.className = "tip-chip";
    tipNode.textContent = `ⓘ Pro tip: ${tip}`;
    elements.chatMessages.append(tipNode);
  }
}

function stepsFromRecipe(recipe, suggestion) {
  const rawInstructions = recipe.instructions || "";
  const steps = rawInstructions
    .split(/\n+|\d+\.\s+/)
    .map((step) => step.replace(/^\d+\.\s*/, "").trim())
    .filter((step) => step.length > 4)
    .slice(0, 6);

  return steps.length ? steps : stepsFromSuggestion(suggestion);
}

function stepsFromSuggestion(suggestion) {
  const name = suggestion.name.toLowerCase();
  if (name.includes("toast")) {
    return [
      "Toast the bread until crisp and golden.",
      "Mash avocado with salt, pepper, and a little acidity.",
      "Spread the avocado over the toast and top with tomato.",
      "Finish with herbs or chili flakes and serve immediately.",
    ];
  }
  if (name.includes("caprese")) {
    return [
      "Wash the cherry tomatoes and halve them.",
      "Slice or cube the avocado into bite-sized pieces.",
      "Layer tomatoes and avocado in a bowl.",
      "Season with salt, pepper, and a bright acidic dressing.",
    ];
  }
  if (name.includes("skillet")) {
    return [
      "Warm a skillet and saute tomatoes until they soften.",
      "Add seasoning and cook until the juices thicken slightly.",
      "Poach or fry eggs separately until just set.",
      "Serve the eggs with tomatoes and sliced avocado.",
    ];
  }
  return [
    "Gather and prep all ingredients before cooking.",
    "Cook the main ingredients gently until tender.",
    "Season in stages and taste as you go.",
    "Plate the dish and serve while fresh.",
  ];
}

function tipForSuggestion(suggestion) {
  const name = suggestion.name.toLowerCase();
  if (name.includes("skillet")) {
    return "Use room temp eggs for better poaching.";
  }
  if (name.includes("toast")) {
    return "Toast the bread well so it stays crisp under the avocado.";
  }
  return "Add acidic ingredients slowly, then taste before adding more.";
}

async function openRecipe(dish) {
  elements.modalTitle.textContent = dish;
  elements.modalIngredients.innerHTML = "";
  elements.modalInstructions.textContent = "Loading recipe...";
  elements.recipeModal.showModal();

  try {
    const recipe = await requestJson("/recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish }),
    });
    elements.modalTitle.textContent = recipe.name || dish;
    renderIngredients(recipe.ingredients || []);
    elements.modalInstructions.textContent = recipe.instructions || "";
  } catch (error) {
    renderDemoRecipe(dish, error.message);
  }
}

function renderDemoRecipe(dish, fallbackMessage) {
  const suggestion = demoSuggestions.find((item) => item.name === dish);
  if (!suggestion) {
    elements.modalInstructions.textContent = fallbackMessage;
    return;
  }

  elements.modalIngredients.innerHTML = "";
  suggestion.tags.forEach((tag) => {
    const item = document.createElement("li");
    item.textContent = tag;
    elements.modalIngredients.append(item);
  });
  elements.modalInstructions.textContent =
    "1. Prep the ingredients.\n2. Cook gently until flavors come together.\n3. Taste, adjust seasoning, and serve warm.";
}

function renderIngredients(ingredients) {
  elements.modalIngredients.innerHTML = "";
  if (!ingredients.length) {
    const item = document.createElement("li");
    item.textContent = "No ingredient list found.";
    elements.modalIngredients.append(item);
    return;
  }

  ingredients.forEach((ingredient) => {
    const item = document.createElement("li");
    item.textContent = ingredient.quantity
      ? `${ingredient.quantity} ${ingredient.name}`
      : ingredient.name;
    elements.modalIngredients.append(item);
  });
}

async function handleChat(event) {
  event.preventDefault();
  const message = elements.chatInput.value.trim();
  if (!message) {
    return;
  }

  appendMessage(message, "user");
  elements.chatInput.value = "";
  appendMessage("Thinking...", "assistant", true);

  try {
    const result = await requestJson("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    replacePendingMessage(result.response);
  } catch (error) {
    replacePendingMessage(error.message);
  }
}

function appendMessage(message, role, pending = false) {
  const row = document.createElement("div");
  row.className = `chat-row ${role}-row`;

  const avatar = document.createElement("span");
  avatar.className = "chat-avatar";
  avatar.textContent = role === "user" ? "U" : "AI";
  avatar.setAttribute("aria-hidden", "true");

  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.textContent = message;
  if (pending) {
    bubble.dataset.pending = "true";
  }

  row.append(avatar, bubble);
  elements.chatMessages.append(row);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function replacePendingMessage(message) {
  const pending = elements.chatMessages.querySelector("[data-pending='true']");
  if (pending) {
    pending.textContent = message;
    pending.removeAttribute("data-pending");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupAnimatedBackground() {
  const canvas = document.querySelector("#bg-canvas");
  const context = canvas.getContext("2d");
  const icons = [
    "\uD83C\uDF45",
    "\uD83E\uDD51",
    "\uD83E\uDD55",
    "\uD83E\uDD66",
    "\uD83C\uDF4B",
    "\uD83E\uDD5A",
  ];
  const particles = [];
  const mouse = { x: -1000, y: -1000 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    initParticles();
  }

  function initParticles() {
    particles.length = 0;
    const count = Math.max(34, Math.floor((window.innerWidth * window.innerHeight) / 26000));
    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 19 + Math.random() * 18,
        icon: icons[index % icons.length],
        alpha: 0.17 + Math.random() * 0.18,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        rotation: Math.random() * Math.PI,
        rotationVelocity: (Math.random() - 0.5) * 0.012,
      });
    }
  }

  function drawParticle(particle) {
    context.save();
    context.globalAlpha = particle.alpha;
    context.font = `${particle.size}px "Segoe UI Emoji", "Apple Color Emoji", serif`;
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillText(particle.icon, -particle.size / 2, particle.size / 2);
    context.restore();
  }

  function updateParticle(particle) {
    if (!reducedMotion) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationVelocity;

      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distance = Math.hypot(dx, dy);
      const radius = 165;

      if (distance > 0 && distance < radius) {
        const force = (radius - distance) / radius;
        particle.x -= (dx / distance) * force * 6;
        particle.y -= (dy / distance) * force * 6;
      }
    }

    if (particle.x < -60) particle.x = window.innerWidth + 60;
    if (particle.x > window.innerWidth + 60) particle.x = -60;
    if (particle.y < -60) particle.y = window.innerHeight + 60;
    if (particle.y > window.innerHeight + 60) particle.y = -60;
  }

  function animate() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((particle) => {
      updateParticle(particle);
      drawParticle(particle);
    });
    window.requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  resize();
  animate();
}

elements.uploadForm.addEventListener("submit", handleUpload);
elements.suggestForm.addEventListener("submit", handleSuggest);
elements.chatForm.addEventListener("submit", handleChat);
elements.modalClose.addEventListener("click", () => elements.recipeModal.close());
elements.backToPantry.addEventListener("click", () => showScreen("pantry"));
elements.backToResults.addEventListener("click", () => showScreen("results"));
elements.uploadTrigger.addEventListener("click", () => elements.pdfInput.click());

elements.addIngredientButton.addEventListener("click", () => {
  addIngredient(elements.ingredientsInput.value);
});

elements.ingredientsInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addIngredient(elements.ingredientsInput.value);
  }
});

elements.pdfInput.addEventListener("change", (event) => {
  updateSelectedFile(event.target.files[0]);
  if (event.target.files[0]) {
    elements.uploadForm.requestSubmit();
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("dragging");
  });
});

elements.dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) {
    updateSelectedFile(file);
  }
});

renderIngredientChips();
renderSuggestions(demoSuggestions);
appendMessage("Great choice. I can guide you step by step while you cook.", "assistant");
setupAnimatedBackground();
