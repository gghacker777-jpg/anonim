const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const attachButton = document.getElementById('attach-button');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const charCount = document.querySelector('.char-count');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeModalBtn = document.getElementById('close-modal');

let scrollToBottomBtn, currentFile = null;

const USE_LOCAL_STORAGE = true;

function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('coolichat_messages') || '[]');
    chatMessages.innerHTML = messages.length === 0 ?
        `<div class="welcome-message">
            <div class="welcome-icon">💬</div>
            <h3>Добро пожаловать в КулиЧат!</h3>
            <p>Здесь вы можете общаться анонимно</p>
        </div>` : '';
    messages.forEach(m => addMessage(m, false));
    setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 100);
}

function saveMessages(messages) {
    localStorage.setItem('coolichat_messages', JSON.stringify(messages));
}

function sendMessageToServer(messageData) {
    const messages = JSON.parse(localStorage.getItem('coolichat_messages') || '[]');
    const message = { id: Date.now(), ...messageData };
    messages.push(message);
    saveMessages(messages);
    return Promise.resolve(message);
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    return diff < 24 * 60 * 60 * 1000 ?
        date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) :
        date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message';

    if (message.file) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'message-file';

        if (message.file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = message.file.data;
            img.alt = message.file.name;
            img.onclick = () => openImageModal(message.file.data);
            fileDiv.appendChild(img);
        } else {
            const link = document.createElement('a');
            link.href = message.file.data;
            link.download = message.file.name;
            link.textContent = `📎 ${message.file.name}`;
            link.className = 'file-link';
            fileDiv.appendChild(link);
        }
        div.appendChild(fileDiv);
    }

    if (message.text) {
        const textDiv = document.createElement('div');
        textDiv.textContent = message.text;
        div.appendChild(textDiv);
    }

    const timeDiv = document.createElement('div');
    timeDiv.className = 'timestamp';
    timeDiv.textContent = formatTimestamp(message.timestamp);
    div.appendChild(timeDiv);

    return div;
}

function addMessage(message, scrollToBottom = true) {
    const welcome = document.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    chatMessages.appendChild(createMessageElement(message));
    if (scrollToBottom) scrollToBottomSmooth();
}

function createScrollButton() {
    scrollToBottomBtn = document.createElement('button');
    scrollToBottomBtn.className = 'scroll-to-bottom-btn';
    scrollToBottomBtn.innerHTML = '↓';
    scrollToBottomBtn.title = 'Прокрутить вниз';
    scrollToBottomBtn.onclick = scrollToBottomSmooth;
    document.body.appendChild(scrollToBottomBtn);
}

function scrollToBottomSmooth() {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

function checkScrollPosition() {
    if (!scrollToBottomBtn) return;
    const isAtBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 100;
    scrollToBottomBtn.classList.toggle('visible', !isAtBottom);
}

function updateCharCount() {
    const count = messageInput.value.length;
    charCount.textContent = `${count}/500`;
    charCount.style.color = count > 450 ? '#ff6b6b' : count > 400 ? '#ffa500' : '#999';
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || file.size > 10 * 1024 * 1024) {
        if (file) alert('Файл слишком большой! Максимальный размер: 10MB');
        return;
    }
    currentFile = file;
    showFilePreview(file);
}

function showFilePreview(file) {
    filePreview.innerHTML = '';
    filePreview.style.display = 'flex';

    const item = document.createElement('div');
    item.className = 'file-preview-item';

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.readAsDataURL(file);
        item.appendChild(img);
    } else {
        const icon = document.createElement('span');
        icon.textContent = file.type.startsWith('video/') ? '🎥' : file.type.startsWith('audio/') ? '🎵' : file.type.includes('pdf') ? '📄' : file.type.includes('doc') ? '📝' : '📎';
        item.appendChild(icon);
    }

    const name = document.createElement('span');
    name.textContent = file.name;
    item.appendChild(name);

    const remove = document.createElement('button');
    remove.className = 'file-remove';
    remove.textContent = '×';
    remove.onclick = removeFile;
    item.appendChild(remove);

    filePreview.appendChild(item);
}

function removeFile() {
    currentFile = null;
    filePreview.style.display = 'none';
    fileInput.value = '';
}

function openImageModal(imageSrc) {
    modalImage.src = imageSrc;
    imageModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    imageModal.style.display = 'none';
    document.body.style.overflow = '';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !currentFile) return;

    let messageData = { text: text || null, timestamp: new Date().toISOString() };

    if (currentFile) {
        const fileData = await fileToBase64(currentFile);
        messageData.file = {
            name: currentFile.name,
            type: currentFile.type,
            size: currentFile.size,
            data: fileData
        };
    }

    const message = await sendMessageToServer(messageData);
    addMessage(message);

    messageInput.value = '';
    removeFile();
    updateCharCount();
    messageInput.focus();
}

// Event listeners
sendButton.onclick = sendMessage;
attachButton.onclick = () => fileInput.click();
fileInput.onchange = handleFileSelect;
messageInput.onkeypress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
messageInput.oninput = updateCharCount;

closeModalBtn.onclick = closeImageModal;
imageModal.onclick = (e) => { if (e.target === imageModal) closeImageModal(); };
document.onkeydown = (e) => { if (e.key === 'Escape' && imageModal.style.display === 'flex') closeImageModal(); };

document.addEventListener('DOMContentLoaded', () => {
    createScrollButton();
    loadMessages();
    messageInput.focus();
    updateCharCount();
    chatMessages.onscroll = checkScrollPosition;
});