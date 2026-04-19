/* ========================================
   EARNHUB - MAIN APPLICATION LOGIC
   ======================================== */

// Global State
let currentUser = null;
let userStats = {
    balance: 0,
    videosWatched: 0,
    adsClicked: 0,
    appsInstalled: 0,
    referralCount: 0,
    totalEarned: 0
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('EarnHub App Initialized');
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Event Listeners
    setupEventListeners();
    
    // Load tasks from Firebase
    loadAllTasks();
});

// ========================================
// AUTHENTICATION
// ========================================

function checkAuthStatus() {
    // Check localStorage for user
    const userData = localStorage.getItem('earnhub_user');
    
    if (userData) {
        currentUser = JSON.parse(userData);
        showDashboard();
        loadUserData();
    } else {
        showLoginSection();
    }
}

document.getElementById('telegramLoginBtn')?.addEventListener('click', () => {
    // Simulate Telegram login
    const userId = 'tg_' + Math.random().toString(36).substr(2, 9);
    const userName = 'Telegram User ' + Math.floor(Math.random() * 1000);
    
    loginUser(userId, userName, 'telegram');
});

document.getElementById('googleLoginBtn')?.addEventListener('click', () => {
    // Simulate Google login
    const userId = 'google_' + Math.random().toString(36).substr(2, 9);
    const userName = 'Google User ' + Math.floor(Math.random() * 1000);
    
    loginUser(userId, userName, 'google');
});

function loginUser(userId, userName, provider) {
    currentUser = {
        id: userId,
        name: userName,
        provider: provider,
        balance: 0,
        referralCode: generateReferralCode(),
        joinDate: new Date().toISOString(),
        completedTasks: []
    };
    
    // Save to localStorage (in real app, this goes to Firebase)
    localStorage.setItem('earnhub_user', JSON.stringify(currentUser));
    
    // Save to IndexedDB for offline support
    saveUserToIndexedDB(currentUser);
    
    showNotification('✓ Login successful! Welcome ' + userName, 'success');
    showDashboard();
    loadUserData();
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('earnhub_user');
    currentUser = null;
    showLoginSection();
    showNotification('Logged out successfully', 'success');
});

// ========================================
// UI DISPLAY FUNCTIONS
// ========================================

function showLoginSection() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('profileSection').classList.add('hidden');
}

function showProfile() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('profileSection').classList.remove('hidden');
    
    // Update profile info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userTgId').textContent = currentUser.id;
    document.getElementById('totalEarned').textContent = '₹' + userStats.totalEarned.toFixed(2);
    
    const joinDate = new Date(currentUser.joinDate);
    document.getElementById('memberSince').textContent = joinDate.toLocaleDateString();
}

// ========================================
// EVENT LISTENERS SETUP
// ========================================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            
            // Update active state
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Show page
            if (page === 'dashboard') {
                showDashboard();
            } else if (page === 'profile') {
                showProfile();
            }
        });
    });
    
    // User menu button
    document.getElementById('userMenuBtn')?.addEventListener('click', () => {
        if (currentUser) {
            showProfile();
            document.querySelector('[data-page="profile"]').classList.add('active');
            document.querySelector('[data-page="dashboard"]').classList.remove('active');
        }
    });
    
    // Withdraw button
    document.getElementById('withdrawBtn')?.addEventListener('click', () => {
        openWithdrawModal();
    });
    
    // Withdraw form
    document.getElementById('withdrawForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitWithdrawRequest();
    });
    
    // Method selection
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Set hidden input
            document.getElementById('withdrawMethod').value = e.currentTarget.dataset.method;
        });
    });
    
    // Copy referral button
    document.getElementById('copyReferralBtn')?.addEventListener('click', () => {
        const referralLink = document.getElementById('referralLink').value;
        navigator.clipboard.writeText(referralLink).then(() => {
            showNotification('✓ Referral link copied!', 'success');
        });
    });
    
    // Share referral button
    document.getElementById('shareReferralBtn')?.addEventListener('click', () => {
        const referralLink = document.getElementById('referralLink').value;
        if (navigator.share) {
            navigator.share({
                title: 'EarnHub',
                text: 'Join EarnHub and earn money! Use my referral link:',
                url: referralLink
            });
        } else {
            showNotification('Share not supported on this device', 'warning');
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.currentTarget.closest('.modal').classList.add('hidden');
        });
    });
}

// ========================================
// TASK LOADING
// ========================================

function loadAllTasks() {
    if (!currentUser) return;
    
    // Simulate loading from Firebase
    const videoTasks = getVideoTasks();
    const adTasks = getAdTasks();
    const appTasks = getAppTasks();
    const channelTasks = getChannelTasks();
    
    // Render tasks
    renderTasks('videosContainer', videoTasks, 'video');
    renderTasks('adsContainer', adTasks, 'ads');
    renderTasks('appsContainer', appTasks, 'apps');
    renderTasks('channelsContainer', channelTasks, 'channels');
    
    // Set referral link
    if (currentUser.referralCode) {
        const referralUrl = `${window.location.origin}?ref=${currentUser.referralCode}`;
        document.getElementById('referralLink').value = referralUrl;
    }
}

function renderTasks(containerId, tasks, taskType) {
    const container = document.getElementById(containerId);
    
    if (tasks.length === 0) {
        container.innerHTML = '<div class="loading">No tasks available right now</div>';
        return;
    }
    
    container.innerHTML = tasks.map(task => {
        const isCompleted = currentUser.completedTasks.includes(task.id);
        
        return `
            <div class="task-card ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}" data-task-type="${taskType}">
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${task.description}</div>
                </div>
                <div>
                    <div class="task-reward">+${task.reward}</div>
                    ${isCompleted ? '<div class="task-status">✓ Done</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    container.querySelectorAll('.task-card:not(.completed)').forEach(card => {
        card.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            const task = tasks.find(t => t.id === taskId);
            
            if (taskType === 'video') {
                openVideoModal(task);
            } else if (taskType === 'ads') {
                openAdLink(task);
            } else if (taskType === 'apps') {
                completeAppTask(task);
            } else if (taskType === 'channels') {
                openChannelLink(task);
            }
        });
    });
}

// ========================================
// SAMPLE TASK DATA
// ========================================

function getVideoTasks() {
    return [
        {
            id: 'vid_001',
            title: 'Funny Cat Videos',
            description: 'Watch for 10 seconds',
            reward: 5,
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            requiredWatchTime: 10
        },
        {
            id: 'vid_002',
            title: 'Technology News',
            description: 'Watch latest tech updates',
            reward: 5,
            url: 'https://www.youtube.com/embed/jNQXAC9IVRw',
            requiredWatchTime: 10
        },
        {
            id: 'vid_003',
            title: 'Gaming Highlights',
            description: 'Watch gaming content',
            reward: 5,
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            requiredWatchTime: 10
        }
    ];
}

function getAdTasks() {
    return [
        {
            id: 'ad_001',
            title: 'Click Banner Ad',
            description: 'Click to visit advertiser',
            reward: 3,
            url: 'https://example.com'
        },
        {
            id: 'ad_002',
            title: 'Product Offer',
            description: 'Check special offer',
            reward: 3,
            url: 'https://example.com'
        },
        {
            id: 'ad_003',
            title: 'Mobile App Ad',
            description: 'View app promotion',
            reward: 3,
            url: 'https://example.com'
        }
    ];
}

function getAppTasks() {
    return [
        {
            id: 'app_001',
            title: 'Social Media App',
            description: 'Install and open app',
            reward: 20,
            appName: 'Instagram'
        },
        {
            id: 'app_002',
            title: 'Streaming App',
            description: 'Install video streaming app',
            reward: 20,
            appName: 'Netflix'
        },
        {
            id: 'app_003',
            title: 'Gaming App',
            description: 'Download and play game',
            reward: 20,
            appName: 'Candy Crush'
        }
    ];
}

function getChannelTasks() {
    return [
        {
            id: 'ch_001',
            title: 'Join Gaming Channel',
            description: 'Subscribe to YouTube channel',
            reward: 10,
            url: 'https://youtube.com'
        },
        {
            id: 'ch_002',
            title: 'Join Tech Channel',
            description: 'Subscribe to tech channel',
            reward: 10,
            url: 'https://telegram.me'
        },
        {
            id: 'ch_003',
            title: 'Join Meme Channel',
            description: 'Join the community',
            reward: 10,
            url: 'https://twitter.com'
        }
    ];
}

// ========================================
// VIDEO TASK HANDLING
// ========================================

function openVideoModal(task) {
    const modal = document.getElementById('videoModal');
    const videoPlayer = document.getElementById('videoPlayer');
    
    // Create iframe for video
    videoPlayer.innerHTML = `<iframe width="100%" height="300" src="${task.url}" frameborder="0" allowfullscreen></iframe>`;
    
    modal.classList.remove('hidden');
    
    // Start watch timer
    let watchTime = 0;
    const watchInterval = setInterval(() => {
        watchTime++;
        document.getElementById('watchTime').textContent = watchTime;
        
        if (watchTime >= task.requiredWatchTime) {
            clearInterval(watchInterval);
            completeVideoTask(task);
        }
    }, 1000);
    
    // Close button
    document.getElementById('closeVideoBtn').addEventListener('click', () => {
        clearInterval(watchInterval);
        modal.classList.add('hidden');
    });
}

function completeVideoTask(task) {
    if (currentUser.completedTasks.includes(task.id)) {
        showNotification('Already completed this task', 'warning');
        return;
    }
    
    // Add to completed
    currentUser.completedTasks.push(task.id);
    
    // Update balance
    currentUser.balance += task.reward;
    userStats.balance = currentUser.balance;
    userStats.videosWatched++;
    userStats.totalEarned += task.reward;
    
    // Save user
    localStorage.setItem('earnhub_user', JSON.stringify(currentUser));
    
    // Update UI
    updateBalanceDisplay();
    loadAllTasks();
    
    // Close modal
    document.getElementById('videoModal').classList.add('hidden');
    
    showNotification(`✓ Earned ₹${task.reward}!`, 'success');
}

// ========================================
// AD TASK HANDLING
// ========================================

function openAdLink(task) {
    // Show confirmation
    if (confirm('You will be redirected to the advertiser. Click OK to continue.')) {
        // Track click
        currentUser.completedTasks.push(task.id);
        currentUser.balance += task.reward;
        userStats.balance = currentUser.balance;
        userStats.adsClicked++;
        userStats.totalEarned += task.reward;
        
        localStorage.setItem('earnhub_user', JSON.stringify(currentUser));
        
        // Open link
        window.open(task.url, '_blank');
        
        // Update UI
        updateBalanceDisplay();
        loadAllTasks();
        
        showNotification(`✓ Earned ₹${task.reward}!`, 'success');
    }
}

// ========================================
// APP TASK HANDLING
// ========================================

function completeAppTask(task) {
    const userConfirm = confirm(`${task.appName}\n\nHave you installed and opened the app?\n\nClick OK if done.`);
    
    if (userConfirm) {
        if (currentUser.completedTasks.includes(task.id)) {
            showNotification('Already completed this task', 'warning');
            return;
        }
        
        currentUser.completedTasks.push(task.id);
        currentUser.balance += task.reward;
        userStats.balance = currentUser.balance;
        userStats.appsInstalled++;
        userStats.totalEarned += task.reward;
        
        localStorage.setItem('earnhub_user', JSON.stringify(currentUser));
        
        updateBalanceDisplay();
        loadAllTasks();
        
        showNotification(`✓ Earned ₹${task.reward}!`, 'success');
    }
}

// ========================================
// CHANNEL TASK HANDLING
// ========================================

function openChannelLink(task) {
    if (confirm('Join to complete this task. Click OK to continue.')) {
        // Open link
        window.open(task.url, '_blank');
        
        // Show verification prompt
        setTimeout(() => {
            const verified = confirm('Have you joined the channel?');
            
            if (verified) {
                if (currentUser.completedTasks.includes(task.id)) {
                    showNotification('Already completed this task', 'warning');
                    return;
                }
                
                currentUser.completedTasks.push(task.id);
                currentUser.balance += task.reward;
                userStats.balance = currentUser.balance;
                userStats.referralCount++; // Could also track channel joins
                userStats.totalEarned += task.reward;
                
                localStorage.setItem('earnhub_user', JSON.stringify(currentUser));
                
                updateBalanceDisplay();
                loadAllTasks();
                
                showNotification(`✓ Earned ₹${task.reward}!`, 'success');
            }
        }, 1000);
    }
}

// ========================================
// WITHDRAW FUNCTIONS
// ========================================

function openWithdrawModal() {
    if (currentUser.balance < 100) {
        showNotification('Minimum withdraw amount is ₹100', 'warning');
        return;
    }
    
    document.getElementById('withdrawModal').classList.remove('hidden');
    document.getElementById('availableBalance').textContent = '₹' + currentUser.balance.toFixed(2);
}

function submitWithdrawRequest() {
    const method = document.getElementById('withdrawMethod').value;
    const account = document.getElementById('withdrawAccount').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    
    if (!method || !account || !amount) {
        showNotification('Please fill all fields', 'warning');
        return;
    }
    
    if (amount < 100) {
        showNotification('Minimum withdraw is ₹100', 'warning');
        return;
    }
    
    if (amount > currentUser.balance) {
        showNotification('Insufficient balance', 'danger');
        return;
    }
    
    // Create withdraw request
    const withdrawRequest = {
        id: 'wd_' + Date.now(),
        userId: currentUser.id,
        amount: amount,
        method: method,
        account: account,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // In real app, send to Firebase
    console.log('Withdraw Request:', withdrawRequest);
    
    // Deduct from balance (pending)
    currentUser.balance -= amount;
    localStorage.setItem('earnhub_user', JSON.stringify(currentUser));
    
    // Clear form
    document.getElementById('withdrawForm').reset();
    document.getElementById('withdrawModal').classList.add('hidden');
    
    // Update UI
    updateBalanceDisplay();
    
    showNotification('✓ Withdraw request submitted! We will process it within 24 hours.', 'success');
}

// ========================================
// USER DATA FUNCTIONS
// ========================================

function loadUserData() {
    if (!currentUser) return;
    
    // Update stats
    document.getElementById('videosWatched').textContent = currentUser.completedTasks.filter(t => t.startsWith('vid_')).length;
    document.getElementById('adsClicked').textContent = currentUser.completedTasks.filter(t => t.startsWith('ad_')).length;
    document.getElementById('appsInstalled').textContent = currentUser.completedTasks.filter(t => t.startsWith('app_')).length;
    document.getElementById('referralCount').textContent = currentUser.completedTasks.filter(t => t.startsWith('ch_')).length;
    
    updateBalanceDisplay();
}

function updateBalanceDisplay() {
    const balance = currentUser.balance.toFixed(2);
    document.getElementById('userBalance').textContent = '₹' + balance;
    document.getElementById('dashBalance').textContent = '₹' + balance;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function generateReferralCode() {
    return 'REF' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification ' + (type === 'success' ? '' : type);
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ========================================
// INDEXEDDB SUPPORT (For Offline)
// ========================================

const DB_NAME = 'EarnHubDB';
const DB_VERSION = 1;

function initIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => console.error('IndexedDB error');
    
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('tasks')) {
            db.createObjectStore('tasks', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('withdraws')) {
            db.createObjectStore('withdraws', { keyPath: 'id' });
        }
    };
}

function saveUserToIndexedDB(user) {
    initIndexedDB();
    
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        store.put(user);
    };
}

// Initialize IndexedDB
initIndexedDB();
