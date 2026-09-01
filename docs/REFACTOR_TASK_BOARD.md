# Refactor Task Board

Date: 2026-04-26

## Legend
- TODO: not started
- DOING: in progress
- DONE: completed and validated

## Phase 1: Foundation
- DONE: Create scalable refactor master plan
- DONE: Create task board
- DOING: Add frontend feature/shared scaffolding
- DOING: Add backend module scaffolding (non-breaking bridges)
- TODO: Add duplicate/dead-code inventory scripts

## Frontend Feature Migration
- DOING: certificates feature migration entrypoint
- TODO: courses feature migration
- TODO: teacher feature migration
- TODO: meetings feature migration
- TODO: resources feature migration
- TODO: dashboard feature migration
- TODO: student feature migration
- TODO: settings feature migration

## Backend Module Migration
- DOING: certificate module bridge
- TODO: course module bridge
- TODO: meeting module bridge
- TODO: teacher module consolidation
- TODO: resource module consolidation
- TODO: auth module consolidation
- TODO: user module consolidation

## Cleanup
- TODO: remove obsolete/duplicate UI files after zero-reference check
- TODO: remove unreferenced backend scripts/services/routes
- TODO: remove obsolete docs and archive artifacts in tracked batches

## Validation Gate (required after each migration batch)
- frontend lint
- frontend build
- backend build
- certificate workflow smoke check
- admin workflow smoke check
