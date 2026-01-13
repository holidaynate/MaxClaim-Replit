# MaxClaim Docker Deployment

This directory contains Docker configuration for deploying MaxClaim as a containerized application.

## Quick Start

### Development

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env

# Start development stack
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f maxclaim-app
```

### Production

```bash
# Build and start production stack
docker-compose up -d

# With n8n automation
docker-compose --profile automation up -d

# With GPU OCR support
docker-compose --profile gpu up -d

# Full production with nginx
docker-compose --profile production --profile automation up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| maxclaim-app | 5000 | Main application |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |
| n8n | 5678 | Workflow automation |
| paddleocr | 8000 | GPU OCR service |
| nginx | 80/443 | Reverse proxy (production) |
| pgadmin | 5050 | Database admin (dev) |
| redis-commander | 8081 | Redis admin (dev) |

## Profiles

Use `--profile` to enable optional services:

- `automation` - Enable n8n workflow automation
- `gpu` - Enable PaddleOCR GPU service
- `production` - Enable nginx reverse proxy

## Environment Variables

See `.env.example` for all required variables:

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_PASSWORD` - Database password

### Recommended
- `OPENAI_API_KEY` - For LLM-powered analysis
- `SENDGRID_API_KEY` - For email notifications
- `STRIPE_SECRET_KEY` - For payment processing

### Optional
- `REDIS_URL` - Redis connection (defaults to local redis service)
- `PADDLEOCR_API_URL` - OCR service URL

## Volumes

Persistent data is stored in named volumes:

- `postgres_data` - Database files
- `redis_data` - Redis persistence
- `n8n_data` - n8n workflows and settings

## Health Checks

All services include health checks:

```bash
# Check all services
docker-compose ps

# Check specific service health
docker inspect maxclaim-app --format='{{.State.Health.Status}}'
```

## Scaling

For horizontal scaling:

```bash
# Scale application instances
docker-compose up -d --scale maxclaim-app=3
```

Note: You'll need a load balancer (nginx or external) for multi-instance setups.

## Backup

### Database Backup

```bash
docker exec maxclaim-postgres pg_dump -U maxclaim maxclaim > backup.sql
```

### Restore

```bash
cat backup.sql | docker exec -i maxclaim-postgres psql -U maxclaim maxclaim
```

## Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f maxclaim-app

# Last 100 lines
docker-compose logs --tail=100 maxclaim-app
```

## Troubleshooting

### Database Connection Issues

```bash
# Check postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Test connection
docker exec maxclaim-postgres psql -U maxclaim -c "SELECT 1"
```

### Application Won't Start

```bash
# Check environment variables
docker-compose config

# Rebuild without cache
docker-compose build --no-cache maxclaim-app

# Check app logs
docker-compose logs maxclaim-app
```

### GPU OCR Not Working

Ensure NVIDIA drivers and nvidia-container-toolkit are installed:

```bash
# Verify GPU access
docker run --rm --gpus all nvidia/cuda:11.7-base nvidia-smi
```

## Security Notes

1. Never commit `.env` files to version control
2. Use strong passwords for all services
3. Enable SSL in production via nginx profile
4. Consider using Docker secrets for sensitive data
5. Regularly update base images for security patches
