#!/bin/bash
# PulsePass Kafka Topic Initialization Script
# Criação de tópicos com 6 a 12 partições conforme especificação técnica do Pacote 2

KAFKA_BROKER=${KAFKA_BROKERS:-"localhost:9092"}

KAFKA_CMD="kafka-topics"
if [ -f "/opt/kafka/bin/kafka-topics.sh" ]; then
  KAFKA_CMD="/opt/kafka/bin/kafka-topics.sh"
elif [ -f "/usr/bin/kafka-topics" ]; then
  KAFKA_CMD="/usr/bin/kafka-topics"
fi

echo "Aguardando Kafka em $KAFKA_BROKER..."
until $KAFKA_CMD --bootstrap-server $KAFKA_BROKER --list > /dev/null 2>&1; do
  sleep 2
done

echo "Criando tópicos de mensageria da plataforma PulsePass..."

$KAFKA_CMD --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic reservations.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

$KAFKA_CMD --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic orders.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

$KAFKA_CMD --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic payments.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=1209600000

$KAFKA_CMD --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic tickets.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=2592000000

$KAFKA_CMD --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic telemetry.events \
  --partitions 12 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=259200000

echo "Tópicos criados com sucesso:"
$KAFKA_CMD --bootstrap-server $KAFKA_BROKER --list
