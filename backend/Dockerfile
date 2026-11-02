FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api cmd/api/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/migrate cmd/migrate/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/seed cmd/seed/main.go

FROM gcr.io/distroless/static-debian12
COPY --from=builder /bin/api /api
COPY --from=builder /bin/migrate /migrate
COPY --from=builder /bin/seed /seed
COPY --from=builder /app/seeds /seeds
COPY --from=builder /app/migrations /migrations
EXPOSE 8080
USER nonroot:nonroot
CMD ["/api"]
