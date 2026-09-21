---
layout: home
title: Home
permalink: /
---

# System & Infrastructure Engineer Portfolio
{:.portfolio-title}

`Linux · Network · Server · Virtualization · Cloud`

## SUMMARY

Linux 서버와 네트워크에 대한 기본기를 바탕으로 시스템 구축, 운영 및 장애 대응 역량을 학습하고 있습니다.

Rocky Linux 기반 서버 구축과 VMware 가상화 환경, 네트워크 및 각종 서버 서비스 구성 경험이 있으며, Azure와 Terraform을 활용한 클라우드 인프라 구축 프로젝트도 수행했습니다.

현재는 시스템 엔지니어를 중심으로 Linux 서버 운영과 네트워크 트러블슈팅 역량을 강화하고 있습니다.

## TECHNICAL SKILLS

**System:** Linux, Rocky Linux, Windows Server, VMware

**Network:** TCP/IP, Subnetting, Routing, DNS, DHCP, NAT, Firewall, VPN, Load Balancing

**Server:** Web, FTP, Mail, WordPress, MySQL, HAProxy

**Cloud:** Azure Virtual Network, VM / VMSS, Application Gateway, Azure Firewall, VPN Gateway, Private Endpoint, Traffic Manager, Log Analytics

**Infrastructure as Code:** Terraform

**Security:** WAF, Network Access Control, Log Analysis, Microsoft Sentinel, Microsoft Defender

## 대표 프로젝트

시스템·클라우드 인프라 직무와 가장 밀접한 두 프로젝트입니다. ([핵심 프로젝트 전체 보기](/project/))

<div class="project-grid">

<div class="project-card" markdown="1">
<span class="project-card-tag">FEATURED · CLOUD</span>

### Terraform 기반 Azure 고가용성·DR 인프라

온프레미스 서비스를 Azure로 확장하고 Hub-Spoke, VMSS, Application Gateway, 다중 리전 DR 환경을 Terraform으로 구축했습니다.

<div class="chip-row"><span class="chip">Terraform</span><span class="chip">Azure</span><span class="chip">Hub-Spoke</span><span class="chip">HA/DR</span></div>

**핵심 검증:** Auto Scaling과 Traffic Manager 기반 리전 Failover 및 서비스 연결을 확인했습니다.

[자세히 보기 →](/project/azure-infra-m365-defender-security/)
</div>

<div class="project-card" markdown="1">
<span class="project-card-tag">FEATURED · HYBRID</span>

### 온프레미스–Azure 하이브리드 인프라

온프레미스 네트워크·서버·방화벽을 구축하고 Site-to-Site IPsec VPN으로 Azure 워크로드와 연결했습니다.

<div class="chip-row"><span class="chip">Hybrid Cloud</span><span class="chip">IPsec VPN</span><span class="chip">MySQL HA</span></div>

**핵심 검증:** VPN 터널, DB 통신, Failover 및 웹 서비스 정상 동작을 확인했습니다.

[자세히 보기 →](/project/hybrid-cloud-security/)
</div>

</div>

## 추가 프로젝트

<div class="secondary-project-grid">

<div class="secondary-project-card" markdown="1">

### Azure 웹·데이터 계층 보안 검증

취약한 웹·데이터 환경에서 공격 → 탐지 → 방어 → 재검증 과정을 수행했습니다.

<div class="chip-row"><span class="chip">Azure</span><span class="chip">WAF</span><span class="chip">Sentinel</span></div>

[자세히 보기 →](/project/azure-data-app-security/)
</div>

<div class="secondary-project-card" markdown="1">

### Azure 공격 탐지·대응 환경 검증

SSH Brute Force·Reverse Shell·토큰 탈취 시나리오를 Defender와 Sentinel로 탐지하고 정책 강화 효과를 확인했습니다.

<div class="chip-row"><span class="chip">Azure</span><span class="chip">Defender</span><span class="chip">Sentinel</span></div>

[자세히 보기 →](/project/azure-behavior-detection-response/)
</div>

</div>

## LEARNING & LABS

클라우드 서비스를 사용하는 것에 그치지 않고 기반이 되는 서버와 네트워크 기술을 직접 구성하며 학습했습니다.

Linux 서버 구축 및 운영, DHCP / DNS / WEB / FTP / Mail Server, VMware 기반 가상화 환경, TCP/IP·Routing·DNS 등 네트워크 기본기를 지속적으로 정리하고 있습니다.

- [인프라 실습 보기](/lab/) — Linux 서버·VMware 가상화 구축 기록
- [기술 노트 보기](/network/) — 네트워크 기본기 정리
- [장애 해결 기록 보기](/troubleshooting/) — 증상·원인·조치·검증 중심 기록

## CURRENT FOCUS

현재는 기존 Linux, Network, Azure, Terraform 경험을 기반으로 시스템 운영, 네트워크 트러블슈팅, 클라우드 인프라 구축 역량을 함께 확장하고 있습니다.

학습 과정에서는 단순히 서비스를 생성하는 것보다 왜 이런 구조를 선택했는지, 문제가 발생했을 때 어디부터 확인할지, 어떻게 재현하고 검증할지를 설명할 수 있는 엔지니어가 되는 것을 목표로 하고 있습니다.
