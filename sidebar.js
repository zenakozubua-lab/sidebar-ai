const serviceButtons = [...document.querySelectorAll('.service-button')];
const frame = document.getElementById('service-frame');
const fallback = document.getElementById('iframe-fallback');
const openInTabButton = document.getElementById('open-in-tab');
const currentServiceLabel = document.getElementById('current-service');

let currentUrl = serviceButtons[0]?.dataset.url ?? 'https://chatgpt.com';

function getServiceName(button) {
  return button.querySelector('strong')?.textContent?.trim() ?? 'AI Service';
}

function setActiveButton(activeButton) {
  serviceButtons.forEach((button) => {
    button.classList.toggle('active', button === activeButton);
  });
}

function showFallback(show) {
  fallback.classList.toggle('hidden', !show);
  frame.classList.toggle('hidden', show);
}

function loadService(button) {
  const url = button.dataset.url;
  if (!url) {
    return;
  }

  currentUrl = url;
  currentServiceLabel.textContent = getServiceName(button);
  setActiveButton(button);
  showFallback(false);

  frame.src = 'about:blank';
  requestAnimationFrame(() => {
    frame.src = url;
  });

  chrome.storage.local.set({ lastServiceUrl: url });
}

serviceButtons.forEach((button) => {
  button.addEventListener('click', () => {
    loadService(button);
  });
});

frame.addEventListener('load', () => {
  try {
    // Попытка доступа к документу iframe помогает определить часть сценариев блокировки.
    // Для кросс-доменных сайтов это нормально вызовет исключение, поэтому только мягкая проверка.
    const isBlank = frame.contentWindow?.location.href === 'about:blank';
    showFallback(Boolean(isBlank));
  } catch {
    // Кросс-доменный iframe: считаем, что загрузка успешна.
    showFallback(false);
  }
});

openInTabButton.addEventListener('click', () => {
  chrome.tabs.create({ url: currentUrl });
});

chrome.storage.local.get(['lastServiceUrl'], ({ lastServiceUrl }) => {
  if (!lastServiceUrl) {
    return;
  }

  const matchingButton = serviceButtons.find((button) => button.dataset.url === lastServiceUrl);
  if (matchingButton) {
    loadService(matchingButton);
  }
});
