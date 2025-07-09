// Ultra-Compatible MOTD Script for GMod Non-Chromium Browser Support
// Uses synchronous XMLHttpRequest and traditional JavaScript syntax only

// Global Variables
var currentCategory = 'general';
var allRules = {};
var allCategories = [];
var apiBaseUrl = '/api'; // Same server now

// Fallback Rules (if API fails)
var fallbackRules = {
    'general': {
        title: 'General Rules',
        content: '<h2>General Rules - DOs & DONTs</h2><p>Basic server rules and guidelines for all players.</p><p>Please connect to the server to see the complete rules.</p>'
    },
    'nlr': {
        title: 'NLR (New Life Rule)',
        content: '<h2>NLR - New Life Rule</h2><p>When you die, you cannot return to the area of your death for <strong>3 minutes</strong> and must forget everything from your previous life.</p>'
    },
    'warns': {
        title: 'Warning System',
        content: '<h2>Warning System</h2><p>Our warning system works as follows:</p><ul><li><strong>1-2 Warns:</strong> Verbal warning from staff</li><li><strong>3-4 Warns:</strong> 1 day ban</li><li><strong>5+ Warns:</strong> 3 day ban or longer</li></ul>'
    }
};

var fallbackCategories = [
    {id: 'general', name: 'General', subtitle: 'DOs & DONTs'},
    {id: 'nlr', name: 'NLR', subtitle: 'Example of NLR & cooldown timers'},
    {id: 'warns', name: 'Warns', subtitle: 'Warn levels & corresponding bans'}
];

// Utility Functions
function safeApiCall(url, method, data, headers) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open(method || 'GET', url, false); // Synchronous for GMod compatibility
        
        // Set headers
        if (headers) {
            for (var key in headers) {
                xhr.setRequestHeader(key, headers[key]);
            }
        }
        
        // Send request
        if (data) {
            xhr.setRequestHeader('Content-Type', 'application/json');
            if (typeof JSON !== 'undefined' && JSON.stringify) {
                xhr.send(JSON.stringify(data));
            } else {
                xhr.send(data.toString());
            }
        } else {
            xhr.send();
        }
        
        // Handle response
        if (xhr.status === 200 || xhr.status === 201) {
            try {
                if (typeof JSON !== 'undefined' && JSON.parse) {
                    return JSON.parse(xhr.responseText);
                } else {
                    // Fallback for very old browsers - return raw text
                    return xhr.responseText;
                }
            } catch (e) {
                console.log('JSON Parse Error:', e);
                return null;
            }
        } else {
            console.log('API Error:', xhr.status, xhr.responseText);
            return null;
        }
    } catch (e) {
        console.log('API Call Failed:', e);
        return null;
    }
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    // Simple error display compatible with GMod
    var errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ff4444; color: white; padding: 10px; border-radius: 5px; z-index: 1000; font-size: 12px;';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(function() {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function loadCategories() {
    console.log('Loading categories from API...');
    var response = safeApiCall(apiBaseUrl + '/rules/categories');
    
    if (response && response.categories && response.categories.length > 0) {
        allCategories = [];
        for (var i = 0; i < response.categories.length; i++) {
            var cat = response.categories[i];
            allCategories.push({
                id: cat.id,
                name: cat.name,
                subtitle: cat.description || ''
            });
        }
        console.log('Loaded', allCategories.length, 'categories from API');
        return true;
    } else {
        console.log('Failed to load categories, using fallback');
        allCategories = fallbackCategories;
        return false;
    }
}

function loadRules() {
    console.log('Loading rules from API...');
    var response = safeApiCall(apiBaseUrl + '/rules');
    
    if (response && response.rules && response.rules.length > 0) {
        allRules = {};
        for (var i = 0; i < response.rules.length; i++) {
            var rule = response.rules[i];
            allRules[rule.category_id] = {
                title: rule.title || 'Rules',
                content: rule.content || '<p>No content available.</p>'
            };
        }
        console.log('Loaded', response.rules.length, 'rules from API');
        return true;
    } else {
        console.log('Failed to load rules, using fallback');
        allRules = fallbackRules;
        return false;
    }
}

function formatRuleContent(content) {
    if (!content) return '';
    
    // Process the content to highlight DO and DO NOT items
    var formatted = content;
    
    // Replace DO NOT patterns with styled spans first
    formatted = formatted.replace(/DO NOT\s+([^<\n]+)/g, function(match, text) {
        return '<span class="rule-do-not"><strong>DO NOT</strong> ' + text + '</span>';
    });
    
    // Replace standalone DO patterns (avoiding already processed DO NOT)
    // Use a more compatible approach without negative lookbehind
    formatted = formatted.replace(/\bDO\s+([^<\n]+)/g, function(match, text) {
        // Skip if this is part of a DO NOT that was already processed
        if (match.indexOf('DO NOT') !== -1) {
            return match;
        }
        return '<span class="rule-do"><strong>DO</strong> ' + text + '</span>';
    });
    
    return formatted;
}

function renderCategories() {
    var nav = document.getElementById('categoriesNav');
    if (!nav) {
        // Fallback for older browsers
        var navs = document.getElementsByClassName('categories-nav');
        if (navs.length > 0) {
            nav = navs[0];
        }
    }
    if (!nav) return;
    
    nav.innerHTML = '';
    
    for (var i = 0; i < allCategories.length; i++) {
        var category = allCategories[i];
        var categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.setAttribute('data-category', category.id);
        
        if (category.id === currentCategory) {
            categoryItem.className += ' active';
        }
        
        categoryItem.innerHTML = 
            '<span class="category-label">' + escapeHtml(category.name) + '</span>' +
            '<span class="category-subtitle">' + escapeHtml(category.subtitle || '') + '</span>';
        
        categoryItem.onclick = function() {
            var categoryId = this.getAttribute('data-category');
            switchCategory(categoryId);
        };
        
        nav.appendChild(categoryItem);
    }
}

function renderRules() {
    var rulesContent = document.getElementById('rulesContent');
    if (!rulesContent) return;
    
    var rule = allRules[currentCategory];
    if (rule) {
        var content = formatRuleContent(rule.content);
        rulesContent.innerHTML = content;
    } else {
        rulesContent.innerHTML = '<p>No rules found for this category. Please check back later.</p>';
    }
}

function switchCategory(categoryId) {
    console.log('Switching to category:', categoryId);
    currentCategory = categoryId;
    
    // Update active category - use getElementsByClassName for compatibility
    var categoryItems = document.getElementsByClassName('category-item');
    for (var i = 0; i < categoryItems.length; i++) {
        var item = categoryItems[i];
        if (item.getAttribute('data-category') === categoryId) {
            item.className = 'category-item active';
        } else {
            item.className = 'category-item';
        }
    }
    
    renderRules();
}

function initializeApp() {
    console.log('Initializing MOTD App...');
    
    // Load data from backend
    var categoriesLoaded = loadCategories();
    var rulesLoaded = loadRules();
    
    if (!categoriesLoaded || !rulesLoaded) {
        console.log('Using fallback data due to API unavailability');
        showError('Using offline mode - some content may be limited');
    }
    
    // Set initial category to first available category
    if (allCategories.length > 0) {
        currentCategory = allCategories[0].id;
    }
    
    // Render initial content
    renderCategories();
    renderRules();
    
    console.log('MOTD App initialized successfully');
}

// Initialize when page loads - compatible with older browsers
if (document.readyState === 'loading') {
    if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else if (document.attachEvent) {
        document.attachEvent('onreadystatechange', function() {
            if (document.readyState === 'complete') {
                initializeApp();
            }
        });
    } else {
        window.onload = initializeApp;
    }
} else {
    initializeApp();
} 