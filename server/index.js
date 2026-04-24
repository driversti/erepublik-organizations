import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import orgsRouter from './routes/orgs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use('/api', orgsRouter);

const publicDir = join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(join(publicDir, 'index.html'));
});

export { app };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
