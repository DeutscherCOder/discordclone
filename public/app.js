const channelMeta = {
  lobby: { topic: "a soft place to land after a long day", icon: "hash", placeholder: "Message #lobby" },
  ideas: { topic: "small sparks, big possibilities", icon: "hash", placeholder: "Message #ideas" },
  photos: { topic: "little moments worth keeping", icon: "hash", placeholder: "Message #photos" },
  fireside: { topic: "a warm room for voices", icon: "volume", placeholder: "Join the conversation" },
  "quiet-corner": { topic: "low volume, no pressure", icon: "volume", placeholder: "Message #quiet-corner" },
};

const seedMessages = {
  lobby: [
    { author: "lilac", variant: "lilac", initial: "L", time: "Today at 20:41", text: "the stars are looking especially good tonight ✦", role: "MOD" },
    { author: "noah", variant: "sage", initial: "N", time: "Today at 20:44", text: "That is a very convincing argument for staying up five more minutes.", reaction: 4 },
    { author: "riley", variant: "amber", initial: "R", time: "Today at 20:48", text: "I dropped a few photos in #photos if anyone wants a tiny evening walk." },
    { author: "alex", variant: "you", initial: "A", time: "Today at 21:03", text: "just finished polishing this place. what should we build first?", you: true },
  ],
  ideas: [
    { author: "sage", variant: "blue", initial: "S", time: "Today at 19:22", text: "What if every room had its own little mood and soundtrack?" },
    { author: "lilac", variant: "lilac", initial: "L", time: "Today at 19:25", text: "soft ambient audio in the background would be lovely.", role: "MOD" },
    { author: "alex", variant: "you", initial: "A", time: "Today at 19:28", text: "noted. adding that to our tiny moonlit roadmap.", you: true },
  ],
  photos: [
    { author: "riley", variant: "amber", initial: "R", time: "Today at 20:48", text: "evening light from the walk. the sky really showed off." },
    { author: "noah", variant: "sage", initial: "N", time: "Today at 20:51", text: "This one feels like a warm cup of tea.", reaction: 2 },
  ],
  fireside: [
    { author: "lilac", variant: "lilac", initial: "L", time: "Today at 20:41", text: "voice room is open if anyone wants company.", role: "MOD" },
    { author: "alex", variant: "you", initial: "A", time: "Today at 21:03", text: "I am testing the fireside room for the demo.", you: true },
  ],
  "quiet-corner": [],
};

const storageKey = "moonlit-demo-v2";
const saved = readSavedState();
const state = {
  activeChannel: saved?.activeChannel || "lobby",
  messages: saved?.messages || structuredClone(seedMessages),
  customChannels: saved?.customChannels || [],
  customServers: saved?.customServers || [],
  joinedVoice: false,
  micMuted: false,
  deafened: false,
};

state.customChannels.forEach(({ channel, isVoice }) => {
  channelMeta[channel] = {
    topic: "a new little room in the night",
    icon: isVoice ? "volume" : "hash",
    placeholder: isVoice ? "Join the conversation" : `Message #${channel}`,
  };
});

const channelName = document.querySelector("#channel-name");
const channelTopic = document.querySelector("#channel-topic");
const titleIcon = document.querySelector(".title-icon");
const composer = document.querySelector("#composer");
const messageInput = document.querySelector("#message-input");
const messageList = document.querySelector("#message-list");
const attachmentPreview = document.querySelector("#attachment-preview");
const fileInput = document.querySelector("#file-input");
const toast = document.querySelector("#toast");
const voiceDock = document.querySelector("#voice-dock");
const callBanner = document.querySelector("#call-banner");
const screenModal = document.querySelector("#screen-share-modal");
const screenPreview = document.querySelector("#screen-preview");
const sidebar = document.querySelector(".workspace-sidebar");
const memberPanel = document.querySelector(".member-panel");
let pendingFiles = [];
let screenStream = null;
let microphoneStream = null;
let toastTimer;

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({
    activeChannel: state.activeChannel,
    messages: state.messages,
    customChannels: state.customChannels,
    customServers: state.customServers,
  }));
}

function icon(name, className = "icon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function nowLabel() {
  return `Today at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderMessages() {
  messageList.replaceChildren();
  const messages = state.messages[state.activeChannel] || [];
  if (!messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-channel";
    empty.innerHTML = `<span class="empty-channel-icon">✦</span><strong>It is quiet here.</strong><p>Start the conversation and make this room yours.</p>`;
    messageList.append(empty);
    return;
  }

  messages.forEach((message, index) => {
    const article = document.createElement("article");
    article.className = `message${message.you ? " message-highlight" : ""}`;
    const avatar = createAvatar(message.variant, message.initial, true);
    const content = document.createElement("div");
    content.className = "message-content";

    const meta = document.createElement("div");
    meta.className = "message-meta";
    const name = document.createElement("strong");
    name.textContent = message.author;
    meta.append(name);
    if (message.role) {
      const role = document.createElement("span");
      role.className = "role-pill";
      role.textContent = message.role;
      meta.append(role);
    }
    if (message.you) {
      const you = document.createElement("span");
      you.className = "you-pill";
      you.textContent = "YOU";
      meta.append(you);
    }
    const time = document.createElement("time");
    time.textContent = message.time;
    meta.append(time);
    content.append(meta);

    if (message.text) {
      const paragraph = document.createElement("p");
      paragraph.textContent = message.text;
      content.append(paragraph);
    }

    if (message.files?.length) {
      message.files.forEach((file) => {
        const fileCard = document.createElement("div");
        fileCard.className = "message-reaction attachment-card";
        fileCard.append(icon(file.type?.startsWith("image/") ? "sparkles" : "paperclip"));
        const fileName = document.createElement("span");
        fileName.textContent = `${file.name} · ${formatBytes(file.size)}`;
        fileCard.append(fileName);
        content.append(fileCard);
      });
    }

    if (message.reaction) {
      const reaction = document.createElement("button");
      reaction.type = "button";
      reaction.className = "message-reaction";
      reaction.innerHTML = "☾ <span></span>";
      reaction.querySelector("span").textContent = message.reaction;
      reaction.addEventListener("click", () => {
        message.reaction += 1;
        saveState();
        renderMessages();
        showToast("Reaction added.");
      });
      content.append(reaction);
    }

    article.append(avatar, content);
    article.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (message.you && window.confirm("Delete this demo message?")) {
        state.messages[state.activeChannel].splice(index, 1);
        saveState();
        renderMessages();
      }
    });
    messageList.append(article);
  });
}

function createAvatar(variant, initial, online = false) {
  const avatar = document.createElement("div");
  avatar.className = `avatar avatar-${variant}`;
  avatar.textContent = initial;
  if (online) {
    const presence = document.createElement("span");
    presence.className = "presence-dot";
    avatar.append(presence);
  }
  return avatar;
}

function setChannel(channel) {
  if (!channelMeta[channel]) return;
  state.activeChannel = channel;
  const meta = channelMeta[channel];
  document.querySelectorAll(".channel-button").forEach((button) => button.classList.toggle("active", button.dataset.channel === channel));
  channelName.textContent = channel;
  channelTopic.textContent = meta.topic;
  messageInput.placeholder = meta.placeholder;
  titleIcon.replaceChildren(icon(meta.icon));
  renderMessages();
  saveState();
  if (channel === "fireside") {
    callBanner.hidden = false;
  }
  if (window.innerWidth < 821) sidebar.classList.remove("open");
}

function addChannelButton(channel, isVoice = false) {
  const button = document.createElement("button");
  button.className = `channel-button${isVoice ? " voice-channel" : ""}`;
  button.dataset.channel = channel;
  button.append(icon(isVoice ? "volume" : "hash", "channel-icon"));
  const label = document.createElement("span");
  label.textContent = channel;
  button.append(label);
  button.addEventListener("click", () => setChannel(channel));
  const category = document.querySelector(isVoice ? ".voice-category" : ".channel-category");
  category.parentElement.insertBefore(button, category.nextElementSibling);
}

function addCustomChannel(isVoice) {
  const proposed = window.prompt(`Name your ${isVoice ? "voice" : "text"} room`);
  const channel = proposed?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (!channel) return;
  if (channelMeta[channel]) {
    showToast("That room already exists.");
    return;
  }
  channelMeta[channel] = { topic: "a new little room in the night", icon: isVoice ? "volume" : "hash", placeholder: isVoice ? "Join the conversation" : `Message #${channel}` };
  state.messages[channel] = [];
  state.customChannels.push({ channel, isVoice });
  saveState();
  addChannelButton(channel, isVoice);
  setChannel(channel);
  showToast(`#${channel} created.`);
}

function addCustomServer() {
  const proposed = window.prompt("Name your new demo server");
  const name = proposed?.trim();
  if (!name) return;
  state.customServers.push(name);
  saveState();
  const button = document.createElement("button");
  button.className = "server-button";
  button.dataset.server = name;
  button.setAttribute("aria-label", `${name} server`);
  button.textContent = name.slice(0, 1).toUpperCase();
  button.addEventListener("click", () => selectServer(button));
  const addButton = document.querySelector(".add-server");
  addButton.parentElement.insertBefore(button, addButton);
  selectServer(button);
  showToast(`${name} created in demo mode.`);
}

function selectServer(button) {
  document.querySelectorAll(".server-button, .brand-mark").forEach((item) => item.classList.remove("server-selected", "active"));
  button.classList.add(button.classList.contains("server-button") ? "server-selected" : "active");
  document.querySelector("#server-name").textContent = button.dataset.server;
  showToast(`${button.dataset.server} selected.`);
}

function renderCustomItems() {
  state.customChannels.forEach(({ channel, isVoice }) => {
    if (!document.querySelector(`[data-channel="${CSS.escape(channel)}"]`)) addChannelButton(channel, isVoice);
  });
  state.customServers.forEach((name) => {
    if ([...document.querySelectorAll(".server-button")].some((button) => button.dataset.server === name)) return;
    const button = document.createElement("button");
    button.className = "server-button";
    button.dataset.server = name;
    button.setAttribute("aria-label", `${name} server`);
    button.textContent = name.slice(0, 1).toUpperCase();
    button.addEventListener("click", () => selectServer(button));
    document.querySelector(".add-server").parentElement.insertBefore(button, document.querySelector(".add-server"));
  });
}

function renderAttachments() {
  attachmentPreview.replaceChildren();
  attachmentPreview.hidden = pendingFiles.length === 0;
  pendingFiles.forEach((file, index) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    chip.append(icon(file.type.startsWith("image/") ? "sparkles" : "paperclip"));
    const name = document.createElement("span");
    name.textContent = `${file.name} · ${formatBytes(file.size)}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.addEventListener("click", () => {
      pendingFiles.splice(index, 1);
      renderAttachments();
    });
    chip.append(name, remove);
    attachmentPreview.append(chip);
  });
}

function addMessage(text, files) {
  const message = {
    author: "alex",
    variant: "you",
    initial: "A",
    time: nowLabel(),
    text,
    you: true,
    files: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
  };
  if (!state.messages[state.activeChannel]) state.messages[state.activeChannel] = [];
  state.messages[state.activeChannel].push(message);
  saveState();
  renderMessages();
  messageInput.focus();
}

function updateMicState(muted) {
  state.micMuted = muted;
  document.querySelectorAll(".mic-toggle, #voice-mic").forEach((button) => button.classList.toggle("is-muted", muted));
  showToast(muted ? "Microphone muted." : "Microphone on.");
}

function updateDeafenState(deafened) {
  state.deafened = deafened;
  document.querySelectorAll(".deafen-toggle, .voice-actions .voice-action:nth-child(2)").forEach((button) => button.classList.toggle("is-muted", deafened));
  showToast(deafened ? "Audio deafened." : "Audio restored.");
}

async function joinVoice() {
  state.joinedVoice = true;
  voiceDock.hidden = false;
  callBanner.hidden = true;
  setChannel("fireside");
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      showToast("Microphone connected. Fireside joined.");
    } catch {
      showToast("Fireside joined in demo mode. Microphone permission was skipped.");
    }
  } else {
    showToast("Fireside joined in demo mode.");
  }
}

function leaveVoice() {
  state.joinedVoice = false;
  voiceDock.hidden = true;
  callBanner.hidden = false;
  microphoneStream?.getTracks().forEach((track) => track.stop());
  microphoneStream = null;
  stopScreenShare();
  showToast("You left Fireside.");
}

async function startScreenShare() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    showToast("Screen sharing is not available in this browser.");
    return;
  }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    screenPreview.srcObject = screenStream;
    screenModal.hidden = false;
    screenStream.getVideoTracks()[0].addEventListener("ended", stopScreenShare);
    showToast("Screen sharing started in demo mode.");
  } catch (error) {
    if (error?.name !== "NotAllowedError") showToast("We could not start screen sharing.");
  }
}

function stopScreenShare() {
  if (screenStream) screenStream.getTracks().forEach((track) => track.stop());
  screenStream = null;
  screenPreview.srcObject = null;
  screenModal.hidden = true;
}

function openDemoSettings() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop demo-settings-backdrop";
  backdrop.innerHTML = `<div class="screen-modal demo-settings"><div class="modal-heading"><div><p class="eyebrow">LOCAL DEMO</p><h3>Moonlit settings</h3></div><button class="icon-button close-demo-settings" aria-label="Close">×</button></div><div class="demo-settings-body"><div class="settings-row"><span class="settings-icon">✦</span><div><strong>Demo mode is on</strong><p>Messages, rooms, and profile changes are stored only in this browser.</p></div></div><div class="settings-row"><span class="settings-icon">⌘</span><div><strong>Keyboard shortcut</strong><p>Press Ctrl or Cmd plus K to focus search.</p></div></div></div><div class="modal-footer"><button class="danger-button reset-demo">Reset demo data</button><button class="primary-button close-demo-settings">Done</button></div></div>`;
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelectorAll(".close-demo-settings").forEach((button) => button.addEventListener("click", close));
  backdrop.querySelector(".reset-demo").addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    window.location.reload();
  });
}

// Channel navigation and initial state.
document.querySelectorAll(".channel-button").forEach((button) => button.addEventListener("click", () => setChannel(button.dataset.channel)));
document.querySelectorAll(".server-button, .brand-mark").forEach((button) => button.addEventListener("click", () => selectServer(button)));

document.querySelectorAll(".tiny-button").forEach((button, index) => {
  button.addEventListener("click", () => addCustomChannel(index === 1));
});
document.querySelector(".add-server").addEventListener("click", addCustomServer);
document.querySelector(".discover-server").addEventListener("click", () => showToast("Server discovery is ready for the backend phase."));
document.querySelector(".prompt-arrow").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText("https://moonlit.demo/invite/night"); } catch { /* Clipboard may be unavailable in preview frames. */ }
  showToast("Demo invite copied.");
});

document.querySelector("#attach-button").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const accepted = Array.from(fileInput.files).filter((file) => file.size <= 25 * 1024 * 1024);
  const skipped = fileInput.files.length - accepted.length;
  pendingFiles.push(...accepted);
  renderAttachments();
  fileInput.value = "";
  if (skipped) showToast("Files over 25 MB were skipped in demo mode.");
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text && pendingFiles.length === 0) return;
  addMessage(text, pendingFiles);
  messageInput.value = "";
  pendingFiles = [];
  renderAttachments();
});

composer.addEventListener("dragover", (event) => { event.preventDefault(); composer.classList.add("dragging"); });
composer.addEventListener("dragleave", () => composer.classList.remove("dragging"));
composer.addEventListener("drop", (event) => {
  event.preventDefault();
  composer.classList.remove("dragging");
  pendingFiles.push(...Array.from(event.dataTransfer.files).filter((file) => file.size <= 25 * 1024 * 1024));
  renderAttachments();
  showToast("Files added to your message.");
});

document.querySelector(".mic-toggle").addEventListener("click", () => updateMicState(!state.micMuted));
document.querySelector(".deafen-toggle").addEventListener("click", () => updateDeafenState(!state.deafened));
document.querySelector("#voice-mic").addEventListener("click", () => updateMicState(!state.micMuted));
document.querySelector(".voice-actions .voice-action:nth-child(2)").addEventListener("click", () => updateDeafenState(!state.deafened));
document.querySelector("#join-voice").addEventListener("click", joinVoice);
document.querySelector("#leave-voice").addEventListener("click", leaveVoice);
document.querySelector("#share-screen").addEventListener("click", startScreenShare);
document.querySelector("#stop-share").addEventListener("click", stopScreenShare);
document.querySelector("#close-share").addEventListener("click", stopScreenShare);
document.querySelector(".dismiss-banner").addEventListener("click", () => { callBanner.hidden = true; });

document.querySelector(".members-toggle").addEventListener("click", () => memberPanel.classList.toggle("open"));
document.querySelector(".close-members").addEventListener("click", () => memberPanel.classList.remove("open"));
document.querySelector(".mobile-menu").addEventListener("click", () => sidebar.classList.toggle("open"));
document.querySelector("[aria-label=\"User settings\"]").addEventListener("click", openDemoSettings);
document.querySelector("[aria-label=\"Add emoji\"]").addEventListener("click", () => { messageInput.value += " ✦"; messageInput.focus(); });
document.querySelector("[aria-label=\"Add gift\"]").addEventListener("click", () => showToast("Gifts are waiting for the real backend."));

document.querySelector("#search-input").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const query = event.currentTarget.value.trim().toLowerCase();
  if (!query) return;
  const matches = Object.values(state.messages).flat().filter((message) => `${message.text || ""} ${message.author}`.toLowerCase().includes(query)).length;
  showToast(matches ? `${matches} demo message${matches === 1 ? "" : "s"} found.` : "No demo messages found.");
  event.currentTarget.blur();
});
window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("#search-input").focus();
  }
  if (event.key === "Escape") {
    stopScreenShare();
    memberPanel.classList.remove("open");
    sidebar.classList.remove("open");
  }
});

document.querySelectorAll(".top-actions > .icon-button").forEach((button) => {
  const label = button.getAttribute("aria-label");
  if (label === "Toggle members" || label === "Help") return;
  button.addEventListener("click", () => showToast(label === "Notifications" ? "You are all caught up." : "No pinned messages yet."));
});

document.querySelector(".server-status").insertAdjacentHTML("beforeend", '<span class="demo-badge">DEMO</span>');
renderCustomItems();
setChannel(state.activeChannel);
