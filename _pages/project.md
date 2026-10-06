---
layout: post
title: "핵심 프로젝트"
date: 2026-05-01 00:00:00 +0900
permalink: /project/
---

시스템·인프라 구축과 보안 검증을 수행한 4개 팀 프로젝트입니다. 프로젝트별 담당 작업과 팀 전체 결과를 구분해 정리했습니다.

## 대표 프로젝트

- [하이브리드 클라우드 보안 구축](/project/hybrid-cloud-security/) — 팀장·MySQL 이중화·VIP, SECUI NGF 정책·정적 라우팅 담당
- [Azure 클라우드 인프라 및 M365 Defender 보안구축](/project/azure-infra-m365-defender-security/) — 팀장·구축 검증 담당, 두 리전 인프라의 웹 계층 장애 대응·DR 전환 확인

## 추가 프로젝트

- [Azure 웹·데이터 계층 보안 검증](/project/azure-data-app-security/) — WEB 서버·실습 페이지·Kali 환경·웹 공격 실습 담당
- [Azure 공격 탐지·대응 환경 검증](/project/azure-behavior-detection-response/) — Kali 환경·SSH Brute Force·Reverse Shell 공격 실습·보고서 담당

## 프로젝트 수행 순서

| 수행 기간 | 프로젝트 | 팀 규모 | 나의 역할 |
|---|---|---|---|
| 2026.05.13 ~ 05.19 | Azure 클라우드 인프라 및 M365 Defender 보안구축 | 5명 | 팀장·구축 검증 |
| 2026.05.20 ~ 06.08 | Azure 웹·데이터 보안 | 5명 | WEB 서버·웹 공격 실습·Kali 환경 |
| 2026.06.09 ~ 07.01 | Azure 행위 기반 보안 | 5명 | 공격 실습·Kali 환경·결과 보고서 |
| 2026.07.02 ~ 07.20 | 하이브리드 클라우드 보안 구축 | 5명 | 팀장·DB 이중화·NGF 정책·정적 라우팅 |



## 검증을 읽는 기준

웹 서버 접속, DB 복제·VIP 승계, WAF 응답, 로그 수집과 인시던트 생성은 각각 다른 검증 항목입니다. 확인한 결과를 제시하고, 복구 시간·요청 손실·오탐·자동 대응 실행처럼 별도 측정이 필요한 항목은 한계와 다음 과제로 구분했습니다.
