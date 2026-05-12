---
layout: post
title: "Rocky Linux에 DHCP 서버 구성하기"
date: 2026-05-13 00:00:00 +0900
category: lab
permalink: /lab/rocky-dhcp-server/
---
Rocky Linux에 DHCP 서버를 설치하고 설정 파일을 구성한 뒤, Windows 10 / 11 클라이언트에서 IP를 자동으로 할당받는 과정을 정리하였다.

---

### 1. DHCP 서버 설치

  ```bash
  dnf install -y dhcp-server
  ```

  Rocky Linux에서 DHCP 서버 패키지를 설치한다.

<br>

### 2. DHCP 설정 파일 수정

- DHCP 서버의 설정 파일

  ```bash
  vi /etc/dhcp/dhcpd.conf
  ```

  DHCP 서버의 설정 파일은 `/etc/dhcp/dhcpd.conf`이다. <br>
  기본적으로 내용이 비어 있기 때문에, 예제 파일에서 내용을 가져와 수정한다.

<br>

- vi 편집기 명령어 모드

  ```
  :$r /usr/share/doc/dhcp-server/dhcpd.conf.example
  ```

  vi 편집기가 열리면 명령어 모드에서 아래 명령어로 예제 설정 파일을 불러온다.


<br>

- vi 편집기 편집 모드

  ```
  :1,51d      ← 1번 줄부터 51번 줄까지 삭제
  :10,28d     ← 10번 줄부터 28번 줄까지 삭제
  :14,$d      ← 14번 줄부터 끝까지 삭제
  :10,13co$   ← 10~13번 줄을 복사하여 파일 끝에 붙여넣기
  ```

  예제 파일을 불러오면 주석과 예제 설정이 많이 추가된다. <br>
  명령어 모드에서 불필요한 줄들을 아래 순서대로 삭제해 깔끔하게 정리한다.

<br>

- 수정된 DHCP 서버의 설정 파일
  ![이미지](/assets/images/rockydhcp/dhcp1.png) <br>
  최종적으로 위와 같이 설정 파일을 완성한다.

<br>

- 주요 항목 설명

  | 항목 | 설명 |
  |---|---|
  | `subnet` | DHCP를 제공할 네트워크 대역 |
  | `range` | 동적으로 할당할 IP 주소 범위 |
  | `option domain-name-servers` | 클라이언트에게 제공할 DNS 서버 |
  | `option routers` | 기본 게이트웨이 주소 |
  | `default-lease-time` | 기본 IP 임대 시간 (초 단위, 3600 = 1시간) |
  | `max-lease-time` | 최대 IP 임대 시간 (초 단위, 7200 = 2시간) |

<br>

### 3. DHCP 예약 기능 (IP 고정 할당)

```
host w10 {
  hardware ethernet 00:00:00:00:00:01;  ← 클라이언트의 MAC 주소
  fixed-address 10.0.0.101;             ← 고정으로 할당할 IP 주소
}
```

  `host` 블록을 사용하면 특정 MAC 주소를 가진 장치에 항상 동일한 IP를 할당할 수 있다.
  이를 IP 예약(Reservation) 또는 고정 할당(Static Assignment) 이라고 한다.


<br>

### 4. DHCP 서비스 시작

```bash
systemctl enable --now dhcp
```
설정이 완료되면 DHCP 서버를 시작하고, 부팅 시 자동으로 실행되도록 등록한다.


<br>

### 5. Windows 10 / 11에서 DHCP 사용하기

- IP 주소 자동 받기 설정

  * `Window + R` → `ncpa.cpl` 실행 → `Ethernet0` 우클릭 → `속성` → `인터넷 프로토콜 버전 4(TCP/IPv4)` 더블클릭 → `자동으로 IP 주소 받기` 선택 후 확인

- MAC 주소 변경 (DHCP 예약 맞추기)

DHCP 서버에서 MAC 주소 기반으로 IP를 예약했다면, Windows에서 MAC 주소를 맞춰줘야 한다.

`Win + R` → `ncpa.cpl` 실행 → `Ethernet0` 우클릭 → `속성`  
→ `구성` → `고급` 탭 → `Locally Administered Address` 선택  
→ `값` 라디오버튼 선택 후 MAC 주소 입력

- **Windows 10:** `000000000001`
- **Windows 11:** `000000000002`


- CMD에서 IP 갱신 확인

설정 후 CMD를 열고 아래 명령어로 IP를 갱신하고 확인한다.

```cmd
ipconfig /release    ← 현재 할당된 IP 반납
ipconfig /renew      ← DHCP 서버에서 새로운 IP 요청
ipconfig /all        ← 현재 IP 정보 상세 확인
```

`ipconfig /all` 결과에서 `DHCP Enabled: Yes`와 할당된 IP를 확인할 수 있다.

---

### 6. 알아두면 좋은 것들

- 오류 확인

DHCP 서비스에 문제가 생겼을 때는 아래 명령어로 로그를 확인한다.

```bash
journalctl -xe
```

설정 파일의 문법 오류나 서비스 실패 원인을 자세히 확인할 수 있다.

- DHCP 임대 현황 확인

DHCP 서버에서 현재 어떤 클라이언트가 IP를 할당받아 사용 중인지 확인할 수 있다.

```bash
vi /var/lib/dhcpd/dhcpd.leases
```

이 파일에는 **동적으로 할당된 IP의 임대 정보**가 기록된다.
다만, `host` 블록으로 설정한 **예약 IP(fixed-address)는 이 파일에 기록되지 않는다.**  
예약 IP는 항상 고정으로 할당되기 때문에 lease 추적 대상이 아니다.

- DHCP 서버 삭제

DHCP 서버가 더 이상 필요 없을 때는 아래와 같이 제거한다.

```bash
dnf autoremove -y dhcp-server
```

단, 이 명령어만으로는 설정 파일과 임대 데이터가 남아 있다.
완전히 삭제하려면 관련 디렉토리도 함께 제거한다.

```bash
rm -rf /etc/dhcp /var/lib/dhcp
```

> `/etc/dhcp` : DHCP 설정 파일 디렉토리  
> `/var/lib/dhcp` : IP 임대 정보 파일 디렉토리
