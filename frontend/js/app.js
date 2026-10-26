const API_BASE = 'http://localhost:5000/api';

// Simple Single Page App Routing
function showSection(sectionId) {
    document.getElementById('home-section').classList.add('hidden');
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');
    
    if (sectionId === 'home') {
        fetchResources();
    }
}

// Fetch and display resources
async function fetchResources() {
    const grid = document.getElementById('resources-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-[#747A76]">Loading resources...</div>';

    try {
        const response = await fetch(`${API_BASE}/resources`);
        const resources = await response.json();

        if (resources.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-10 bg-white border border-[#E5E7E2] rounded-lg text-[#747A76]">No resources have been published yet. Be the first to upload!</div>';
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

// Init
window.addEventListener('DOMContentLoaded', () => {
    fetchResources();
});