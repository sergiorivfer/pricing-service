# 🏪 Mucho-Store — Pricing Service (Infraestructura DevOps)

[![CI/CD](https://github.com/WendyKatherine/pricing-service/actions/workflows/deploy.yml/badge.svg)](https://github.com/WendyKatherine/pricing-service/actions)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![OCI](https://img.shields.io/badge/OCI-Free_Tier-F80000?style=flat-square&logo=oracle&logoColor=white)](https://cloud.oracle.com)
[![Fastify](https://img.shields.io/badge/API-Fastify_5-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## Descripción

Microservicio de precios para **Mucho-Store** (e-commerce de personalización 3D), desarrollado por Wendy Katherine con Clean Architecture. Mi rol como **DevOps** fue diseñar, provisionar y mantener toda la infraestructura cloud, CI/CD y despliegue en **Oracle Cloud Infrastructure Free Tier**.

---

## Infraestructura (OCI)

| Recurso | Detalle |
|---------|---------|
| **Compartimento** | `mucho-store` |
| **VCN** | `mucho-store-vcn` (CIDR 10.0.0.0/16) |
| **Security List** | Puertos 22 (SSH) y 3001 (API) |
| **Internet Gateway** | Ruta 0.0.0.0/0 → IGW |
| **VM** | VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM), Ubuntu 24.04 |
| **IP Pública** | 150.136.157.43 |
| **Docker** | 29.1.3 · Compose 2.40.3 |

---

## CI/CD Pipeline (GitHub Actions)

El pipeline en `.github/workflows/deploy.yml` se ejecuta automáticamente:

| Evento | Acción |
|--------|--------|
| **PR a main** | CI: npm ci → lint → typecheck → test unitarios |
| **Push a main** | CI → Build Docker → Push a ghcr.io → Deploy a VM |

**Pipeline de deploy:**
```
1. Pull última imagen de ghcr.io
2. Ejecutar migraciones de base de datos
3. Iniciar servicios con docker compose up -d
4. Health check: esperar hasta 60s a que /ready responda (DB conectada)
5. Limpiar imágenes viejas (docker image prune)
```

**Secrets requeridos:** `VM_HOST`, `VM_USER`, `VM_SSH_KEY`, `DB_PASSWORD`

---

## Stack

| Capa | Tecnología |
|------|-----------|
| **API** | Fastify 5, TypeScript, Clean Architecture |
| **Base de datos** | PostgreSQL 16 (contenedor) |
| **Contenerización** | Docker, Docker Compose |
| **Cloud** | Oracle Cloud Infrastructure (Free Tier) |
| **Registry** | GitHub Container Registry (ghcr.io) |
| **CI/CD** | GitHub Actions |
| **OS** | Ubuntu 24.04 LTS |

---

## Arquitectura de despliegue

```
                    ┌──────────────────────┐
                    │    GitHub Actions     │
                    │  (CI/CD Pipeline)     │
                    └──────────┬───────────┘
                               │ push a main
                               ▼
                    ┌──────────────────────┐
                    │   ghcr.io            │
                    │   Image Registry     │
                    └──────────┬───────────┘
                               │ docker pull
                               ▼
               ┌───────────────────────────────┐
               │   OCI VM (Ubuntu 24.04)       │
               │                                 │
               │  docker-compose.prod.yml       │
               │  ├── pricing-api (Fastify)     │
               │  │   → puerto 3001             │
               │  └── pricing-db (PostgreSQL)   │
               │                                 │
               │  Health: /health, /ready        │
               └─────────────────────────────────┘
```

---

## DevOps Highlights

- ✅ Infraestructura completa en **OCI Free Tier** (VCN, Security List, IGW, VM)
- ✅ **CI/CD automatizado**: push a main → build → test → deploy automático
- ✅ **Docker Compose multi-servicio** con health checks y dependencias
- ✅ **Migraciones automáticas** en cada deploy
- ✅ **Readiness probe** que verifica conexión a BD antes de considerar el servicio listo
- ✅ **Rolling updates** con zero-downtime (docker compose up -d)
- ✅ Gestión de **secrets** via GitHub Secrets

---

## Créditos

- **DevOps / Infraestructura:** Sergio Rivera ([@sergiorivfer](https://github.com/sergiorivfer))
- **Desarrollo API (Clean Architecture):** Wendy Katherine ([@WendyKatherine](https://github.com/WendyKatherine))
- **Proyecto:** Mucho-Store (e-commerce personalización 3D)
