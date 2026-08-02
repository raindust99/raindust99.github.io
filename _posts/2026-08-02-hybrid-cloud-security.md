---
layout: post
title: "하이브리드 클라우드 보안구축"
date: 2026-08-02 00:00:00 +0900
category: project
permalink: /project/hybrid-cloud-security/
---
온프레미스 네트워크·서버·방화벽을 직접 구축하고, 핵심 서비스를 Azure 퍼블릭 클라우드로 이전해 IPsec VPN으로 연계하는 하이브리드 클라우드 체계를 만든 과정을 정리하였다.

---

### 1. 프로젝트 개요

실무 환경에서는 온프레미스 인프라를 클라우드로 일괄 이관할 때의 운영 안정성 위험과 레거시 자원 낭비 문제가 꾸준히 제기된다. 그래서 온프레미스와 퍼블릭 클라우드를 동시에 운영하는 하이브리드 클라우드로 전환하는 사례가 늘고 있다.
이 프로젝트는 온프레미스 네트워크 인프라를 직접 구축하고, 핵심 서비스(웹서버)를 Azure로 이전해 IPsec VPN으로 온프레미스-클라우드 연계 체계를 구현하는 것을 목표로 했다. Azure 인프라는 Terraform(IaC)으로 IP 대역 설계부터 구성했고, 데이터베이스는 보안 정책상 온프레미스에 남겨 MySQL Master-Master 이중화(keepalived VIP)로 구현했다.

<br>

**사용 장비 및 소프트웨어**

| 구분 | 장비 / 소프트웨어 | 버전 / 비고 |
|---|---|---|
| 방화벽 | SECUI Bluemax NGF 100 | 하드웨어 방화벽 |
| L3 스위치 | PIOLINK TiFRONT G24 | L3 스위치 |
| L2 스위치 | Cisco Catalyst 2960 × 2대 | L2 스위치 |
| 서버 OS | Rocky Linux 9 | VMware / Azure(9-lvm) |
| 웹서버 / DBMS | Apache / MySQL 8.x | PHP, Master-Master + keepalived VIP |
| 로그 / 분석 | rsyslog / Wireshark | UDP·TCP 514, 포트 미러링 |
| 클라우드 | Microsoft Azure | Korea Central (DR: Japan East) |
| Azure 컴퓨팅·보안 | VMSS / AppGW WAF / Azure Firewall | 오토스케일, WAF, UDR |
| 캐시·스토리지 / DR | Redis·Files / Traffic Manager | PE 격리, Priority Failover |
| 모니터링 / IaC / VPN | Log Analytics / Terraform / IPsec | azurerm 4.74.0, IKEv2 |

<br>

---

### 2. 인프라 설계

전체 인프라는 온프레미스 내부망과 Azure 퍼블릭 클라우드를 IPsec VPN으로 연결한 하이브리드 구조다. Azure는 Korea Central(Active)과 Japan East(DR)를 동일한 Hub-Spoke 구조로 대칭 구성하고, Traffic Manager로 우선순위 기반 장애 조치를 수행한다.

![하이브리드 클라우드 전체 구성도](/assets/images/hybrid-cloud-security/01-hybrid-architecture-overview.png)

<br>

**네트워크 IP 대역 설계**

| 구분 | 네트워크 대역 | 비고 |
|---|---|---|
| VLAN10 (관리·보안팀) | 192.168.1.0/24 | SVI 192.168.1.254 |
| VLAN20 (일반 직원) | 192.168.2.0/24 | SVI 192.168.2.254 |
| VLAN30 (서버팜) | 192.168.3.0/29 | SVI 192.168.3.1 |
| VLAN40 (Analyse) | 192.168.4.0/30 | SVI 192.168.4.1 |
| VLAN50 (방화벽-L3 구간) | 192.168.11.0/30 | 방화벽 .1 / L3 .2 |
| External (WAN) | 1.220.76.0/29 | 라우터 .1 / 방화벽 .2 |
| Azure Central Hub / Spoke | 10.0.0.0/16 / 10.1.0.0/16 | Firewall·AppGW·GW / Bastion·Web·PE |
| Azure Japan Hub / Spoke (DR) | 10.2.0.0/16 / 10.3.0.0/16 | 동일 대칭 구조 |

<br>

**주요 시스템 IP**

| 시스템 | IP 주소 | 비고 |
|---|---|---|
| 보안팀장 / 보안담당자 PC | 192.168.1.1 / .10 | VLAN10 |
| 내부 직원 PC | 192.168.2.10 ~ .11 | VLAN20 |
| L2-1 / L2-2 스위치 | 192.168.2.252 / .253 | Cisco Catalyst 2960 |
| DB1 / DB2 | 192.168.3.2 / .3 | VLAN30, Rocky Linux 9 |
| DB VIP / LOG 서버 | 192.168.3.6 / .4 | keepalived / rsyslog |
| Analyse 서버 | 192.168.4.2 | VLAN40, Wireshark |
| Bluemax 방화벽 | WAN 1.220.76.2 / LAN 192.168.11.1 | SECUI NGF 100 |
| Azure WEB (VMSS) | Central 10.1.1.x / Japan 10.3.1.x | Rocky Linux 9 |

<br>

실제 구축한 랙에는 SECUI Bluemax 방화벽, PIOLINK L3 스위치, Cisco L2 스위치 2대, 서버가 들어간다.

![온프레미스 장비 랙 구성](/assets/images/hybrid-cloud-security/02-onprem-equipment-rack.jpg)

<br>

---

### 3. 온프레미스 네트워크 구축

Cisco L2 스위치 2대와 PIOLINK L3 스위치로 내부망을 구성했다.

<br>

**L2 스위치 (Cisco Catalyst 2960 × 2)**

두 스위치 모두 같은 기본 보안 설정을 넣고, 서버팜을 관리하는 L2-2에는 Port Security를 하나 더 추가했다.

- 호스트네임 지정, VLAN10(보안담당자)·VLAN20(일반직원) 등 용도별 VLAN 생성
- 단말이 연결되는 포트를 액세스 모드로 해당 VLAN에 배치
- L3 스위치와 연결되는 fa0/24 포트는 트렁크로 설정
- 관리용 IP·기본 게이트웨이 설정, NTP로 시각 동기화 (로그 타임스탬프 정확도 확보)
- 로그를 중앙 LOG 서버(192.168.3.4)로 전송
- enable 비밀번호와 접속 경고 배너(MOTD) 설정
- (L2-2만) 서버팜 연결 포트에 Port Security로 포트별 학습 MAC 수 제한 → MAC 플러딩·비인가 단말 차단
- 액세스 포트에 BPDU Guard 활성화 → 비인가 스위치 연결이나 STP 조작으로 인한 루프 공격 차단
- 원격 관리는 SSH만 허용하고 Telnet 차단, VTY ACL로 보안담당자 대역(VLAN10)에서만 접속 허용
- running-config를 startup-config로 저장해 재부팅 후에도 설정 유지

<br>

**L3 스위치 (PIOLINK TiFRONT G24)**

- VLAN 10·20·30·40·50 생성, 각 VLAN의 SVI(가상 인터페이스)로 인터-VLAN 라우팅 구현
- 물리 인터페이스·트렁크로 L2 스위치 및 서버와 연결
- 기본 경로(0.0.0.0/0)를 방화벽 구간(192.168.11.1)으로 지정 → 외부로 나가는 모든 트래픽이 방화벽을 경유
- GE13 포트 트래픽을 Analyse 서버로 미러링 → Wireshark로 실시간 분석
- NTP 동기화, 경고 배너, 로그를 LOG 서버로 전송
- ACL로 VLAN20(일반직원)의 서버팜(VLAN30) 직접 접근을 차단하고 VLAN10(보안담당자)만 허용 — 일반 사용자망과 핵심 서버를 분리

<br>

---

### 4. 온프레미스 서버 구축

서버팜(VLAN30)에 DB 이중화·Log·Analyse 서버를 구축했다.

<br>

**DB 서버 이중화 — MySQL Master-Master + keepalived VIP**

db1(192.168.3.2)·db2(192.168.3.3) 두 노드를 양방향 복제하고, keepalived 가상 IP(192.168.3.6)로 자동 장애 복구를 구현했다. WEB 서버와 Azure VMSS는 개별 DB IP가 아니라 항상 이 VIP로만 접속한다.

MySQL을 설치하고 WordPress용 DB·계정을 만든다.

```
dnf install -y mysql-server
systemctl enable --now mysqld

CREATE DATABASE wordpress;
CREATE USER 'ijo'@'%' IDENTIFIED BY '<PASSWORD>';
GRANT ALL PRIVILEGES ON wordpress.* TO 'ijo'@'%';
FLUSH PRIVILEGES;
```

server-id를 서로 다르게 부여하고, auto_increment 간격·오프셋을 db1(홀수)/db2(짝수)로 분리해서 양쪽에서 동시에 INSERT해도 PK가 충돌하지 않게 했다.

```
# db1 /etc/my.cnf.d/mysql-server.cnf → [mysqld]
server-id=1
log-bin=mysql-bin
auto_increment_increment=2
auto_increment_offset=1

# db2 /etc/my.cnf.d/mysql-server.cnf → [mysqld]
server-id=2
log-bin=mysql-bin
auto_increment_increment=2
auto_increment_offset=2
```

복제 전용 계정을 만들고, 각 노드의 바이너리 로그 위치(File·Position)를 기준으로 상대 노드를 소스로 지정해서 양방향 복제를 완성했다.

```
CREATE USER 'repl'@'%' IDENTIFIED WITH mysql_native_password BY '<PASSWORD>';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

# db2에서 — db1을 소스로 복제 시작
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.3.2', SOURCE_USER='repl',
  SOURCE_PASSWORD='<PASSWORD>',
  SOURCE_LOG_FILE='mysql-bin.000001', SOURCE_LOG_POS=<메모값>;
START REPLICA;
# 반대 방향(db1 ← db2)도 동일하게 설정하면 양방향 복제 완성
```

한쪽에 입력한 데이터가 반대쪽에 즉시 반영되는지 양방향으로 확인했다.

![MySQL Master-Master 양방향 복제 확인](/assets/images/hybrid-cloud-security/03-mysql-master-master-replication.png)

두 DB에 keepalived를 설치해 VIP를 공유하고, MySQL 상태를 주기적으로 점검해서 우선순위가 높은 db1(MASTER)이 정상일 때 VIP를 보유하다가 장애가 나면 db2(BACKUP)가 자동으로 승계하게 했다.

```
# MySQL 헬스체크 스크립트 /etc/keepalived/chk_mysql.sh
#!/bin/bash
mysqladmin ping -u root --silent 2>/dev/null

# /etc/keepalived/keepalived.conf - db1 (MASTER)
vrrp_script chk_mysql {
  script "/etc/keepalived/chk_mysql.sh"
  interval 2 weight -20 fall 2 rise 2
}
vrrp_instance VI_DB {
  state MASTER
  interface ens160
  virtual_router_id 51
  priority 110            # db2 = 100
  advert_int 1
  authentication { auth_type PASS auth_pass <PSK> }
  virtual_ipaddress { 192.168.3.6/29 }
  track_script { chk_mysql }
}
# db2 (BACKUP): state BACKUP / priority 100, 나머지 동일

firewall-cmd --permanent --add-rich-rule='rule protocol value="vrrp" accept'
firewall-cmd --reload
systemctl enable --now keepalived
```

db1을 정지시켜 장애를 유발한 뒤에도 db2가 VIP를 승계해서 서비스가 끊기지 않는 걸 확인했다.

![keepalived 가상 IP 활성 노드 할당 확인](/assets/images/hybrid-cloud-security/04-keepalived-vip-check.png)

<br>

**DB 서버 보안**

- `mysql_secure_installation`으로 익명 계정·원격 root 로그인·테스트 DB 등 설치 직후의 위험한 기본값 제거
- DB 계정이 WEB 서버·VMSS 등 허가된 출발지 IP에서만 접속하도록 제한
- firewalld rich rule로 3306 포트를 허용 IP에 한해서만 개방해 네트워크 계층에서 한 번 더 접근 통제
- 허용된 IP는 접속되고 그 외에는 차단되는지 실제로 검증

<br>

**Log 서버 — RAID1 + rsyslog**

로그 저장의 안정성을 위해 디스크 2개를 RAID1(미러링)으로 묶어서, 한 디스크가 고장 나도 데이터가 보존되게 했다.

```
mdadm --create /dev/md0 --level=1 --raid-devices=2 <disk1> <disk2>
mkfs.ext4 /dev/md0
mount /dev/md0 /var/log/syslog
# /etc/fstab에 등록해 재부팅 후에도 자동 마운트
mdadm --detail --scan >> /etc/mdadm.conf
```

![RAID1 볼륨 생성](/assets/images/hybrid-cloud-security/05-raid1-setup.png)

rsyslog에서 UDP/TCP 514 수신을 활성화하고 장비 IP별·날짜별로 로그를 분리 저장하는 템플릿을 구성해서, 스위치·DB 등 각 장비의 로그를 한곳에서 체계적으로 모았다.

<br>

**Analyse 서버 — 포트 미러링 + Wireshark**

VLAN40(/30) 대역에 정적 IP를 설정하고 Wireshark를 설치했다. GUI를 원격 PC에서 띄우기 위해 X11 포워딩도 켰다.

```
hostnamectl set-hostname Analysesvr
nmcli connection modify ens160 ipv4.method manual \
  ipv4.addresses 192.168.4.2/30 ipv4.gateway 192.168.4.1
nmcli connection up ens160

dnf -y install wireshark
sudo dnf install -y xorg-x11-xauth
echo "X11Forwarding yes" | sudo tee /etc/ssh/sshd_config.d/99-x11.conf
systemctl restart sshd
```

이 서버는 트래픽 수집 전용이라 IP 포워딩을 차단해 라우터로 악용되지 않게 했고, SSH도 보안담당자 대역(VLAN10)에서만 허용했다.

```
echo 'net.ipv4.ip_forward=0' | sudo tee /etc/sysctl.d/99-no-forward.conf
sysctl --system

firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" service name="ssh" accept'
firewall-cmd --permanent --remove-service=ssh
firewall-cmd --reload
```

포트 미러링으로 받은 트래픽을 Wireshark로 캡처해서 비정상 트래픽을 살펴봤다.

![Wireshark 포트 미러링 트래픽 캡처](/assets/images/hybrid-cloud-security/06-wireshark-capture.png)

<br>

---

### 5. 온프레미스 방화벽 구축 (SECUI Bluemax NGF 100)

외부(WAN 1.220.76.2)와 내부(192.168.11.1) 경계 방화벽으로 NAT·패킷 필터링·로그를 구성했다.

- 인터페이스 분리 : eth0(관리 192.168.10.10/24), eth1(WAN 1.220.76.2/29), eth2(192.168.11.1/30, L3 스위치 연동)
- 정적 라우팅 : 기본 경로는 외부 게이트웨이(1.220.76.1, eth1)로, 내부 대역(192.168.1~4.0)은 L3 스위치(192.168.11.2, eth2)로
- 장비 기본 정보·NTP·Timezone(Asia/Seoul) 설정으로 로그 타임스탬프 정확도 확보
- 내부 사설 대역이 외부와 통신하도록 SNAT을 구성하되, IPsec VPN 터널 트래픽은 NAT 대상에서 제외 — VPN 구간은 사설 IP 그대로 통신해야 하기 때문
- 보안 정책 : 내부 사용자 인터넷 접속(DNS·HTTP·HTTPS), Azure VMSS ↔ 온프레미스 DB MySQL 양방향 통신, 장비 로그 전송(192.168.3.4)만 허용하고 마지막 규칙에서 나머지 전체 차단(최소 권한 원칙)
- 웹 관리 콘솔 접근을 보안담당자 대역(VLAN10)과 관리 대역(192.168.10.0/24)으로 제한
- 통과·차단 로그 수집 설정

<br>

---

### 6. Hybrid Cloud 구축 (Azure · Terraform IaC)

Azure 쪽은 [이전 Azure 인프라 프로젝트](/project/azure-infra-m365-defender-security/)에서 짠 Terraform 코드를 그대로 재활용해서, Korea Central(Active)·Japan East(DR) 이중 리전 Hub-Spoke 인프라를 다시 구성했다. RG·VNet·Subnet·공인 IP·Peering·UDR, NSG·Azure Firewall·Bastion, AppGW+WAF·VMSS·오토스케일, Storage·Files·Redis·PE까지 구조는 동일하다.

<br>

이번에 새로 붙인 부분은 온프레미스 연동이다. Azure Korea Central VPN Gateway와 온프레미스 Bluemax 방화벽 간에 IPsec 터널을 구성했다. 방화벽에는 Azure VPN Gateway 공인 IP를 센터 장비 IP로 등록하고, 지점 ID는 team601로, 인증은 사전 공유 키(PSK)로, IKEv2 기반 IKE/IPsec 정책을 Azure 측과 동일하게 맞췄다. DR용으로 Japan East VPN Gateway와도 같은 방식(IKEv2·AES-256·SHA-256·DHGroup14)으로 터널을 하나 더 구성해서, Central 장애 시에도 이 터널로 온프레미스 DB 연동이 유지되게 했다.

Traffic Manager는 우선순위 라우팅으로 평소에는 Korea Central(우선순위 1)로 보내다가 장애를 감지하면 Japan East(우선순위 2)로 자동 전환한다. Log Analytics로 Firewall·WAF·AppGW 로그를 한곳에 모아 모니터링 기반도 마련했다.

<br>

---

### 7. 시나리오 검증

**접근 제어 — 역할별 권한 분리**

보안담당자(VLAN10)와 일반 사용자(VLAN20)를 구분해서 다음을 확인했다.

- 보안담당자는 Analyse 서버·Log 서버 SSH·L3 ping·L2 스위치 SSH·Bluemax 관리 콘솔에 모두 접근 가능
- 일반 사용자는 위 항목 전부 접근 불가 — 인터넷과 Azure WEB 접속만 가능하고, Azure WEB에 대한 SSH·RDP도 차단

| 보안담당자 — Analyse 서버 접근 가능 | 일반 사용자 — Analyse 서버 접근 불가 |
|---|---|
| ![허용](/assets/images/hybrid-cloud-security/07-analyse-access-allowed.png) | ![차단](/assets/images/hybrid-cloud-security/08-analyse-access-blocked.png) |

<br>

**트래픽 분석 — Wireshark**

포트 미러링으로 받은 DB 트래픽·서버팜 트래픽·웹 트래픽을 각각 캡처해서 정상 흐름을 확인했다.

<br>

**Log Analytics 모니터링 검증**

- Azure Firewall 네트워크 룰 로그(허용·차단 건수) 조회 → 클라우드 아웃바운드가 정책대로 통제되는지 확인
- WAF 탐지·차단 로그 조회 → SQL Injection 등 웹 공격이 실제로 차단되는지 확인
- Application Gateway 액세스 로그(응답 코드별 건수) 조회 → 정상 응답과 오류·차단 응답 분포로 서비스 상태 모니터링

| Firewall 네트워크 룰 로그 | WAF 차단 로그 |
|---|---|
| ![Firewall 로그](/assets/images/hybrid-cloud-security/09-log-analytics-firewall-log.png) | ![WAF 로그](/assets/images/hybrid-cloud-security/10-log-analytics-waf-log.png) |

<br>

---

### 8. 성과, 한계, 다음 단계

**이번 프로젝트로 얻은 것**

- 온프레미스 네트워크를 VLAN(사용자망·서버팜·분석망)으로 분리하고 L3 스위치에서 인터-VLAN 라우팅을 구성
- BPDU Guard·Port Security·SSH 전용 관리·VTY ACL로 스위치 단 보안을 적용해 비인가 접근과 L2 공격 표면을 최소화
- DB를 Master-Master 양방향 복제 + keepalived VIP로 이중화해서 노드 장애 시에도 서비스 연속성 확보
- Log 서버는 RAID1 + rsyslog 원격 수신으로 각 장비 로그를 중앙 수집·보관, Analyse 서버는 포트 미러링 + Wireshark로 내부 트래픽 상시 분석 기반 마련
- 경계 방화벽에서 관리자 접근 제한, SNAT 정책, 패킷 필터링, 로그 수집으로 내부망-외부망 경계 통제
- 웹 서버를 Azure VMSS로 이전하고 이전 프로젝트의 이중 리전 Hub-Spoke 인프라와 연계, IPsec VPN으로 온프레미스 DB와 사설 대역 그대로 통신, Traffic Manager로 DR 자동 전환까지 구현

<br>

**한계점 및 개선 방향**

| 항목 | 현황 | 개선 방향 |
|---|---|---|
| VPN 단일 경로 | IPsec VPN이 단일 터널이라 장애 시 하이브리드 연계 중단 가능 | Active-Active VPN 이중화 + BGP 동적 라우팅 |
| DB 페일오버 수동 검증 | keepalived 상태·복제 지연을 수동으로 확인 | 상시 모니터링 + 장애 자동 알림 도구 도입 |
| 일부 구간 HTTP | 평문 HTTP 리스너 구간 존재 | 인증서 적용, HTTPS(TLS) 전환 |
| 시나리오 검증 수동 비중 높음 | 수동 검증 위주 | CI/CD 파이프라인 + 모니터링 자동화 연계 |
| DB 백업·복구 미정교화 | 절차가 단순한 수준 | 백업·복구 절차 정교화, 비용·성능 지속 최적화 |
