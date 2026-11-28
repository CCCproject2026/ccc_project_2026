---
name: iot-contracts
description: Use when changes cross devices, MQTT, preprocessing, ML inference, or web result delivery.
---
# IoT and ML contract work
1. Read current code, OpenAPI/schema, detailed design, and agreed issue decisions; flag stale docs.
2. Trace a sample from producer to consumer, including serialization, validation, queueing, buffering, inference, and errors.
3. Verify sensor unit, sample rate, axis order, window, scaler, model input, and result semantics from explicit evidence. Do not infer missing values.
4. Check duplicate delivery, ordering, queue bounds, timeout, privacy-safe observability, and recovery behavior.
5. Separate implemented behavior from intended design and unverified device/integration behavior.
Output a flow map, contract table, mismatch list, and evidence paths. Fall-risk results are not diagnoses or confirmed events; retain human review.
If source and design disagree or a device fact is unconfirmed, mark it unresolved and do not choose a value by intuition.
