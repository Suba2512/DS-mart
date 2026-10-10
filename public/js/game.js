// DS Mart - Supermarket Game Canvas & Cute Character Engine
// Implements 60fps canvas rendering, cute chibi boy character with trolley,
// collision physics, shelf interactions, customer queue, and DS integration.

(function() {
    'use strict';

    // Game State
    const gameState = {
        currentScreen: 'landing', // 'landing', 'game', 'instructions'
        lives: 3,
        maxLives: 3,
        score: 0,
        level: 1,
        targetProducts: 8,
        isPaused: false,
        quizActive: false,
        billingActive: false,
        gameWon: false,
        gameOver: false,
        quizzesAnswered: 0,
        pendingShelf: null
    };

    // Canvas & Context
    let canvas, ctx;
    let minimapCanvas, minimapCtx;
    let animationFrameId;

    // Responsive Canvas & Viewport Scaling
    let gameScale = 1;
    let gameOffsetX = 0;
    let gameOffsetY = 0;
    let viewWidth = 960;
    let viewHeight = 640;

    // Fullscreen Toggle
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen request failed:', err));
        } else {
            document.exitFullscreen().catch(err => console.log('Exit fullscreen failed:', err));
        }
    }

    // Player Object: Cute Chibi Guy with Shopping Cart
    const player = {
        x: 455,
        y: 575,
        width: 38,
        height: 52,
        speed: 3.8,
        vx: 0,
        vy: 0,
        direction: 'up', // 'up', 'down', 'left', 'right'
        isMoving: false,
        walkCycle: 0,
        bobOffset: 0,
        celebrating: 0,
        shocked: 0,
        particles: [],
        cart: {
            offsetX: 26,
            offsetY: 0,
            width: 34,
            height: 38,
            wheelRotation: 0
        }
    };

    // Keyboard state
    const keys = {
        ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
        w: false, s: false, a: false, d: false,
        W: false, S: false, A: false, D: false,
        KeyE: false, Space: false
    };

    // Shelves configuration matching Screenshot 1 exactly
    const shelves = [
        // Row 1
        { id: 'milk', name: 'Milk', category: 'Dairy', price: 3.50, x: 125, y: 140, w: 155, h: 78, color: '#3a86ff', collected: false },
        { id: 'rice', name: 'Rice', category: 'Grains', price: 6.20, x: 370, y: 140, w: 155, h: 78, color: '#ffb703', collected: false },
        { id: 'fruits', name: 'Fruits', category: 'Produce', price: 4.80, x: 615, y: 140, w: 155, h: 78, color: '#e63946', collected: false },
        
        // Row 2
        { id: 'bread', name: 'Bread', category: 'Bakery', price: 2.75, x: 125, y: 290, w: 155, h: 78, color: '#fb8500', collected: false },
        { id: 'eggs', name: 'Eggs', category: 'Poultry', price: 3.90, x: 370, y: 290, w: 155, h: 78, color: '#ffd166', collected: false },
        { id: 'juice', name: 'Juice', category: 'Beverages', price: 4.10, x: 615, y: 290, w: 155, h: 78, color: '#06d6a0', collected: false },
        
        // Row 3
        { id: 'biscuits', name: 'Biscuits', category: 'Snacks', price: 2.30, x: 125, y: 440, w: 155, h: 78, color: '#b5838d', collected: false },
        { id: 'soap', name: 'Soap', category: 'Hygiene', price: 1.90, x: 370, y: 440, w: 155, h: 78, color: '#4cc9f0', collected: false }
    ];

    // Billing Counter Configuration matching Screenshot 1 position
    const billingCounter = {
        name: 'Billing Counter',
        x: 635,
        y: 450,
        w: 245,
        h: 56,
        cashier: { x: 790, y: 418, name: 'Amy (Cashier)' },
        customersQueue: [
            { id: 1, name: 'Rohan', color: '#457b9d', x: 720, y: 495 },
            { id: 2, name: 'Priya', color: '#e76f51', x: 745, y: 520 },
            { id: 3, name: 'Alex', color: '#2a9d8f', x: 745, y: 555 },
            { id: 4, name: 'Meera', color: '#e9c46a', x: 745, y: 590 }
        ]
    };

    // Static decorative NPCs & props matching Screenshot 1
    const staticObjects = [
        { type: 'cabinet', x: 8, y: 170, w: 40, h: 100 },
        { type: 'cabinet', x: 8, y: 420, w: 32, h: 90 },
        { type: 'npc_pink', x: 68, y: 250, name: 'Pink Chibi' },
        { type: 'npc_green', x: 830, y: 250, name: 'Green Chibi' },
        { type: 'plant', x: 28, y: 660, w: 35, h: 45 }
    ];

    // DS Quiz Bank
    const quizQuestions = [
        {
            category: 'Stack',
            question: 'In DS Mart, every item in your trolley follows the STACK structure. Which principle does a Stack follow?',
            options: ['FIFO (First In First Out)', 'LIFO (Last In First Out)', 'Random Access', 'Priority Ordering'],
            correctIndex: 1,
            explanation: 'Stacks operate strictly on LIFO (Last In, First Out). The most recently pushed product is on top and popped first!'
        },
        {
            category: 'Stack',
            question: 'What is the time complexity of the stack_push() operation implemented in our C backend?',
            options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'],
            correctIndex: 2,
            explanation: 'Pushing to the top of an array/pointer stack takes O(1) constant time since we directly access stack[top++].'
        },
        {
            category: 'Linked List',
            question: 'Why is a Linked List used alongside the Trolley Stack for collected products?',
            options: [
                'To allow sequential traversal and pointer-based dynamic node insertion',
                'Because it is faster than an array for binary search',
                'Because it uses less memory than an empty stack',
                'It prevents duplicate items automatically'
            ],
            correctIndex: 0,
            explanation: 'Linked Lists excel at dynamic insertions and pointer-based sequential traversals without fixed contiguous memory.'
        },
        {
            category: 'Linked List',
            question: 'In C, what does each node in our product Linked List contain?',
            options: [
                'Only the product name string',
                'Product data and a pointer to the next struct Node',
                'An array index and a hash value',
                'The front and rear pointers of the queue'
            ],
            correctIndex: 1,
            explanation: 'A singly linked list node contains the payload (Product data) and a next pointer (struct Node* next).'
        },
        {
            category: 'Queue',
            question: 'At the Billing Counter, customers wait in a Queue. Which principle governs customer service here?',
            options: ['LIFO (Last In First Out)', 'FIFO (First In First Out)', 'Shortest Job First', 'Heaviest Basket First'],
            correctIndex: 1,
            explanation: 'Queues strictly follow FIFO (First In, First Out). The customer who arrived first (Front) is billed and dequeued first!'
        },
        {
            category: 'Queue',
            question: 'When a new customer joins the billing line, which Queue operation is called and where are they added?',
            options: [
                'dequeue() at the front',
                'push() at the top',
                'enqueue() at the rear',
                'insert() at the head'
            ],
            correctIndex: 2,
            explanation: 'In a queue, enqueue() inserts elements at the rear (tail), while dequeue() removes from the front (head).'
        },
        {
            category: 'Data Structures',
            question: 'What happens when you call pop() on an empty Stack or dequeue() on an empty Queue?',
            options: ['Stack/Queue Overflow', 'Underflow condition', 'Garbage collection trigger', 'Automatic resize'],
            correctIndex: 1,
            explanation: 'Attempting to extract an element from an empty data structure triggers an Underflow error!'
        }
    ];

    // Initialize the Game
    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        minimapCanvas = document.getElementById('minimapCanvas');
        minimapCtx = minimapCanvas.getContext('2d');

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        setupEventListeners();
        resetGame();

        // Start render loop
        requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        viewWidth = rect.width || 960;
        viewHeight = rect.height || 640;

        canvas.width = viewWidth * dpr;
        canvas.height = viewHeight * dpr;
        
        // Uniform scale preserving 960x640 logical design
        const scaleX = viewWidth / 960;
        const scaleY = viewHeight / 640;
        gameScale = Math.min(scaleX, scaleY);
        gameOffsetX = (viewWidth - 960 * gameScale) / 2;
        gameOffsetY = (viewHeight - 640 * gameScale) / 2;

        minimapCanvas.width = 120 * dpr;
        minimapCanvas.height = 80 * dpr;
        minimapCtx.scale(dpr, dpr);
    }

    function resetGame() {
        gameState.lives = 3;
        gameState.score = 0;
        gameState.level = 1;
        gameState.quizzesAnswered = 0;
        gameState.billingActive = false;
        gameState.gameWon = false;
        gameState.gameOver = false;
        gameState.pendingShelf = null;

        shelves.forEach(s => s.collected = false);

        player.x = 455;
        player.y = 575;
        player.direction = 'up';
        player.vx = 0;
        player.vy = 0;
        player.particles = [];

        if (window.dsApi) {
            window.dsApi.reset().then(() => updateHUD());
        }

        updateHUD();
    }

    function setupEventListeners() {
        // Keyboard inputs
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            }
            if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
            if (keys.hasOwnProperty(e.code)) keys[e.code] = true;

            if ((e.key === 'e' || e.key === 'E' || e.code === 'Space') && !gameState.quizActive) {
                handleInteract();
            }

            if ((e.key === 'p' || e.key === 'P') && !gameState.quizActive) {
                handlePopCart();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
            if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
        });

        // Window maximize button triggers fullscreen
        const btnFullscreen = document.getElementById('btnToggleFullscreen');
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                toggleFullscreen();
            });
        }

        // Landing page buttons
        document.getElementById('btnPlayGame').addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.playClick();
            switchScreen('game');
        });

        document.getElementById('btnInstructions').addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.playClick();
            openModal('instructionsModal');
        });

        document.getElementById('btnExitLanding').addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.playClick();
            alert('Thank you for exploring DS Mart! Have a great day!');
        });

        // Supermarket exit button
        document.getElementById('btnSupermarketExit').addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.playClick();
            if (confirm('Return to Landing Page? Your current supermarket progress will reset.')) {
                switchScreen('landing');
            }
        });

        // Pop Cart Button
        const btnPop = document.getElementById('btnPopCart');
        if (btnPop) {
            btnPop.addEventListener('click', handlePopCart);
        }

        // Inspect Cart Button
        const btnInspect = document.getElementById('btnInspectCart');
        if (btnInspect) {
            btnInspect.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                openLinkedListModal();
            });
        }

        // C Engine Inspector Toggle
        const btnToggleCEngine = document.getElementById('btnToggleCEngine');
        if (btnToggleCEngine) {
            btnToggleCEngine.addEventListener('click', () => {
                const drawer = document.getElementById('cEngineDrawer');
                drawer.classList.toggle('open');
                if (window.soundEngine) window.soundEngine.playClick();
            });
        }

        // Close modal handlers
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Canvas click/touch for click-to-move
        canvas.addEventListener('click', (e) => {
            if (gameState.currentScreen !== 'game' || gameState.quizActive) return;
            const rect = canvas.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) - gameOffsetX) / gameScale;
            const clickY = ((e.clientY - rect.top) - gameOffsetY) / gameScale;

            // Check if clicking near shelf
            const nearby = shelves.find(s => Math.hypot(s.x + s.w/2 - clickX, s.y + s.h/2 - clickY) < 60);
            if (nearby) {
                // Move player closer to shelf
                player.x = nearby.x + nearby.w / 2;
                player.y = nearby.y + nearby.h + 30;
                handleInteract();
                return;
            }

            // Simple direct waypoint
            player.x = Math.max(50, Math.min(910, clickX));
            player.y = Math.max(120, Math.min(600, clickY));
            createSparkles(player.x, player.y, '#38bdf8');
        });

        // Virtual D-pad click & hold handlers
        const bindDpad = (id, keyName) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const start = (e) => { e.preventDefault(); keys[keyName] = true; };
            const stop = (e) => { e.preventDefault(); keys[keyName] = false; };
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop);
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', stop, { passive: false });
        };

        bindDpad('dpadUp', 'ArrowUp');
        bindDpad('dpadDown', 'ArrowDown');
        bindDpad('dpadLeft', 'ArrowLeft');
        bindDpad('dpadRight', 'ArrowRight');

        const btnDpadAction = document.getElementById('dpadAction');
        if (btnDpadAction) {
            btnDpadAction.addEventListener('click', (e) => {
                e.preventDefault();
                handleInteract();
            });
        }
    }

    function switchScreen(screen) {
        gameState.currentScreen = screen;
        const landingView = document.getElementById('landingView');
        const supermarketView = document.getElementById('supermarketView');

        if (screen === 'game') {
            landingView.style.display = 'none';
            supermarketView.style.display = 'block';
            resetGame();
        } else {
            landingView.style.display = 'flex';
            supermarketView.style.display = 'none';
        }
    }

    // Input & Physics
    function updatePlayer() {
        if (gameState.currentScreen !== 'game' || gameState.quizActive) return;

        let moveX = 0;
        let moveY = 0;

        if (keys.ArrowUp || keys.w || keys.W) moveY -= 1;
        if (keys.ArrowDown || keys.s || keys.S) moveY += 1;
        if (keys.ArrowLeft || keys.a || keys.A) moveX -= 1;
        if (keys.ArrowRight || keys.d || keys.D) moveX += 1;

        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }

        player.isMoving = moveX !== 0 || moveY !== 0;

        if (player.isMoving) {
            player.walkCycle += 0.22;
            player.cart.wheelRotation += 0.3;

            if (Math.abs(moveX) > Math.abs(moveY)) {
                player.direction = moveX > 0 ? 'right' : 'left';
            } else {
                player.direction = moveY > 0 ? 'down' : 'up';
            }

            // Spawn cute walk dust particles
            if (Math.random() < 0.2) {
                player.particles.push({
                    x: player.x + (Math.random() * 12 - 6),
                    y: player.y + 22,
                    vx: -moveX * 0.5 + (Math.random() * 0.4 - 0.2),
                    vy: -moveY * 0.5 + (Math.random() * 0.4 - 0.2),
                    alpha: 0.6,
                    radius: 3 + Math.random() * 3,
                    color: '#e2e8f0'
                });
            }
        } else {
            player.walkCycle = 0;
        }

        // Bobbing breathing animation
        player.bobOffset = Math.sin(Date.now() / 250) * 1.5;

        // Apply movement with bounding box collisions
        const nextX = player.x + moveX * player.speed;
        const nextY = player.y + moveY * player.speed;

        // Boundary limits
        const minX = 40;
        const maxX = 920;
        const minY = 140;
        const maxY = 610;

        // Shelf obstacle collisions
        let canMoveX = (nextX >= minX && nextX <= maxX);
        let canMoveY = (nextY >= minY && nextY <= maxY);

        const playerRadius = 18;

        shelves.forEach(shelf => {
            // Check X collision
            if (checkRectOverlap(nextX, player.y, playerRadius, shelf.x, shelf.y, shelf.w, shelf.h)) {
                canMoveX = false;
            }
            // Check Y collision
            if (checkRectOverlap(player.x, nextY, playerRadius, shelf.x, shelf.y, shelf.w, shelf.h)) {
                canMoveY = false;
            }
        });

        // Billing counter collision
        if (checkRectOverlap(nextX, player.y, playerRadius, billingCounter.x, billingCounter.y, billingCounter.w, billingCounter.h)) {
            canMoveX = false;
        }
        if (checkRectOverlap(player.x, nextY, playerRadius, billingCounter.x, billingCounter.y, billingCounter.w, billingCounter.h)) {
            canMoveY = false;
        }

        if (canMoveX) player.x = nextX;
        if (canMoveY) player.y = nextY;

        // Update celebrating & shocked timers
        if (player.celebrating > 0) player.celebrating--;
        if (player.shocked > 0) player.shocked--;

        // Update particles
        for (let i = player.particles.length - 1; i >= 0; i--) {
            const p = player.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.03;
            if (p.alpha <= 0) player.particles.splice(i, 1);
        }

        // Check proximity to shelves
        checkProximity();
    }

    function checkRectOverlap(px, py, r, rx, ry, rw, rh) {
        const closestX = Math.max(rx, Math.min(px, rx + rw));
        const closestY = Math.max(ry, Math.min(py, ry + rh));
        const distanceX = px - closestX;
        const distanceY = py - closestY;
        return (distanceX * distanceX + distanceY * distanceY) < (r * r);
    }

    // Shelf & Counter Proximity
    function checkProximity() {
        let nearbyShelf = null;

        for (const shelf of shelves) {
            const centerX = shelf.x + shelf.w / 2;
            const centerY = shelf.y + shelf.h / 2;
            const dist = Math.hypot(player.x - centerX, player.y - centerY);

            if (dist < 85) {
                nearbyShelf = shelf;
                break;
            }
        }

        gameState.pendingShelf = nearbyShelf;

        // Check billing counter proximity
        const billingDist = Math.hypot(player.x - (billingCounter.x + billingCounter.w / 2), player.y - (billingCounter.y + billingCounter.h / 2));
        gameState.nearBillingCounter = (billingDist < 110);
    }

    // Interaction handler
    async function handleInteract() {
        if (gameState.pendingShelf) {
            const shelf = gameState.pendingShelf;
            await collectItem(shelf);
            return;
        }

        if (gameState.nearBillingCounter) {
            startBillingProcess();
            return;
        }
    }

    // Collect product & Push onto Stack
    async function collectItem(shelf) {
        if (!window.dsApi) return;

        // Call C backend to push to Stack & insert to Linked List
        await window.dsApi.pushProduct(shelf.name, shelf.price, shelf.category);

        shelf.collected = true;
        player.celebrating = 30; // 30 frames of happy jump
        createSparkles(player.x, player.y - 30, '#ffd166');

        if (window.soundEngine) window.soundEngine.playPush();

        // Check if quiz should trigger based on game state
        const collectedCount = window.dsApi.state.stack.items.length;
        
        // Show floating toast
        showToast(`🛒 [C STACK PUSH] Added "${shelf.name}" to Trolley (LIFO: Top = ${window.dsApi.state.stack.top})`);

        updateHUD();

        // Trigger quiz questions periodically
        if (collectedCount === 2 || collectedCount === 4 || collectedCount === 6) {
            setTimeout(() => {
                triggerQuizModal();
            }, 500);
        }

        // If player collected 4 or more products, prompt to visit billing counter
        if (collectedCount >= 4 && !gameState.billingActive) {
            showToast(`💳 Trolley has ${collectedCount} products! Head over to the Billing Counter to process the Queue.`);
        }
    }

    // Pop product from trolley (LIFO)
    async function handlePopCart() {
        if (!window.dsApi) return;
        const res = await window.dsApi.popProduct();
        if (res.error) {
            showToast(`⚠️ ${res.error}`);
            return;
        }

        if (window.soundEngine) window.soundEngine.playPop();
        player.shocked = 15;
        showToast(`🗑️ [C STACK POP] Removed "${res.popped.name}" from trolley (LIFO: Top = ${window.dsApi.state.stack.top})`);
        updateHUD();
    }

    // Billing Counter & Queue challenge
    async function startBillingProcess() {
        const stackCount = window.dsApi.state.stack.items.length;
        if (stackCount === 0) {
            alert("Your trolley is empty! Please collect some grocery products first.");
            return;
        }

        gameState.billingActive = true;
        openModal('billingModal');
        renderBillingModalContent();
    }

    function renderBillingModalContent() {
        const container = document.getElementById('billingModalContent');
        if (!container) return;

        const queue = window.dsApi.state.queue;
        const stack = window.dsApi.state.stack;

        let customersHtml = queue.customers.map((c, idx) => `
            <div class="billing-customer-card ${idx === 0 ? 'is-front' : ''}">
                <div class="customer-tag">${idx === 0 ? 'FRONT (Next in Line)' : `Position #${idx + 1}`}</div>
                <div class="customer-name">${c.name}</div>
                <div class="customer-meta">${c.items} items • $${c.total.toFixed(2)}</div>
                <div class="customer-ptr">Node Address: <code>${c.address}</code></div>
            </div>
        `).join('');

        if (queue.customers.length === 0) {
            customersHtml = `<div class="queue-empty-msg">🎉 Queue is empty! All waiting customers have been dequeued. Your turn now!</div>`;
        }

        container.innerHTML = `
            <div class="billing-flow-box">
                <div class="billing-banner">
                    <h3>Supermarket Queue Service (FIFO Principle)</h3>
                    <p>Customers are served one by one from the <strong>Front</strong> of the line using the C <code>dequeue()</code> function.</p>
                </div>
                
                <div class="billing-queue-visualizer">
                    <h4>Current Customers Queue (${queue.count} in line):</h4>
                    <div class="queue-cards-row">
                        ${customersHtml}
                    </div>
                </div>

                <div class="billing-actions-row">
                    <button id="btnServeCustomer" class="btn-primary-action" ${queue.customers.length === 0 ? 'disabled' : ''}>
                        🛎️ Serve Front Customer (Call C dequeue)
                    </button>
                    <button id="btnPlayerCheckout" class="btn-checkout-action" ${queue.customers.length > 0 ? 'disabled' : ''}>
                        🧾 Bill Player's Trolley (Complete Stack & Queue)
                    </button>
                </div>
            </div>
        `;

        const btnServe = document.getElementById('btnServeCustomer');
        if (btnServe) {
            btnServe.addEventListener('click', async () => {
                if (window.soundEngine) window.soundEngine.playCashRegister();
                const res = await window.dsApi.dequeueCustomer();
                showToast(`Served customer ${res.served ? res.served.name : ''} (FIFO)!`);
                updateHUD();
                renderBillingModalContent();

                // Trigger Queue DS Question
                setTimeout(() => {
                    closeModal('billingModal');
                    triggerQueueQuiz();
                }, 400);
            });
        }

        const btnCheckout = document.getElementById('btnPlayerCheckout');
        if (btnCheckout) {
            btnCheckout.addEventListener('click', () => {
                completeGame();
            });
        }
    }

    function triggerQueueQuiz() {
        const q = quizQuestions.find(item => item.category === 'Queue');
        presentQuiz(q, () => {
            // On quiz completion, reopen billing modal
            openModal('billingModal');
            renderBillingModalContent();
        });
    }

    function triggerQuizModal() {
        const unusedQuizzes = quizQuestions.filter((_, idx) => idx >= gameState.quizzesAnswered);
        const q = unusedQuizzes.length > 0 ? unusedQuizzes[0] : quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
        gameState.quizzesAnswered++;
        presentQuiz(q);
    }

    function presentQuiz(questionObj, callback) {
        gameState.quizActive = true;
        const modal = document.getElementById('quizModal');
        const titleEl = document.getElementById('quizCategory');
        const questionEl = document.getElementById('quizText');
        const optionsEl = document.getElementById('quizOptions');
        const feedbackEl = document.getElementById('quizFeedback');

        titleEl.textContent = `DS Challenge: ${questionObj.category}`;
        questionEl.textContent = questionObj.question;
        feedbackEl.innerHTML = '';
        optionsEl.innerHTML = '';

        questionObj.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt-btn';
            btn.innerHTML = `<span class="opt-label">${String.fromCharCode(65 + idx)}</span> <span class="opt-text">${opt}</span>`;
            btn.addEventListener('click', () => {
                handleQuizAnswer(idx, questionObj, feedbackEl, callback);
            });
            optionsEl.appendChild(btn);
        });

        openModal('quizModal');
    }

    function handleQuizAnswer(selectedIdx, questionObj, feedbackEl, callback) {
        const isCorrect = selectedIdx === questionObj.correctIndex;
        const buttons = document.querySelectorAll('.quiz-opt-btn');
        buttons.forEach((b, idx) => {
            b.disabled = true;
            if (idx === questionObj.correctIndex) b.classList.add('correct');
            else if (idx === selectedIdx) b.classList.add('wrong');
        });

        if (isCorrect) {
            if (window.soundEngine) window.soundEngine.playCorrect();
            gameState.score += 25;
            player.celebrating = 45;
            createSparkles(player.x, player.y - 20, '#06d6a0');
            feedbackEl.innerHTML = `
                <div class="feedback-box success">
                    <strong>✅ Correct! (+25 Points)</strong>
                    <p>${questionObj.explanation}</p>
                </div>
            `;
        } else {
            if (window.soundEngine) window.soundEngine.playWrong();
            gameState.lives = Math.max(0, gameState.lives - 1);
            player.shocked = 40;
            flashScreenDamage();
            feedbackEl.innerHTML = `
                <div class="feedback-box error">
                    <strong>❌ Incorrect! (-1 Life ❤️)</strong>
                    <p>${questionObj.explanation}</p>
                </div>
            `;

            if (gameState.lives <= 0) {
                setTimeout(() => {
                    closeModal('quizModal');
                    gameOver();
                }, 1800);
                return;
            }
        }

        updateHUD();

        setTimeout(() => {
            closeModal('quizModal');
            gameState.quizActive = false;
            if (callback) callback();
        }, 2200);
    }

    function completeGame() {
        closeModal('billingModal');
        gameState.gameWon = true;
        if (window.soundEngine) window.soundEngine.playVictory();

        const modal = document.getElementById('winnerModal');
        const statsEl = document.getElementById('winnerStats');

        const stackItems = window.dsApi.state.stack.items;
        const totalCost = stackItems.reduce((sum, item) => sum + item.price, 0);

        statsEl.innerHTML = `
            <div class="winner-stat-card">
                <span class="stat-num">${gameState.score + 50}</span>
                <span class="stat-lbl">Final Score</span>
            </div>
            <div class="winner-stat-card">
                <span class="stat-num">${gameState.lives} / 3</span>
                <span class="stat-lbl">Lives Remaining</span>
            </div>
            <div class="winner-stat-card">
                <span class="stat-num">${stackItems.length}</span>
                <span class="stat-lbl">Stack Items Billed</span>
            </div>
            <div class="winner-stat-card">
                <span class="stat-num">$${totalCost.toFixed(2)}</span>
                <span class="stat-lbl">Total Grocery Bill</span>
            </div>
        `;

        openModal('winnerModal');
    }

    function gameOver() {
        gameState.gameOver = true;
        const modal = document.getElementById('gameOverModal');
        openModal('gameOverModal');
    }

    // Linked List Traversal & Search Modal
    function openLinkedListModal() {
        const modal = document.getElementById('linkedListModal');
        const container = document.getElementById('linkedListNodesContainer');
        const list = window.dsApi.state.linked_list;

        let html = '';
        if (list.nodes.length === 0) {
            html = `<div class="empty-list-notice">The Linked List is currently empty (Cart has 0 items). Head to the shelves and pick products!</div>`;
        } else {
            list.nodes.forEach((node, idx) => {
                html += `
                    <div class="ll-node-card" id="llNode_${idx}">
                        <div class="node-badge">Node #${idx}</div>
                        <div class="node-title">${node.name}</div>
                        <div class="node-meta">$${node.price.toFixed(2)} • ${node.category}</div>
                        <div class="node-memory">
                            <span>Addr: <code>${node.address}</code></span>
                            <span>Next: <code>${node.next}</code></span>
                        </div>
                    </div>
                    ${idx < list.nodes.length - 1 ? '<div class="ll-arrow">➔</div>' : '<div class="ll-null-node">NULL</div>'}
                `;
            });
        }

        container.innerHTML = html;

        // Search feature
        const searchInput = document.getElementById('inputSearchLL');
        const btnSearch = document.getElementById('btnSearchLL');
        const searchResultEl = document.getElementById('searchResultDisplay');

        btnSearch.onclick = async () => {
            const query = searchInput.value.trim();
            if (!query) return;

            searchResultEl.innerHTML = `<em>Traversing Linked List pointers from Head (<code>${list.head_address}</code>)...</em>`;

            const searchRes = await window.dsApi.searchList(query);
            if (searchRes.found) {
                searchResultEl.innerHTML = `<span style="color:#10b981;">✓ Found <strong>${query}</strong> at memory address <code>${searchRes.foundNode.address}</code>!</span>`;
                // Highlight found card
                const foundIndex = searchRes.steps.find(s => s.isTarget).index;
                const nodeCard = document.getElementById(`llNode_${foundIndex}`);
                if (nodeCard) nodeCard.classList.add('highlight-found');
            } else {
                searchResultEl.innerHTML = `<span style="color:#ef4444;">✗ Product "${query}" not found in current Linked List traversal.</span>`;
            }
        };

        openModal('linkedListModal');
    }

    // Modal Helpers
    function openModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.add('active');
    }

    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('active');
    }

    // Screen Shake / Damage Flash
    function flashScreenDamage() {
        const canvasContainer = document.querySelector('.supermarket-canvas-wrapper');
        if (canvasContainer) {
            canvasContainer.classList.add('shake-anim');
            setTimeout(() => canvasContainer.classList.remove('shake-anim'), 400);
        }
    }

    function showToast(msg) {
        const toast = document.getElementById('gameToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function createSparkles(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 2.5;
            player.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                radius: 3 + Math.random() * 3,
                color: color || '#ffd166'
            });
        }
    }

    // Update HUD bar & bottom right Trolley card
    function updateHUD() {
        // Lives
        const heartsContainer = document.getElementById('hudHearts');
        if (heartsContainer) {
            let hearts = '';
            for (let i = 0; i < gameState.maxLives; i++) {
                hearts += (i < gameState.lives) ? '❤️' : '🖤';
            }
            heartsContainer.textContent = hearts;
        }

        const livesCount = document.getElementById('hudLivesCount');
        if (livesCount) livesCount.textContent = gameState.lives;

        // Score
        const scoreEl = document.getElementById('hudScore');
        if (scoreEl) scoreEl.textContent = gameState.score;

        // Level
        const levelEl = document.getElementById('hudLevel');
        if (levelEl) levelEl.textContent = gameState.level;

        // Trolley (Stack) Card
        const trolleyListEl = document.getElementById('trolleyStackPreview');
        const productCountEl = document.getElementById('trolleyProductCount');

        const stack = window.dsApi ? window.dsApi.state.stack : { count: 0, items: [] };

        if (productCountEl) {
            productCountEl.textContent = `${stack.count} / 8`;
        }

        if (trolleyListEl) {
            if (stack.count === 0) {
                trolleyListEl.innerHTML = `<span class="empty-stack-text">- Empty</span>`;
            } else {
                // Show top 3 items in stack, with topmost marked [TOP]
                const itemsToDisplay = stack.items.slice(-3).reverse();
                trolleyListEl.innerHTML = itemsToDisplay.map((item, idx) => `
                    <div class="stack-preview-item ${idx === 0 ? 'top-item' : ''}">
                        ${idx === 0 ? '▲ [TOP] ' : '• '} ${item.name} ($${item.price.toFixed(2)})
                    </div>
                `).join('');
            }
        }
    }

    // RENDER ENGINE (60 FPS)
    function gameLoop() {
        updatePlayer();
        renderScene();
        renderMinimap();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function renderScene() {
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, viewWidth, viewHeight);

        // 1. Draw Supermarket Floor Tiles covering 100% of the screen
        renderFloor(viewWidth, viewHeight);

        // 2. Center and scale the interactive game world
        ctx.save();
        ctx.translate(gameOffsetX, gameOffsetY);
        ctx.scale(gameScale, gameScale);

        // Shelves
        shelves.forEach(shelf => renderShelf(shelf));

        // Billing Counter and Customers
        renderBillingCounter();

        // Static NPCs and Plants
        renderStaticObjects();

        // Cute Chibi Guy with Shopping Cart
        renderCuteBoy();

        // Floating Interaction Bubbles
        renderInteractionPrompts();

        // Particles
        renderParticles();

        ctx.restore();
        ctx.restore();
    }

    // Floor rendering with tiles & grid grout lines across full screen
    function renderFloor(w, h) {
        const tileSize = 48;
        ctx.fillStyle = '#dde2e8'; // Clean light grey supermarket tile
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#cdd4dd';
        ctx.lineWidth = 1;

        for (let x = 0; x < w; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        for (let y = 0; y < h; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Walls / Trim border
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 0, w, 10); // top wall
        ctx.fillRect(0, 0, 10, h); // left wall
        ctx.fillRect(w - 10, 0, 10, h); // right wall
        ctx.fillRect(0, h - 10, w, 10); // bottom wall

        // Supermarket Glass Entrance Threshold & Mat (Matches Screenshot 1 bottom center)
        const doorW = 140;
        const doorX = (w - doorW) / 2;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(doorX, h - 16, doorW, 16);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(doorX + 4, h - 12, doorW - 8, 10);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(doorX + doorW / 2 - 2, h - 12, 4, 10); // center door split
    }

    // Shelf rendering matching Screenshot 1
    function renderShelf(shelf) {
        const { x, y, w, h, name, color, collected } = shelf;

        // Shelf shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 6, w, h, 6);
        ctx.fill();

        // Wooden frame body
        ctx.fillStyle = '#b08968';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();

        // Inner shelf tiers (3 shelves)
        ctx.fillStyle = '#7f5539';
        ctx.fillRect(x + 6, y + 16, w - 12, 16);
        ctx.fillRect(x + 6, y + 36, w - 12, 16);
        ctx.fillRect(x + 6, y + 56, w - 12, 15);

        // Product items on shelves (colored bottles, packages, produce)
        renderProductsOnShelf(shelf);

        // Wooden borders/dividers
        ctx.fillStyle = '#9c6644';
        ctx.fillRect(x, y + 32, w, 3);
        ctx.fillRect(x, y + 52, w, 3);

        // Header Sign Board (Metallic blue dark box with white text matching screenshot)
        const signW = 90;
        const signH = 22;
        const signX = x + (w - signW) / 2;
        const signY = y - 14;

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(signX, signY, signW, signH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, signX + signW / 2, signY + signH / 2);

        // Checkmark badge if already collected
        if (collected) {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(x + w - 10, y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('✓', x + w - 10, y + 10);
        }
    }

    function renderProductsOnShelf(shelf) {
        const { x, y, w, name } = shelf;
        const tierY = [y + 18, y + 38, y + 58];

        tierY.forEach((ty, tierIdx) => {
            const count = 7;
            const itemW = (w - 24) / count;

            for (let i = 0; i < count; i++) {
                const ix = x + 12 + i * itemW;

                if (name === 'Milk') {
                    // Blue milk cartons/bottles
                    ctx.fillStyle = (i % 2 === 0) ? '#38bdf8' : '#e0f2fe';
                    ctx.fillRect(ix + 1, ty, itemW - 3, 12);
                    ctx.fillStyle = '#0284c7';
                    ctx.fillRect(ix + 2, ty - 2, itemW - 5, 2);
                } else if (name === 'Rice') {
                    // Yellow sacks
                    ctx.fillStyle = (i % 2 === 0) ? '#fde047' : '#eab308';
                    ctx.beginPath();
                    ctx.roundRect(ix + 1, ty, itemW - 3, 12, 2);
                    ctx.fill();
                } else if (name === 'Fruits') {
                    // Red apples & green fruits
                    ctx.fillStyle = (i % 2 === 0) ? '#ef4444' : '#22c55e';
                    ctx.beginPath();
                    ctx.arc(ix + itemW / 2 - 1, ty + 6, 5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (name === 'Bread') {
                    // Golden loaves
                    ctx.fillStyle = '#d97706';
                    ctx.beginPath();
                    ctx.roundRect(ix + 1, ty + 2, itemW - 3, 9, 3);
                    ctx.fill();
                } else if (name === 'Eggs') {
                    // Egg cartons
                    ctx.fillStyle = '#fed7aa';
                    ctx.fillRect(ix + 1, ty + 2, itemW - 3, 9);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(ix + 3, ty + 1, itemW - 7, 2);
                } else if (name === 'Juice') {
                    // Orange & citrus bottles
                    ctx.fillStyle = (i % 2 === 0) ? '#f97316' : '#fbbf24';
                    ctx.fillRect(ix + 2, ty, itemW - 4, 12);
                } else if (name === 'Biscuits') {
                    // Biscuit packets
                    ctx.fillStyle = (i % 2 === 0) ? '#ec4899' : '#8b5cf6';
                    ctx.fillRect(ix + 1, ty + 1, itemW - 3, 10);
                } else if (name === 'Soap') {
                    // Pastel soap bars
                    ctx.fillStyle = (i % 2 === 0) ? '#67e8f9' : '#a7f3d0';
                    ctx.fillRect(ix + 1, ty + 2, itemW - 3, 9);
                }
            }
        });
    }

    // Billing Counter rendering
    function renderBillingCounter() {
        const bc = billingCounter;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath();
        ctx.roundRect(bc.x + 6, bc.y + 6, bc.w, bc.h, 12);
        ctx.fill();

        // Blue checkout conveyor counter desk
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.roundRect(bc.x, bc.y, bc.w, bc.h, 10);
        ctx.fill();

        // Top counter surface (cyan/blue)
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(bc.x + 10, bc.y + 8, bc.w - 20, 16);

        // Cash register screen
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bc.x + 130, bc.y + 12, 34, 22);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bc.x + 133, bc.y + 14, 28, 16);

        // Header sign
        const signW = 120;
        const signH = 22;
        const signX = bc.x + (bc.w - signW) / 2;
        const signY = bc.y - 18;

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(signX, signY, signW, signH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bc.name, signX + signW / 2, signY + signH / 2);

        // Cashier Amy (cute chibi with blue hat behind desk)
        const cx = bc.cashier.x;
        const cy = bc.cashier.y;
        // Head
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fill();
        // Blue hair/cap
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(cx, cy - 3, 12, Math.PI, Math.PI * 2);
        ctx.fill();
        // Eyes & smile
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx - 4, cy, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Render Customers in Queue (FIFO)
        const qCustomers = (window.dsApi && window.dsApi.state.queue) ? window.dsApi.state.queue.customers : bc.customersQueue;
        
        qCustomers.forEach((cust, idx) => {
            // Position customers vertically in line facing the counter
            const qx = bc.x + 65;
            const qy = bc.y + 60 + idx * 36;

            // Customer shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(qx, qy + 16, 9, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Customer cute chibi body
            const colors = ['#0284c7', '#ea580c', '#16a34a', '#d97706'];
            ctx.fillStyle = colors[idx % colors.length];
            ctx.beginPath();
            ctx.roundRect(qx - 8, qy, 16, 18, 4);
            ctx.fill();

            // Head (facing counter / up)
            ctx.fillStyle = '#ffedd5';
            ctx.beginPath();
            ctx.arc(qx, qy - 6, 9, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            ctx.fillStyle = '#3f2e21';
            ctx.beginPath();
            ctx.arc(qx, qy - 9, 9, Math.PI * 0.8, Math.PI * 2.2);
            ctx.fill();

            // Queue number badge
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.roundRect(qx + 12, qy - 8, 20, 14, 3);
            ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`#${idx + 1}`, qx + 22, qy - 1);
        });
    }

    // Static NPCs & Plants matching Screenshot 1
    function renderStaticObjects() {
        // Cabinet on left
        ctx.fillStyle = '#a07855';
        ctx.fillRect(12, 210, 24, 70);
        ctx.fillStyle = '#8b5e3c';
        ctx.fillRect(15, 214, 18, 30);
        ctx.fillRect(15, 248, 18, 28);

        // Plant on bottom left
        const px = 34;
        const py = 600;
        // Clay pot
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(px - 10, py);
        ctx.lineTo(px + 10, py);
        ctx.lineTo(px + 7, py + 18);
        ctx.lineTo(px - 7, py + 18);
        ctx.closePath();
        ctx.fill();
        // Green leaves
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(px - 6, py - 8, 8, 14, -0.4, 0, Math.PI * 2);
        ctx.ellipse(px + 6, py - 8, 8, 14, 0.4, 0, Math.PI * 2);
        ctx.ellipse(px, py - 14, 7, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pink kid NPC on left
        renderKidNPC(72, 280, '#f43f5e', '#593822');

        // Green kid NPC on right
        renderKidNPC(835, 280, '#16a34a', '#1e293b');
    }

    function renderKidNPC(x, y, shirtColor, hairColor) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath();
        ctx.ellipse(x, y + 20, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chibi body
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        ctx.roundRect(x - 9, y + 4, 18, 18, 4);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(x, y - 4, 10, 0, Math.PI * 2);
        ctx.fill();

        // Fluffy hair
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(x - 6, y - 9, 6, 0, Math.PI * 2);
        ctx.arc(x, y - 12, 7, 0, Math.PI * 2);
        ctx.arc(x + 6, y - 9, 6, 0, Math.PI * 2);
        ctx.fill();

        // Face eyes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(x + 3, y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // THE CUTE CHIBI GUY WITH SHOPPING TROLLEY (Player Character)
    function renderCuteBoy() {
        const x = player.x;
        const y = player.y + (player.celebrating > 0 ? -Math.sin(player.walkCycle * 2) * 8 : player.bobOffset);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(x, player.y + 24, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trolley position depends on player direction
        let cartX = x + 24;
        let cartY = y - 2;

        if (player.direction === 'up') {
            cartX = x + 24;
            cartY = y - 2;
        } else if (player.direction === 'down') {
            cartX = x - 24;
            cartY = y + 2;
        } else if (player.direction === 'left') {
            cartX = x - 26;
            cartY = y - 2;
        } else if (player.direction === 'right') {
            cartX = x + 26;
            cartY = y - 2;
        }

        // Render Cart (Trolley)
        renderShoppingCart(cartX, cartY);

        // Walk cycle offsets for legs
        const legOffset = player.isMoving ? Math.sin(player.walkCycle) * 6 : 0;

        // Legs / Pants (Dark blue jeans)
        ctx.fillStyle = '#1e3a8a';
        // Left leg
        ctx.beginPath();
        ctx.roundRect(x - 9, y + 14 - legOffset, 7, 12, 3);
        ctx.fill();
        // Right leg
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 14 + legOffset, 7, 12, 3);
        ctx.fill();

        // White sneakers
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(x - 10, y + 23 - legOffset, 8, 4, 2);
        ctx.roundRect(x + 2, y + 23 + legOffset, 8, 4, 2);
        ctx.fill();

        // Body: Cute Bright Blue Hoodie / Jacket (matching screenshot!)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(x - 12, y - 6, 24, 22, 6);
        ctx.fill();

        // White zipper line & hood trim
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 2);
        ctx.lineTo(x, y + 14);
        ctx.stroke();

        // Cute Chibi Head
        const headY = y - 14;

        // Skin (soft warm tone)
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(x, headY, 13, 0, Math.PI * 2);
        ctx.fill();

        // Cute Fluffy Curly Brown Hair (Afro/curly style matching Screenshot 1!)
        ctx.fillStyle = '#451a03';
        // Curly hair clusters around head
        const curls = [
            { dx: -10, dy: -6, r: 6 },
            { dx: -6, dy: -12, r: 7 },
            { dx: 0, dy: -14, r: 7.5 },
            { dx: 6, dy: -12, r: 7 },
            { dx: 10, dy: -6, r: 6 },
            { dx: -11, dy: 1, r: 5 },
            { dx: 11, dy: 1, r: 5 }
        ];

        curls.forEach(c => {
            ctx.beginPath();
            ctx.arc(x + c.dx, headY + c.dy, c.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Face expressions based on direction & mood
        if (player.direction === 'down' || player.direction === 'left' || player.direction === 'right') {
            const faceOffsetX = player.direction === 'left' ? -3 : (player.direction === 'right' ? 3 : 0);

            // Rosy cheeks (cute anime blush)
            ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
            ctx.beginPath();
            ctx.arc(x - 6 + faceOffsetX, headY + 3, 3, 0, Math.PI * 2);
            ctx.arc(x + 6 + faceOffsetX, headY + 3, 3, 0, Math.PI * 2);
            ctx.fill();

            // Big Sparkling Anime Eyes
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(x - 4 + faceOffsetX, headY - 1, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 4 + faceOffsetX, headY - 1, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Eye sparkle highlights
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x - 5 + faceOffsetX, headY - 2, 1, 0, Math.PI * 2);
            ctx.arc(x + 3 + faceOffsetX, headY - 2, 1, 0, Math.PI * 2);
            ctx.fill();

            // Happy cheerful mouth
            ctx.strokeStyle = '#9a3412';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x + faceOffsetX, headY + 4, 3, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        // Reactive Emotions
        if (player.celebrating > 0) {
            // Stars / sparkles around head
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText('✨', x + 14, headY - 12);
            ctx.fillText('★', x - 16, headY - 8);
        }

        if (player.shocked > 0) {
            // Sweat drop
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(x + 14, headY - 4, 3, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Shopping Cart / Trolley rendering
    function renderShoppingCart(cx, cy) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 16, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wire basket body
        ctx.strokeStyle = '#94a3b8';
        ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(cx - 12, cy - 8, 24, 20, 3);
        ctx.fill();
        ctx.stroke();

        // Metal wire grid lines
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy - 8); ctx.lineTo(cx - 6, cy + 12);
        ctx.moveTo(cx, cy - 8);     ctx.lineTo(cx, cy + 12);
        ctx.moveTo(cx + 6, cy - 8); ctx.lineTo(cx + 6, cy + 12);
        ctx.moveTo(cx - 12, cy - 1); ctx.lineTo(cx + 12, cy - 1);
        ctx.moveTo(cx - 12, cy + 5); ctx.lineTo(cx + 12, cy + 5);
        ctx.stroke();

        // Red handle bar
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 11);
        ctx.lineTo(cx + 10, cy - 11);
        ctx.stroke();

        // Wheels
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(cx - 9, cy + 14, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 9, cy + 14, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // If items are inside trolley, show cute colorful product stack preview
        const stackItems = window.dsApi ? window.dsApi.state.stack.items : [];
        if (stackItems.length > 0) {
            const topItem = stackItems[stackItems.length - 1];
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.roundRect(cx - 7, cy - 4, 14, 10, 2);
            ctx.fill();
            // Tiny label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(topItem.name.substring(0, 4), cx, cy + 3);
        }
    }

    // Interaction Prompt Overlay
    function renderInteractionPrompts() {
        if (gameState.pendingShelf) {
            const s = gameState.pendingShelf;
            const bubbleX = s.x + s.w / 2;
            const bubbleY = s.y - 32;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;

            const text = `Press [E] or Tap to Take ${s.name} (Stack Push)`;
            ctx.font = 'bold 12px "Outfit", sans-serif';
            const textWidth = ctx.measureText(text).width;

            ctx.beginPath();
            ctx.roundRect(bubbleX - textWidth / 2 - 12, bubbleY - 14, textWidth + 24, 28, 14);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, bubbleX, bubbleY);
        }

        if (gameState.nearBillingCounter) {
            const bx = billingCounter.x + billingCounter.w / 2;
            const by = billingCounter.y - 36;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.strokeStyle = '#06d6a0';
            ctx.lineWidth = 2;

            const text = `Press [E] to Enter Billing Counter (Queue Service)`;
            ctx.font = 'bold 12px "Outfit", sans-serif';
            const textWidth = ctx.measureText(text).width;

            ctx.beginPath();
            ctx.roundRect(bx - textWidth / 2 - 12, by - 14, textWidth + 24, 28, 14);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#06d6a0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, bx, by);
        }
    }

    // Minimap Radar rendering (matching top right radar in Screenshot 1)
    function renderMinimap() {
        if (!minimapCtx) return;

        minimapCtx.clearRect(0, 0, 120, 80);

        // Dark radar background
        minimapCtx.fillStyle = '#0f172a';
        minimapCtx.fillRect(0, 0, 120, 80);

        // Store perimeter outline
        minimapCtx.strokeStyle = '#0284c7';
        minimapCtx.lineWidth = 1.5;
        minimapCtx.strokeRect(4, 4, 112, 72);

        // Shelves miniature rectangles
        minimapCtx.fillStyle = '#475569';
        shelves.forEach(s => {
            const mx = (s.x / 960) * 120;
            const my = (s.y / 640) * 80;
            const mw = (s.w / 960) * 120;
            const mh = (s.h / 640) * 80;
            minimapCtx.fillRect(mx, my, mw, mh);
        });

        // Billing counter
        minimapCtx.fillStyle = '#1d4ed8';
        minimapCtx.fillRect((billingCounter.x / 960) * 120, (billingCounter.y / 640) * 80, (billingCounter.w / 960) * 120, (billingCounter.h / 640) * 80);

        // Cute player purple glowing dot!
        const px = (player.x / 960) * 120;
        const py = (player.y / 640) * 80;

        minimapCtx.fillStyle = 'rgba(168, 85, 247, 0.4)';
        minimapCtx.beginPath();
        minimapCtx.arc(px, py, 6, 0, Math.PI * 2);
        minimapCtx.fill();

        minimapCtx.fillStyle = '#c084fc';
        minimapCtx.beginPath();
        minimapCtx.arc(px, py, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Particles render
    function renderParticles() {
        player.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    // Exported function to update C memory display log in inspector
    window.updateCLogDisplay = function() {
        const terminalEl = document.getElementById('cEngineLogContainer');
        if (terminalEl && window.dsApi) {
            terminalEl.innerHTML = window.dsApi.cLogs.map(l => `<div class="c-log-line">${l}</div>`).join('');
        }
    };

    // Auto-init on DOM loaded
    window.addEventListener('DOMContentLoaded', init);

})();
