// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const filesList = document.getElementById('filesList');
const convertAllBtn = document.getElementById('convertAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const themeToggle = document.getElementById('themeToggle');
const resizeToggle = document.getElementById('resizeToggle');
const resizeFields = document.getElementById('resizeFields');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const totalFilesEl = document.getElementById('totalFiles');
const convertedFilesEl = document.getElementById('convertedFiles');
const totalSizeEl = document.getElementById('totalSize');

// State
let files = [];
let convertedFiles = [];
let isDarkMode = false;
let totalSizeSaved = 0;

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
convertAllBtn.addEventListener('click', convertAllFiles);
downloadAllBtn.addEventListener('click', downloadAllAsZip);
themeToggle.addEventListener('click', toggleTheme);
resizeToggle.addEventListener('change', toggleResizeFields);
widthInput.addEventListener('input', updateHeightProportionally);
heightInput.addEventListener('input', updateWidthProportionally);

// File Handling
function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('active');
}

function handleDragLeave(e) {
    e.preventDefault();
    if (!uploadArea.contains(e.relatedTarget)) {
        uploadArea.classList.remove('active');
    }
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('active');
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
}

function processFiles(fileList) {
    const svgFiles = fileList.filter(file => file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg'));
    
    if (svgFiles.length === 0) {
        alert('Please select valid SVG files.');
        return;
    }

    files = [...files, ...svgFiles];
    renderFilesList();
    updateGlobalButtons();
    updateStats();
}

// Rendering
function renderFilesList() {
    if (files.length === 0) {
        filesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-image"></i>
                <p>No files uploaded yet. Drag & drop SVG files or click "Choose Files" to get started.</p>
            </div>
        `;
        return;
    }

    filesList.innerHTML = files.map((file, index) => `
        <div class="file-card ${file.converted ? 'converted' : ''}" data-index="${index}">
            <div class="file-header">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <div class="preview-container">
                <div class="preview-col">
                    <div class="preview-box">
                        <span class="file-type-badge">SVG</span>
                        <img src="${URL.createObjectURL(file)}" alt="${file.name}">
                    </div>
                    <div class="preview-label">Original SVG</div>
                </div>
                <div class="preview-col">
                    <div class="preview-box" id="preview-${index}">
                        <span class="file-type-badge">WEBP</span>
                        ${file.converted ? `<img src="${file.converted.dataUrl}" alt="Converted ${file.name}">` : '<div class="empty-preview"><i class="fas fa-hourglass-half"></i></div>'}
                    </div>
                    <div class="preview-label">Converted WEBP</div>
                </div>
            </div>
            <div class="file-details">
                <div class="dimension">${file.width || '?'} × ${file.height || '?'} px</div>
                <div class="size-comparison">
                    ${file.converted ? `
                        ${formatFileSize(file.converted.blob.size)}
                        ${file.converted.blob.size < file.size ? 
                            `<span class="size-change size-decrease"><i class="fas fa-arrow-down"></i> ${calculateSizeReduction(file.size, file.converted.blob.size)}%</span>` : 
                            `<span class="size-change size-increase"><i class="fas fa-arrow-up"></i> ${calculateSizeIncrease(file.size, file.converted.blob.size)}%</span>`
                        }
                    ` : ''}
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress" id="progress-${index}" style="width: ${file.converted ? '100%' : '0%'}"></div>
                </div>
                <div class="progress-text">
                    <span id="status-${index}">
                        ${file.converted ? '<span class="success-message"><i class="fas fa-check-circle"></i> Conversion Complete</span>' : 'Ready to convert'}
                    </span>
                    ${file.converted ? `<span>WEBP Size: ${formatFileSize(file.converted.blob.size)}</span>` : ''}
                </div>
            </div>
            <div class="file-actions">
                <button class="btn" onclick="convertFile(${index})" ${file.converted ? 'disabled' : ''}>
                    <i class="fas fa-sync-alt"></i> Convert
                </button>
                <button class="btn btn-secondary" onclick="downloadFile(${index})" ${file.converted ? '' : 'disabled'}>
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn btn-accent" onclick="removeFile(${index})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');

    // Extract dimensions for each file
    files.forEach((file, index) => {
        if (!file.width || !file.height) {
            extractSvgDimensions(file, index);
        }
    });
}

function extractSvgDimensions(file, index) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const svgText = e.target.result;
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        let width = svgElement.getAttribute('width');
        let height = svgElement.getAttribute('height');
        
        // If width/height attributes are not present, try viewBox
        if (!width || !height) {
            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
                const viewBoxParts = viewBox.split(' ');
                width = viewBoxParts[2];
                height = viewBoxParts[3];
            }
        }
        
        // If still no dimensions, use default
        if (!width || !height) {
            width = '300';
            height = '150';
        }
        
        // Remove units if present (e.g., "100px" -> "100")
        width = width.replace(/[^\d.-]/g, '');
        height = height.replace(/[^\d.-]/g, '');
        
        files[index].width = parseInt(width);
        files[index].height = parseInt(height);
        
        // Update the display
        const dimensionElement = document.querySelector(`[data-index="${index}"] .dimension`);
        if (dimensionElement) {
            dimensionElement.textContent = `${files[index].width} × ${files[index].height} px`;
        }
        
        // Update resize inputs if this is the first file
        if (index === 0 && !resizeToggle.checked) {
            widthInput.value = files[index].width;
            heightInput.value = files[index].height;
        }
    };
    reader.readAsText(file);
}

// Conversion
async function convertFile(index) {
    const file = files[index];
    const progressBar = document.getElementById(`progress-${index}`);
    const statusElement = document.getElementById(`status-${index}`);
    
    try {
        statusElement.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> Converting...</span>';
        progressBar.style.width = '0%';
        
        // Read SVG file
        const svgText = await readFileAsText(file);
        
        // Get dimensions
        let width = file.width;
        let height = file.height;
        
        // Use custom dimensions if resize is enabled
        if (resizeToggle.checked) {
            width = parseInt(widthInput.value) || width;
            height = parseInt(heightInput.value) || height;
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Create image from SVG
        const img = new Image();
        img.onload = function() {
            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to WEBP
            const dataUrl = canvas.toDataURL('image/webp', 1.0);
            const blob = dataURLToBlob(dataUrl);
            
            // Update file object
            file.converted = {
                dataUrl: dataUrl,
                blob: blob,
                width: width,
                height: height
            };
            
            // Update UI
            const previewElement = document.getElementById(`preview-${index}`);
            previewElement.innerHTML = `<span class="file-type-badge">WEBP</span><img src="${dataUrl}" alt="Converted ${file.name}">`;
            
            statusElement.innerHTML = '<span class="success-message"><i class="fas fa-check-circle"></i> Conversion Complete</span>';
            progressBar.style.width = '100%';
            
            // Update card styling
            const cardElement = document.querySelector(`[data-index="${index}"]`);
            cardElement.classList.add('converted');
            
            // Update actions
            const convertBtn = document.querySelector(`[data-index="${index}"] .file-actions .btn`);
            const downloadBtn = document.querySelector(`[data-index="${index}"] .file-actions .btn.btn-secondary`);
            convertBtn.disabled = true;
            downloadBtn.disabled = false;
            
            // Update stats
            updateStats();
            
            // Update global buttons
            updateGlobalButtons();
        };
        
        img.onerror = function() {
            throw new Error('Failed to load SVG image');
        };
        
        // Create blob URL for the image
        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        img.src = URL.createObjectURL(blob);
        
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            progressBar.style.width = `${progress}%`;
            if (progress >= 90) clearInterval(progressInterval);
        }, 100);
        
    } catch (error) {
        console.error('Conversion error:', error);
        statusElement.innerHTML = `<span class="error-message"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</span>`;
        progressBar.style.width = '0%';
    }
}

function convertAllFiles() {
    files.forEach((file, index) => {
        if (!file.converted) {
            convertFile(index);
        }
    });
}

// Download
function downloadFile(index) {
    const file = files[index];
    if (!file.converted) return;
    
    const link = document.createElement('a');
    link.download = file.name.replace('.svg', '.webp');
    link.href = file.converted.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function downloadAllAsZip() {
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
        alert('ZIP functionality requires JSZip library. Please include it in your project.');
        return;
    }
    
    const zip = new JSZip();
    
    files.forEach(file => {
        if (file.converted) {
            const filename = file.name.replace('.svg', '.webp');
            zip.file(filename, file.converted.blob);
        }
    });
    
    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = 'converted-webp-files.zip';
        link.href = URL.createObjectURL(content);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('ZIP creation error:', error);
        alert('Error creating ZIP file: ' + error.message);
    }
}

// Utility Functions
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsText(file);
    });
}

function dataURLToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateSizeReduction(originalSize, newSize) {
    return Math.round(((originalSize - newSize) / originalSize) * 100);
}

function calculateSizeIncrease(originalSize, newSize) {
    return Math.round(((newSize - originalSize) / originalSize) * 100);
}

function removeFile(index) {
    // Update total size saved before removing
    if (files[index].converted) {
        totalSizeSaved -= (files[index].size - files[index].converted.blob.size);
    }
    
    files.splice(index, 1);
    renderFilesList();
    updateGlobalButtons();
    updateStats();
}

function updateGlobalButtons() {
    const hasFiles = files.length > 0;
    const allConverted = files.length > 0 && files.every(file => file.converted);
    const someConverted = files.some(file => file.converted);
    
    convertAllBtn.disabled = !hasFiles || allConverted;
    downloadAllBtn.disabled = !someConverted;
}

function updateStats() {
    totalFilesEl.textContent = files.length;
    const convertedCount = files.filter(file => file.converted).length;
    convertedFilesEl.textContent = convertedCount;
    
    // Calculate total size saved
    totalSizeSaved = files.reduce((total, file) => {
        if (file.converted) {
            return total + (file.size - file.converted.blob.size);
        }
        return total;
    }, 0);
    
    totalSizeEl.textContent = formatFileSize(totalSizeSaved);
}

// Theme Toggle
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Resize Options
function toggleResizeFields() {
    if (resizeToggle.checked) {
        resizeFields.classList.add('active');
        widthInput.disabled = false;
        heightInput.disabled = false;
        
        // Set default values from first file if available
        if (files.length > 0 && files[0].width && files[0].height) {
            widthInput.value = files[0].width;
            heightInput.value = files[0].height;
        }
    } else {
        resizeFields.classList.remove('active');
        widthInput.disabled = true;
        heightInput.disabled = true;
    }
}

function updateHeightProportionally() {
    if (!resizeToggle.checked || files.length === 0) return;
    
    const width = parseInt(widthInput.value);
    if (isNaN(width) || width <= 0) return;
    
    const originalWidth = files[0].width;
    const originalHeight = files[0].height;
    const ratio = originalHeight / originalWidth;
    
    heightInput.value = Math.round(width * ratio);
}

function updateWidthProportionally() {
    if (!resizeToggle.checked || files.length === 0) return;
    
    const height = parseInt(heightInput.value);
    if (isNaN(height) || height <= 0) return;
    
    const originalWidth = files[0].width;
    const originalHeight = files[0].height;
    const ratio = originalWidth / originalHeight;
    
    widthInput.value = Math.round(height * ratio);
}

// Initialize
function init() {
    // Check for dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        toggleTheme();
    }
    
    // Load JSZip if available
    if (typeof JSZip === 'undefined') {
        console.warn('JSZip not loaded. Download All (ZIP) functionality will not work.');
    }
}

// Run initialization
init();