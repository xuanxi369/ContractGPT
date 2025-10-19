// === 全局变量绑定 ===
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drag-drop-zone");
const contractText = document.getElementById("contract-text");
const riskCards = document.getElementById("risk-cards");
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat");
const chatLog = document.getElementById("chat-log");
const statusArea = document.getElementById("status-area");
const togglePreviewBtn = document.getElementById("toggle-preview");
const toggleChatLogBtn = document.getElementById("toggle-chat-log");

// === Worker API 地址 ===
const WORKER_API_URL = "https://contractgpt-worker.millychck-033.workers.dev/"; // ← 修改为你的Worker URL

let fullContractText = "";
let aiAnalysisData = null; // 保存AI返回的数据
let chatHistory = [];

// === DOM 加载后执行 ===
document.addEventListener("DOMContentLoaded", () => {

  // === 文件上传处理 ===
  function handleFile(file) {
    const fileType = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    statusArea.textContent = "⏳ 正在解析文件，请稍候...";

    if (fileType === "txt") {
      reader.onload = e => processText(e.target.result, "TXT");
      reader.readAsText(file);
    } else if (fileType === "pdf") {
      reader.onload = async e => {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(" ") + "\n";
        }
        processText(text, "PDF");
      };
      reader.readAsArrayBuffer(file);
    } else if (fileType === "docx") {
      reader.onload = e => {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
          .then(result => processText(result.value, "DOCX"))
          .catch(err => statusArea.textContent = "❌ 解析DOCX失败：" + err.message);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("❌ 不支持的文件类型，请上传 .txt、.pdf 或 .docx 文件。");
      statusArea.textContent = "❌ 上传失败：不支持的文件类型";
    }
  }

  // === 文件内容处理 ===
  async function processText(text, type) {
    fullContractText = text;
    contractText.textContent = text.slice(0, 5000) + (text.length > 5000 ? "..." : "");
    statusArea.textContent = `✅ 已上传${type}文件，正在进行AI分析...`;

    await analyzeWithAI(text);
  }

  // === 调用 Worker 进行 AI 分析 ===
  async function analyzeWithAI(contractText) {
    try {
      const response = await fetch(WORKER_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contractText }),
      });

      if (!response.ok) throw new Error(`Worker请求失败: ${response.status}`);

      const data = await response.json();
      aiAnalysisData = data;
      showAIAnalysis(data);
      statusArea.textContent = "✅ AI分析完成";
    } catch (error) {
      console.error("AI分析错误:", error);
      statusArea.textContent = "❌ AI分析失败：" + error.message;
    }
  }

  // === 展示AI分析结果 ===
  function showAIAnalysis(data) {
    riskCards.innerHTML = "";

    if (!data || !data.risks || data.risks.length === 0) {
      riskCards.innerHTML = "<p>✅ 未检测到明显风险。</p>";
      return;
    }

    data.risks.forEach(risk => {
      const card = document.createElement("div");
      card.className = "risk-card";
      card.innerHTML = `
        <h4>⚠️ ${risk.title}</h4>
        <p>${risk.message}</p>
      `;
      riskCards.appendChild(card);
    });
  }

  // === 聊天功能 ===
  sendChatBtn.addEventListener("click", async () => {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;
    chatInput.value = "";
    appendChat("user", userMessage);

    try {
      const response = await fetch(`${WORKER_API_URL.replace("/analyze", "/chat")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: fullContractText,
          history: chatHistory,
        }),
      });
      const data = await response.json();
      appendChat("ai", data.reply);
      chatHistory.push({ role: "user", content: userMessage });
      chatHistory.push({ role: "assistant", content: data.reply });
    } catch (err) {
      appendChat("ai", "⚠️ AI连接失败，请稍后重试。");
    }
  });

  // === 聊天显示 ===
  function appendChat(role, text) {
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // === 拖拽上传 ===
  dropZone.addEventListener("dragover", e => e.preventDefault());
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", e => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
});
