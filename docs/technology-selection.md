# Technology selection

Explicit assessment requirements always override the defaults. Otherwise pick the simplest stack that fits.

| Requirement | Suggested stack |
|---|---|
| Relational business app (default) | React + Node/Express + PostgreSQL (this repo) |
| Flexible document data | React + Node + MongoDB (Mongoose) |
| Enterprise Java mandated | React + Spring Boot + PostgreSQL/MySQL |
| Data-heavy or AI | React + Python FastAPI |
| SQL Server mandated | Any backend + SQL Server |
| Mobile | Flutter or React Native against the same REST API |
| Chatbot / document Q&A | React + FastAPI + LLM (+ RAG for documents) |
| Distributed system | Only if the brief demands it; otherwise a modular monolith |

Rules: do not add a technology to show familiarity; prefer a modular monolith; microservices only when required; PostgreSQL is chosen for constraints, transactions and reporting, not because it is "faster" than MySQL.

Ready-made reference templates for Java, Python, MongoDB, mobile and AI are in [stack-references.md](stack-references.md).
