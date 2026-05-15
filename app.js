const COMMUNITY = "coolstars22";
const PAGE_SIZE = 25;

const statusEl = document.getElementById("status");
const galleryEl = document.getElementById("gallery");

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
  return thumbs["750"] || thumbs["500"] || thumbs["250"] || null;
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
          ? `<img src="${thumbUrl}" alt="Poster thumbnail" loading="lazy">`
          : `<div class="thumb-placeholder">No thumbnail</div>`
      }
    </div>
    <div class="card-body">
      <h2 class="title">${title}</h2>
      <p class="authors">${authors}</p>
      <div class="links">
        <a href="${recordUrl}" target="_blank" rel="noopener noreferrer">Zenodo page</a>
        <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer">Open PDF</a>
      </div>
    </div>
  `;

  return article;
}

async function fetchAllRecords() {
  const query = `communities:${COMMUNITY}`;
  let page = 1;
  let allRecords = [];

  while (true) {
    const url = `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=${PAGE_SIZE}&page=${page}`;
    console.log(url);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    const records = data.hits?.hits || [];
    allRecords = allRecords.concat(records);

    if (records.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return allRecords;
}

async function loadPosters() {
  try {
    statusEl.textContent = "Loading posters...";
    const allRecords = await fetchAllRecords();
    const posters = allRecords.filter(isPoster);

    statusEl.textContent = `${posters.length} posters found`;
    galleryEl.innerHTML = "";

    posters.forEach(record => {
      galleryEl.appendChild(buildCard(record));
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Failed to load posters: ${err.message}`;
  }
}

loadPosters();
