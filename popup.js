const WELLNESS_CATEGORIES = {
    PRODUCTIVE: { score: 1.0, color: '#22c55e', name: 'Productive' },
    EDUCATIONAL: { score: 0.9, color: '#3b82f6', name: 'Educational' },
    NEUTRAL: { score: 0.7, color: '#f59e0b', name: 'Neutral' },
    SOCIAL: { score: 0.4, color: '#f97316', name: 'Social' },
    ENTERTAINMENT: { score: 0.2, color: '#ef4444', name: 'Entertainment' },
    UNKNOWN: { score: 0.5, color: '#6b7280', name: 'Unknown' }
};

document.addEventListener('DOMContentLoaded', function() {
    loadAndUpdateUI();
    updateFocusModeButton();
    
    // Set up event listeners
    document.getElementById('take-break-btn').addEventListener('click', suggestBreak);
    document.getElementById('focus-mode-btn').addEventListener('click', toggleFocusMode);
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-input').click();
    });
    document.getElementById('import-input').addEventListener('change', importData);
    
    // Refresh UI every 30 seconds
    setInterval(loadAndUpdateUI, 30000);
});

function loadAndUpdateUI() {
    chrome.storage.local.get(['dailyData', 'weeklyStats'], function(result) {
        if (result.dailyData) {
            updateUI(result.dailyData, result.weeklyStats || []);
        }
    });
}

function updateUI(data, weeklyStats) {
    updateWellnessScore(data, weeklyStats);
    updateMetrics(data);
    updateCategoryBreakdown(data);
    updateInsights(data);
    updateWeeklyChart(weeklyStats);
}

function updateWellnessScore(data, weeklyStats) {
    const scoreElement = document.getElementById('score-number');
    const trendElement = document.getElementById('score-trend');
    
    if (scoreElement) {
        scoreElement.textContent = data.wellnessScore || 75;
        
        // Update circle color based on score
        const circle = scoreElement.parentElement;
        if (data.wellnessScore >= 80) {
            circle.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        } else if (data.wellnessScore >= 60) {
            circle.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        } else {
            circle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
    }
    
    if (trendElement && weeklyStats.length > 0) {
        const yesterday = weeklyStats[weeklyStats.length - 1];
        const trend = data.wellnessScore - (yesterday?.wellnessScore || 75);
        const trendIcon = trend > 0 ? '↗' : trend < 0 ? '↘' : '→';
        const trendText = trend > 0 ? `+${trend}` : trend.toString();
        trendElement.textContent = `${trendIcon} ${trendText} from yesterday`;
        trendElement.style.color = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#6b7280';
    }
}

function updateMetrics(data) {
    // Active time
    const activeTimeElement = document.getElementById('active-time');
    if (activeTimeElement) {
        const hours = Math.floor((data.totalTime || 0) / 3600000);
        const minutes = Math.floor(((data.totalTime || 0) % 3600000) / 60000);
        activeTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    // Focus time
    const focusTimeElement = document.getElementById('focus-time');
    if (focusTimeElement) {
        const hours = Math.floor((data.focusTime || 0) / 3600000);
        const minutes = Math.floor(((data.focusTime || 0) % 3600000) / 60000);
        focusTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    // Tab switches
    const tabSwitchesElement = document.getElementById('tab-switches');
    if (tabSwitchesElement) {
        tabSwitchesElement.textContent = data.tabSwitches || 0;
    }
    
    // Distraction events
    const distractionElement = document.getElementById('distraction-events');
    if (distractionElement) {
        distractionElement.textContent = data.distractionEvents || 0;
    }
}

function updateCategoryBreakdown(data) {
    const categoryList = document.getElementById('category-list');
    if (!categoryList || !data.categoryBreakdown) return;
    
    categoryList.innerHTML = '';
    
    const totalTime = data.totalTime || 0;
    if (totalTime === 0) {
        categoryList.innerHTML = '<p class="no-data">No activity yet today</p>';
        return;
    }
    
    // Sort categories by time spent
    const sortedCategories = Object.entries(data.categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Show top 5 categories
    
    sortedCategories.forEach(([category, time]) => {
        const percentage = Math.round((time / totalTime) * 100);
        const hours = Math.floor(time / 3600000);
        const minutes = Math.floor((time % 3600000) / 60000);
        
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.innerHTML = `
            <div class="category-info">
                <div class="category-color" style="background-color: ${WELLNESS_CATEGORIES[category]?.color || '#6b7280'}"></div>
                <span class="category-name">${WELLNESS_CATEGORIES[category]?.name || category}</span>
            </div>
            <div class="category-stats">
                <span class="category-time">${hours}h ${minutes}m</span>
                <span class="category-percentage">${percentage}%</span>
            </div>
        `;
        categoryList.appendChild(categoryElement);
    });
}

function updateInsights(data) {
    const insightList = document.getElementById('insight-list');
    if (!insightList) return;
    
    insightList.innerHTML = '';
    
    const insights = generateInsights(data);
    
    insights.forEach(insight => {
        const insightElement = document.createElement('div');
        insightElement.className = `insight-item ${insight.type}`;
        insightElement.innerHTML = `
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `;
        insightList.appendChild(insightElement);
    });
}

function generateInsights(data) {
    const insights = [];
    
    // Wellness score insights
    if (data.wellnessScore >= 80) {
        insights.push({
            type: 'positive',
            icon: '🎯',
            title: 'Great Focus!',
            description: 'Your wellness score is excellent. Keep up the productive browsing!'
        });
    } else if (data.wellnessScore < 50) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Low Wellness Score',
            description: 'Consider spending more time on productive activities.'
        });
    }
    
    // Focus time insights
    if ((data.focusTime || 0) > 7200000) { // 2+ hours
        insights.push({
            type: 'positive',
            icon: '🔥',
            title: 'Focus Champion!',
            description: 'You\'ve had great focus sessions today.'
        });
    }
    
    // Tab switching insights
    if (data.tabSwitches > 100) {
        insights.push({
            type: 'warning',
            icon: '🔄',
            title: 'High Tab Activity',
            description: 'Try to reduce tab switching for better focus.'
        });
    }
    
    // Category-specific insights
    if (data.categoryBreakdown) {
        const socialTime = data.categoryBreakdown['SOCIAL'] || 0;
        const totalTime = data.totalTime || 0;
        
        if (socialTime > totalTime * 0.3) { // More than 30% social
            insights.push({
                type: 'info',
                icon: '📱',
                title: 'Social Media Usage',
                description: 'Consider balancing social media with productive activities.'
            });
        }
    }
    
    return insights.slice(0, 3); // Show max 3 insights
}

function updateWeeklyChart(weeklyStats) {
    const chartContainer = document.getElementById('weekly-chart');
    if (!chartContainer) return;
    
    chartContainer.innerHTML = '';
    
    if (weeklyStats.length === 0) {
        chartContainer.innerHTML = '<p class="no-data">No weekly data available</p>';
        return;
    }
    
    const maxScore = Math.max(...weeklyStats.map(day => day.wellnessScore), 100);
    
    weeklyStats.forEach((day, index) => {
        const dayElement = document.createElement('div');
        dayElement.className = 'chart-day';
        
        const barHeight = (day.wellnessScore / maxScore) * 100;
        const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
        
        dayElement.innerHTML = `
            <div class="chart-bar" style="height: ${barHeight}%; background-color: ${getScoreColor(day.wellnessScore)}"></div>
            <div class="chart-label">${dayName}</div>
            <div class="chart-score">${day.wellnessScore}</div>
        `;
        
        chartContainer.appendChild(dayElement);
    });
}

// Data backup functionality
function exportData() {
    chrome.storage.local.get(null, (data) => {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: data
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindful-browse-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    });
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (importData.version && importData.data) {
                chrome.storage.local.set(importData.data, () => {
                    alert('Data imported successfully! Please reload the extension.');
                });
            } else {
                alert('Invalid backup file format.');
            }
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function getScoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

function suggestBreak() {
    const breakSuggestions = [
        "Take a 5-minute walk",
        "Do some deep breathing exercises",
        "Stretch your neck and shoulders",
        "Look away from the screen for 20 seconds",
        "Drink a glass of water",
        "Do some quick desk exercises"
    ];
    
    const randomSuggestion = breakSuggestions[Math.floor(Math.random() * breakSuggestions.length)];
    alert(`Break Time! 🧘‍♀️\n\n${randomSuggestion}`);
}

function toggleFocusMode() {
    chrome.storage.local.get(['focusMode'], (result) => {
        const currentMode = result.focusMode || false;
        const newMode = !currentMode;
        
        // Update storage
        chrome.storage.local.set({ focusMode: newMode });
        
        // Update button text
        const button = document.getElementById('focus-mode-btn');
        button.textContent = newMode ? 'Exit Focus Mode' : 'Focus Mode';
        button.style.background = newMode ? 
            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        
        // Notify all tabs about focus mode change
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'focus_mode_changed',
                    enabled: newMode
                }).catch(() => {
                    // Ignore errors for tabs that don't have content script
                });
            });
        });
        
        // Show feedback
        if (newMode) {
            showFocusNotification('Focus Mode Activated! 🎯\n\nDistracting sites will be blocked.');
        } else {
            showFocusNotification('Focus Mode Deactivated\n\nAll sites are now accessible.');
        }
    });
}

function showFocusNotification(message) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #22c55e;
        color: white;
        padding: 16px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update focus mode button state on load
function updateFocusModeButton() {
    chrome.storage.local.get(['focusMode'], (result) => {
        const focusMode = result.focusMode || false;
        const button = document.getElementById('focus-mode-btn');
        
        if (button) {
            button.textContent = focusMode ? 'Exit Focus Mode' : 'Focus Mode';
            button.style.background = focusMode ? 
                'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    });
}
