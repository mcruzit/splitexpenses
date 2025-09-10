sh-backend:
	docker compose exec backend sh

sh-frontend:
	docker compose exec frontend sh

sh-db:
	docker compose exec postgres sh

up:
	docker compose up -d

up-build:
	docker compose up -d --build

down:
	docker compose down

stop:
	docker compose stop

restart:
	docker compose restart

ps:
	docker compose ps
