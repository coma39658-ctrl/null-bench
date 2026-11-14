# Null Bench Public

## Purpose

Public-facing Null Bench tool for graph/network structural analysis.

## Public beginner guide (Urdu · English · Arabic)

Read the [three-language Null Bench quick start](docs/null-bench-quickstart-ur-en-ar.md)
for the real browser controls, authorized sample graph data, the meaning of the
null distribution, evidence limits, and privacy notes.

Try the existing [public browser tool](https://coma39658-ctrl.github.io/null-bench/#try).
The guide is documentation only; it does not add a new model or change the live app.

## Core Function

Null Bench compares an observed network structure against randomized/null-model networks to identify statistically unusual structural patterns.

## Data Type

- Nodes
- Edges
- Graph/network topology
- Structural metrics
- Null-model statistics

## Verified

- Public Null Bench interface
- Graph input and analysis
- Observed structural metrics
- Null-model comparison
- Statistical comparison
- Cloudflare Worker and D1 visit analytics

## Important Boundary

This project is not a raw sensor/time-series engine.

Do not mix:

- NASA/C-MAPSS RUL data
- Engine vibration/temperature/pressure analysis
- Raw machine sensor analysis

Those belong to the separate E-ZERO Structural Anomaly project.

## Architectural Rule

Keep this project independent from `ezero_structural_anomaly_v01`.

The two projects may communicate through clearly defined APIs/interfaces in the future, but their analytical calculations must remain separate.

## Separation of Concerns

Null Bench is responsible for graph/network null-model analysis.

It must not silently become a sensor/time-series/RUL analysis engine.
