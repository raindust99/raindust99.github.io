---
layout: post
title: "Azure 클라우드 데이터 및 App 보안"
date: 2026-08-03 00:00:00 +0900
category: project
permalink: /project/azure-data-app-security/
---
Azure 클라우드 실습 환경에 의도적으로 취약한 웹·데이터 계층을 배포하고, WordPress 크리덴셜 탈취·SQL Injection·데이터 유출 3개 시나리오를 공격 → 탐지 → 방어 순서로 검증한 과정을 정리하였다.

---

### 1. 개요

웹·데이터 계층 보호(WAF, DB 접근통제, 유출 탐지)에 초점을 맞춰, 의도적으로 취약하게 구성한 인프라(hardening_enabled=false)를 대상으로 실제 공격을 수행하고, Microsoft Sentinel 기반 탐지 규칙으로 공격을 식별한 뒤, hardening_enabled 토글로 강화 모드에 전환해 동일 공격이 차단되는지 단계적으로 검증했다.

<br>

**3개 공격 시나리오**

| 시나리오 | 공격 내용 | 주요 탐지 규칙 |
|---|---|---|
| 시나리오 1 | WordPress 크리덴셜 탈취 (Hydra → /xmlrpc.php) | waf-web-attack |
| 시나리오 2 | SQL Injection (lab-sqli.php) | waf-web-attack |
| 시나리오 3 | 데이터 유출 (mysqldump 직접 연결) | mysql-dump-exfil |

<br>

---

### 2. 공격 시나리오 정의

공격자는 외부에 노출된 웹 진입점(App Gateway 공인 IP, :80)으로 접근하는 위협 행위자로 가정했다. 별도 서브넷(snet-kali, 10.0.10.0/24)에 Kali Linux VM을 공격자 환경으로 배치해서, hydra·sqlmap·curl로 공격 흐름을 재현했다.

- **App Gateway + WAF** : WAF_v2 · OWASP 3.2 · Prevention 모드 — 웹 트래픽 1차 방어선
- **WEB VM (Team3-vm-web)** : Rocky Linux 9 · Apache httpd + WordPress · 의도적 취약점(lab-sqli.php) 포함
- **DB VM (Team3-vm-db)** : Rocky Linux 9 · MySQL · company.personal_info 민감 정보 테이블

공격 목표는 WordPress 관리자 계정 탈취, SQL Injection을 통한 DB 정보 접근, DB 내 민감 개인정보의 외부 반출 세 가지로 잡았다.

<br>

**3단계 데모 프레임워크**

| 단계 | 내용 |
|---|---|
| ① 공격 | Kali VM에서 실제 공격 명령을 실행해 취약 인프라의 침해 가능성을 확인 |
| ② 탐지 | 로그 파이프라인(AMA/DCR·진단 설정)으로 수집된 로그를 Sentinel 분석 규칙이 상관 분석해 인시던트를 생성하는지 확인 |
| ③ 방어 | `terraform apply -var hardening_enabled=true`로 강화 모드를 적용하고 동일 공격을 재실행해 차단 여부를 확인 |

<br>

---

### 3. 전체 인프라 구성

Azure VNet(10.0.0.0/16)을 엣지(App Gateway/WAF)·웹·데이터·위협(Kali)·관리(Bastion)·인프라(NAT) 역할별 서브넷으로 분리했다. 웹 공격은 App Gateway 공인 IP(:80)로 보내 WAF를 경유하게 하고, DB 유출은 같은 VNet 내부에서 DB 사설 IP로 직접 연결하는 흐름으로 설계했다. WEB·DB VM은 공인 IP 없이 NAT Gateway로만 아웃바운드 통신하고, Bastion은 SSH 점프호스트 용도로만 쓴다.

![전체 인프라 아키텍처 구성도](/assets/images/azure-data-app-security/01-infra-architecture-overview.png)

<br>

**핵심 인프라 정보**

| 항목 | 값 | 비고 |
|---|---|---|
| 구독 / RG | Team3-rg | koreacentral 리전 |
| VNet | 10.0.0.0/16 | 역할별 서브넷 분리 |
| App GW 공인 IP | 20.200.210.194 : 80 | WAF_v2 · OWASP 3.2 · Prevention |
| VM 사양 | Standard_B2s (2 vCPU/4GB) × 4 | WEB·DB·Kali·Bastion(관리) |
| SOC | Sentinel + AMA/DCR | Team3-law |

<br>

**서브넷 · NSG**

기본 모드는 서브넷 전체 인바운드를 허용(nsg-allowall)하는 취약 구성으로 배포하고, 강화 모드에서는 서브넷에 연결된 NSG 리소스 자체를 통째로 교체한다.

| 서브넷 | CIDR | 존 | 강화 시 |
|---|---|---|---|
| snet-lb | 10.0.2.0/24 | 엣지 | Application Gateway + WAF |
| snet-web | 10.0.3.0/24 | 웹 | nsg-web-hardened — snet-lb에서만 80 허용 |
| snet-db | 10.0.5.0/24 | 데이터 | nsg-db-hardened — snet-web에서만 3306 허용 |
| snet-kali | 10.0.10.0/24 | 위협 | 공격자 VM, nsg-allowall 고정 |
| snet-nat | 10.0.1.0/24 | 인프라 | NAT Gateway |

<br>

**hardening_enabled 토글**

variables.tf의 불리언 변수 하나로 데이터·App 계층 방어를 한 번에 켜고 끌 수 있게 설계했다.

| 토글 값 | 적용 효과 |
|---|---|
| false (기본) | NSG 전체 허용 · WAF rate-limit 미적용 · DB 10.0.0.0/8 허용 + MySQL 계정 '%' (의도적 취약) |
| true (강화) | NSG 출발지 제한 · WAF rate-limit(xmlrpc 50req/min) · DB를 WEB IP/32로 제한 + GRANT 범위 축소 |

인프라·보안 구성은 전부 Terraform으로 코드화했다. VNet·서브넷·NSG부터 Application Gateway+WAF(커스텀 rate-limit 규칙 포함), WordPress·lab-sqli.php·MySQL 시딩을 배포하는 부팅 스크립트, Log Analytics+Sentinel 온보딩, 진단 설정, 탐지 규칙(waf-web-attack·mysql-dump-exfil)까지 hardening_enabled 토글 하나로 취약/강화 상태를 오갈 수 있게 짰다.

<br>

---

### 4. 관제 및 로그 파이프라인

VM 내부 로그(WEB httpd, DB general_log)는 AMA(Azure Monitor Agent)+DCR이 Syslog로 수집하고, Azure 리소스 로그(App GW WAF, NSG)는 진단 설정으로 Log Analytics에 보낸다. 공격자 VM(Kali)은 모니터링 대상에서 제외해서 AMA를 설치하지 않는다.

| 로그 소스 | 수집 방법 | 분석 규칙 |
|---|---|---|
| App GW WAF | 진단 설정 (ApplicationGatewayFirewallLog) | waf-web-attack |
| DB general_log | rsyslog(local0) → AMA/DCR | mysql-dump-exfil |
| WEB httpd | rsyslog(local1) → AMA/DCR | — |
| NSG | 진단 설정 (NetworkSecurityGroupEvent) | — |

- **waf-web-attack** : ApplicationGatewayFirewallLog의 action이 Blocked/Detected면 인시던트 생성 (시나리오 1·2)
- **mysql-dump-exfil** : Syslog 메시지에 'personal_info' 또는 'SELECT' 패턴이 매칭되면 인시던트 생성 (시나리오 3)

<br>

---

### 5. 공격 시나리오별 실습

**시나리오 1 — WordPress 크리덴셜 탈취 (Hydra → xmlrpc.php)**

WordPress의 XML-RPC 인터페이스(/xmlrpc.php)를 대상으로 Hydra 브루트포스를 수행해 관리자 계정을 탈취한 시나리오다.

① 공격 — xmlrpc.php가 활성 상태(HTTP 405)임을 확인하고, wp-cli로 실제 관리자 계정명(min, 기본값 'admin'이 아님)을 식별한 뒤 Hydra로 비밀번호 후보를 대입했다.

```
hydra -l min -P /tmp/wp-passwords.txt -s 80 $APPGW_IP \
  http-post-form \
  "/xmlrpc.php:<methodCall>...^USER^...^PASS^...:faultCode" -t 4 -v
```

min/1234 조합이 성공했고, xmlrpc API를 직접 호출해 `isAdmin=1` 응답으로 관리자 권한 탈취를 최종 확인했다.

![min/1234로 관리자 권한 탈취 확인 (isAdmin=1)](/assets/images/azure-data-app-security/02-scenario1-isadmin-proof.png)

② 탐지 — 취약 단계에서는 WAF를 Detection 모드로 운용해 공격 트래픽은 통과시키되 로그를 쌓았다. App Gateway의 WAF 로그가 Sentinel로 전달되어 waf-web-attack 규칙이 다수의 인시던트를 생성했다.

![Sentinel 인시던트 — WAF Web Attack Detection 다수 생성](/assets/images/azure-data-app-security/03-scenario1-sentinel-incidents.png)

③ 방어 — 강화 모드에서 WAF 커스텀 규칙(RateLimitXmlrpc, /xmlrpc.php 1분당 50회 초과 시 Block)을 적용하고 동일 공격을 재실행한 결과, 유효 비밀번호를 하나도 찾지 못하고 차단됐다.

![강화 모드 적용 후 Hydra 재실행 — 0 valid password found](/assets/images/azure-data-app-security/04-scenario1-hardened-block.png)

취약점은 xmlrpc.php의 기본 활성화, 4자리 숫자 비밀번호, 계정 잠금 정책 부재, Rate Limit 미적용이 겹친 결과였다. xmlrpc.php 비활성화·강력한 비밀번호 정책·로그인 시도 제한 플러그인이 근본적인 대응책이다.

<br>

**시나리오 2 — SQL Injection (lab-sqli.php)**

lab-sqli.php는 `$_GET['id']`를 검증 없이 그대로 SQL에 이어붙이는 의도적 취약 코드다.

① 공격 — App Gateway 경유로 raw 문자열 SQLi와 sqlmap 자동화 공격을 수행했다.

```
curl "http://$APPGW_IP/lab-sqli.php?id=1' OR '1'='1"
sqlmap -u "http://$APPGW_IP/lab-sqli.php?id=1" --batch
```

boolean-based·error-based·time-based·UNION 4종 인젝션이 모두 성공했고, `--dump` 옵션으로 company.personal_info 테이블(id·name·ssn·phone)을 CSV로 추출하는 데까지 성공했다.

![sqlmap --dump — personal_info 테이블 추출](/assets/images/azure-data-app-security/05-scenario2-sqlmap-dump.png)

② 탐지 — OWASP CRS SQLi 룰(942100·942130·942390 등)이 매칭되어, sqlmap의 반복 페이로드 요청 중 Matched 382건·Detected 59건이 적재됐고 이 중 59건이 waf-web-attack 인시던트로 이어졌다.

③ 방어 — 이 WAF policy의 모드는 hardening_enabled 토글과 무관하게 Prevention으로 고정돼 있어서, SQLi 페이로드는 애초에 상시 차단 대상이다. 강화 상태에서 동일 sqlmap 공격을 재실행하니 WAF가 HTTP 403으로 응답했다.

![강화 상태에서 sqlmap 재실행 — WAF 403 차단](/assets/images/azure-data-app-security/06-scenario2-waf-403-block.png)

코드 수준에서는 Prepared Statement 적용이 근본 대응책이다.

<br>

**시나리오 3 — 데이터 유출 (mysqldump 직접 연결)**

① 공격 — 기본 모드에서는 firewalld가 10.0.0.0/8 전체에 3306을 허용하고 MySQL 계정이 '%'로 생성돼 있어서, 같은 VNet 안이면 DB 사설 IP로 직접 mysqldump가 가능했다.

```
mysqldump -h $DB_IP -u <db_admin_user> -p company personal_info > dump.sql
```

실제로 company.personal_info 테이블(id·name·ssn·phone)을 덤프하는 데 성공했다.

![mysqldump로 personal_info 테이블 덤프 성공](/assets/images/azure-data-app-security/07-scenario3-mysqldump-success.png)

② 탐지 — DB의 general_log가 local0으로 수집되어 Sentinel Syslog 테이블에 적재된다. mysqldump 실행 시 발생하는 다수의 SELECT 쿼리가 로그로 남고, 메시지에 'personal_info' 또는 'SELECT' 패턴이 매칭되면 mysql-dump-exfil 규칙이 인시던트를 생성한다.

③ 방어 — 강화 모드에서는 firewalld rich-rule과 MySQL GRANT를 모두 WEB VM 사설 IP(/32)로 제한한다. 적용 후 Kali에서 mysqldump를 재시도하니 `Host ... is not allowed to connect to this MySQL server`(error 1130)로 연결이 거부됐다.

![강화 모드 적용 후 mysqldump 재시도 — error 1130 차단](/assets/images/azure-data-app-security/08-scenario3-access-denied.png)

<br>

---

### 6. 계정 권한 제약과 개인 계정 확장 검증

3개 시나리오는 실습 계정에서 구축·검증했는데, 이 계정에는 구독 소유자·테넌트 보안 관리자 권한이 없어서 Microsoft Defender for Cloud 플랜 활성화, Azure Policy 할당, Logic App 기반 Sentinel Playbook 같은 클라우드 보안 태세·자동 대응 기능을 켤 수 없었다. 그래서 동일한 Terraform 코드를 개인 계정으로 다시 배포해서 이 기능들을 추가로 검증했다.

- Defender for Cloud (Storage·VM 위협 탐지)
- Azure Policy (Managed Identity 등 거버넌스 강제)
- Sentinel Playbook (인시던트 기반 공격 IP 자동 차단, SOAR)
- Key Vault 진단 로깅

![Defender for Cloud 보안 상태(Secure Score) 및 권장 사항](/assets/images/azure-data-app-security/09-defender-secure-score.png)

특히 Sentinel Playbook은 인시던트가 발생하면 NSG에 공격 IP를 자동으로 차단하는 SOAR 자동 대응이라, 수동 강화(hardening_enabled 토글)를 자동화로 잇는 연장선이다. 권한만 확보되면 이 자동 대응을 데이터·App 방어(WAF·DB 접근통제)에도 그대로 적용해서, 방어를 자동화·거버넌스 수준까지 끌어올릴 수 있다.

<br>

---

### 7. 성과, 한계, 다음 단계

**이번 프로젝트로 얻은 것**

- 3개 시나리오(WordPress 크리덴셜 탈취·SQL Injection·데이터 유출) 모두 공격·탐지·방어 전 단계를 실제 실습으로 검증
- hardening_enabled 토글 하나로 취약 상태와 강화 상태를 오가며, 같은 공격이 어떻게 차단되는지 비교 구조로 확인
- WAF 로그·DB general_log를 Sentinel로 모아 waf-web-attack·mysql-dump-exfil 두 분석 규칙으로 상관 탐지
- 실습 계정의 권한 제약을 개인 계정 확장으로 보완해서 Defender for Cloud·Azure Policy·Sentinel Playbook까지 검증 범위를 넓힘

<br>

**향후 과제**

| 항목 | 내용 |
|---|---|
| WAF rate-limit 임계값 정밀 측정 | 강화 모드에서 50req/min 초과 시 51번째부터 차단되는 임계 동작을 부하 테스트로 정량 측정 |
| 탐지 룰 정밀도 튜닝 | mysql-dump-exfil의 'SELECT' 패턴은 정상 트래픽도 매칭될 수 있어 오탐 저감 필요 |
| 확장 웹 시나리오 | 정찰·XSS·Path Traversal/LFI는 코드·전용 탐지 규칙 미구현 — Terraform 코드 추가가 선행돼야 함 |
| 보안 태세·자동 대응 고도화 | Defender for Cloud·Azure Policy 권장 사항 조치율 개선, Sentinel Playbook을 데이터·App 인시던트에 연계 |
