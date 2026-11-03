#!/bin/bash
# PulsePass Kafka Topic Initialization Script
# Criação de tópicos com 6 a 12 partições conforme especificação técnica do Pacote 2

KAFKA_BROKER=${KAFKA_BROKERS:-"localhost:9092"}

echo "Aguardando Kafka em $KAFKA_BROKER..."
until /opt/kafka/bin/kafka-topics.sh --bootstrap-server $KAFKA_BROKER --list > /dev/null 2>&1; do
  sleep 2
done

echo "Criando tópicos de mensageria da plataforma PulsePass..."

/opt/kafka/bin/kafka-topics.sh --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic reservations.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

/opt/kafka/bin/kafka-topics.sh --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic orders.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000

/opt/kafka/bin/kafka-topics.sh --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic payments.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=1209600000

/opt/kafka/bin/kafka-topics.sh --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic tickets.events \
  --partitions 6 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=2592000000

/opt/kafka/bin/kafka-topics.sh --bootstrap-server $KAFKA_BROKER --create --if-not-exists \
  --topic telemetry.events \
  --partitions 12 \
  --replication-factor 1 \
  --config cleanup.policy=delete \
  --config retention.ms=259200000

echo "Tópicos criados com sucesso:"
/opt/kafka/bin/kafka-topics.sh --bootstrap-server $KAFKA_BROKER --list
