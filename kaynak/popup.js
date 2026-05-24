document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('save-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const folderList = document.getElementById('folder-list');
  const detailView = document.getElementById('detail-view');
  const backBtn = document.getElementById('back-btn');
  const copyBtn = document.getElementById('copy-btn');
  const detailTitle = document.getElementById('detail-title');
  const linkList = document.getElementById('link-list');

  const aboutModal = document.getElementById('about-modal');
  const githubBtn = document.getElementById('github-btn');

  let currentFolderLinks = [];


  loadFolders();

  
  settingsBtn.addEventListener('click', () => {
    aboutModal.classList.remove('hidden');
  });


  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.add('hidden');
    }
  });


  githubBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/umutyalcin-pen' });
  });


  const exportBtn = document.getElementById('export-btn');
  exportBtn.addEventListener('click', () => {
    chrome.storage.local.get(null, (items) => {
      const dataStr = JSON.stringify(items, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `link_arsivcisi_yedek_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');

  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        chrome.storage.local.set(data, () => {
          loadFolders(); 
          alert('Veriler başarıyla yüklendi!');
          aboutModal.classList.add('hidden');
        });
      } catch (error) {
        alert('Dosya formatı hatalı!');
      }
    };
    reader.readAsText(file);
  });

  saveBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const today = new Date().toLocaleDateString('en-CA'); 
    const linkData = {
      title: tab.title,
      url: tab.url,
      favicon: tab.favIconUrl || 'icons/default.png', 
      timestamp: Date.now()
    };

    chrome.storage.local.get([today], (result) => {
      const currentLinks = result[today] || [];
      const existingLinkIndex = currentLinks.findIndex(link => link.url === linkData.url);

      if (existingLinkIndex === -1) {
       
        const updatedLinks = [...currentLinks, linkData];
        chrome.storage.local.set({ [today]: updatedLinks }, () => {
          loadFolders(); 
          
          const originalText = saveBtn.innerHTML;
          saveBtn.innerHTML = 'Kaydedildi!';
          saveBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.style.background = '';
          }, 1500);
        });
      } else {
        
        const updatedLinks = currentLinks.filter(link => link.url !== linkData.url);

        
        if (updatedLinks.length === 0) {
          chrome.storage.local.remove(today, () => {
            loadFolders();
            
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = 'Kaydetme İptal';
            saveBtn.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)'; 
            setTimeout(() => {
              saveBtn.innerHTML = originalText;
              saveBtn.style.background = '';
            }, 1500);
          });
        } else {
          chrome.storage.local.set({ [today]: updatedLinks }, () => {
            loadFolders();
            
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = 'Kaydetme İptal';
            saveBtn.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)'; 
            setTimeout(() => {
              saveBtn.innerHTML = originalText;
              saveBtn.style.background = '';
            }, 1500);
          });
        }
      }
    });
  });

  
  backBtn.addEventListener('click', () => {
    detailView.classList.add('hidden');
  });

  
  copyBtn.addEventListener('click', () => {
    if (!currentFolderLinks || currentFolderLinks.length === 0) return;

    const textToCopy = currentFolderLinks.map(link => `${link.title} - ${link.url}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      copyBtn.style.color = '#10b981';

      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
        copyBtn.style.color = '';
      }, 1500);
    });
  });

  function loadFolders() {
    chrome.storage.local.get(null, (items) => {
      folderList.innerHTML = '';
      const dates = Object.keys(items).sort().reverse(); 

      if (dates.length === 0) {
        folderList.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 20px;">No links saved yet.</div>';
        return;
      }

      dates.forEach(date => {
        const links = items[date];
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.innerHTML = `
          <div class="folder-info">
            <span class="folder-date">${formatDate(date)}</span>
            <span class="folder-count">${links.length} Link</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary);">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `;

        folderItem.addEventListener('click', () => openFolder(date, links));
        folderList.appendChild(folderItem);
      });
    });
  }

  function openFolder(date, links) {
    currentFolderLinks = links;
    detailTitle.textContent = formatDate(date);
    linkList.innerHTML = '';

    
    const groups = {};
    links.forEach(link => {
      let domain;
      try {
        domain = new URL(link.url).hostname.replace(/^www\./, '');
      } catch (e) {
        domain = 'Diğer';
      }
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(link);
    });

    
    const sortedDomains = Object.keys(groups).sort();

    sortedDomains.forEach(domain => {
      
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.textContent = domain;
      linkList.appendChild(groupHeader);

      
      groups[domain].forEach(link => {
        const linkItem = document.createElement('a');
        linkItem.className = 'link-item';
        linkItem.href = link.url;
        linkItem.target = '_blank';

        
        const faviconUrl = link.favicon && link.favicon.startsWith('http') ? link.favicon : 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>';

        linkItem.innerHTML = `
          <img src="${faviconUrl}" class="link-favicon" alt="icon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">
          <div class="link-info">
            <span class="link-title">${link.title}</span>
            <span class="link-url">${link.url}</span>
          </div>
        `;
        linkList.appendChild(linkItem);
      });
    });

    detailView.classList.remove('hidden');
  }

  function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    
    const localDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
    return localDate.toLocaleDateString('tr-TR', options);
  }
});

