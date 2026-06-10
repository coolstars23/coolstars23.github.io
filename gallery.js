const COMMUNITY = "coolstars23";
const PAGE_SIZE = 25;
const POSTERS_PER_PAGE = 20;

const statusEl = document.getElementById("status");
const galleryEl = document.getElementById("gallery");
const searchInput = document.getElementById("searchInput");

let allPosters = [];
let currentPage = 1;

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAuthors(record) {
  const creators = record.metadata?.creators || [];
  return creators.map(c => c.name).join(", ");
}

function getPdfFile(record) {
  const files = record.files || [];
  return files.find(f => f.key?.toLowerCase().endsWith(".pdf")) || null;
}

const MANUAL_THUMBNAILS = {
  20616752: "images/poster-thumbs/20616752.jpg",
  20616531: "images/poster-thumbs/20616531.jpg",
  20617031: "images/poster-thumbs/20617031.jpg",
  20615532: "images/poster-thumbs/20615532.jpg",
  20616268: "images/poster-thumbs/20616268.jpg",
  20620290: "images/poster-thumbs/20620290.jpg",
  20420912: "images/poster-thumbs/20420912.jpg"
};

function getThumbUrl(record) {
  if (MANUAL_THUMBNAILS[record.id]) {
    return MANUAL_THUMBNAILS[record.id];
  }

  const thumbs = record.links?.thumbnails;

  if (!thumbs) return null;

  return (
    thumbs["750"] ||
    thumbs["500"] ||
    thumbs["250"] ||
    thumbs["100"] ||
    thumbs["50"] ||
    null
  );
}

function isPoster(record) {
  return record.metadata?.resource_type?.type === "poster";
}

function buildCard(record) {
  const title = escapeHtml(record.metadata?.title || "Untitled");
  const authors = escapeHtml(getAuthors(record));
  const recordUrl = record.links?.self_html || "#";

  const pdfFile = getPdfFile(record);
  const pdfUrl = pdfFile?.links?.self || recordUrl;

  const thumbUrl = getThumbUrl(record);

  const article = document.createElement("article");
  article.className = "card";

  article.innerHTML = `
    <div class="thumb-wrap">
      ${
        thumbUrl
          ? `<img
               src="${thumbUrl}"
               alt="Poster thumbnail"
               loading="lazy"
               decoding="async"
               fetchpriority="low"
               onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;thumb-placeholder&quot;>No thumbnail</div>';"
             >`
          : `<div class="thumb-placeholder">No thumbnail</div>`
      }
    </div>

    <div class="card-body">
      <h2 class="title">${title}</h2>

      <p class="authors">${authors}</p>

      <div class="links">
        <a href="${recordUrl}" target="_blank" rel="noopener noreferrer">
          Zenodo page
        </a>

        <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer">
          Open PDF
        </a>
      </div>
    </div>
  `;

  return article;
}

function renderPagination(totalPages) {
  ["paginationTop", "paginationBottom"].forEach(id => {
    let paginationEl = document.getElementById(id);

    if (!paginationEl) {
      paginationEl = document.createElement("div");
      paginationEl.id = id;
      paginationEl.style.margin = "30px 0";
      paginationEl.style.display = "flex";
      paginationEl.style.flexWrap = "wrap";
      paginationEl.style.gap = "10px";
      paginationEl.style.justifyContent = "center";

      if (id === "paginationTop") {
        galleryEl.parentNode.insertBefore(paginationEl, galleryEl);
      } else {
        galleryEl.parentNode.insertBefore(paginationEl, galleryEl.nextSibling);
      }
    }

    paginationEl.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;

      btn.style.padding = "8px 14px";
      btn.style.border = "1px solid #ccc";
      btn.style.borderRadius = "6px";
      btn.style.cursor = "pointer";
      btn.style.background = i === currentPage ? "#ddd" : "#fff";

      btn.onclick = () => {
        currentPage = i;
        renderCurrentPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      paginationEl.appendChild(btn);
    }
  });
}


function getFilteredPosters() {
  const query = searchInput?.value.trim().toLowerCase() || "";

  if (!query) return allPosters;

  const keywords = query.split(/\s+/);

  return allPosters.filter(record => {
    const title = (record.metadata?.title || "").toLowerCase();
    const authors = getAuthors(record).toLowerCase();

    const searchableText = `${title} ${authors}`;

    return keywords.every(keyword =>
      searchableText.includes(keyword)
    );
  });
}

function renderCurrentPage() {
  galleryEl.innerHTML = "";

  const filteredPosters = getFilteredPosters();
  const totalPages = Math.ceil(filteredPosters.length / POSTERS_PER_PAGE);

  if (totalPages > 0 && currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * POSTERS_PER_PAGE;
  const end = start + POSTERS_PER_PAGE;

  const posters = filteredPosters.slice(start, end);

  posters.forEach(record => {
    galleryEl.appendChild(buildCard(record));
  });

  renderPagination(totalPages);

  if (filteredPosters.length === 0) {
    statusEl.textContent = "No posters found";
    return;
  }

  statusEl.textContent =
    `${filteredPosters.length} posters found ` +
    `(showing ${start + 1}-${Math.min(end, filteredPosters.length)})`;
}

async function fetchAllRecords() {
  const query = `communities:${COMMUNITY}`;

  let page = 1;
  let recordsAll = [];

  while (true) {
    const url =
      `https://zenodo.org/api/records` +
      `?q=${encodeURIComponent(query)}` +
      `&size=${PAGE_SIZE}` +
      `&page=${page}`;

    console.log(url);

    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();

    const records = data.hits?.hits || [];

    recordsAll = recordsAll.concat(records);

    if (records.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return recordsAll;
}

async function loadPosters() {
  try {
    statusEl.textContent = "Loading posters... (may take ~30 s)";

    const allRecords = await fetchAllRecords();

    allPosters = allRecords
      .filter(isPoster)
      .sort(() => Math.random() - 0.5);

    currentPage = 1;

    renderCurrentPage();

  } catch (err) {
    console.error(err);

    statusEl.textContent =
      `Failed to load posters: ${err.message}`;
  }
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderCurrentPage();
  });
}

loadPosters();
