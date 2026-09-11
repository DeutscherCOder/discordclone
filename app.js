const channelMeta = {
  lobby: { topic: "a soft place to land after a long day", icon: "#i-hash", placeholder: "Message #lobby" },
  ideas: { topic: "small sparks, big possibilities", icon: "#i-hash", placeholder: "Message #ideas" },
  photos: { topic: "little moments worth keeping", icon: "#i-hash", placeholder: "Message #photos" },
  fireside: { topic: "a warm room for voices", icon: "#i-volume", placeholder: "Join the conversation" },
  "quiet-corner": { topic: "low volume, no pressure", icon: "#i-volume", placeholder: "Message #quiet-corner" },
};

const channelName = document.querySelector("#channel-name");
const channelTopic = document.querySelector("#channel-topic");
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

let activeChannel = "lobby";
let pendingFiles = [];
let screenStream = null;
let toastTimer;

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

function setChannel(channel) {
  const meta = channelMeta[channel] || channelMeta.lobby;
  activeChannel = channel;
  document.querySelectorAll(".channel-button").forEach((button) => button.classList.toggle("active", button.dataset.channel === channel));
  channelName.textContent = channel;
  channelTopic.textContent = meta.topic;
  messageInput.placeholder = meta.placeholder;
  document.querySelector(".title-icon").replaceChildren(icon(meta.icon.slice(3)));
  if (channel === "fireside") {
    callBanner.hidden = false;
    showToast("Fireside is ready when you are.");
  }
}

document.querySelectorAll(".channel-button").forEach((button) => {
  button.addEventListener("click", () => setChannel(button.dataset.channel));
});

document.querySelectorAll(".server-button, .brand-mark").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".server-button, .brand-mark").forEach((item) => item.classList.remove("server-selected", "active"));
    button.classList.add(button.classList.contains("server-button") ? "server-selected" : "active");
    document.querySelector("#server-name").textContent = button.dataset.server;
    showToast(`${button.dataset.server} selected`);
  });
});

document.querySelector("#attach-button").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  pendingFiles = [...pendingFiles, ...Array.from(fileInput.files)];
  renderAttachments();
  fileInput.value = "";
});

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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text && pendingFiles.length === 0) return;
  addMessage(text, pendingFiles);
  messageInput.value = "";
  pendingFiles = [];
  renderAttachments();
  messageInput.focus();
});

function addMessage(text, files) {
  const article = document.createElement("article");
  article.className = "message message-highlight";
  const avatar = document.createElement("div");
  avatar.className = "avatar avatar-you";
  avatar.textContent = "A";
  const presence = document.createElement("span");
  presence.className = "presence-dot";
  avatar.append(presence);
  const content = document.createElement("div");
  content.className = "message-content";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const name = document.createElement("strong");
  name.textContent = "alex";
  const you = document.createElement("span");
  you.className = "you-pill";
  you.textContent = "YOU";
  const time = document.createElement("time");
  time.textContent = `Today at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  meta.append(name, you, time);
  content.append(meta);
  if (text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    content.append(paragraph);
  }
  files.forEach((file) => {
    const fileCard = document.createElement("div");
    fileCard.className = "message-reaction";
    fileCard.replaceChildren(icon(file.type.startsWith("image/") ? "sparkles" : "paperclip"));
    const fileName = document.createElement("span");
    fileName.textContent = `${file.name} · ${formatBytes(file.size)}`;
    fileCard.append(fileName);
    content.append(fileCard);
  });
  article.append(avatar, content);
  messageList.append(article);
  article.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function bindToggle(selector, message) {
  const button = document.querySelector(selector);
  button.addEventListener("click", () => {
    button.classList.toggle("is-muted");
    showToast(button.classList.contains("is-muted") ? message : message.replace("Mute", "Unmute").replace("Deafen", "Undeafen"));
  });
}
bindToggle(".mic-toggle", "Mute microphone");
bindToggle(".deafen-toggle", "Deafen audio");
bindToggle("#voice-mic", "Mute microphone");

document.querySelector("#join-voice").addEventListener("click", () => {
  voiceDock.hidden = false;
  callBanner.hidden = true;
  setChannel("fireside");
  showToast("You joined Fireside voice.");
});

document.querySelector("#leave-voice").addEventListener("click", () => {
  voiceDock.hidden = true;
  callBanner.hidden = false;
  stopScreenShare();
  showToast("You left the voice room.");
});

document.querySelector(".dismiss-banner").addEventListener("click", () => { callBanner.hidden = true; });

document.querySelector("#share-screen").addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    showToast("Screen sharing is not available in this browser.");
    return;
  }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    screenPreview.srcObject = screenStream;
    screenModal.hidden = false;
    screenStream.getVideoTracks()[0].addEventListener("ended", stopScreenShare);
    showToast("Screen sharing started.");
  } catch (error) {
    if (error?.name !== "NotAllowedError") showToast("We could not start screen sharing.");
  }
});

document.querySelector("#stop-share").addEventListener("click", stopScreenShare);
document.querySelector("#close-share").addEventListener("click", stopScreenShare);
function stopScreenShare() {
  if (screenStream) screenStream.getTracks().forEach((track) => track.stop());
  screenStream = null;
  screenPreview.srcObject = null;
  screenModal.hidden = true;
}

document.querySelector(".members-toggle").addEventListener("click", () => document.querySelector(".member-panel").classList.toggle("open"));
document.querySelector(".close-members").addEventListener("click", () => document.querySelector(".member-panel").classList.remove("open"));
document.querySelector(".mobile-menu").addEventListener("click", () => document.querySelector(".workspace-sidebar").classList.toggle("open"));

document.querySelector("#search-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.currentTarget.value.trim()) {
    showToast(`Searching Moonlit for “${event.currentTarget.value.trim()}”`);
    event.currentTarget.blur();
  }
});
window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("#search-input").focus();
  }
});
