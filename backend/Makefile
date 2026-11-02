.PHONY: run build test tidy migrate-up migrate-down seed docker-build

run:
	go run cmd/api/main.go

build:
	go build -o bin/api cmd/api/main.go
	go build -o bin/migrate cmd/migrate/main.go
	go build -o bin/seed cmd/seed/main.go

test:
	go test -v ./...

tidy:
	go mod tidy

migrate-up:
	go run cmd/migrate/main.go up

migrate-down:
	go run cmd/migrate/main.go down

seed:
	go run cmd/seed/main.go

docker-build:
	docker build -t gitlearn-backend .
