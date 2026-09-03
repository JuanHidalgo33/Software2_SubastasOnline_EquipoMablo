import { buildApp } from './composition';
import { config } from './config';

const app = buildApp();

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});