---
layout: home
title: Home
permalink: /
---

# 김지율 | 시스템·인프라 엔지니어 포트폴리오
{:.portfolio-title}

`Linux · Network · MySQL · Virtualization · Azure`

Linux 서버와 네트워크 구축·장애 대응을 중심으로 시스템·인프라 엔지니어를 준비하고 있습니다. 팀 프로젝트에서 DB 이중화와 방화벽·정적 라우팅, 웹 서버 구성, 공격 재현과 결과 문서화를 담당했습니다.

[프로젝트와 담당 역할 보기](/project/) · [About Me](/about/) · [GitHub](https://github.com/raindust99)

## 대표 프로젝트

시스템·인프라 직무와 연결되는 두 프로젝트입니다. 각 글에서 나의 담당 범위와 팀 전체 결과를 구분해 소개합니다.

<div class="project-grid">

<div class="project-card" markdown="1">
<span class="project-card-tag">FEATURED · HYBRID</span>

### 온프레미스–Azure 하이브리드 인프라

**2026.07.02 ~ 07.20 · 5명 · 팀장**

**나의 담당:** MySQL Master-Master + keepalived VIP, SECUI NGF 방화벽 정책, 정적 라우팅.

<div class="chip-row"><span class="chip">MySQL HA</span><span class="chip">keepalived</span><span class="chip">Firewall</span><span class="chip">Routing</span></div>

**검증:** 양방향 복제와 DB 장애 시 VIP 승계·서비스 동작을 확인했습니다. 팀에서는 VLAN·서버·로그 환경과 Azure VPN 연동을 구성했습니다.

[담당 작업과 검증 결과 보기 →](/project/hybrid-cloud-security/)
</div>

<div class="project-card" markdown="1">
<span class="project-card-tag">FEATURED · CLOUD</span>

### Terraform 기반 Azure 고가용성·DR 인프라

**2026.05.13 ~ 05.19 · 5명 · 팀장·구축 검증**

**나의 담당:** 구축된 Azure 인프라의 검증. 팀에서 Terraform 기반 Hub-Spoke, VMSS, Application Gateway와 두 리전 DR 환경을 구성했습니다.

<div class="chip-row"><span class="chip">Terraform</span><span class="chip">Azure</span><span class="chip">Hub-Spoke</span><span class="chip">HA/DR</span></div>

**검증:** CPU 부하에 따른 VMSS 2대 → 5대 확장과 Central 엔드포인트 비활성화 후 Japan DNS 응답·웹 접속을 확인했습니다.

[아키텍처와 검증 범위 보기 →](/project/azure-infra-m365-defender-security/)
</div>

</div>

## 추가 프로젝트

<div class="secondary-project-grid">

<div class="secondary-project-card" markdown="1">

### Azure 웹·데이터 계층 보안 검증

**2026.05.20 ~ 06.08 · 5명**

**나의 담당:** WordPress·Apache WEB 서버, lab-sqli.php, Kali 환경, Hydra·sqlmap 웹 공격 실습.

<div class="chip-row"><span class="chip">Apache</span><span class="chip">WordPress</span><span class="chip">WAF</span></div>

웹 공격을 재현하고 방어 적용 후 결과를 확인했습니다. 팀의 WAF·DB·Sentinel 검증과 연결해 정리했습니다.

[웹 서버 구성과 공격·방어 검증 보기 →](/project/azure-data-app-security/)
</div>

<div class="secondary-project-card" markdown="1">

### Azure 공격 탐지·대응 환경 검증

**2026.06.09 ~ 07.01 · 5명**

**나의 담당:** Kali 환경, SSH Brute Force·Reverse Shell 공격 실습, 결과 보고서.

<div class="chip-row"><span class="chip">Linux</span><span class="chip">SSH</span><span class="chip">Log Analysis</span></div>

공격 재현과 강화 후 재시도 결과를 기록했습니다. Key Vault·MDE·JIT 확장은 팀 검증으로 구분했습니다.

[공격 재현과 결과 기록 보기 →](/project/azure-behavior-detection-response/)
</div>

</div>

## 기술 역량과 경험

| 영역 | 경험 |
|---|---|
| Linux·가상화 | Rocky Linux 서버 서비스, VMware 실습 환경 구성 |
| DB 가용성 | MySQL 양방향 복제, keepalived VIP 및 장애 시 승계 검증 |
| 네트워크·방화벽 | TCP/IP·DNS·DHCP 실습, SECUI NGF 정책·정적 라우팅 |
| 웹 서비스 | Apache·WordPress 구성, 웹·DB 통신 및 공격 재현 |
| 클라우드·IaC | 팀의 Terraform 기반 Azure 인프라에서 VMSS·DR·서비스 연결 검증 |
| 로그·보안 | 공격 재현 결과를 팀의 WAF·Sentinel·호스트 로그와 연결해 정리 |

## 학습과 장애 해결 기록

서버 서비스를 직접 구성하고, 연결이 실패했을 때 증상·설정·로그를 나누어 확인하는 과정을 기록합니다.

- [인프라 실습](/lab/) — Linux 서버·VMware 환경 구축
- [기술 노트](/network/) — 네트워크 기본기
- [VPN 장애 해결 사례](/troubleshooting/azure-onprem-vpn-connection-failure/) — 양측 정책 비교와 복구 검증

## 현재 학습 방향

기존 구축 경험을 바탕으로 서버 운영과 네트워크 트러블슈팅 역량을 강화하고 있습니다. 다음 실습에서는 DB 백업·복원, 복제 지연과 장애 시 요청 실패 측정, 반복 점검 자동화를 통해 운영 관점의 검증을 넓히려 합니다.
