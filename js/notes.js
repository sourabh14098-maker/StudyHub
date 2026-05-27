/* StudyHub - Notes Database Controller (MongoDB Integrated) */

const COURSE_SUBJECTS = {
  "Semester 1": ["Programming in C", "Computer Fundamentals", "Mathematical Foundations", "English Communication"],
  "Semester 2": ["Data Structures", "Digital Electronics", "Operating Systems", "Discrete Mathematics"],
  "Semester 3": ["Java Programming", "Computer Architecture", "Software Engineering", "Financial Accounting"],
  "Semester 4": ["DBMS", "Computer Networks", "Visual Basic", "Python Programming"],
  "Semester 5": ["Web Technology", "Theory of Computation", "Unix Programming", "Graphics & Multimedia"],
  "Semester 6": ["Cloud Computing", "Information Security", "Mobile Applications", "AI & Machine Learning"]
};

let cachedNotes = [];
let cachedDownloads = [];

function apiUrl(path) {
  const baseUrl = window.location.protocol === "file:" ? "http://localhost:5000" : "";
  return `${baseUrl}${path}`;
}

// Initialize and fetch notes from MongoDB backend
async function loadNotesFromBackend() {
  try {
    const res = await fetch(apiUrl("/api/notes"));
    if (!res.ok) throw new Error("Backend response error");
    const data = await res.json();
    if (Array.isArray(data)) {
      cachedNotes = data.map(n => ({
        id: n._id,
        title: n.title,
        description: n.description || "",
        subject: n.subject,
        semester: n.semester || "Semester 1",
        fileType: n.fileType || "pdf",
        fileSize: n.fileSize || "2.4 MB",
        uploaderName: n.uploadedBy ? (n.uploadedBy.name || "Student") : "Anonymous",
        downloadCount: n.downloadCount || 0,
        status: n.status || "approved",
        fileName: n.fileName,
        filePath: n.filePath
      }));
      console.log("🎒 Notes loaded from MongoDB Atlas:", cachedNotes.length);
      // Dispatch event to notify components/pages to refresh the UI
      document.dispatchEvent(new CustomEvent("notesLoaded"));
    }
  } catch (err) {
    console.error("❌ Failed to load notes from MongoDB backend:", err);
  }
}

// Fetch user's download history from MongoDB backend
async function loadDownloadsHistoryFromBackend() {
  try {
    const token = localStorage.getItem('sh_token');
    if (!token) return;
    const res = await fetch(apiUrl("/api/notes/downloads/history"), {
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        cachedDownloads = data;
        console.log("🎒 Download history loaded from MongoDB Atlas:", cachedDownloads.length);
        document.dispatchEvent(new CustomEvent("downloadsLoaded"));
      }
    }
  } catch (err) {
    console.error("❌ Failed to load download history from MongoDB backend:", err);
  }
}

// Initial load on page run
loadNotesFromBackend();
loadDownloadsHistoryFromBackend();

// Get all cached notes from MongoDB
function getAllNotes() {
  return cachedNotes;
}

// Real File upload helper
async function uploadNoteToBackend(formData) {
  try {
    const token = localStorage.getItem('sh_token');
    const res = await fetch(apiUrl("/api/notes/upload"), {
      method: "POST",
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      },
      body: formData
    });
    const result = await res.json();
    if (res.ok) {
      await loadNotesFromBackend(); // reload list
      return { success: true, note: result.note };
    } else {
      return { success: false, error: result.message };
    }
  } catch (err) {
    return { success: false, error: "Connection to server failed: " + err.message };
  }
}

// Delete note from MongoDB
async function deleteNote(noteId) {
  try {
    const token = localStorage.getItem('sh_token');
    const res = await fetch(apiUrl(`/api/notes/${noteId}`), {
      method: "DELETE",
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });
    if (res.ok) {
      cachedNotes = cachedNotes.filter(n => n.id !== noteId);
      cachedDownloads = cachedDownloads.filter(n => n.id !== noteId);
      return true;
    }
  } catch (err) {
    console.error("❌ Failed to delete note:", err);
  }
  return false;
}

// Record download count, save to MongoDB history, and trigger real file download directly in browser
async function downloadNoteFile(noteId) {
  const user = getCurrentUser();
  if (!user) return 'not_logged_in';

  const notes = getAllNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return 'not_found';
  if (!note.fileName) return 'file_missing';

  const downloadUrl = apiUrl(`/api/notes/file/${noteId}`);

  try {
    const fileCheck = await fetch(downloadUrl, { method: "HEAD" });
    if (!fileCheck.ok) return 'file_missing';
  } catch (err) {
    console.error("Failed to verify note file:", err);
    return 'server_error';
  }

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = note.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  recordDownloadInBackground(noteId, note);

  return 'success';
}

// Record download count and save to MongoDB history without blocking the file download.
async function recordDownloadInBackground(noteId, note) {
  const token = localStorage.getItem('sh_token');
  try {
    const res = await fetch(apiUrl(`/api/notes/download/${noteId}`), { 
      method: "POST",
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });
    if (res.ok) {
      const data = await res.json();
      note.downloadCount = data.downloadCount || (note.downloadCount + 1);
      // Reload downloads log to refresh history lists in background
      await loadDownloadsHistoryFromBackend();
      document.dispatchEvent(new CustomEvent("notesLoaded"));
    }
  } catch (err) {
    console.error("❌ Failed to update download count in database:", err);
  }
}

async function addNoteToHistory(noteId) {
  return downloadNoteFile(noteId);
}

// User downloads list helper from MongoDB Atlas cache
function getUserDownloads(userId) {
  return cachedDownloads;
}
