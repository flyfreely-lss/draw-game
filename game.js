// 画布设置
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// 设置画布大小
function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 60;
    canvas.height = Math.min(500, window.innerHeight - 300);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 绘画状态
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// 撤销功能 - 历史记录
let drawingHistory = [];
let currentStep = -1;

// 控制元素
const brushSizeInput = document.getElementById('brushSize');
const brushColorInput = document.getElementById('brushColor');
const brushSizeDisplay = document.getElementById('brushSizeDisplay');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const guessBtn = document.getElementById('guessBtn');
const statusText = document.getElementById('statusText');
const guessesList = document.getElementById('guessesList');

// 更新笔刷大小显示
brushSizeInput.addEventListener('input', (e) => {
    brushSizeDisplay.textContent = e.target.value + 'px';
});

// 保存当前画布状态到历史记录
function saveState() {
    // 移除当前步骤之后的所有历史记录
    drawingHistory = drawingHistory.slice(0, currentStep + 1);
    
    // 保存当前画布状态
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    drawingHistory.push(imageData);
    currentStep++;
    
    // 限制历史记录数量，避免内存占用过大
    if (drawingHistory.length > 50) {
        drawingHistory.shift();
        currentStep--;
    }
    
    updateUndoButton();
}

// 更新撤销按钮状态
function updateUndoButton() {
    undoBtn.disabled = currentStep <= 0;
    undoBtn.style.opacity = currentStep <= 0 ? '0.5' : '1';
    undoBtn.style.cursor = currentStep <= 0 ? 'not-allowed' : 'pointer';
}

// 初始化时保存空白画布状态
saveState();

// 获取鼠标/触摸位置
function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    }
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// 开始绘画
function startDrawing(e) {
    isDrawing = true;
    const pos = getPosition(e);
    lastX = pos.x;
    lastY = pos.y;
}

// 绘画中
function draw(e) {
    if (!isDrawing) return;
    
    e.preventDefault();
    const pos = getPosition(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = brushColorInput.value;
    ctx.lineWidth = brushSizeInput.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
}

// 结束绘画
function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        // 绘画结束后保存状态
        saveState();
    }
}

// 鼠标事件
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// 触摸事件
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

// 撤销功能
undoBtn.addEventListener('click', () => {
    if (currentStep > 0) {
        currentStep--;
        const imageData = drawingHistory[currentStep];
        ctx.putImageData(imageData, 0, 0);
        updateUndoButton();
    }
});

// 清空画布
clearBtn.addEventListener('click', () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 清空历史记录并保存空白状态
    drawingHistory = [];
    currentStep = -1;
    saveState();
    
    guessesList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🎨</div>
            <div class="empty-state-text">画布已清空</div>
            <div class="empty-state-hint">重新开始绘画吧！</div>
        </div>
    `;
    statusText.textContent = '等待你的绘画...';
});

// AI猜测功能 - 基于简单的图像分析
guessBtn.addEventListener('click', () => {
    statusText.textContent = '🤔 AI正在分析你的画作...';
    
    // 模拟AI思考延迟
    setTimeout(() => {
        const guesses = analyzeDrawing();
        displayGuesses(guesses);
        statusText.textContent = `✨ 分析完成！AI给出了 ${guesses.length} 个猜测`;
    }, 1000);
});

// 分析绘画内容
function analyzeDrawing() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 统计特征
    let totalPixels = 0;
    let coloredPixels = 0;
    let colors = new Set();
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // 如果不是白色背景
        if (!(r > 250 && g > 250 && b > 250)) {
            coloredPixels++;
            const pixelIndex = i / 4;
            const x = pixelIndex % canvas.width;
            const y = Math.floor(pixelIndex / canvas.width);
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            const colorKey = `${Math.floor(r/50)},${Math.floor(g/50)},${Math.floor(b/50)}`;
            colors.add(colorKey);
        }
        totalPixels++;
    }
    
    // 计算特征
    const coverage = coloredPixels / totalPixels;
    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / height;
    const colorCount = colors.size;
    
    // 基于特征生成猜测
    const guesses = [];
    
    if (coloredPixels < 100) {
        return [{
            name: '空白画布',
            confidence: 95,
            reason: '画布上几乎没有内容'
        }];
    }
    
    // 圆形物体判断
    if (aspectRatio > 0.8 && aspectRatio < 1.2 && coverage < 0.3) {
        guesses.push(
            { name: '太阳', confidence: 75 + Math.random() * 15 },
            { name: '笑脸', confidence: 65 + Math.random() * 15 },
            { name: '球', confidence: 60 + Math.random() * 15 },
            { name: '圆圈', confidence: 55 + Math.random() * 15 }
        );
    }
    
    // 纵向长条
    if (aspectRatio < 0.5 && coverage < 0.2) {
        guesses.push(
            { name: '树', confidence: 70 + Math.random() * 15 },
            { name: '人', confidence: 65 + Math.random() * 15 },
            { name: '火箭', confidence: 60 + Math.random() * 15 },
            { name: '铅笔', confidence: 55 + Math.random() * 15 }
        );
    }
    
    // 横向长条
    if (aspectRatio > 2 && coverage < 0.2) {
        guesses.push(
            { name: '汽车', confidence: 70 + Math.random() * 15 },
            { name: '飞机', confidence: 65 + Math.random() * 15 },
            { name: '船', confidence: 60 + Math.random() * 15 },
            { name: '火车', confidence: 55 + Math.random() * 15 }
        );
    }
    
    // 复杂图形
    if (coverage > 0.3) {
        guesses.push(
            { name: '房子', confidence: 70 + Math.random() * 15 },
            { name: '城堡', confidence: 60 + Math.random() * 15 },
            { name: '风景画', confidence: 55 + Math.random() * 15 }
        );
    }
    
    // 多色彩
    if (colorCount > 5) {
        guesses.push(
            { name: '彩虹', confidence: 65 + Math.random() * 15 },
            { name: '花朵', confidence: 60 + Math.random() * 15 },
            { name: '蝴蝶', confidence: 55 + Math.random() * 15 }
        );
    }
    
    // 如果没有匹配，给出通用猜测
    if (guesses.length === 0) {
        guesses.push(
            { name: '抽象艺术', confidence: 60 + Math.random() * 20 },
            { name: '涂鸦', confidence: 55 + Math.random() * 20 },
            { name: '图案', confidence: 50 + Math.random() * 20 },
            { name: '符号', confidence: 45 + Math.random() * 20 }
        );
    }
    
    // 添加一些随机的常见物品猜测
    const commonItems = ['猫', '狗', '鸟', '鱼', '蛋糕', '爱心', '星星', '月亮', '云朵', '山'];
    const randomItems = commonItems
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(item => ({
            name: item,
            confidence: 30 + Math.random() * 25
        }));
    
    guesses.push(...randomItems);
    
    // 按置信度排序并限制数量
    return guesses
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8)
        .map(g => ({
            ...g,
            confidence: Math.round(g.confidence)
        }));
}

// 显示猜测结果
function displayGuesses(guesses) {
    guessesList.innerHTML = '';
    
    guesses.forEach((guess, index) => {
        setTimeout(() => {
            const guessItem = document.createElement('div');
            guessItem.className = 'guess-item';
            
            let confidenceClass = 'low';
            if (guess.confidence >= 70) confidenceClass = 'high';
            else if (guess.confidence >= 50) confidenceClass = 'medium';
            
            guessItem.innerHTML = `
                <div class="guess-text">${index + 1}. ${guess.name}</div>
                <div class="confidence ${confidenceClass}">${guess.confidence}%</div>
            `;
            
            guessesList.appendChild(guessItem);
        }, index * 100);
    });
}
