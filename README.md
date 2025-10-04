# Docker Management

npm run docker:up # Start all services
npm run docker:down # Stop all services
npm run docker:logs # View logs
docker-compose ps # Check service status

# Application

npm start # Start main app
npm run dev # Start with auto-reload
npm run consumers # Start Kafka consumers

# Utilities

npm run cache:clear # Clear all Redis cache
npm run kafka:topics # List Kafka topics

# Monitoring

docker exec -it kanban-redis redis-cli # Redis CLI

# Open http://localhost:8080 # Kafka UI

# Open http://localhost:8081 # Redis Commander
