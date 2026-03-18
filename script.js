// 全局变量
let currentPlayer = 1;
let playerCount = 0;
let roleConfig = {};
const speeches = []; // 存储所有玩家发言
let recognition;
let isRecording = false;

// DOM 元素
const playerCountEl = document.getElementById('playerCount');
const startGameBtn = document.getElementById('startGame');
const gamePanelEl = document.getElementById('gamePanel');
const roleConfigEl = document.getElementById('roleConfig');
const goodRolesEl = document.getElementById('goodRoles');
const evilRolesEl = document.getElementById('evilRoles');
const currentPlayerEl = document.getElementById('currentPlayer');
const toggleMicBtn = document.getElementById('toggleMic');
const nextPlayerBtn = document.getElementById('nextPlayer');
const analyzeBtn = document.getElementById('analyzeBtn');
const transcriptEl = document.getElementById('transcript');
const speechHistoryEl = document.getElementById('speechHistory');
const resultTextEl = document.getElementById('resultText');
const analysisResultEl = document.getElementById('analysisResult');
const speakBtn = document.getElementById('speakBtn');

// 角色配置表
const ROLE_CONFIGS = {
    5: {
        good: ["梅林", "派西维尔", "忠臣"],
        evil: ["莫甘娜", "刺客"]
    },
    6: {
        good: ["梅林", "派西维尔", "忠臣", "忠臣"],
        evil: ["莫甘娜", "刺客"]
    },
    7: {
        good: ["梅林", "派西维尔", "忠臣", "忠臣"],
        evil: ["莫甘娜", "刺客", "奥伯伦"]
    },
    8: {
        good: ["梅林", "派西维尔", "忠臣", "忠臣", "忠臣"],
        evil: ["莫甘娜", "刺客", "莫德雷德"]
    },
    9: {
        good: ["梅林", "派西维尔", "忠臣", "忠臣", "忠臣", "忠臣"],
        evil: ["莫德雷德", "莫甘娜", "刺客"]
    },
    10: {
        good: ["梅林", "派西维尔", "忠臣", "忠臣", "忠臣", "忠臣"],
        evil: ["莫德雷德", "莫甘娜", "刺客", "奥伯伦"]
    }
};

// 初始化语音识别
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("您的浏览器不支持语音识别，请使用 Chrome 或 Edge。");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        transcriptEl.textContent = transcript;
    };

    recognition.onend = () => {
        if (isRecording) {
            recognition.start(); // 继续录音
        }
    };
}

// 开始游戏
startGameBtn.addEventListener('click', () => {
    playerCount = parseInt(playerCountEl.value);
    roleConfig = ROLE_CONFIGS[playerCount];

    // 显示角色配置
    goodRolesEl.innerHTML = `<strong>好人阵营:</strong> ${roleConfig.good.join("、")}`;
    evilRolesEl.innerHTML = `<strong>坏人阵营:</strong> ${roleConfig.evil.join("、")}`;
    goodRolesEl.className = "role-list good";
    evilRolesEl.className = "role-list evil";

    // 切换到游戏面板
    document.querySelector('.setup-box').classList.add('hidden');
    roleConfigEl.classList.remove('hidden');
    gamePanelEl.classList.remove('hidden');
    currentPlayerEl.textContent = `当前玩家：玩家1`;
});

// 开始/停止录音
toggleMicBtn.addEventListener('click', () => {
    if (!isRecording) {
        transcriptEl.textContent = '';
        recognition.start();
        toggleMicBtn.textContent = '⏹️ 停止录音';
        isRecording = true;
    } else {
        recognition.stop();
        toggleMicBtn.textContent = '🎤 开始录音';
        isRecording = false;
        
        // 保存当前玩家发言
        if (transcriptEl.textContent.trim()) {
            speeches.push({
                player: currentPlayer,
                text: transcriptEl.textContent
            });
            updateSpeechHistory();
            analyzeBtn.disabled = speeches.length < playerCount;
        }
    }
});

// 切换玩家
nextPlayerBtn.addEventListener('click', () => {
    if (currentPlayer < playerCount) {
        currentPlayer++;
    } else {
        currentPlayer = 1; // 循环到第一个玩家
    }
    currentPlayerEl.textContent = `当前玩家：玩家${currentPlayer}`;
    transcriptEl.textContent = '';
});

// 更新发言历史
function updateSpeechHistory() {
    speechHistoryEl.innerHTML = speeches.map(speech => 
        `<li><strong>玩家${speech.player}:</strong> ${speech.text}</li>`
    ).join('');
}

// 调用 DeepSeek API 分析
analyzeBtn.addEventListener('click', async () => {
    if (speeches.length === 0) return;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "分析中...";

    const messages = [
        {
            role: "system",
            content: `你是一个阿瓦隆桌游 AI 助手。当前是${playerCount}人局，角色配置：
好人: ${roleConfig.good.join("、")}
坏人: ${roleConfig.evil.join("、")}
请根据以下玩家发言，分析可能的角色分布，重点提示梅林/刺客的隐藏策略，并给出任务组队建议。用中文回答，语气自然。`
        },
        ...speeches.map(speech => ({
            role: "user",
            content: `玩家${speech.player}说: ${speech.text}`
        }))
    ];

    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${sk-LwUUDIQHERP_U3g5cOBLVg}`, // 替换为你的 API Key
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages
            })
        });

        const data = await response.json();
        const analysis = data.choices[0].message.content;
        
        resultTextEl.innerHTML = analysis.replace(/\n/g, "<br>");
        analysisResultEl.classList.remove('hidden');
    } catch (error) {
        resultTextEl.textContent = `分析失败: ${error.message}`;
    } finally {
        analyzeBtn.textContent = "🤖 开始分析本轮局势";
    }
});

// 语音朗读
speakBtn.addEventListener('click', () => {
    const utterance = new SpeechSynthesisUtterance(resultTextEl.textContent);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
});

// 初始化
window.onload = () => {
    initSpeechRecognition();
};