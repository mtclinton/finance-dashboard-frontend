# Finance Dashboard Frontend

A small React (Vite) frontend for the Finance Dashboard. It builds to static files and runs behind nginx. The nginx config proxies `/api` to the backend service inside the same Kubernetes namespace, so there’s no CORS drama and no client‑side env juggling.

## Local dev

```bash
cd finance-dashboard-frontend
npm i
npm run dev
# open http://localhost:5173
```

By default, the code calls `/api/*`. In Kubernetes the nginx in this image proxies that to the backend Service. For local dev, you can run the backend locally on :8080 and `vite` will hit it if you run a dev proxy or just adjust requests temporarily.

## Docker

```bash
docker build -t docker.io/mtclinton/finance-dashboard-frontend:latest .
docker push docker.io/mtclinton/finance-dashboard-frontend:latest
```

## Kubernetes

The included cluster manifest runs:
- Postgres (Deployment + Service)
- Backend (Service + Deployment)
- Frontend (Service + Deployment, nginx proxying `/api` to backend)

Use `minikube service -n finance finance-frontend --url` to open the UI. 

That’s it — simple, boring, and it works. 




