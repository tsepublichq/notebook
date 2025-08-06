  const SUPABASE_URL = "https://yqmbizqabtaedufylzlw.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbWJpenFhYnRhZWR1Znlsemx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NTQzMDksImV4cCI6MjA3MDAzMDMwOX0.ZWDF2rQa7fmJzZH92WoOYZddKWjCG44w94dpXwMtcEM";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let notebooks = [];
  let currentPage = 1;
  let rowsPerPage = 20;
  let sortColumn = '';
  let sortDirection = 'asc';
  let searchQuery = '';
  let editingId = null;
  let deletingId = null;

  document.addEventListener('DOMContentLoaded', function() {
      loadFromDatabase();

      document.getElementById('searchInput').addEventListener('input', function(e) {
          searchQuery = e.target.value.toLowerCase();
          currentPage = 1;
          renderTable();
      });

      document.getElementById('rowsPerPage').addEventListener('change', function(e) {
          rowsPerPage = parseInt(e.target.value);
          currentPage = 1;
          renderTable();
      });

      document.getElementById('addBtn').addEventListener('click', function() {
          openModal();
      });

      document.getElementById('exportBtn').addEventListener('click', function() {
          exportToExcel();
      });

      document.getElementById('notebookForm').addEventListener('submit', function(e) {
          e.preventDefault();
          saveNotebook();
      });
  });

  async function loadFromDatabase() {
      let { data, error } = await supabaseClient
          .from('notebooksystem')
          .select('*')
          .order('id', { ascending: true });
      if (error) {
          console.error("Error loading data:", error);
      } else {
          notebooks = data;
          renderTable();
          updateSummary();
      }
  }

  function getFilteredData() {
      let filtered = notebooks;
      if (searchQuery) {
          filtered = notebooks.filter(notebook =>
              Object.values(notebook).some(value =>
                  value && value.toString().toLowerCase().includes(searchQuery)
              )
          );
      }
      if (sortColumn) {
          filtered.sort((a, b) => {
              const aValue = a[sortColumn] || '';
              const bValue = b[sortColumn] || '';
              return sortDirection === 'asc'
                  ? aValue.toString().localeCompare(bValue.toString())
                  : bValue.toString().localeCompare(aValue.toString());
          });
      }
      return filtered;
  }

  function renderTable() {
      const filtered = getFilteredData();
      const totalPages = Math.ceil(filtered.length / rowsPerPage);
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = Math.min(startIndex + rowsPerPage, filtered.length);
      const pageData = filtered.slice(startIndex, endIndex);

      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      pageData.forEach((notebook, index) => {
          const row = document.createElement('tr');
          row.className = `status-${notebook.status}`;
          row.innerHTML = `
              <td>${startIndex + index + 1}</td>
              <td>${notebook.assetcode}</td>
              <td>${notebook.model}</td>
              <td>${notebook.serialnumber}</td>
              <td>${notebook.location}</td>
              <td>${notebook.username || '-'}</td>
              <td>${notebook.department}</td>
              <td><span class="status-badge">${getStatusIcon(notebook.status)} ${notebook.status?.charAt(0).toUpperCase() + notebook.status?.slice(1)}</span></td>
              <td>${notebook.devicenumber || '-'}</td>
              <td>${notebook.purchasedunder || '-'}</td>
              <td>${notebook.duedate || '-'}</td>
              <td class="remark-cell">${notebook.remark || '-'}</td>
              <td class="actions">
                  <button class="icon-button edit" onclick="editNotebook(${notebook.id})" title="Edit">✏️</button>
                  <button class="icon-button delete" onclick="deleteNotebook(${notebook.id})" title="Delete">🗑️</button>
              </td>
          `;
          tbody.appendChild(row);
      });

      document.getElementById('tableInfo').textContent =
          `Showing ${startIndex + 1} to ${endIndex} of ${filtered.length} entries`;

      renderPagination(totalPages);
  }

  function getStatusIcon(status) {
      switch (status) {
          case 'active': return '🟢';
          case 'inactive': return '🔴';
          case 'damaged': return '🟡';
          default: return '⚪';
      }
  }

  function renderPagination(totalPages) {
      const pagination = document.getElementById('pagination');
      pagination.innerHTML = '';
      if (totalPages <= 1) return;

      const prevBtn = document.createElement('button');
      prevBtn.textContent = '← Previous';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
      pagination.appendChild(prevBtn);

      for (let i = 1; i <= Math.min(5, totalPages); i++) {
          const pageBtn = document.createElement('button');
          pageBtn.textContent = i;
          pageBtn.className = i === currentPage ? 'active' : '';
          pageBtn.onclick = () => { currentPage = i; renderTable(); };
          pagination.appendChild(pageBtn);
      }

      if (totalPages > 5) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.padding = '6px 12px';
          pagination.appendChild(ellipsis);

          const lastBtn = document.createElement('button');
          lastBtn.textContent = totalPages;
          lastBtn.onclick = () => { currentPage = totalPages; renderTable(); };
          pagination.appendChild(lastBtn);
      }

      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next →';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
      pagination.appendChild(nextBtn);
  }

  function updateSummary() {
      const total = notebooks.length;
      const active = notebooks.filter(n => n.status === 'active').length;
      const inactive = notebooks.filter(n => n.status === 'inactive').length;
      const damaged = notebooks.filter(n => n.status === 'damaged').length;

      document.querySelector('.total-count').textContent = total;
      document.querySelectorAll('.active-count').forEach(el => el.textContent = active);
      document.querySelectorAll('.inactive-count').forEach(el => el.textContent = inactive);
      document.querySelectorAll('.damaged-count').forEach(el => el.textContent = damaged);
  }

  function sortTable(column) {
      if (sortColumn === column) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
          sortColumn = column;
          sortDirection = 'asc';
      }
      renderTable();
  }

  function openModal(notebook = null) {
      editingId = notebook ? notebook.id : null;
      document.getElementById('modalTitle').textContent = notebook ? 'Edit Notebook' : 'Add New Notebook';
      const form = document.getElementById('notebookForm');
      form.reset();
      if (notebook) {
          Object.keys(notebook).forEach(key => {
              const input = form.querySelector(`[name="${key}"]`);
              if (input) input.value = notebook[key] || '';
          });
      }
      document.getElementById('formModal').classList.remove('hidden');
  }

  function closeModal() {
      document.getElementById('formModal').classList.add('hidden');
      editingId = null;
  }

  async function saveNotebook() {
    const form = document.getElementById('notebookForm');
    const formData = new FormData(form);
    const notebook = {};

    // แปลงชื่อ key เป็นตัวเล็กให้ตรงกับ column ใน Supabase
    for (let [key, value] of formData.entries()) {
        notebook[key.toLowerCase()] = value;
    }

    console.log("Notebook before save:", notebook);

    if (editingId) {
        await supabaseClient
            .from('notebooksystem')
            .update(notebook)
            .eq('id', editingId);
    } else {
        await supabaseClient
            .from('notebooksystem')
            .insert([notebook]);
    }
    await loadFromDatabase();
    closeModal();
}


  function editNotebook(id) {
      const notebook = notebooks.find(n => n.id === id);
      if (notebook) openModal(notebook);
  }

  function deleteNotebook(id) {
      const notebook = notebooks.find(n => n.id === id);
      if (notebook) {
          deletingId = id;
          document.getElementById('deleteInfo').innerHTML =
              `<strong>${notebook.assetcode}</strong><br><small>${notebook.model}</small>`;
          document.getElementById('deleteModal').classList.remove('hidden');
      }
  }

  function closeDeleteModal() {
      document.getElementById('deleteModal').classList.add('hidden');
      deletingId = null;
  }

  async function confirmDelete() {
      if (deletingId) {
          await supabaseClient.from('notebooksystem').delete().eq('id', deletingId);
          await loadFromDatabase();
          closeDeleteModal();
      }
  }

  function exportToExcel() {
    const headers = [
        'No.', 'Asset Code', 'Model', 'Serial Number', 'Location',
        'User Name', 'Department', 'Status', 'Device Number',
        'Purchased Under', '5-Year Due Date', 'Remark'
    ];
    let csv = headers.join(',') + '\n';

    notebooks.forEach((notebook, index) => {
        const row = [
            index + 1,
            notebook.assetcode || '',
            notebook.model || '',
            notebook.serialnumber || '',
            notebook.location || '',
            notebook.username || '',
            notebook.department || '',
            notebook.status || '',
            notebook.devicenumber || '',
            notebook.purchasedunder || '',
            notebook.duedate || '',
            notebook.remark || ''
        ].map(field => `"${field.toString().replace(/"/g, '""')}"`);
        csv += row.join(',') + '\n';
    });

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook-inventory.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}


