---
layout: post
title: "Azure 클라우드 인프라 및 M365 Defender 보안구축"
date: 2026-07-02 00:00:00 +0900
category: project
permalink: /project/azure-infra-m365-defender-security/
---
온프레미스에서 운영하던 워드프레스 쇼핑몰을 Azure 퍼블릭 클라우드로 확장하면서, Hub-Spoke 네트워크·다중 리전 재해복구·Zero-Trust 보안·온프레미스 하이브리드 연동까지 갖춘 인프라를 Terraform으로 구축한 과정을 정리하였다.

이번 글에서는 그중 **인프라 구축** 파트를 다룬다.

---

### 1. 프로젝트 개요

온프레미스 환경에서 운영되던 웹 서비스를 Azure로 확장·이관하여, 무중단 고가용성과 재해복구(DR) 역량을 갖춘 하이브리드 클라우드 인프라를 구축하는 것을 목표로 했다. 단일 리전에서 시작해 다중 리전 이중화 → 자동 확장 → 하이브리드 연동 순으로 단계적으로 확장하는 방식을 택해서, 각 단계마다 검증 가능한 결과물을 확보하고 리스크를 분산했다.

애플리케이션 계층은 WordPress 7.0(ko_KR) 기반 WooCommerce 쇼핑몰로 구성했고, 데이터베이스는 보안 정책상 온프레미스에 남겨둔 채 Site-to-Site IPsec VPN으로 Azure와 연동하는 하이브리드 구조를 적용했다.

**핵심 목표**

- **고가용성(HA)** : VMSS + Application Gateway 자동 확장, 가용 영역(Zone) 분산 배치로 단일 장애 지점(SPOF) 제거
- **재해복구(DR)** : Korea Central · Japan East 두 리전에 동일 스택을 배포하고 Traffic Manager 우선순위 라우팅으로 리전 장애 시 자동 페일오버
- **제로 트러스트 보안** : Hub-Spoke 망 분리, Azure Firewall 중앙 집중 제어, Application Gateway WAF, Private Endpoint 기반 PaaS 격리
- **하이브리드 연동** : 온프레미스 MySQL을 IPsec VPN 터널로 안전하게 연동해 데이터 주권 유지
- **인프라 자동화(IaC)** : Terraform으로 전체 인프라를 코드화해 일관성·재현성·신속한 복제 확보

**사용 기술**

| 구분 | 기술 / 버전 | 비고 |
|---|---|---|
| IaC 도구 | Terraform | 선언형 인프라 정의·배포 자동화 |
| Azure Provider | azurerm 4.74.0 | 버전 고정으로 일관성 확보 |
| 가상 머신 OS | Rocky Linux 9 (9-lvm) | publisher: resf |
| VM 규격 | Standard_B1s | 테스트·운영 비용 최적화 |
| 웹 애플리케이션 | WordPress 7.0 (ko_KR) | WooCommerce · 커스텀 쇼핑 페이지(auth.php) |
| 캐시 계층 | Azure Managed Redis (Balanced_B1) | TLS · 포트 10000 |
| 데이터베이스 | 온프레미스 MySQL | 10.10.34.119:3306 (VPN 연동) |
| 주 리전 / DR 리전 | Korea Central / Japan East | Korea South는 가용 영역 미지원이라 제외 |

> Korea South는 가용 영역(Availability Zone)을 제공하지 않아 Zone 분산 HA 구성이 불가능하다. 그래서 가용 영역을 지원하는 Japan East를 DR 리전으로 선택해서, 두 리전 모두 Zone-redundant 구성을 동일하게 적용했다.

---

### 2. 아키텍처 설계 — 5단계로 확장하기

인프라는 두 국면으로 나눠 구축했다. 1~3단계(구축기)에서는 Korea Central 단일 리전 안에서 기본 웹 서비스부터 Hub-Spoke 망 분리, 보안 계층까지 완성했고, 4~5단계(확장기)에서는 Japan East를 추가해 재해복구·하이브리드 연동·성능 최적화를 구현했다.

| 단계 | 핵심 추가 구성 | 목표 |
|---|---|---|
| 1단계 | 단일 리전 기본 인프라 (VNet, AppGW, VM, Bastion, NAT, PE, 스토리지) | 단일 리전 기본 웹 서비스 |
| 2단계 | Hub-Spoke 망 분리 · Peering | 네트워크 격리·확장성 |
| 3단계 | VMSS 자동 확장, WAF, Redis 캐시, Private Endpoint, Azure Monitor·Log Analytics | 단일 리전 서비스 계층 강화 |
| 4단계 | Japan East 추가, Azure Firewall·UDR, VPN Gateway·Local Network Gateway(IPsec), 양 리전 대칭 | 다중 리전 DR·하이브리드 연동 |
| 5단계 | Traffic Manager(우선순위 라우팅), Azure Files 공유, 통합 모니터링 | 자동 절체·성능·운영 최적화 |

최종 형상은 두 리전 각각에 Hub VNet과 Spoke VNet을 두고 리전 내부에서 Peering으로 연결하는 Hub-Spoke 구조다. Hub에는 Azure Firewall·Application Gateway·VPN Gateway 같은 공유·경계 서비스를, Spoke에는 워크로드(VMSS)와 Private Endpoint를 배치했다.

![Azure 하이브리드 클라우드 전체 아키텍처 구성도](/assets/images/azure-infra-m365-defender/01-architecture-overview.png)

**VNet · 서브넷 대역**

| 리전 | VNet | 대역 | 서브넷 |
|---|---|---|---|
| Korea Central | central-hub-vnet | 10.0.0.0/16 | AzureFirewallSubnet(10.0.0.0/24), AppGW-Subnet(10.0.1.0/24), GatewaySubnet(10.0.2.0/26) |
| Korea Central | central-spoke-vnet | 10.1.0.0/16 | AzureBastionSubnet(10.1.0.0/26), Web-Subnet(10.1.1.0/24), PE-Subnet(10.1.2.0/24) |
| Japan East | japan-hub-vnet | 10.2.0.0/16 | AzureFirewallSubnet(10.2.0.0/24), AppGW-Subnet(10.2.1.0/24), GatewaySubnet(10.2.2.0/26) |
| Japan East | japan-spoke-vnet | 10.3.0.0/16 | AzureBastionSubnet(10.3.0.0/26), Web-Subnet(10.3.1.0/24), PE-Subnet(10.3.2.0/24) |
| 온프레미스 | Bluemax NGF 100 | 10.10.34.0/24 | 내부 서버팜 (MySQL 10.10.34.119) |

네 개 VNet 대역과 온프레미스 대역이 서로 겹치지 않도록 설계했고, GatewaySubnet·AzureBastionSubnet은 Azure가 강제하는 고정 이름과 최소 `/26` 크기 요건을 맞췄다.

**Zero-Trust를 만드는 4가지 장치**

- **Azure Firewall + UDR 중앙 집중 제어** : Hub의 AzureFirewallSubnet에 Firewall(Standard)을 두고, Spoke의 Web-Subnet·PE-Subnet에 UDR을 적용해서 모든 아웃바운드가 강제로 Firewall을 경유하게 했다. 정책은 웹 서버(10.1.1.0/24, 10.3.1.0/24) → 온프레미스 MySQL(10.10.34.119:3306) 통신과 Spoke 대역의 80/443 아웃바운드만 허용한다. Application Gateway는 v2 SKU 특성상 공인 IP로 직접 인바운드를 받아야 해서 AppGW-Subnet에는 UDR을 적용하지 않았고, PE-Subnet에는 온프레미스 경로를 두지 않아 Private Endpoint 응답이 불필요하게 VPN 게이트웨이로 향하지 않게 했다.
- **Application Gateway WAF** : WAF_v2 SKU + OWASP 3.2 룰셋을 Prevention 모드로 적용해서 SQL Injection 등 L7 공격을 실시간 차단한다.
- **Private Endpoint 기반 PaaS 격리** : Storage(File)와 Redis는 공인 네트워크 접근을 막고 Spoke의 PE-Subnet에 Private Endpoint로 연결했다. 여기서 한 가지 삽질했던 부분 — 신형 Azure Managed Redis는 `privatelink.redis.azure.net` 영역을 써야 한다. 구형 Azure Cache for Redis용 `privatelink.redis.cache.windows.net`을 쓰면 PE 격리가 동작하지 않고 공인 IP가 그대로 반환된다.
- **온프레미스 하이브리드 VPN** : 양 리전의 VPN Gateway(VpnGw1AZ, RouteBased)와 온프레미스 Bluemax NGF 100 방화벽 간에 Site-to-Site IPsec 터널을 수립했다. VpnGw1은 deprecated라 가용 영역을 지원하는 VpnGw1AZ를 선택했다.

**다중 리전 DR — Traffic Manager**

| 엔드포인트 | 대상 (AppGW 공인 IP) | 우선순위 | 역할 |
|---|---|---|---|
| central-endpoint | 20.214.152.240 | 1 | Active (정상 운영) |
| japan-endpoint | 52.140.213.49 | 2 | Standby (페일오버) |

접속 도메인은 `team601shop2.trafficmanager.net`이며 TTL 30초로 HTTP 상태를 체크한다. Central이 장애가 나면 프로브 실패를 감지해서 Japan East 엔드포인트로 DNS를 전환한다.

**성능·운영 계층**

- Azure Managed Redis(Balanced_B1)를 양 리전에 배치하고 AllKeysLRU 제거 정책 적용, TLS·포트 10000으로 WordPress Redis Object Cache와 연동
- `wp-content/uploads`를 Azure Files(SMB)로 마운트해서 VMSS 인스턴스 간 업로드 파일 공유. Central은 GRS(team601storage2), Japan은 비용 효율적인 LRS 전용 계정(team601storage2jp)으로 분리
- 리전별 Log Analytics Workspace로 VMSS·Application Gateway·Firewall의 메트릭·로그 수집

---

### 3. Terraform으로 인프라 코드화하기

전체 인프라는 azurerm 4.74.0 Provider로 22개 파일로 모듈화했다. 파일명에 번호를 붙여서 의존 순서와 가독성을 같이 잡았다.

| 파일 | 역할 | 파일 | 역할 |
|---|---|---|---|
| 00_init.tf | Provider 초기화 | 11_udr.tf | 사용자 지정 라우팅 |
| 01_rg.tf | 리소스 그룹 | 12_vpngw.tf | VPN Gateway |
| 02_vnet.tf | 가상 네트워크 | 13_localnetgw.tf | 로컬 네트워크 GW |
| 03_sub.tf | 서브넷 | 14_vpnconn.tf | VPN 연결·IPsec 정책 |
| 04_pubip.tf | 공인 IP | 15_storage.tf | 스토리지·Files·PE |
| 05_appgw.tf | App Gateway·WAF | 16_redis.tf | Managed Redis·PE |
| 06_bastion.tf | Bastion | 17_vmss.tf | VMSS·cloud-init |
| 07_nsg.tf | NSG 규칙 | 18_auto.tf | 오토스케일 |
| 08_nsgsub.tf | NSG 연결 | 19_monitor.tf | Log Analytics·진단 |
| 09_peering.tf | VNet Peering | 20_trafficmanager.tf | Traffic Manager |
| 10_firewall.tf | Azure Firewall·정책 | 100_var.tf / install.sh.tpl | 변수 · 부팅 스크립트 |

구성하면서 기록해 둔 포인트 몇 가지:

- **Provider 초기화** : `resource_provider_registrations = "none"`으로 불필요한 리소스 공급자 자동 등록을 껐다.
- **변수 관리** : 리소스 그룹명·리전·관리자 계정·VM 규격·VPN PSK를 변수로 모듈화했고, `vpn_psk`는 `sensitive = true`로 지정해 로그에 노출되지 않게 했다.
- **서브넷** : Web·PE 서브넷은 `default_outbound_access_enabled = false`로 불필요한 인터넷 노출을 막았다.
- **VMSS + cloud-init** : Central은 2대(가용 영역 1·2 분산, zone_balance), Japan은 1대 대기로 구성했다. 표준 Rocky Linux 9 마켓플레이스 이미지에 `custom_data`로 `install.sh.tpl`을 주입해서, 별도 골든 이미지 없이 부팅 시점에 httpd·php·mysql client 설치 → WordPress 배치 및 온프레미스 DB 연결 → Azure Files 마운트 → VPN 터널 연결 대기 → WP-CLI 설치 → Redis Object Cache 연동까지 전 과정을 자동화했다. WooCommerce·Storefront 테마는 설치하지만, 실제 화면은 GitHub 저장소의 커스텀 쇼핑 페이지(로그인·회원가입·마이페이지, auth.php 기반)로 제공한다.
- **오토스케일** : CPU 평균 사용률 70% 초과 시 인스턴스 1대 증가(최대 5대), 20% 미만 시 1대 감소.
- **모니터링** : azurerm 4.x부터 진단 메트릭 블록이 `enabled_metric`으로 이름이 바뀌었다.

![Korea Central 리전 Azure 리소스 그룹 구성 완료 화면](/assets/images/azure-infra-m365-defender/02-korea-central-resources.png)

---

### 4. 온프레미스 방화벽 & IPsec VPN 연동

하이브리드 연동의 핵심은 Azure VPN Gateway와 온프레미스 Bluemax NGF 100 방화벽 간의 Site-to-Site IPsec 터널이다.

| 구분 | 값 |
|---|---|
| 방화벽 장비 | Bluemax NGF 100 |
| WAN 인터페이스 (eth1) | 1.220.76.2/29 |
| LAN 인터페이스 (eth4) | 10.10.34.11/24 |
| 기본 정적 경로 | 0.0.0.0/0 → 1.220.76.1 (eth1) |
| 내부 MySQL | 10.10.34.119:3306 (Rocky Linux, DB: wordpress) |
| Azure Central VPN GW | 20.249.43.29 |
| Azure Japan VPN GW | 48.218.110.47 |

Azure 측 사용자 지정 IPsec/IKE 정책과 Bluemax 보안 정책을 정확히 일치시켜야 터널이 성립한다.

| 파라미터 | 값 |
|---|---|
| IKE / IPsec 암호화 | AES256 |
| IKE / IPsec 무결성 | SHA256 |
| DH Group | DHGroup14 |
| PFS Group | None |
| SA Lifetime | 27000초 |
| 모드 / 프로토콜 | IKEv2 / ESP-Tunnel |

Bluemax 방화벽 보안 정책은 화이트리스트 방식으로 구성해서, 명시한 트래픽만 허용하고 마지막에 전체 차단(Deny-All) 규칙을 뒀다. VPN 터널 구간(10.1.0.0/16 ↔ 10.10.34.0/24)에는 NAT를 적용하지 않았는데, 이 구간은 IPsec이 처리하기 때문에 SNAT/DNAT가 끼어들면 응답 패킷이 디폴트 게이트웨이로 새어 나가 터널이 끊어지기 때문이다.

---

### 5. 검증 결과 — 실제로 잘 동작하는지 확인하기

배포한 인프라가 설계 의도대로 동작하는지 8개 영역으로 나눠서 검증했다.

**보안 (Zero-Trust · Firewall · WAF)**

VMSS에는 공인 IP를 아예 할당하지 않고 Application Gateway 뒤에만 존재하도록 해서 외부에서 직접 접근할 수 없게 했다. VMSS에서 `curl ifconfig.me`를 실행하면 Firewall 공인 IP(20.214.183.226)가 반환되어, 모든 아웃바운드가 UDR을 통해 Azure Firewall을 강제로 경유하는 걸 확인했다.

![VMSS에서 curl ifconfig.me 실행 시 Azure Firewall 공인 IP로 응답](/assets/images/azure-infra-m365-defender/03-firewall-egress-curl.png)

외부 인터넷에서 온프레미스 DB 공인 경로(1.220.76.2:3306)로 `Test-NetConnection`을 시도하면 `TcpTestSucceeded: False`로 차단되어 DB 포트가 외부에 노출되지 않는다는 것도 확인했다. Application Gateway WAF(OWASP 3.2, Prevention 모드)에서는 정상 요청은 200 OK, SQL Injection 시도는 403 Forbidden으로 차단되었다.

| 정상 요청 → 200 OK | SQL Injection 시도 → 403 Forbidden |
|---|---|
| ![WAF 정상 요청 200 OK](/assets/images/azure-infra-m365-defender/04-waf-normal-200.png) | ![WAF SQL Injection 차단 403 Forbidden](/assets/images/azure-infra-m365-defender/05-waf-sqli-block-403.png) |

**네트워크 아키텍처 (Hub-Spoke)** — 두 리전 모두 Hub-Spoke VNet Peering이 정상 연결되어 통신하는 것을 확인했다.

**고가용성(HA) 및 Auto Scaling** — VMSS 인스턴스 2대 중 1대를 중지(할당 취소)한 상태에서도 쇼핑몰이 정상 접속되어 단일 인스턴스 장애에 대한 서비스 연속성을 검증했다. 이어서 `yes` 명령으로 CPU 부하를 ~99%까지 올려 threshold 70%를 초과시키자, 오토스케일이 트리거되어 인스턴스가 2대에서 5대로 자동 확장되었다.

![CPU 임계치 초과로 VMSS 인스턴스 2대에서 5대로 자동 확장](/assets/images/azure-infra-m365-defender/06-autoscale-2to5.png)

**하이브리드 클라우드 (VPN · 온프레미스 DB)** — Site-to-Site VPN을 통해 Azure VMSS(10.1.1.x)와 온프레미스 MySQL(10.10.34.119:3306)이 정상 연동되는 것을 확인했다. 같은 포트로 외부 인터넷에서 접근하면 방화벽에서 차단된다.

**캐시 계층 (Redis)** — VMSS에서 nslookup 시 Redis가 `privatelink.redis.azure.net`으로 CNAME 풀이되고 사설 IP(10.1.2.5)를 반환해서 Private Endpoint 격리가 정상 동작함을 확인했다. WordPress에서도 `wp redis status` 실행 시 `Status: Connected`로 정상 연동을 확인했다.

![WordPress Redis Object Cache 연동 상태 Connected 확인](/assets/images/azure-infra-m365-defender/09-redis-objectcache-connected.png)

**재해복구 — Traffic Manager Failover** — 정상 상태에서 `team601shop2.trafficmanager.net`을 조회하면 Central App Gateway IP(20.214.152.240)가 반환된다. central-endpoint를 비활성화하자 japan-endpoint가 Online으로 전환되고, DNS 조회 결과도 Japan App Gateway IP(52.140.213.49)로 바뀌는 것을 확인했다.

![Traffic Manager 페일오버 이후 Japan East IP로 DNS 응답 전환](/assets/images/azure-infra-m365-defender/07-failover-japan-ip.png)

![페일오버 이후 Japan 리전에서 쇼핑몰 정상 접속 화면](/assets/images/azure-infra-m365-defender/08-japan-shop-after-failover.png)

Central에서 회원가입(test01)을 한 뒤 온프레미스 MySQL의 `shop_users` 테이블에서 해당 레코드를 바로 확인할 수 있었다. DB가 온프레미스 단일 인스턴스에 있기 때문에, 어느 리전으로 접속하든 같은 데이터를 보게 되고 리전 페일오버가 데이터 정합성에 영향을 주지 않는다.

**공유 스토리지 (Azure Files)** — 인스턴스 A에서 Azure Files(team601storage2/wp-media, 100G)를 마운트하고 파일을 업로드한 뒤, 인스턴스 B에서 동일 파일이 그대로 조회되어 인스턴스 간 공유가 정상 동작함을 검증했다. 스케일아웃으로 새로 생기는 인스턴스도 같은 공유 볼륨을 마운트한다.

**운영 및 모니터링 (Log Analytics)** — Log Analytics Workspace에서 VMSS·Application Gateway·Firewall의 메트릭과 로그가 정상 수집되는 것을 확인했다.

**검증 종합**

| 영역 | 검증 내용 | 상태 |
|---|---|---|
| 보안 | 공인 IP 제거 · Firewall 경유 · WAF 차단 · 외부 DB 차단 | 완료 |
| 네트워크 | Hub-Spoke · VNet Peering | 완료 |
| 고가용성 | 인스턴스 장애 지속 · Auto Scaling | 완료 |
| 하이브리드 | VPN · 온프레미스 DB 연동 | 완료 |
| 캐시 계층 | Redis PE DNS 격리 · WordPress Redis 연동 | 완료 |
| 재해복구 | 정상 운영 · Japan 페일오버 · 데이터 일관성 | 완료 |
| 공유 스토리지 | Azure Files 마운트 | 완료 |
| 모니터링 | Log Analytics 로그 수집 | 완료 |

---

### 6. 회고 — 성과, 한계, 다음 단계

**이번 프로젝트로 얻은 것**

- **다중 리전 DR 체계** : Korea Central·Japan East 이중화 + Traffic Manager 자동 페일오버로 리전 단위 장애에도 무중단 서비스
- **제로 트러스트 보안** : Hub-Spoke 망 분리, Firewall 중앙 제어, WAF, Private Endpoint 격리로 다계층 방어
- **하이브리드 데이터 구조** : IPsec VPN으로 온프레미스 MySQL을 안전하게 연동해 데이터 주권과 클라우드 확장성을 동시에 확보
- **자동 확장 · 고가용성** : VMSS Auto Scaling과 가용 영역 분산으로 트래픽 변동 대응 및 SPOF 제거
- **IaC 자동화** : 22개 Terraform 파일로 전체 인프라를 코드화해 재현성·일관성·신속한 복제 확보 (수동 구축 대비 배포 시간 단축, Auto Scaling·DR 리전 LRS 분리·캐시 계층으로 운영 비용도 절감)

**한계점 및 개선 방향**

| 항목 | 현황 | 개선 방향 |
|---|---|---|
| HTTPS 미적용 | AppGW 리스너가 80(HTTP)으로 운영 | 443 리스너·인증서 적용, Key Vault 연동 SSL 종단 |
| 온프레미스 DB 단일 | MySQL 단일 인스턴스 | DB 이중화 또는 읽기 복제본 추가 |
| VPN 단일 터널(SPOF) | VPN GW·Bluemax·ISP 단일 경로 | Active-Active VPN, 회선 이중화, ExpressRoute 도입 |
| 비밀번호 평문 하드코딩 | tfvars·install.sh에 평문 저장 | Azure Key Vault + Managed Identity로 시크릿 관리 |
| 스토리지 Access Key 인증 | 키 유출 위험 | Entra ID 인증·SAS 적용, 키 정기 회전 |
| Traffic Manager 절체 지연 | DNS TTL(30초)만큼 지연 | Front Door(L7) 도입으로 즉시 절체 |
| CI/CD 부재 | Terraform 수동 apply | 파이프라인 구축으로 코드 변경 자동 배포 |

**앞으로 넓혀보고 싶은 방향**

- 글로벌 가속 : Front Door + WAF 정책 통합으로 DDoS 방어 및 위치 기반 라우팅
- 클라우드 네이티브 전환 : AKS(Kubernetes)·Serverless 도입으로 배포 유연성 강화
- 데이터 인텔리전스 : 분석 파이프라인 연동으로 데이터 기반 의사결정 지원
- 보안 자동화 : Policy as Code와 Sentinel로 배포부터 운영까지 통합 보안 관제

