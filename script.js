class StreamingBenchmark {
            constructor() {
                this.selectedKeys = [];
                this.customKeys = [];
                this.testMode = 'time';
                this.duration = 30;
                this.isRunning = false;
                this.startTime = 0;
                this.taps = [];
                this.keyStates = {};
                this.totalTaps = 0;
                this.currentBPM = 0;
                this.unstableRate = 0;
                this.bpmHistory = [];
                this.testResults = {};
                this.bpmGraphData = [];
                this.canvas = null;
                this.ctx = null;
                this.currentTheme = 'dark';
                
                this.initializeTheme();
                this.initializeEventListeners();
                this.updateStartButton();
            }

            initializeTheme() {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = prefersDark ? 'dark' : 'light';
                this.setTheme(theme);
                
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    this.setTheme(e.matches ? 'dark' : 'light');
                });
            }

            initializeEventListeners() {
                document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

                document.querySelectorAll('.key-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        if (e.target.id === 'addCustomKey') {
                            this.addCustomKey();
                        } else {
                            this.toggleKey(e.target.dataset.key);
                        }
                    });
                });

                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => this.setMode(e.target.dataset.mode));
                });

                document.getElementById('durationInput').addEventListener('input', (e) => {
                    this.duration = parseInt(e.target.value) || 30;
                });

                document.getElementById('startBtn').addEventListener('click', () => this.startTest());
                document.getElementById('stopBtn').addEventListener('click', () => this.stopTest());
                document.getElementById('restartBtn').addEventListener('click', () => this.restartTest());
                document.getElementById('backToSetupBtn').addEventListener('click', () => this.backToSetup());

                document.addEventListener('keydown', (e) => this.handleKeyDown(e));
                document.addEventListener('keyup', (e) => this.handleKeyUp(e));
                document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
                document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
                
                document.addEventListener('contextmenu', (e) => {
                    if (this.isRunning) e.preventDefault();
                });
            }

            addCustomKey() {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'key-input';
                input.placeholder = 'Key';
                input.maxLength = 1;
                
                const addBtn = document.createElement('button');
                addBtn.textContent = 'Add';
                addBtn.className = 'add-key-btn';
                
                const container = document.getElementById('customKeys');
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.margin = '5px 0';
                
                wrapper.appendChild(input);
                wrapper.appendChild(addBtn);
                container.insertBefore(wrapper, container.lastElementChild);
                
                addBtn.addEventListener('click', () => {
                    const key = input.value.toLowerCase();
                    if (key && !this.customKeys.includes(key)) {
                        this.customKeys.push(key);
                        
                        const keyBtn = document.createElement('button');
                        keyBtn.className = 'key-btn';
                        keyBtn.dataset.key = key;
                        keyBtn.textContent = key.toUpperCase();
                        keyBtn.addEventListener('click', () => this.toggleKey(key));
                        
                        wrapper.replaceWith(keyBtn);
                    }
                });
                
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') addBtn.click();
                });
                
                input.focus();
            }

            handleMouseDown(e) {
                if (!this.isRunning) return;
                
                let mouseKey = null;
                if (e.button === 0) mouseKey = 'mouse1';
                if (e.button === 2) mouseKey = 'mouse2';
                
                if (!mouseKey || !this.selectedKeys.includes(mouseKey)) return;
                
                e.preventDefault();
                
                if (this.keyStates[mouseKey]) return;
                
                this.keyStates[mouseKey] = true;
                
                const tapTime = Date.now() - this.startTime;
                this.taps.push(tapTime);
                this.totalTaps++;
                
                const keyDisplay = document.getElementById(`key-${mouseKey}`);
                if (keyDisplay) {
                    keyDisplay.classList.add('pressed');
                }
                
                this.calculateMetrics();
            }
            
            handleMouseUp(e) {
                if (!this.isRunning) return;
                
                let mouseKey = null;
                if (e.button === 0) mouseKey = 'mouse1';
                if (e.button === 2) mouseKey = 'mouse2';
                
                if (!mouseKey || !this.selectedKeys.includes(mouseKey)) return;
                
                this.keyStates[mouseKey] = false;
                
                const keyDisplay = document.getElementById(`key-${mouseKey}`);
                if (keyDisplay) {
                    keyDisplay.classList.remove('pressed');
                }
            }

            toggleKey(key) {
                const btn = document.querySelector(`[data-key="${key}"]`);
                
                if (this.selectedKeys.includes(key)) {
                    this.selectedKeys = this.selectedKeys.filter(k => k !== key);
                    btn.classList.remove('active');
                } else if (this.selectedKeys.length < 4) {
                    this.selectedKeys.push(key);
                    btn.classList.add('active');
                }

                this.updateStartButton();
            }

            setMode(mode) {
                this.testMode = mode;
                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === mode);
                });

                const label = document.getElementById('durationLabel');
                const modeLabel = document.getElementById('durationModeLabel');
                
                if (mode === 'time') {
                    label.textContent = 'seconds';
                    modeLabel.textContent = 'Duration:';
                } else {
                    label.textContent = 'taps';
                    modeLabel.textContent = 'Target:';
                }
            }

            updateStartButton() {
                const startBtn = document.getElementById('startBtn');
                startBtn.disabled = this.selectedKeys.length < 2;
            }

            startTest() {
                if (this.selectedKeys.length < 2) return;

                this.isRunning = true;
                this.startTime = Date.now();
                this.taps = [];
                this.totalTaps = 0;
                this.currentBPM = 0;
                this.unstableRate = 0;
                this.bpmHistory = [];
                this.bpmGraphData = [];
                this.keyStates = {};

                this.selectedKeys.forEach(key => {
                    this.keyStates[key] = false;
                });

                document.getElementById('setup').classList.add('hidden');
                document.getElementById('benchmark').classList.remove('hidden');

                this.createKeyDisplays();
                this.initializeGraph();
                this.updateLoop();
            }

            createKeyDisplays() {
                const container = document.getElementById('activeKeys');
                container.innerHTML = '';

                this.selectedKeys.forEach(key => {
                    const keyDisplay = document.createElement('div');
                    keyDisplay.className = 'key-display';
                    keyDisplay.textContent = key === 'mouse1' ? 'M1' : 
                                           key === 'mouse2' ? 'M2' : 
                                           key.toUpperCase();
                    keyDisplay.id = `key-${key}`;
                    container.appendChild(keyDisplay);
                });
            }

            handleKeyDown(e) {
                if (!this.isRunning) return;

                const key = e.key.toLowerCase();
                if (!this.selectedKeys.includes(key)) return;

                if (this.keyStates[key]) return;

                this.keyStates[key] = true;

                const tapTime = Date.now() - this.startTime;
                this.taps.push(tapTime);
                this.totalTaps++;

                const keyDisplay = document.getElementById(`key-${key}`);
                if (keyDisplay) {
                    keyDisplay.classList.add('pressed');
                }

                this.calculateMetrics();
            }

            handleKeyUp(e) {
                if (!this.isRunning) return;

                const key = e.key.toLowerCase();
                if (!this.selectedKeys.includes(key)) return;

                this.keyStates[key] = false;

                const keyDisplay = document.getElementById(`key-${key}`);
                if (keyDisplay) {
                    keyDisplay.classList.remove('pressed');
                }
            }

            calculateMetrics() {
                if (this.taps.length < 2) return;

                const recentTaps = this.taps.slice(-10);
                if (recentTaps.length >= 2) {
                    const timeDiff = recentTaps[recentTaps.length - 1] - recentTaps[0];
                    const tapCount = recentTaps.length - 1;
                    this.currentBPM = Math.round((tapCount / (timeDiff / 1000)) * 60 / 4);
                    this.bpmHistory.push(this.currentBPM);
                    
                    const elapsed = (Date.now() - this.startTime) / 1000;
                    this.bpmGraphData.push({ time: elapsed, bpm: this.currentBPM });
                    
                    if (this.bpmGraphData.length > 100) {
                        this.bpmGraphData.shift();
                    }
                }

                if (this.taps.length >= 10) {
                    const expectedInterval = 60000 / (this.currentBPM * 4);
                    
                    const hitErrors = [];
                    for (let i = 1; i < this.taps.length; i++) {
                        const actualInterval = this.taps[i] - this.taps[i - 1];
                        const hitError = actualInterval - expectedInterval;
                        hitErrors.push(hitError);
                    }

                    if (hitErrors.length > 0) {
                        const meanError = hitErrors.reduce((a, b) => a + b, 0) / hitErrors.length;
                        
                        const variance = hitErrors.reduce((sum, error) => {
                            return sum + Math.pow(error - meanError, 2);
                        }, 0) / hitErrors.length;
                        
                        const standardDeviation = Math.sqrt(variance);
                        this.unstableRate = Math.round(standardDeviation * 10 * 10) / 10;
                    }
                }
            }

            updateLoop() {
                if (!this.isRunning) return;

                const currentTime = Date.now();
                const elapsed = (currentTime - this.startTime) / 1000;
                const progress = this.testMode === 'time' 
                    ? elapsed / this.duration 
                    : this.totalTaps / this.duration;

                document.getElementById('bpmValue').textContent = this.currentBPM;
                document.getElementById('tapCount').textContent = this.totalTaps;
                document.getElementById('unstableRate').textContent = this.unstableRate;
                document.getElementById('timeElapsed').textContent = Math.round(elapsed * 10) / 10;
                document.getElementById('progressFill').style.width = `${Math.min(progress * 100, 100)}%`;

                this.updateGraph();

                const shouldStop = this.testMode === 'time' 
                    ? elapsed >= this.duration 
                    : this.totalTaps >= this.duration;

                if (shouldStop) {
                    this.stopTest();
                    return;
                }

                requestAnimationFrame(() => this.updateLoop());
            }

            stopTest() {
                this.isRunning = false;
                
                const finalTime = (Date.now() - this.startTime) / 1000;
                const avgBPM = this.bpmHistory.length > 0 ? 
                    Math.round(this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length) : 0;
                
                this.testResults = {
                    avgBPM: avgBPM,
                    totalTaps: this.totalTaps,
                    unstableRate: this.unstableRate,
                    duration: Math.round(finalTime * 10) / 10,
                    selectedKeys: [...this.selectedKeys]
                };

                this.showResults();
            }

            showResults() {
                document.getElementById('benchmark').classList.add('hidden');
                document.getElementById('results').classList.remove('hidden');
                
                document.getElementById('finalBPM').textContent = this.testResults.avgBPM;
                document.getElementById('finalTaps').textContent = this.testResults.totalTaps;
                document.getElementById('finalUnstable').textContent = this.testResults.unstableRate;
                document.getElementById('finalDuration').textContent = this.testResults.duration;
                
                this.drawFinalGraph();
            }

            drawFinalGraph() {
                const canvas = document.getElementById('finalBpmCanvas');
                const ctx = canvas.getContext('2d');
                
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * window.devicePixelRatio;
                canvas.height = rect.height * window.devicePixelRatio;
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
                
                const width = rect.width;
                const height = rect.height;

                if (this.bpmGraphData.length < 2) {
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' 
                        ? 'rgba(0, 0, 0, 0.5)' 
                        : 'rgba(255, 255, 255, 0.5)';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('No BPM data available', width / 2, height / 2);
                    return;
                }

                const bpmValues = this.bpmGraphData.map(d => d.bpm);
                const minBPM = Math.max(0, Math.min(...bpmValues) - 20);
                const maxBPM = Math.max(...bpmValues) + 20;
                const timeSpan = Math.max(...this.bpmGraphData.map(d => d.time)) - Math.min(...this.bpmGraphData.map(d => d.time));

                const graphPadding = 10;
                const graphWidth = width - (graphPadding * 2);
                const graphHeight = height - (graphPadding * 2);

                ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'light' 
                    ? 'rgba(0, 0, 0, 0.1)' 
                    : 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                
                for (let i = 0; i <= 8; i++) {
                    const y = graphPadding + (graphHeight * i) / 8;
                    ctx.beginPath();
                    ctx.moveTo(graphPadding, y);
                    ctx.lineTo(width - graphPadding, y);
                    ctx.stroke();
                }

                for (let i = 0; i <= 10; i++) {
                    const x = graphPadding + (graphWidth * i) / 10;
                    ctx.beginPath();
                    ctx.moveTo(x, graphPadding);
                    ctx.lineTo(x, height - graphPadding);
                    ctx.stroke();
                }

                ctx.strokeStyle = '#2196F3';
                ctx.lineWidth = 3;
                ctx.beginPath();

                this.bpmGraphData.forEach((point, index) => {
                    const x = graphPadding + (timeSpan > 0 ? ((point.time - this.bpmGraphData[0].time) / timeSpan) * graphWidth : 0);
                    const y = height - graphPadding - ((point.bpm - minBPM) / (maxBPM - minBPM)) * graphHeight;

                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                ctx.stroke();

                ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
                ctx.beginPath();
                
                this.bpmGraphData.forEach((point, index) => {
                    const x = graphPadding + (timeSpan > 0 ? ((point.time - this.bpmGraphData[0].time) / timeSpan) * graphWidth : 0);
                    const y = height - graphPadding - ((point.bpm - minBPM) / (maxBPM - minBPM)) * graphHeight;

                    if (index === 0) {
                        ctx.moveTo(x, height - graphPadding);
                        ctx.lineTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                
                ctx.lineTo(graphWidth + graphPadding, height - graphPadding);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' 
                    ? 'rgba(0, 0, 0, 0.8)' 
                    : 'rgba(255, 255, 255, 0.8)';
                ctx.font = '14px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(Math.round(maxBPM) + ' BPM', graphPadding + 5, graphPadding + 15);
                ctx.fillText(Math.round(minBPM) + ' BPM', graphPadding + 5, height - graphPadding - 5);
                
                const avgBPM = this.testResults.avgBPM;
                const avgY = height - graphPadding - ((avgBPM - minBPM) / (maxBPM - minBPM)) * graphHeight;
                
                ctx.strokeStyle = '#FF9800';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(graphPadding, avgY);
                ctx.lineTo(width - graphPadding, avgY);
                ctx.stroke();
                ctx.setLineDash([]);
                
                ctx.fillStyle = '#FF9800';
                ctx.textAlign = 'right';
                ctx.fillText('Avg: ' + avgBPM + ' BPM', width - graphPadding - 5, avgY - 5);
            }

            restartTest() {
                document.getElementById('results').classList.add('hidden');
                this.startTest();
            }

            backToSetup() {
                document.getElementById('results').classList.add('hidden');
                document.getElementById('setup').classList.remove('hidden');
            }

            setTheme(theme) {
                if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.getElementById('themeToggle').textContent = 'LIGHT';
                } else {
                    document.documentElement.removeAttribute('data-theme');
                    document.getElementById('themeToggle').textContent = 'DARK';
                }
                this.currentTheme = theme;
            }

            toggleTheme() {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                this.setTheme(newTheme);
            }

            initializeGraph() {
                this.canvas = document.getElementById('bpmCanvas');
                this.ctx = this.canvas.getContext('2d');
                
                const rect = this.canvas.getBoundingClientRect();
                this.canvas.width = rect.width * window.devicePixelRatio;
                this.canvas.height = rect.height * window.devicePixelRatio;
                this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                
                this.canvas.style.width = rect.width + 'px';
                this.canvas.style.height = rect.height + 'px';
            }

            updateGraph() {
                if (!this.ctx || this.bpmGraphData.length < 2) return;

                const canvas = this.canvas;
                const ctx = this.ctx;
                const width = canvas.style.width.replace('px', '');
                const height = canvas.style.height.replace('px', '');

                ctx.clearRect(0, 0, width, height);

                const bpmValues = this.bpmGraphData.map(d => d.bpm);
                const minBPM = Math.max(0, Math.min(...bpmValues) - 20);
                const maxBPM = Math.max(...bpmValues) + 20;
                const timeSpan = Math.max(...this.bpmGraphData.map(d => d.time)) - Math.min(...this.bpmGraphData.map(d => d.time));

                ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'light' 
                    ? 'rgba(0, 0, 0, 0.1)' 
                    : 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                
                for (let i = 0; i <= 5; i++) {
                    const y = (height * i) / 5;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }

                for (let i = 0; i <= 10; i++) {
                    const x = (width * i) / 10;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                }

                if (this.bpmGraphData.length > 1) {
                    ctx.strokeStyle = '#2196F3';
                    ctx.lineWidth = 3;
                    ctx.beginPath();

                    this.bpmGraphData.forEach((point, index) => {
                        const x = timeSpan > 0 ? ((point.time - this.bpmGraphData[0].time) / timeSpan) * width : 0;
                        const y = height - ((point.bpm - minBPM) / (maxBPM - minBPM)) * height;

                        if (index === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    });

                    ctx.stroke();

                    const lastPoint = this.bpmGraphData[this.bpmGraphData.length - 1];
                    const lastX = timeSpan > 0 ? ((lastPoint.time - this.bpmGraphData[0].time) / timeSpan) * width : 0;
                    const lastY = height - ((lastPoint.bpm - minBPM) / (maxBPM - minBPM)) * height;

                    ctx.fillStyle = '#FF9800';
                    ctx.beginPath();
                    ctx.arc(lastX, lastY, 5, 0, 2 * Math.PI);
                    ctx.fill();
                }

                ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' 
                    ? 'rgba(0, 0, 0, 0.8)' 
                    : 'rgba(255, 255, 255, 0.8)';
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`${maxBPM} BPM`, 5, 15);
                ctx.fillText(`${minBPM} BPM`, 5, height - 5);
                
                if (this.currentBPM > 0) {
                    ctx.textAlign = 'right';
                    ctx.fillText(`Current: ${this.currentBPM} BPM`, width - 5, 15);
                }
            }
        }
        const benchmark = new StreamingBenchmark();