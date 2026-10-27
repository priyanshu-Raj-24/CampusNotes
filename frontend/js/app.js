
const API_BASE = (() => {
    const configured = window.CAMPUSNOTES_API_BASE;
    if (configured && configured.trim()) return configured.replace(/\/$/, '');

    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (isLocalHost) return 'http://localhost:5000/api';

    return `${window.location.origin}/api`;
})();


const firebaseConfig = {
    apiKey:            "AIzaSyBzA2Vpn-oKMkv5SxyY6bCQ-hMrVd1Exa4",
    authDomain:        "campusnotes-a2720.firebaseapp.com",
    projectId:         "campusnotes-a2720",
    storageBucket:     "campusnotes-a2720.firebasestorage.app",
    messagingSenderId: "1084104758698",
    appId:             "1:1084104758698:web:fbd0b3d4bfca8262f2c7d3",
    measurementId:     "G-B1ZDDNM07G"
};

// Guard against double-initialisation (e.g. hot-reload)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth     = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let idToken = null; // Stores the signed-in user's JWT for secured API calls


function getAvatarUrl(user) {
    if (user && user.photoURL) return user.photoURL;
    const name = encodeURIComponent((user && (user.displayName || user.email)) || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=285744&color=fff&size=64`;
}

function updateUserProfileUI(user) {
    const profile      = document.getElementById('user-profile');
    const avatar       = document.getElementById('user-avatar');
    const displayName  = document.getElementById('user-display-name');
    const mobileInfo   = document.getElementById('mobile-user-info');
    const mobileAvatar = document.getElementById('mobile-user-avatar');
    const mobileName   = document.getElementById('mobile-user-name');
    const greeting     = document.getElementById('modal-greeting');

    const navAdminLink    = document.getElementById('nav-admin-link');
    const mobileAdminLink = document.getElementById('mobile-admin-link');

    if (user) {
        const name = user.displayName || user.email || 'Student';
        const url  = getAvatarUrl(user);

        if (profile) {
            profile.classList.remove('hidden');
            profile.classList.add('flex');
        }
        if (avatar) {
            avatar.src = url;
            avatar.alt = name;
        }
        if (displayName) displayName.textContent = name;

        if (mobileInfo)   mobileInfo.classList.remove('hidden');
        if (mobileAvatar) {
            mobileAvatar.src = url;
            mobileAvatar.alt = name;
        }
        if (mobileName) mobileName.textContent = name;
        if (greeting)   greeting.textContent = `Hi, ${name.split(' ')[0]}`;

        // Admin link is shown/hidden by checkAdminStatus() after token is ready
    } else {
        if (profile) {
            profile.classList.add('hidden');
            profile.classList.remove('flex');
        }
        if (mobileInfo) mobileInfo.classList.add('hidden');
        if (greeting)   greeting.textContent = '';

        // Hide Admin link when signed out
        if (navAdminLink)    navAdminLink.classList.add('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
    }
}

function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent scrolling behind modal
}

function hideLoginModal() {
    const modal = document.getElementById('login-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = ''; // restore scrolling
}

function setSignInBusy(busy) {
    const btn   = document.getElementById('google-signin-btn');
    const label = document.getElementById('signin-label');
    if (btn)   btn.disabled = busy;
    if (label) label.textContent = busy ? 'Signing in…' : 'Continue with Google';
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        idToken = await user.getIdToken();
        updateUserProfileUI(user);
        hideLoginModal();
        checkUserPreferences();
        checkAdminStatus(); // Show/hide Admin link based on server-verified admin role
    } else {
        idToken = null;
        updateUserProfileUI(null);
        closeWelcomeModal();
        showLoginModal();
        setAdminLinkVisible(false); // Always hide Admin link on sign-out

        const adminSection = document.getElementById('admin-section');
        if (adminSection && !adminSection.classList.contains('hidden')) {
            showSection('home');
        }
    }
});

// Check with the backend whether the signed-in user is an admin,
// then show or hide the Admin nav link accordingly.
async function checkAdminStatus() {
    const navAdminLink    = document.getElementById('nav-admin-link');
    const mobileAdminLink = document.getElementById('mobile-admin-link');

    // Hide first — will only be revealed if server confirms admin
    setAdminLinkVisible(false);

    try {
        if (!idToken && auth.currentUser) idToken = await auth.currentUser.getIdToken();
        if (!idToken) return;

        const res  = await fetch(`${API_BASE}/admin/verify`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
        });
        const data = await res.json();

        if (res.ok && data.isAdmin) {
            setAdminLinkVisible(true);
        }
    } catch (err) {
        // Network error or backend down — keep Admin link hidden
        console.warn('Admin status check failed:', err.message);
    }
}

function setAdminLinkVisible(visible) {
    const navAdminLink    = document.getElementById('nav-admin-link');
    const mobileAdminLink = document.getElementById('mobile-admin-link');
    if (visible) {
        if (navAdminLink)    navAdminLink.classList.remove('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.remove('hidden');
    } else {
        if (navAdminLink)    navAdminLink.classList.add('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
    }
}

async function signInWithGoogle() {
    setSignInBusy(true);
    try {
        await auth.signInWithPopup(provider);
        showToast('Signed in successfully. Welcome!', 'success');
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            showToast(`Login failed: ${error.message}`, 'error');
        }
    } finally {
        setSignInBusy(false);
    }
}

async function handleSignOut() {
    try {
        await auth.signOut();
        showToast('Signed out successfully.', 'success');
    } catch (error) {
        showToast(`Sign out failed: ${error.message}`, 'error');
    }
}


function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span class="text-base font-bold">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Auto-remove after animation (3.6s display + 0.4s fadeout)
    setTimeout(() => toast.remove(), 4100);
}


function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn  = document.getElementById('hamburger-btn');
    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
}

function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn  = document.getElementById('hamburger-btn');
    if (!menu) return;
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
}


const SECTIONS = ['home', 'upload', 'admin'];

function showSection(sectionId) {
    if (!auth.currentUser) {
        showLoginModal();
        return;
    }

    // Guard admin section — require a valid token
    if (sectionId === 'admin' && !idToken) {
        showToast('Please sign in first.', 'error');
        return;
    }

    SECTIONS.forEach(id => {
        const el = document.getElementById(`${id}-section`);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(`${sectionId}-section`);
    if (target) target.classList.remove('hidden');

    closeMobileMenu();

    if (sectionId === 'home')  checkUserPreferences();
    if (sectionId === 'admin') fetchAdminResources();
}


const FILE_TYPE_ICONS = {
    pdf:  '📄',
    docx: '📝',
    doc:  '📝',
    txt:  '📃',
    png:  '🖼️',
    jpg:  '🖼️',
    jpeg: '🖼️',
};

const CATEGORY_COLORS = {
    'Lecture Notes':                 'bg-blue-50 text-blue-700',
    'Previous Year Question Papers': 'bg-amber-50 text-amber-700',
    'Lab Manuals':                   'bg-purple-50 text-purple-700',
    'Reference Materials':           'bg-[#EAF0EB] text-[#285744]',
};

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024)            return `${bytes} B`;
    if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(isoString) {
    if (!isoString) return '';
    try {
        return new Date(isoString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch {
        return '';
    }
}

function buildResourceCard(res) {
    const ext      = (res.fileExtension || (res.originalFilename ? res.originalFilename.split('.').pop() : 'file')).toLowerCase();
    const icon     = FILE_TYPE_ICONS[ext] || '📎';
    const catColor = CATEGORY_COLORS[res.category] || 'bg-gray-100 text-gray-700';
    const size     = formatFileSize(res.fileSizeBytes);
    const date     = formatDate(res.createdAt);
    const catLabel = res.category === 'Previous Year Question Papers' ? 'Question Papers' : res.category;

    // Show a "NEW" badge for resources uploaded in the last 7 days
    const isNew    = res.createdAt && (Date.now() - new Date(res.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
    const newBadge = isNew ? `<span class="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">NEW</span>` : '';

    return `
    <article class="resource-card" aria-label="${res.title}">
        <div class="flex justify-between items-start mb-3 gap-2">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${catColor} truncate">${catLabel}</span>
            <div class="flex items-center gap-1.5 flex-shrink-0">
                ${newBadge}
                <span class="text-xs text-[#747A76] whitespace-nowrap">Y${res.academicYear} · S${res.semesterNumber}</span>
            </div>
        </div>
        <div class="flex items-start gap-3 mb-2">
            <span class="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">${icon}</span>
            <div class="min-w-0">
                <h3 class="font-bold text-base text-[#202522] leading-snug line-clamp-2">${res.title}</h3>
                <p class="text-sm text-[#747A76] mt-0.5 truncate">${res.subject}</p>
            </div>
        </div>
        <div class="mt-auto pt-3 border-t border-[#E5E7E2] flex justify-between items-center gap-2">
            <div class="text-xs text-[#747A76] truncate">
                <span class="uppercase font-medium">${ext}</span>${size ? ` · ${size}` : ''}${date ? ` · ${date}` : ''}
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <button class="share-btn" onclick="shareResource('${res.id}','${res.title.replace(/'/g, "\\'")}')"
                    aria-label="Share ${res.title}" title="Share">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                </button>
                <a href="${API_BASE}/download/${res.id}"
                    class="text-[#285744] hover:underline font-semibold text-sm flex items-center gap-1"
                    aria-label="Download ${res.title}"
                    download="${res.originalFilename || res.title}">
                    Download
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"/>
                    </svg>
                </a>
            </div>
        </div>
    </article>`;
}

function buildEmptyState(message) {
    return `<div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <div class="text-5xl mb-4">📭</div>
        <p class="text-[#747A76] text-base font-medium">${message}</p>
    </div>`;
}

async function shareResource(id, title) {
    const url = `${window.location.origin}/api/download/${id}`;
    if (navigator.share) {
        // Native share sheet on mobile (Android/iOS)
        try {
            await navigator.share({ title: `CampusNotes – ${title}`, url });
        } catch (e) {
            if (e.name !== 'AbortError') showToast('Could not share.', 'error');
        }
    } else {
        // Desktop fallback: copy link to clipboard
        try {
            await navigator.clipboard.writeText(url);
            showToast('Link copied to clipboard!', 'success');
        } catch {
            showToast('Could not copy link.', 'error');
        }
    }
}

function buildErrorState(message) {
    return `<div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <div class="text-5xl mb-4">⚠️</div>
        <p class="text-red-600 text-base font-medium">${message}</p>
    </div>`;
}

const SPINNER_HTML = `<div class="col-span-full flex justify-center py-10">
    <svg class="w-8 h-8 text-[#285744] animate-spin" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
</div>`;

const SKELETON_CARD = `<div class="resource-card">
    <div class="skeleton h-5 w-2/3 mb-3 rounded"></div>
    <div class="skeleton h-4 w-full mb-2 rounded"></div>
    <div class="skeleton h-4 w-1/2 mb-6 rounded"></div>
    <div class="skeleton h-3 w-full rounded"></div>
</div>`;


async function fetchResources(prefYear = null, prefSemester = null) {
    const grid    = document.getElementById('resources-grid');
    const countEl = document.getElementById('resource-count');
    const titleEl = document.getElementById('resource-section-title');

    grid.innerHTML  = Array(3).fill(SKELETON_CARD).join('');
    countEl.textContent = '';

    try {
        let url = `${API_BASE}/resources`;
        if (prefYear && prefSemester) {
            url = `${API_BASE}/search?year=${prefYear}&semester=${prefSemester}`;
        }

        const response  = await fetch(url);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const resources = await response.json();

        titleEl.textContent = prefYear
            ? `Resources for Year ${prefYear}, Semester ${prefSemester}`
            : 'Recently Published';
        countEl.textContent = resources.length
            ? `${resources.length} resource${resources.length !== 1 ? 's' : ''}`
            : '';

        grid.innerHTML = resources.length
            ? resources.map(buildResourceCard).join('')
            : buildEmptyState('No resources found for this selection yet. Be the first to upload!');

    } catch (error) {
        console.error('Error fetching resources:', error);
        grid.innerHTML = buildErrorState('Failed to load resources. Is the backend running?');
    }
}


async function handleSearch() {
    const q        = document.getElementById('searchInput').value.trim();
    const year     = document.getElementById('filterYear').value;
    const semester = document.getElementById('filterSemester').value;
    const category = document.getElementById('filterCategory').value;

    const grid    = document.getElementById('resources-grid');
    const countEl = document.getElementById('resource-count');
    const titleEl = document.getElementById('resource-section-title');

    // If nothing entered, reset to all
    if (!q && !year && !semester && !category) {
        titleEl.textContent = 'Recently Published';
        fetchResources();
        return;
    }

    grid.innerHTML  = SPINNER_HTML;
    countEl.textContent = '';

    const params = new URLSearchParams();
    if (q)        params.append('q', q);
    if (year)     params.append('year', year);
    if (semester) params.append('semester', semester);
    if (category) params.append('category', category);

    try {
        const response  = await fetch(`${API_BASE}/search?${params.toString()}`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const resources = await response.json();

        const parts = [];
        if (q)        parts.push(`"${q}"`);
        if (year)     parts.push(`Year ${year}`);
        if (semester) parts.push(`Sem ${semester}`);
        if (category) parts.push(category);
        titleEl.textContent = `Search results for ${parts.join(' · ')}`;
        countEl.textContent = resources.length
            ? `${resources.length} result${resources.length !== 1 ? 's' : ''}`
            : '';

        grid.innerHTML = resources.length
            ? resources.map(buildResourceCard).join('')
            : buildEmptyState('No matching resources found. Try different keywords or filters.');

    } catch (error) {
        console.error('Search error:', error);
        grid.innerHTML = buildErrorState('Search failed. Please try again.');
        showToast('Search failed. Is the backend running?', 'error');
    }
}

// Category quick-filter pills — syncs with the dropdown and triggers a search
function quickFilterCategory(category) {
    // Update the active pill styling
    document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.classList.remove('cat-pill-active');
        btn.classList.add('cat-pill');
    });
    const clicked = [...document.querySelectorAll('.cat-pill')]
        .find(btn => btn.textContent.trim().replace(/^.\s/, '') === (category === '' ? 'All' : category.replace('Previous Year Question Papers', 'Question Papers').replace('Reference Materials', 'Reference')));
    if (clicked) clicked.classList.add('cat-pill-active');

    // Sync the category dropdown so existing search logic stays consistent
    const dropdown = document.getElementById('filterCategory');
    if (dropdown) dropdown.value = category;

    // Clear other filters and trigger the search
    document.getElementById('searchInput').value = '';
    document.getElementById('filterYear').value     = '';
    document.getElementById('filterSemester').value = '';

    if (!category) {
        document.getElementById('resource-section-title').textContent = 'Recently Published';
        fetchResources();
    } else {
        handleSearch();
    }
}


async function fetchAdminResources() {
    if (!idToken) {
        showToast('Session expired. Please log in again.', 'error');
        showSection('home');
        return;
    }

    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-[#747A76]">
        <svg class="w-6 h-6 animate-spin text-[#285744] mx-auto" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
    </td></tr>`;

    try {
        // Refresh token before each admin call in case it's expired
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();

        const response = await fetch(`${API_BASE}/admin/resources`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
        });

        if (response.status === 401 || response.status === 403) {
            showToast('Access denied. Admin only.', 'error');
            showSection('home');
            return;
        }

        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const resources = await response.json();

        if (resources.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-[#747A76]">No resources found.</td></tr>';
            return;
        }

        const STATUS_STYLES = {
            'published':      'bg-green-100 text-green-800',
            'pending_review': 'bg-amber-100 text-amber-800',
            'restricted':     'bg-red-100 text-red-800',
        };

        tbody.innerHTML = resources.map(res => {
            const colorClass  = STATUS_STYLES[res.status] || 'bg-gray-100 text-gray-800';
            const statusLabel = res.status.replace(/_/g, ' ');
            const date        = formatDate(res.createdAt);

            const publishBtn  = res.status !== 'published'
                ? `<button onclick="updateStatus('${res.id}', 'published')"  class="text-xs text-green-700 font-semibold hover:underline">Publish</button>`
                : '';
            const restrictBtn = res.status !== 'restricted'
                ? `<button onclick="updateStatus('${res.id}', 'restricted')" class="text-xs text-red-700   font-semibold hover:underline">Restrict</button>`
                : '';
            const deleteBtn = `<button onclick="deleteResource('${res.id}', \`${res.title.replace(/`/g, "'")}\`)"
                class="text-xs text-white bg-red-500 hover:bg-red-600 active:bg-red-700 font-semibold px-2.5 py-1 rounded transition-colors"
                aria-label="Delete ${res.title}">Delete</button>`;

            return `
            <tr class="border-b border-[#E5E7E2] hover:bg-[#F8F8F5] transition-colors">
                <td class="p-4">
                    <div class="font-medium text-[#202522] line-clamp-1">${res.title}</div>
                    <div class="text-xs text-[#747A76] mt-0.5">${res.originalFilename}${date ? ` · ${date}` : ''}</div>
                </td>
                <td class="p-4 text-sm text-[#747A76] whitespace-nowrap">
                    ${res.subject} <span class="text-[#c3d6cb]">|</span> Y${res.academicYear} S${res.semesterNumber}
                </td>
                <td class="p-4">
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${colorClass}">${statusLabel}</span>
                </td>
                <td class="p-4">
                    <div class="flex flex-wrap items-center justify-end gap-2">
                        ${publishBtn}${restrictBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error('Admin fetch error:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-red-600">Failed to load admin panel. Is the backend running?</td></tr>';
    }
}

async function updateStatus(id, newStatus) {
    if (!confirm(`Mark this resource as "${newStatus.replace(/_/g, ' ')}"?`)) return;
    if (!idToken) { showToast('Not authenticated. Please log in again.', 'error'); return; }

    try {
        // Refresh token
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();

        const response = await fetch(`${API_BASE}/admin/resources/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        showToast(`Resource marked as ${newStatus.replace(/_/g, ' ')}.`, 'success');
        fetchAdminResources();
    } catch (error) {
        console.error('updateStatus error:', error);
        showToast('Failed to update status. Please try again.', 'error');
    }
}

async function deleteResource(id, title) {
    // Show a clear confirmation before permanently deleting
    if (!confirm(`⚠️ Permanently delete "${title}"?\n\nThis will remove the file from Cloudinary and Firestore. This cannot be undone.`)) return;
    if (!idToken) { showToast('Not authenticated. Please log in again.', 'error'); return; }

    try {
        // Refresh token
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();

        const response = await fetch(`${API_BASE}/admin/resources/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${idToken}` },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        showToast(`"${title}" has been permanently deleted.`, 'success');
        fetchAdminResources(); // Refresh the admin table
    } catch (error) {
        console.error('deleteResource error:', error);
        showToast(`Delete failed: ${error.message}`, 'error');
    }
}


function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.add('drag-over');
}
function handleDragLeave() {
    document.getElementById('drop-zone').classList.remove('drag-over');
}
function handleDrop(e) {
    e.preventDefault();
    handleDragLeave();
    const file = e.dataTransfer.files[0];
    if (file) applySelectedFile(file);
}
function handleFileSelect(input) {
    if (input.files[0]) applySelectedFile(input.files[0]);
}

function applySelectedFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        showToast('File exceeds the 10 MB limit. Please choose a smaller file.', 'error');
        return;
    }
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
        showToast(`File type "${ext}" is not supported.`, 'error');
        return;
    }

    // Transfer file to the hidden input
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('file').files = dt.files;

    document.getElementById('drop-label').innerHTML =
        `<span class="text-[#285744] font-semibold">✓ ${file.name}</span> <span class="text-[#747A76] text-xs">(${formatFileSize(file.size)})</span>`;
}

function validateUploadForm() {
    const fields = [
        { id: 'title',        msg: 'Please enter a resource title.'    },
        { id: 'academicYear', msg: 'Please select an academic year.'   },
        { id: 'semester',     msg: 'Please select a semester.'         },
        { id: 'subject',      msg: 'Please enter the subject name.'    },
        { id: 'category',     msg: 'Please select a category.'         },
    ];
    for (const { id, msg } of fields) {
        if (!document.getElementById(id).value.trim()) {
            showToast(msg, 'error');
            document.getElementById(id).focus();
            return false;
        }
    }
    if (!document.getElementById('file').files[0]) {
        showToast('Please select a file to upload.', 'error');
        return false;
    }
    return true;
}

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateUploadForm()) return;

    const submitBtn     = document.getElementById('submit-btn');
    const submitLabel   = document.getElementById('submit-label');
    const submitSpinner = document.getElementById('submit-spinner');

    submitBtn.disabled = true;
    submitLabel.textContent = 'Uploading…';
    submitSpinner.classList.remove('hidden');

    const file = document.getElementById('file').files[0];
    const ext  = file.name.split('.').pop().toLowerCase();

    const formData = new FormData();
    formData.append('title',         document.getElementById('title').value.trim());
    formData.append('academicYear',  document.getElementById('academicYear').value);
    formData.append('semester',      document.getElementById('semester').value);
    formData.append('subject',       document.getElementById('subject').value.trim());
    formData.append('category',      document.getElementById('category').value);
    formData.append('fileExtension', ext);
    formData.append('file',          file);

    // Show progress bar
    const progressWrap  = document.getElementById('upload-progress-wrap');
    const progressBar   = document.getElementById('upload-progress-bar');
    const progressLabel = document.getElementById('upload-progress-label');
    progressWrap.style.display  = 'block';
    progressLabel.style.display = 'block';
    progressBar.style.width     = '0%';
    progressLabel.textContent   = 'Uploading… 0%';

    try {
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}/resources`);

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width   = `${pct}%`;
                    progressLabel.textContent = `Uploading… ${pct}%`;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    progressBar.style.width   = '100%';
                    progressLabel.textContent = 'Upload complete!';
                    resolve(xhr.responseText);
                } else {
                    try {
                        const d = JSON.parse(xhr.responseText);
                        reject(new Error(d.error || `Server error ${xhr.status}`));
                    } catch {
                        reject(new Error(`Server error ${xhr.status}`));
                    }
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error — check your connection.')));
            xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

            xhr.send(formData);
        });

        showToast('Upload successful! It will be reviewed before going live.', 'success');
        document.getElementById('upload-form').reset();
        document.getElementById('drop-label').innerHTML =
            `Drag &amp; drop your file here, or <span class="text-[#285744] underline cursor-pointer">browse</span>`;
        setTimeout(() => showSection('home'), 1500);
    } catch (error) {
        showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = 'Upload & Submit for Review';
        submitSpinner.classList.add('hidden');
        setTimeout(() => {
            progressWrap.style.display  = 'none';
            progressLabel.style.display = 'none';
            progressBar.style.width     = '0%';
        }, 2500);
    }
});


function getSemesterOptions(year) {
    const start = (year - 1) * 2 + 1;
    return `<option value="${start}">Semester ${start}</option>
            <option value="${start + 1}">Semester ${start + 1}</option>`;
}

function updateUploadSemesters() {
    const year = parseInt(document.getElementById('academicYear').value);
    if (!year) return;
    document.getElementById('semester').innerHTML = getSemesterOptions(year);
}

function updateModalSemesters() {
    const year = parseInt(document.getElementById('modal-year').value);
    document.getElementById('modal-semester').innerHTML = getSemesterOptions(year);
}


function checkUserPreferences() {
    if (!auth.currentUser) {
        showLoginModal();
        return;
    }

    const year = localStorage.getItem('campusNotesYear');
    const sem  = localStorage.getItem('campusNotesSemester');

    if (!year || !sem) {
        openWelcomeModal();
        fetchResources();
    } else {
        fetchResources(year, sem);
        updatePreferenceBanner(year, sem);
        document.getElementById('filterYear').value = year;
        document.getElementById('filterSemester').value = sem;
    }
}

function openWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    updateModalSemesters();
}

function closeWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function saveUserPreferences() {
    const year = document.getElementById('modal-year').value;
    const sem  = document.getElementById('modal-semester').value;

    localStorage.setItem('campusNotesYear', year);
    localStorage.setItem('campusNotesSemester', sem);

    closeWelcomeModal();
    document.getElementById('filterYear').value = year;
    document.getElementById('filterSemester').value = sem;
    fetchResources(year, sem);
    updatePreferenceBanner(year, sem);
}

function closeModalAndShowAll() {
    closeWelcomeModal();
    document.getElementById('active-preference-banner').classList.add('hidden');
    localStorage.removeItem('campusNotesYear');
    localStorage.removeItem('campusNotesSemester');
    fetchResources();
}

function updatePreferenceBanner(year, sem) {
    document.getElementById('preference-text').textContent =
        `📚 Showing resources for Year ${year}, Semester ${sem}`;
    document.getElementById('active-preference-banner').classList.remove('hidden');
}


document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'searchInput') {
        handleSearch();
    }
    if (e.key === 'Escape') {
        const welcome = document.getElementById('welcome-modal');
        if (welcome && !welcome.classList.contains('hidden') && auth.currentUser) {
            closeModalAndShowAll();
        }
    }
});

// ── Back to top button ──
const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }, { passive: true });
}


// ── Dark / Light Theme Toggle ──────────────────────────────────
// Persists choice in localStorage. Applied immediately on load (see <head> inline script).

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const moon = document.getElementById('theme-icon-moon');
    const sun  = document.getElementById('theme-icon-sun');
    if (theme === 'dark') {
        if (moon) moon.classList.add('hidden');
        if (sun)  sun.classList.remove('hidden');
    } else {
        if (moon) moon.classList.remove('hidden');
        if (sun)  sun.classList.add('hidden');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('campusNotes_theme', next);
    applyTheme(next);
}

// Apply saved theme on JS load (also applied inline in <head> to avoid flash)
(function () {
    const saved = localStorage.getItem('campusNotes_theme') || 'light';
    applyTheme(saved);
})();
