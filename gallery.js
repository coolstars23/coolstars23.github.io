const COMMUNITY = "coolstars23";
const PAGE_SIZE = 25;
const POSTERS_PER_PAGE = 50;

const statusEl = document.getElementById("status");
const galleryEl = document.getElementById("gallery");

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

function getThumbUrl(record) {
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
  let paginationEl = document.getElementById("pagination");

  if (!paginationEl) {
    paginationEl = document.createElement("div");
    paginationEl.id = "pagination";
    paginationEl.style.margin = "30px 0";
    paginationEl.style.display = "flex";
    paginationEl.style.flexWrap = "wrap";
    paginationEl.style.gap = "10px";

    galleryEl.parentNode.insertBefore(paginationEl, galleryEl);
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
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    };

    paginationEl.appendChild(btn);
  }
}

function renderCurrentPage() {
  galleryEl.innerHTML = "";

  const start = (currentPage - 1) * POSTERS_PER_PAGE;
  const end = start + POSTERS_PER_PAGE;

  const posters = allPosters.slice(start, end);

  posters.forEach(record => {
    galleryEl.appendChild(buildCard(record));
  });

  const totalPages = Math.ceil(allPosters.length / POSTERS_PER_PAGE);

  renderPagination(totalPages);

  statusEl.textContent =
    `${allPosters.length} posters found ` +
    `(showing ${start + 1}-${Math.min(end, allPosters.length)})`;
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
    statusEl.textContent = "Loading posters...";

    const allRecords = await fetchAllRecords();

    allPosters = allRecords.filter(isPoster);

    currentPage = 1;

    renderCurrentPage();

  } catch (err) {
    console.error(err);

    statusEl.textContent =
      `Failed to load posters: ${err.message}`;
  }
}

loadPosters();
