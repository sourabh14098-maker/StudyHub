/* StudyHub - Notes Database Controller */

// Semesters and Subjects Mapping
const COURSE_SUBJECTS = {
  "Semester 1": ["Programming in C", "Computer Fundamentals", "Mathematical Foundations", "English Communication"],
  "Semester 2": ["Data Structures", "Digital Electronics", "Operating Systems", "Discrete Mathematics"],
  "Semester 3": ["Java Programming", "Computer Architecture", "Software Engineering", "Financial Accounting"],
  "Semester 4": ["DBMS", "Computer Networks", "Visual Basic", "Python Programming"],
  "Semester 5": ["Web Technology", "Theory of Computation", "Unix Programming", "Graphics & Multimedia"],
  "Semester 6": ["Cloud Computing", "Information Security", "Mobile Applications", "AI & Machine Learning"]
};

const NOTES_STORAGE_VERSION = 'user-only-1';
const LEGACY_SEED_NOTE_IDS = new Set([
  'note_1', 'note_2', 'note_3', 'note_4', 'note_5', 'note_6', 'note_7', 'note_8'
]);

// Initialize notes storage (user uploads only, no demo seed data)
(function initNotesDB() {
  const storedVersion = localStorage.getItem('sh_notes_version');

  if (storedVersion !== NOTES_STORAGE_VERSION) {
    const existing = JSON.parse(localStorage.getItem('sh_notes') || '[]');
    const userNotes = existing.filter(note => !LEGACY_SEED_NOTE_IDS.has(note.id));
    localStorage.setItem('sh_notes', JSON.stringify(userNotes));
    localStorage.setItem('sh_notes_version', NOTES_STORAGE_VERSION);
  } else if (!localStorage.getItem('sh_notes')) {
    localStorage.setItem('sh_notes', JSON.stringify([]));
  }
})();

// Get all notes from localStorage (assign id to legacy notes missing one)
function getAllNotes() {
  const notes = JSON.parse(localStorage.getItem('sh_notes') || '[]');
  let changed = false;
  const normalized = notes.map((note, index) => {
    if (note.id) return note;
    changed = true;
    return { ...note, id: 'note_' + Date.now() + '_' + index };
  });
  if (changed) saveNotes(normalized);
  return normalized;
}

// Save notes to localStorage
function saveNotes(notes) {
  localStorage.setItem('sh_notes', JSON.stringify(notes));
}

// Add a new note and persist to sh_notes (same key used by Browse Notes)
function uploadNote(title, description, subject, semester, fileType, fileSize = '2.5 MB') {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) return { success: false, error: 'User not logged in' };

  const notes = getAllNotes();
  const newNote = {
    id: 'note_' + Date.now(),
    title: title.trim(),
    description: description.trim(),
    subject: subject,
    semester: semester,
    fileType: (fileType || 'pdf').toLowerCase(),
    fileSize: fileSize || '2.5 MB',
    uploaderId: user.id,
    uploaderName: user.username,
    downloadCount: 0,
    status: 'approved',
    dateUploaded: new Date().toISOString()
  };

  notes.push(newNote);
  saveNotes(notes);
  return { success: true, note: newNote };
}

// Approve note
function approveNote(noteId) {
  const notes = getAllNotes();
  const index = notes.findIndex(n => n.id === noteId);
  if (index !== -1) {
    notes[index].status = 'approved';
    saveNotes(notes);
    return true;
  }
  return false;
}

// Delete note from sh_notes (and remove from download history)
function deleteNote(noteId) {
  if (!noteId) return false;

  const notes = getAllNotes();
  const filtered = notes.filter(n => n.id !== noteId);
  if (filtered.length === notes.length) return false;

  saveNotes(filtered);

  if (typeof getCurrentUser === 'function') {
    const user = getCurrentUser();
    if (user) {
      const key = `sh_downloads_${user.id}`;
      const downloads = JSON.parse(localStorage.getItem(key) || '[]').filter(id => id !== noteId);
      localStorage.setItem(key, JSON.stringify(downloads));
    }
  }

  return true;
}

// Record and download note (requires login)
function downloadNoteFile(noteId) {
  // Block download if user is not logged in
  const user = getCurrentUser();
  if (!user) return 'not_logged_in';

  const notes = getAllNotes();
  const index = notes.findIndex(n => n.id === noteId);
  if (index === -1) return 'not_found';

  const note = notes[index];
  
  // Increment download count
  note.downloadCount += 1;
  saveNotes(notes);

  // Save to user downloaded history
  const key = `sh_downloads_${user.id}`;
  let downloads = JSON.parse(localStorage.getItem(key) || '[]');
  if (!downloads.includes(noteId)) {
    downloads.push(noteId);
    localStorage.setItem(key, JSON.stringify(downloads));
  }

  // Trigger a mock file download in browser
  triggerMockDownload(note);
  return 'success';
}

// Trigger browser file download (generates a text file pretending to be the note)
function triggerMockDownload(note) {
  const content = `StudyHub Note Download
======================================
Note Title: ${note.title}
Subject: ${note.subject}
Semester: ${note.semester}
Uploader: ${note.uploaderName}
File Size: ${note.fileSize}
File Type: ${note.fileType.toUpperCase()}

This is a mock study notes download from StudyHub.
StudyHub is a frontend-only project created for students.
Thank you for using StudyHub!`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.title.replace(/\s+/g, '_')}.${note.fileType}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Get user download list
function getUserDownloads(userId) {
  const key = `sh_downloads_${userId}`;
  const downloadIds = JSON.parse(localStorage.getItem(key) || '[]');
  const notes = getAllNotes();
  // Return the actual note objects that were downloaded
  return notes.filter(n => downloadIds.includes(n.id));
}
