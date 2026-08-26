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

## PROJECTS

**Azure 클라우드 인프라 및 M365 Defender 보안구축**

온프레미스 서비스를 Azure로 확장하여 고가용성, 재해복구, 네트워크 보안, 하이브리드 연결을 고려한 클라우드 인프라를 구축했습니다.

- Terraform으로 전체 인프라를 코드화
- Hub-Spoke 네트워크와 VMSS 기반 Auto Scaling, Application Gateway/WAF, Azure Firewall 구성
- Korea Central과 Japan East 다중 리전 환경 구축
- Traffic Manager를 이용한 장애 조치 구조 구성
- 온프레미스 MySQL과 Azure Site-to-Site IPsec VPN으로 연결
- Private Endpoint와 중앙 집중식 네트워크 정책 적용
- Terraform 기반 Infrastructure as Code
- Hub-Spoke 네트워크 설계
- VMSS Auto Scaling 및 고가용성 구성
- Multi-Region DR 및 Traffic Manager Failover
- Application Gateway / WAF / Azure Firewall
- Site-to-Site IPsec VPN
- Private Endpoint
- Log Analytics 기반 모니터링

<div class="project-subsection-gap"></div>

**Azure 클라우드 데이터 및 App 보안**

의도적으로 취약한 웹 데이터 환경을 구축한 뒤 공격 -> 탐지 -> 방어 -> 재검증 과정을 통해 클라우드 보안 구성이 실제로 동작하는지 검증했습니다.

- Terraform 변수 하나로 취약 환경과 강화 환경을 전환할 수 있도록 구성
- Application Gateway WAF와 NSG, DB 접근제어 정책을 코드로 관리
- WordPress Credential Attack, SQL Injection, 데이터 유출 시나리오 수행
- 수집된 로그를 Microsoft Sentinel에서 탐지
- 보안 정책을 강화하여 동일 공격이 차단되는지 재검증
- Terraform 기반 취약/강화 환경 자동 전환
- Application Gateway WAF
- NSG 기반 네트워크 접근제어
- Log Analytics / Microsoft Sentinel
- 공격 시나리오 기반 탐지 및 대응 검증
- 보안 정책 적용 전후 비교

## TECHNICAL SKILLS

**System:** Linux, Rocky Linux, Windows Server, VMware

**Network:** TCP/IP, Subnetting, Routing, DNS, DHCP, NAT, Firewall, VPN, Load Balancing

**Server:** Web, FTP, Mail, WordPress, MySQL, HAProxy

**Cloud:** Azure Virtual Network, VM / VMSS, Application Gateway, Azure Firewall, VPN Gateway, Private Endpoint, Traffic Manager, Log Analytics

**Infrastructure as Code:** Terraform

**Security:** WAF, Network Access Control, Log Analysis, Microsoft Sentinel, Microsoft Defender

## INFRASTRUCTURE & SERVER LABS

클라우드 서비스를 사용하는 것에 그치지 않고 기반이 되는 서버와 네트워크 기술을 직접 구성하며 학습했습니다.

다음 실습을 기록합니다: Linux 서버 구축 및 운영, DHCP / DNS / WEB / FTP / Mail Server, WordPress / MySQL 환경 구성, HAProxy 기반 Load Balancing, VMware 기반 가상화 환경, 네트워크 및 시스템 실습.

[Infrastructure & Server Labs 보기](/lab/)

## NETWORK STUDY

시스템과 인프라가 동작하는 방식을 이해하기 위해 TCP/IP, Routing, DNS를 비롯한 네트워크 기본기를 지속적으로 정리하고 있습니다.

[Network 정리 보기](/network/)

## PROJECT ARCHIVE

보안 부트캠프와 개인 실습을 통해 진행한 전체 프로젝트입니다.

[전체 프로젝트 보기](/project/)

## CURRENT FOCUS

현재는 기존 Linux, Network, Azure, Terraform 경험을 기반으로 시스템 운영, 네트워크 트러블슈팅, 클라우드 인프라 구축 역량을 함께 확장하고 있습니다.

학습 과정에서는 단순히 서비스를 생성하는 것보다 왜 이런 구조를 선택했는지, 문제가 발생했을 때 어디부터 확인할지, 어떻게 재현하고 검증할지를 설명할 수 있는 엔지니어가 되는 것을 목표로 하고 있습니다.
