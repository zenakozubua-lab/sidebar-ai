const tabs = [...document.querySelectorAll('.tab-button')];
const panels = {
  assistant: document.getElementById('assistant-tab'),
  launcher: document.getElementById('launcher-tab')
};

const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const saveKeyButton = document.getElementById('save-key');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatLog = document.getElementById('chat-log');
const sendButton = document.getElementById('send-btn');

const handoffInput = document.getElementById('handoff-input');
const copyPromptButton = document.getElementById('copy-prompt');
const launchStatus = document.getElementById('launch-status');
const serviceButtons = [...document.querySelectorAll('.service-button')];

const SERVICE_URLS = {
  chatgpt: 'https://chatgpt.com/',
  copilot: 'https://copilot.microsoft.com/',
  claude: 'https://claude.ai/new',
  gemini: 'https://gemini.google.com/app',
  perplexity: 'https://www.perplexity.ai/'
};

let messages = [];

function switchTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  Object.entries(panels).forEach(([name, panel]) => {
    panel.classList.toggle('hidden', name !== tabName);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function appendMessage(role, content) {
  const item = document.createElement('article');
  item.className = `message ${role}`;

  const title = document.createElement('h3');
  title.textContent = role === 'user' ? 'Вы' : 'AI';

  const text = document.createElement('p');
  text.textContent = content;

  item.append(title, text);
  chatLog.appendChild(item);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function setStatus(text, type = 'neutral') {
  launchStatus.textContent = text;
  launchStatus.dataset.type = type;
}

async function copyPromptToClipboard() {
  const prompt = handoffInput.value.trim();
  if (!prompt) {
    setStatus('Введите запрос перед копированием.', 'warning');
    return '';
  }

  await navigator.clipboard.writeText(prompt);
  setStatus('Запрос скопирован. Откройте сервис и вставьте Ctrl/Cmd + V.', 'success');
  return prompt;
}

copyPromptButton.addEventListener('click', async () => {
  try {
    await copyPromptToClipboard();
  } catch (error) {
    setStatus(`Не удалось скопировать: ${error.message}`, 'error');
  }
});

serviceButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const service = button.dataset.service;
    const targetUrl = SERVICE_URLS[service];
    if (!targetUrl) {
      return;
    }

    try {
      await copyPromptToClipboard();
    } catch {
      // Даже если копирование не удалось — всё равно откроем сервис.
    }

    chrome.tabs.create({ url: targetUrl });
    setStatus('Сервис открыт в новой вкладке.', 'success');
  });
});

saveKeyButton.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  chrome.storage.local.set({ openRouterApiKey: apiKey, openRouterModel: model }, () => {
    setStatus(apiKey ? 'API key сохранён.' : 'API key очищен.', 'success');
  });
});

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const prompt = chatInput.value.trim();
  if (!prompt) {
    return;
  }

  const { openRouterApiKey, openRouterModel } = await chrome.storage.local.get([
    'openRouterApiKey',
    'openRouterModel'
  ]);

  if (!openRouterApiKey) {
    appendMessage('assistant', 'Добавьте OpenRouter API key, чтобы использовать встроенный чат.');
    return;
  }

  appendMessage('user', prompt);
  messages.push({ role: 'user', content: prompt });
  chatInput.value = '';
  sendButton.disabled = true;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: openRouterModel || 'openai/gpt-4o-mini',
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || 'Пустой ответ от модели.';

    messages.push({ role: 'assistant', content: answer });
    appendMessage('assistant', answer);
  } catch (error) {
    appendMessage('assistant', `Ошибка запроса: ${error.message}`);
  } finally {
    sendButton.disabled = false;
  }
});

chrome.storage.local.get(['openRouterApiKey', 'openRouterModel'], (result) => {
  if (result.openRouterApiKey) {
    apiKeyInput.value = result.openRouterApiKey;
  }
  if (result.openRouterModel) {
    modelSelect.value = result.openRouterModel;
  }
});

appendMessage(
  'assistant',
  'Привет! Это альтернативный режим без iframe. Добавьте OpenRouter API key и задайте вопрос.'
);
