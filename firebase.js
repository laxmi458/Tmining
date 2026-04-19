/* ========================================
   FIREBASE CONFIGURATION
   ======================================== */

// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-messaging-id",
    appId: "your-app-id"
};

// Initialize Firebase
let db = null;
let auth = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// ========================================
// USER MANAGEMENT
// ========================================

/**
 * Create or update user in Firestore
 */
async function createUserInFirebase(userData) {
    try {
        if (!db) {
            console.error('Firebase not initialized');
            return false;
        }
        
        const userRef = db.collection('users').doc(userData.id);
        await userRef.set({
            id: userData.id,
            name: userData.name,
            email: userData.email || null,
            provider: userData.provider,
            balance: userData.balance || 0,
            totalEarned: userData.totalEarned || 0,
            referralCode: userData.referralCode,
            referredBy: userData.referredBy || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        }, { merge: true });
        
        console.log('User created/updated successfully');
        return true;
    } catch (error) {
        console.error('Error creating user:', error);
        return false;
    }
}

/**
 * Get user data from Firebase
 */
async function getUserFromFirebase(userId) {
    try {
        if (!db) return null;
        
        const doc = await db.collection('users').doc(userId).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

/**
 * Update user balance in Firebase
 */
async function updateUserBalance(userId, newBalance) {
    try {
        if (!db) return false;
        
        await db.collection('users').doc(userId).update({
            balance: newBalance,
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error updating balance:', error);
        return false;
    }
}

// ========================================
// TASK MANAGEMENT
// ========================================

/**
 * Get all tasks from Firebase
 */
async function getAllTasksFromFirebase() {
    try {
        if (!db) return { videos: [], ads: [], apps: [], channels: [] };
        
        const videosDocs = await db.collection('tasks/video/items').get();
        const adsDocs = await db.collection('tasks/ads/items').get();
        const appsDocs = await db.collection('tasks/apps/items').get();
        const channelsDocs = await db.collection('tasks/channels/items').get();
        
        return {
            videos: videosDocs.docs.map(doc => doc.data()),
            ads: adsDocs.docs.map(doc => doc.data()),
            apps: appsDocs.docs.map(doc => doc.data()),
            channels: channelsDocs.docs.map(doc => doc.data())
        };
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return { videos: [], ads: [], apps: [], channels: [] };
    }
}

/**
 * Add task completion record
 */
async function recordTaskCompletion(userId, taskId, taskType, reward) {
    try {
        if (!db) return false;
        
        const completionRef = db.collection('completions').doc();
        await completionRef.set({
            userId: userId,
            taskId: taskId,
            taskType: taskType,
            reward: reward,
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ipAddress: await getIpAddress() // For fraud detection
        });
        
        return true;
    } catch (error) {
        console.error('Error recording completion:', error);
        return false;
    }
}

/**
 * Check if task already completed
 */
async function isTaskCompleted(userId, taskId) {
    try {
        if (!db) return false;
        
        const query = await db.collection('completions')
            .where('userId', '==', userId)
            .where('taskId', '==', taskId)
            .limit(1)
            .get();
        
        return !query.empty;
    } catch (error) {
        console.error('Error checking task completion:', error);
        return false;
    }
}

// ========================================
// WITHDRAW MANAGEMENT
// ========================================

/**
 * Create withdraw request
 */
async function createWithdrawRequest(userId, amount, method, account) {
    try {
        if (!db) return null;
        
        const user = await getUserFromFirebase(userId);
        
        if (!user || user.balance < amount) {
            throw new Error('Insufficient balance');
        }
        
        const withdrawRef = db.collection('withdraws').doc();
        const withdrawId = withdrawRef.id;
        
        await withdrawRef.set({
            id: withdrawId,
            userId: userId,
            amount: amount,
            method: method,
            account: account,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedAt: null,
            adminNotes: ''
        });
        
        // Update user balance
        await updateUserBalance(userId, user.balance - amount);
        
        return withdrawId;
    } catch (error) {
        console.error('Error creating withdraw request:', error);
        return null;
    }
}

/**
 * Get withdraw requests
 */
async function getWithdrawRequests(userId = null, status = 'pending') {
    try {
        if (!db) return [];
        
        let query = db.collection('withdraws').where('status', '==', status);
        
        if (userId) {
            query = query.where('userId', '==', userId);
        }
        
        const docs = await query.get();
        return docs.docs.map(doc => doc.data());
    } catch (error) {
        console.error('Error fetching withdraws:', error);
        return [];
    }
}

// ========================================
// REFERRAL MANAGEMENT
// ========================================

/**
 * Process referral bonus
 */
async function processReferralBonus(referrerId, referredUserId) {
    try {
        if (!db) return false;
        
        const referrer = await getUserFromFirebase(referrerId);
        if (!referrer) return false;
        
        const bonusAmount = 20; // Points
        const newBalance = referrer.balance + bonusAmount;
        
        await updateUserBalance(referrerId, newBalance);
        
        // Record referral
        await db.collection('referrals').add({
            referrerId: referrerId,
            referredUserId: referredUserId,
            bonusAmount: bonusAmount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error processing referral:', error);
        return false;
    }
}

/**
 * Get referral count
 */
async function getReferralCount(userId) {
    try {
        if (!db) return 0;
        
        const query = await db.collection('referrals')
            .where('referrerId', '==', userId)
            .get();
        
        return query.size;
    } catch (error) {
        console.error('Error getting referral count:', error);
        return 0;
    }
}

// ========================================
// ADMIN FUNCTIONS
// ========================================

/**
 * Get dashboard statistics
 */
async function getDashboardStats() {
    try {
        if (!db) return null;
        
        const usersSnapshot = await db.collection('users').get();
        const withdrawsSnapshot = await db.collection('withdraws')
            .where('status', '==', 'pending')
            .get();
        const completionsSnapshot = await db.collection('completions').get();
        
        const totalEarnings = usersSnapshot.docs.reduce((sum, doc) => {
            return sum + (doc.data().totalEarned || 0);
        }, 0);
        
        return {
            totalUsers: usersSnapshot.size,
            totalEarnings: totalEarnings,
            pendingWithdraws: withdrawsSnapshot.size,
            totalCompletions: completionsSnapshot.size
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return null;
    }
}

/**
 * Get all users with pagination
 */
async function getAllUsers(limit = 50, startAfter = null) {
    try {
        if (!db) return [];
        
        let query = db.collection('users').orderBy('createdAt', 'desc').limit(limit);
        
        if (startAfter) {
            query = query.startAfter(startAfter);
        }
        
        const docs = await query.get();
        return docs.docs.map(doc => doc.data());
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

/**
 * Approve withdraw request
 */
async function approveWithdraw(withdrawId, adminId) {
    try {
        if (!db) return false;
        
        await db.collection('withdraws').doc(withdrawId).update({
            status: 'approved',
            approvedBy: adminId,
            processedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error approving withdraw:', error);
        return false;
    }
}

/**
 * Reject withdraw request and refund balance
 */
async function rejectWithdraw(withdrawId, adminId, reason) {
    try {
        if (!db) return false;
        
        const withdrawDoc = await db.collection('withdraws').doc(withdrawId).get();
        const withdraw = withdrawDoc.data();
        
        // Refund balance
        const user = await getUserFromFirebase(withdraw.userId);
        await updateUserBalance(withdraw.userId, user.balance + withdraw.amount);
        
        // Update withdraw status
        await db.collection('withdraws').doc(withdrawId).update({
            status: 'rejected',
            rejectedBy: adminId,
            rejectionReason: reason,
            processedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error rejecting withdraw:', error);
        return false;
    }
}

/**
 * Add or update task in Firebase
 */
async function addTask(taskType, taskData) {
    try {
        if (!db) return null;
        
        const taskId = `${taskType}_${Date.now()}`;
        
        await db.collection('tasks').doc(taskType).collection('items').doc(taskId).set({
            id: taskId,
            ...taskData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });
        
        return taskId;
    } catch (error) {
        console.error('Error adding task:', error);
        return null;
    }
}

/**
 * Delete task from Firebase
 */
async function deleteTask(taskType, taskId) {
    try {
        if (!db) return false;
        
        await db.collection('tasks').doc(taskType).collection('items').doc(taskId).delete();
        return true;
    } catch (error) {
        console.error('Error deleting task:', error);
        return false;
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get user's IP address (for fraud detection)
 */
async function getIpAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

/**
 * Validate user session
 */
async function validateUserSession(userId, token) {
    try {
        if (!db) return false;
        
        const user = await getUserFromFirebase(userId);
        return user && user.status === 'active';
    } catch (error) {
        console.error('Error validating session:', error);
        return false;
    }
}

/**
 * Log user activity for analytics
 */
async function logActivity(userId, activityType, activityData) {
    try {
        if (!db) return false;
        
        await db.collection('activities').add({
            userId: userId,
            type: activityType,
            data: activityData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        });
        
        return true;
    } catch (error) {
        console.error('Error logging activity:', error);
        return false;
    }
}

console.log('Firebase utilities loaded');
