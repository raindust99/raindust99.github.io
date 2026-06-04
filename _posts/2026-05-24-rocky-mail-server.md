---
layout: post
title: "Rocky Linux에 DNS+Mail 서버 구성"
date: 2026-05-24 00:00:00 +0900
category: lab
permalink: /lab/rocky-mail-server/
---
Rocky Linux 9 환경에서 **BIND**(DNS), **Postfix**(SMTP), **Dovecot**(POP3/IMAP)을 함께 구성해 도메인 이름으로 메일을 주고받는 방법을 정리한다.

> 실습 환경
> - DNS 서버 : `10.0.0.21` (ns1.kjy.local)
> - Mail 서버 : `10.0.0.23` (mx1.kjy.local)
> - 도메인 : `kjy.local`

---

### 구성 흐름

```
[클라이언트]
    │
    ▼
[DNS 서버 10.0.0.21]   ← mx1.kjy.local → 10.0.0.23 (MX 레코드)
    │
    ▼
[Mail 서버 10.0.0.23]
    ├── Postfix  (SMTP  :25)
    └── Dovecot  (POP3 :110 / IMAP :143)
```

<br>

### 1. DNS 서버에 메일 관련 레코드 추가

메일 서버를 도메인으로 사용하려면 DNS에 A 레코드와 MX 레코드를 등록해야 한다.

- BIND 설치

    ```bash
    dnf install -y bind bind-utils
    systemctl enable --now named
    ```

- 정방향 조회 영역 설정

    ```bash
    vi /etc/named.conf
    ```

    `options` 블록에 아래 항목을 추가 또는 수정한다.

    ```
    options {
        listen-on port 53 { any; };
        allow-query { any; };
        ...
    };
    ```

    영역 선언을 추가한다.

    ```
    zone "kjy.local" IN {
        type master;
        file "/var/named/kjy.local.zone";
        allow-transfer { 10.0.0.22; };   # 보조 DNS가 있는 경우
    };
    ```

- 정방향 조회 영역 파일 작성

    ```bash
    vi /var/named/kjy.local.zone
    ```

    ```
    $TTL 86400
    @   IN  SOA  ns1.kjy.local.  root.kjy.local. (
                2024010101  ; Serial
                3600        ; Refresh
                900         ; Retry
                604800      ; Expire
                86400 )     ; Minimum TTL

    ; 네임 서버
    @       IN  NS   ns1.kjy.local.

    ; A 레코드
    @       IN  A    10.0.0.21
    ns1     IN  A    10.0.0.21
    www     IN  A    10.0.0.22
    ftp     IN  A    10.0.0.22
    mx1     IN  A    10.0.0.23

    ; MX 레코드 (메일 서버 지정)
    @       IN  MX   10  mx1.kjy.local.
    ```

    > MX 레코드의 숫자(10)는 우선순위다. 숫자가 낮을수록 먼저 사용된다.

- 역방향 조회 영역 설정

    `/etc/named.conf`에 역방향 영역 선언을 추가한다.

    ```
    zone "0.0.10.in-addr.arpa" IN {
        type master;
        file "/var/named/0.0.10.in-addr.arpa.zone";
        allow-transfer { 10.0.0.22; };
    };
    ```

- 역방향 조회 영역 파일 작성

    ```bash
    vi /var/named/0.0.10.in-addr.arpa.zone
    ```

    ```
    $TTL 86400
    @   IN  SOA  ns1.kjy.local.  root.kjy.local. (
                2024010101
                3600
                900
                604800
                86400 )

    @   IN  NS   ns1.kjy.local.

    ; PTR 레코드
    21  IN  PTR  ns1.kjy.local.
    23  IN  PTR  mx1.kjy.local.
    ```

- 영역 파일 권한 설정 및 BIND 재시작

    ```bash
    chown root:named /var/named/kjy.local.zone
    chown root:named /var/named/0.0.10.in-addr.arpa.zone

    # 설정 문법 확인
    named-checkconf
    named-checkzone kjy.local /var/named/kjy.local.zone
    named-checkzone 0.0.10.in-addr.arpa /var/named/0.0.10.in-addr.arpa.zone

    systemctl restart named
    ```

- DNS 레코드 확인

    ```bash
    # A 레코드 확인
    nslookup mx1.kjy.local 10.0.0.21

    # MX 레코드 확인
    nslookup -type=MX kjy.local 10.0.0.21

    # 역방향 확인
    nslookup 10.0.0.23 10.0.0.21
    ```

<br>

### 2. 클라이언트 DNS 설정

메일 클라이언트(Thunderbird를 사용할 PC)의 DNS를 `10.0.0.21`로 지정해야 `mx1.kjy.local`로 접속할 수 있다.

```bash
# /etc/resolv.conf 수정 (Rocky Linux 클라이언트)
vi /etc/resolv.conf
```

```
nameserver 10.0.0.21
```

또는 NetworkManager로 설정한다.

```bash
nmcli con mod "연결이름" ipv4.dns "10.0.0.21"
nmcli con up "연결이름"
```

<br>

### 3. 방화벽 포트 열기 (Mail 서버)

메일 서버(`10.0.0.23`)에서 아래 포트를 허용한다.

| 포트 | 프로토콜 | 용도 |
|------|----------|------|
| 25   | TCP | SMTP (메일 송신) |
| 110  | TCP | POP3 (메일 수신) |
| 143  | TCP | IMAP (메일 수신) |

```bash
firewall-cmd --permanent --add-port=25/tcp
firewall-cmd --permanent --add-port=110/tcp
firewall-cmd --permanent --add-port=143/tcp
firewall-cmd --reload

# 확인
firewall-cmd --list-ports
```

DNS 서버(`10.0.0.21`)에서도 53번 포트를 허용한다.

```bash
firewall-cmd --permanent --add-service=dns
firewall-cmd --reload
```

<br>

### 4. Postfix 설치 및 설정 (SMTP)

- 설치

    ```bash
    dnf install -y postfix
    systemctl enable --now postfix
    ```

- main.cf 설정

    ```bash
    vi /etc/postfix/main.cf
    ```

    ```
    # 호스트 이름 (DNS의 A 레코드와 일치해야 함)
    myhostname = mx1.kjy.local

    # 메일 도메인 (MX 레코드 도메인과 일치해야 함)
    mydomain = kjy.local

    # 발신 도메인
    myorigin = $mydomain

    # 모든 인터페이스에서 수신
    inet_interfaces = all

    # 수신 허용 도메인
    mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain

    # Maildir 형식으로 메일박스 생성
    home_mailbox = Maildir/
    ```

- 재시작

    ```bash
    systemctl restart postfix
    systemctl status postfix
    ```

<br>

### 5. Dovecot 설치 및 설정 (POP3/IMAP)

- 설치

    ```bash
    dnf install -y dovecot
    systemctl enable --now dovecot
    ```

- 프로토콜 활성화

    ```bash
    vi /etc/dovecot/dovecot.conf
    ```

    ```
    protocols = imap pop3
    ```

- 메일박스 위치 설정

    ```bash
    vi /etc/dovecot/conf.d/10-mail.conf
    ```

    ```
    mail_location = maildir:~/Maildir
    ```

- 인증 설정

    ```bash
    vi /etc/dovecot/conf.d/10-auth.conf
    ```

    ```
    # 평문 인증 허용 (내부 실습 환경)
    disable_plaintext_auth = no
    auth_mechanisms = plain login
    ```

    > ⚠️ 운영 환경에서는 SSL/TLS를 적용하고 `disable_plaintext_auth = yes`로 설정해야 한다.

- 재시작

    ```bash
    systemctl restart dovecot
    systemctl status dovecot
    ```

<br>

### 6. 메일 계정 생성

Rocky Linux에서는 OS 사용자가 곧 메일 계정이다.

```bash
# 사용자 x 생성
useradd x
echo "It1" | passwd --stdin x

# 사용자 y 생성
useradd y
echo "It1" | passwd --stdin y
```

<br>

### 7. 로그 확인

```bash
# 실시간 로그 확인
tail -f /var/log/maillog

# journalctl로 확인
journalctl -u postfix -u dovecot -f
```

<br>

### 8. 동작 확인

- 포트 리스닝 확인

    ```bash
    ss -tlnp | grep -E '25|110|143'
    ```

- MX 레코드를 통한 메일 발송 테스트

    ```bash
    echo "test mail body" | mail -s "test subject" x@kjy.local
    ```

    Postfix는 `kjy.local`의 MX 레코드를 DNS에서 조회해 `mx1.kjy.local(10.0.0.23)`로 메일을 전달한다.

<br>

### 9. Thunderbird에서 계정 연결하기

- 사전 조건

    클라이언트 PC의 DNS가 `10.0.0.21`로 설정되어 있어야 `mx1.kjy.local`로 접속할 수 있다.

<br>

- 계정 추가

    설정 → 계정 설정 → 새 계정 → 메일 계정 → MANUAL CONFIGURATION

<br>

- 수신 서버 설정

    | 항목 | 값 |
    |------|-----|
    | 호스트명 | `mx1.kjy.local` |
    | 포트 | `110` (POP3) 또는 `143` (IMAP) |
    | 보안 연결 | 없음 |
    | 인증 방식 | 안전하지 않게 전송되는 비밀번호 |
    | 사용자 이름 | `x` |

<br>

- 발신 서버 설정

    | 항목 | 값 |
    |------|-----|
    | 호스트명 | `mx1.kjy.local` |
    | 포트 | `25` |
    | 보안 연결 | 없음 |
    | 인증 방식 | 안전하지 않게 전송되는 비밀번호 |
    | 사용자 이름 | `x` |

<br>

- 발신 서버 편집

    설정 → 계정 설정 → 보내는 서버 편집 → 보안 연결 : 없음 / 인증 방식 : 안전하지 않게 전송되는 비밀번호 → 확인

<br>

- 테스트

    새 메시지 → 자기 자신(`x@kjy.local`)에게 메일 발송 → 받은 편지함, 보낸 편지함에서 모두 확인되면 정상 동작.

<br>

- 계정 삭제

    설정 → 우측 상단 삭제 → 메시지 데이터 삭제 체크 → 제거

