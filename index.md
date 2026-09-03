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

## PROJECTS

보안 부트캠프와 개인 실습을 통해 진행한 프로젝트입니다. ([전체 프로젝트 보기](/project/))

<div class="project-block" markdown="1">

**Azure 클라우드 인프라 및 M365 Defender 보안구축**

온프레미스 서비스를 Azure로 확장하여 고가용성, 재해복구, 네트워크 보안, 하이브리드 연결을 고려한 클라우드 인프라를 구축했습니다.

<div class="chip-row"><span class="chip">Terraform</span><span class="chip">Azure</span><span class="chip">Hub-Spoke</span><span class="chip">WAF</span></div>

- Hub-Spoke 네트워크와 VMSS 기반 Auto Scaling, Application Gateway/WAF, Azure Firewall 구성
- Korea Central·Japan East 다중 리전 구축 + Traffic Manager 기반 장애 조치
- 온프레미스 MySQL을 Azure Site-to-Site IPsec VPN으로 연결, Private Endpoint로 PaaS 격리

[자세히 보기 →](/project/azure-infra-m365-defender-security/)

</div>

<div class="project-block" markdown="1">

**하이브리드 클라우드 보안구축**

온프레미스 네트워크·서버·방화벽을 직접 구축하고, 핵심 서비스를 Azure로 이전해 IPsec VPN으로 연계하는 하이브리드 클라우드 체계를 만들었습니다.

<div class="chip-row"><span class="chip">Hybrid Cloud</span><span class="chip">IPsec VPN</span><span class="chip">Azure</span></div>

- 온프레미스 서버·네트워크·방화벽을 직접 구축
- Azure Site-to-Site IPsec VPN으로 온프레미스-클라우드 연동
- 하이브리드 환경 전반의 트래픽·로그 분석으로 연결 상태 검증

[자세히 보기 →](/project/hybrid-cloud-security/)

</div>

<div class="project-block" markdown="1">

**Azure 클라우드 데이터 및 App 보안**

의도적으로 취약한 웹·데이터 환경을 구축한 뒤 공격 → 탐지 → 방어 → 재검증 과정을 통해 클라우드 보안 구성이 실제로 동작하는지 검증했습니다.

<div class="chip-row"><span class="chip">Azure</span><span class="chip">WAF</span><span class="chip">Sentinel</span></div>

- Terraform 변수 하나로 취약 환경과 강화 환경을 전환할 수 있도록 구성
- WordPress Credential Attack, SQL Injection, 데이터 유출 시나리오를 직접 수행
- Microsoft Sentinel로 탐지 후 보안 정책 강화, 동일 공격 재검증으로 효과 확인

[자세히 보기 →](/project/azure-data-app-security/)

</div>

<div class="project-block" markdown="1">

**Azure 클라우드 행위기반 보안탐지 및 대응**

Bastion 호스트를 대상으로 SSH Brute Force·Reverse Shell·토큰 탈취 시나리오를 공격 → 탐지 → 방어 순서로 검증했습니다.

<div class="chip-row"><span class="chip">Azure</span><span class="chip">Defender</span><span class="chip">Sentinel</span></div>

- SSH Brute Force, Reverse Shell, Key Vault Managed Identity 토큰 탈취 3개 시나리오 수행
- Microsoft Defender·Sentinel로 각 공격을 탐지하고 MITRE ATT&CK에 매핑
- 탐지 로그를 근거로 NSG·Key Vault 정책을 강화해 재공격 차단 확인

[자세히 보기 →](/project/azure-behavior-detection-response/)

</div>

## LEARNING & LABS

클라우드 서비스를 사용하는 것에 그치지 않고 기반이 되는 서버와 네트워크 기술을 직접 구성하며 학습했습니다.

Linux 서버 구축 및 운영, DHCP / DNS / WEB / FTP / Mail Server, VMware 기반 가상화 환경, TCP/IP·Routing·DNS 등 네트워크 기본기를 지속적으로 정리하고 있습니다.

- [Infrastructure & Server Labs 보기](/lab/) — 실습 10건
- [Network 정리 보기](/network/) — 네트워크 기본기 정리

## CURRENT FOCUS

현재는 기존 Linux, Network, Azure, Terraform 경험을 기반으로 시스템 운영, 네트워크 트러블슈팅, 클라우드 인프라 구축 역량을 함께 확장하고 있습니다.

학습 과정에서는 단순히 서비스를 생성하는 것보다 왜 이런 구조를 선택했는지, 문제가 발생했을 때 어디부터 확인할지, 어떻게 재현하고 검증할지를 설명할 수 있는 엔지니어가 되는 것을 목표로 하고 있습니다.
