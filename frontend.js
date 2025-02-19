import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.listen(80, () => {
    console.log('Server running on http://localhost:3000');
});