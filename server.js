const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // prefix with timestamp to avoid collisions but keep original name
    const safe = Date.now() + '_' + file.originalname;
    cb(null, safe);
  }
});

const upload = multer({ storage });

// List files
app.get('/files', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const list = files.map(f => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      return {
        name: f,
        size: stat.size,
        mtime: stat.mtime
      };
    });
    res.json(list);
  });
});

// Upload files (multipart/form-data, name=files)
app.post('/upload', upload.array('files'), (req, res) => {
  const files = (req.files || []).map(f => ({ originalname: f.originalname, filename: f.filename, size: f.size }));
  res.json({ ok: true, files });
});

// Delete multiple files - send JSON { names: ["filename1","filename2"] }
app.delete('/files', (req, res) => {
  const names = req.body.names;
  if (!Array.isArray(names)) return res.status(400).json({ error: 'names array required' });
  const removed = [];
  const errors = [];
  names.forEach(name => {
    try {
      const full = path.join(UPLOAD_DIR, name);
      if (fs.existsSync(full)) {
        fs.unlinkSync(full);
        removed.push(name);
      } else {
        errors.push({ name, error: 'not found' });
      }
    } catch (e) {
      errors.push({ name, error: e.message });
    }
  });
  res.json({ removed, errors });
});

// Delete single file by name in URL
app.delete('/files/:name', (req, res) => {
  const name = req.params.name;
  const full = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'not found' });
  fs.unlink(full, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ removed: [name] });
  });
});

// Download single file
app.get('/download/:name', (req, res) => {
  const name = req.params.name;
  const full = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(full)) return res.status(404).send('Not found');
  // Try to present the original filename (strip timestamp prefix)
  const original = name.split('_').slice(1).join('_') || name;
  res.download(full, original);
});

// Download multiple files as zip - send JSON { names: [...] }
app.post('/download', (req, res) => {
  const names = req.body.names;
  if (!Array.isArray(names) || names.length === 0) return res.status(400).json({ error: 'names array required' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=files.zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);
  names.forEach(name => {
    const full = path.join(UPLOAD_DIR, name);
    if (fs.existsSync(full)) {
      const entryName = name.split('_').slice(1).join('_') || name;
      archive.file(full, { name: entryName });
    }
  });
  archive.finalize();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
