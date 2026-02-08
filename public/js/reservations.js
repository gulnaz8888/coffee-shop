const resMsg = document.getElementById("resMsg");
const list = document.getElementById("list");

function toast(text, ok = true) {
  resMsg.textContent = text;
  resMsg.classList.toggle("bad", !ok);
}

function render(items) {
  if (!items || !items.length) {
    list.className = "listEmpty";
    list.textContent = "No data yet.";
    return;
  }

  list.className = "list";
  list.innerHTML = items.map((r) => {
    const when = r.dateTime ? new Date(r.dateTime).toLocaleString() : "(no date)";
    const guests = r.guests ?? "?";
    const notes = r.notes ? String(r.notes) : "";
    return `
      <div class="item">
        <div class="itemTop">
          <div class="itemTitle">${when}</div>
          <div class="pill">${guests} guests</div>
        </div>
        ${notes ? `<div class="itemSub">${escapeHtml(notes)}</div>` : ``}
      </div>
    `;
  }).join("");
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function load() {
  try {
    const data = await apiAuth("/api/resource", "GET");
    const items = Array.isArray(data) ? data : (data.items || data.resources || []);
    render(items);
    toast("Loaded.", true);
  } catch (err) {
    render([]);
    toast(err.message || "Load failed. Please sign in.", false);
  }
}

document.getElementById("loadBtn").addEventListener("click", load);

document.getElementById("bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const dateTime = document.getElementById("dateTime").value;
  const guests = Number(document.getElementById("guests").value || 2);
  const notes = document.getElementById("notes").value.trim();

  try {
    const payload = {
      type: "reservation",
      title: "Table reservation",
      dateTime,
      guests,
      notes
    };

    await apiAuth("/api/resource", "POST", payload);
    toast("Booked.", true);
    await load();
  } catch (err) {
    toast(err.message || "Booking failed. Please sign in.", false);
  }
});
load();