const API_BASE = 'http://localhost:5000/api';

// Simple Single Page App Routing
function showSection(sectionId) {
    document.getElementById('home-section').classList.add('hidden');
    document.getElementById('upload-section').classList.add('hidden');
    
    const adminSection = document.getElementById('admin-section');
    if (adminSection) adminSection.classList.add('hidden');

    document.getElementById(`${sectionId}-section`).classList.remove('hidden');
    
    if (sectionId === 'home') {
        checkUserPreferences();
    } else if (sectionId === 'admin') {
        fetchAdminResources();
    }
}

// Fetch and display resources (Homepage)
async function fetchResources(prefYear = null, prefSemester = null) {
    const grid = document.getElementById('resources-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-[#747A76]">Loading resources...</div>';

    try {
        let url = `${API_BASE}/resources`;
        if (prefYear && prefSemester) {
            url = `${API_BASE}/search?year=${prefYear}&semester=${prefSemester}`;
        }

        const response = await fetch(url);
        const resources = await response.json();

        if (resources.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-10 bg-white border border-[#E5E7E2] rounded-lg text-[#747A76]">No resources found for this selection yet. Be the first to upload!</div>';
            return;
        }

        grid.innerHTML = resources.map(res => `
            <div class="bg-white border border-[#E5E7E2] rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col h-full">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-xs font-semibold px-2 py-1 bg-[#EAF0EB] text-[#285744] rounded">${res.category}</span>
                    <span class="text-xs text-[#747A76]">Year ${res.academicYear} • Sem ${res.semesterNumber}</span>
                </div>
                <h3 class="font-bold text-lg mb-1 text-[#202522]">${res.title}</h3>
                <p class="text-sm text-[#747A76] mb-4">${res.subject}</p>
                <div class="mt-auto pt-4 border-t border-[#E5E7E2] flex justify-between items-center">
                    <span class="text-xs text-[#747A76] uppercase">${res.fileExtension || 'FILE'} • ${(res.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                    <a href="${res.downloadUrl}" target="_blank" class="text-[#285744] hover:underline font-medium text-sm">Download</a>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error fetching resources:', error);
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-red-600">Failed to load resources. Is the backend running?</div>';
    }
}

// --- Search Functionality ---
async function handleSearch() {
    const q = document.getElementById('searchInput').value;
    const year = document.getElementById('filterYear').value;
    
    const queryParams = new URLSearchParams();
    if (q) queryParams.append('q', q);
    if (year) queryParams.append('year', year);

    const grid = document.getElementById('resources-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-[#747A76]">Searching...</div>';

    try {
        const response = await fetch(`${API_BASE}/search?${queryParams.toString()}`);
        const resources = await response.json();

        if (resources.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-10 bg-white border border-[#E5E7E2] rounded-lg text-[#747A76]">No matching resources found.</div>';
            return;
        }

        grid.innerHTML = resources.map(res => `
            <div class="bg-white border border-[#E5E7E2] rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col h-full">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-xs font-semibold px-2 py-1 bg-[#EAF0EB] text-[#285744] rounded">${res.category}</span>
                    <span class="text-xs text-[#747A76]">Year ${res.academicYear} • Sem ${res.semesterNumber}</span>
                </div>
                <h3 class="font-bold text-lg mb-1 text-[#202522]">${res.title}</h3>
                <p class="text-sm text-[#747A76] mb-4">${res.subject}</p>
                <div class="mt-auto pt-4 border-t border-[#E5E7E2] flex justify-between items-center">
                    <span class="text-xs text-[#747A76] uppercase">${res.fileExtension || 'FILE'} • ${(res.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                    <a href="${res.downloadUrl}" target="_blank" class="text-[#285744] hover:underline font-medium text-sm">Download</a>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Search error:', error);
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-red-600">Search failed.</div>';
    }
}

// --- Admin Functionality ---
async function fetchAdminResources() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-[#747A76]">Loading data...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/admin/resources`);
        const resources = await response.json();

        tbody.innerHTML = resources.map(res => {
            const statusColors = {
                'published': 'bg-green-100 text-green-800',
                'pending_review': 'bg-yellow-100 text-yellow-800',
                'restricted': 'bg-red-100 text-red-800'
            };
            const colorClass = statusColors[res.status] || 'bg-gray-100 text-gray-800';

            return `
            <tr class="border-b border-[#E5E7E2] hover:bg-[#F8F8F5]">
                <td class="p-4">
                    <div class="font-medium text-[#202522]">${res.title}</div>
                    <div class="text-xs text-[#747A76] mt-1 break-all">${res.originalFilename}</div>
                </td>
                <td class="p-4 text-sm text-[#747A76]">${res.subject} (Y${res.academicYear} S${res.semesterNumber})</td>
                <td class="p-4">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${colorClass}">${res.status}</span>
                </td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="updateStatus('${res.id}', 'published')" class="text-xs text-green-700 font-medium hover:underline">Publish</button>
                    <button onclick="updateStatus('${res.id}', 'restricted')" class="text-xs text-red-700 font-medium hover:underline">Restrict</button>
                </td>
            </tr>
            `;
        }).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-600">Failed to load admin panel.</td></tr>';
    }
}

async function updateStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to mark this resource as ${newStatus}?`)) return;

    try {
        await fetch(`${API_BASE}/admin/resources/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        fetchAdminResources(); // Refresh the table
    } catch (error) {
        alert('Failed to update status.');
    }
}

// Handle Form Submission
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const statusDiv = document.getElementById('upload-status');
    const fileInput = document.getElementById('file');
    
    submitBtn.disabled = true;
    submitBtn.innerText = 'Uploading...';
    statusDiv.classList.remove('hidden', 'text-red-600', 'text-green-600');
    statusDiv.innerText = 'Uploading to secure storage...';

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('academicYear', document.getElementById('academicYear').value);
    formData.append('semester', document.getElementById('semester').value);
    formData.append('subject', document.getElementById('subject').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch(`${API_BASE}/resources`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.classList.add('text-green-600');
            statusDiv.innerText = 'Upload successful! Redirecting...';
            document.getElementById('upload-form').reset();
            
            setTimeout(() => {
                showSection('home');
                statusDiv.classList.add('hidden');
                submitBtn.disabled = false;
                submitBtn.innerText = 'Upload & Publish';
            }, 2000);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        statusDiv.classList.add('text-red-600');
        statusDiv.innerText = `Error: ${error.message}`;
        submitBtn.disabled = false;
        submitBtn.innerText = 'Upload & Publish';
    }
});

// --- Dynamic Form Logic ---
function updateUploadSemesters() {
    const year = parseInt(document.getElementById('academicYear').value);
    const semSelect = document.getElementById('semester');
    const startSem = (year - 1) * 2 + 1;
    semSelect.innerHTML = `
        <option value="${startSem}">Semester ${startSem}</option>
        <option value="${startSem + 1}">Semester ${startSem + 1}</option>
    `;
}

// --- Modal & Preference Logic ---
function updateModalSemesters() {
    const year = parseInt(document.getElementById('modal-year').value);
    const semSelect = document.getElementById('modal-semester');
    const startSem = (year - 1) * 2 + 1;
    semSelect.innerHTML = `
        <option value="${startSem}">Semester ${startSem}</option>
        <option value="${startSem + 1}">Semester ${startSem + 1}</option>
    `;
}

function checkUserPreferences() {
    const year = localStorage.getItem('campusNotesYear');
    const sem = localStorage.getItem('campusNotesSemester');
    
    if (!year || !sem) {
        openWelcomeModal();
    } else {
        fetchResources(year, sem);
        updatePreferenceBanner(year, sem);
        document.getElementById('filterYear').value = year;
    }
}

function openWelcomeModal() {
    document.getElementById('welcome-modal').classList.remove('hidden');
    updateModalSemesters(); 
}

function saveUserPreferences() {
    const year = document.getElementById('modal-year').value;
    const sem = document.getElementById('modal-semester').value;
    
    localStorage.setItem('campusNotesYear', year);
    localStorage.setItem('campusNotesSemester', sem);
    
    document.getElementById('welcome-modal').classList.add('hidden');
    document.getElementById('filterYear').value = year;
    
    fetchResources(year, sem);
    updatePreferenceBanner(year, sem);
}

function closeModalAndShowAll() {
    document.getElementById('welcome-modal').classList.add('hidden');
    document.getElementById('active-preference-banner').classList.add('hidden');
    fetchResources(); 
}

function updatePreferenceBanner(year, sem) {
    const text = document.getElementById('preference-text');
    text.innerText = `📚 Showing resources tailored for Year ${year}, Semester ${sem}`;
    document.getElementById('active-preference-banner').classList.remove('hidden');
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    checkUserPreferences();
});