---
layout: post
title: "Rocky Linux에 DNS+WEB 서버 구성"
date: 2026-05-22 00:00:00 +0900
category: lab
permalink: /lab/rocky-dns-web-server/
---
Rocky Linux 9.4에 Apache httpd와 BIND(named)를 설치하고 가상 호스트 및 사용자 인증 설정, 주/보조 DNS 영역 구성까지 한 번에 정리하였다.

---

### 1. Apache HTTP Server 설치

```bash
dnf install -y httpd
```

설치 후 기본으로 생성되는 welcome 페이지를 비활성화한다.  
비활성화하면 `index.html`이 없는 디렉토리에서 파일 목록(디렉토리 리스팅)이 노출되므로, 이후 단계에서 `Indexes` 옵션도 반드시 제거해야 한다.

```bash
mv /etc/httpd/conf.d/{welcome.conf,welcome.conf.bak}
```

서비스 활성화 및 방화벽 허용:

```bash
systemctl enable --now httpd
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload
```


<br>

### 2. httpd.conf 기본 설정

```bash
vi /etc/httpd/conf/httpd.conf
```

- 91번 줄 — 서버 관리자 이메일 수정

    ```
    # 변경 전
    ServerAdmin root@localhost

    # 변경 후
    ServerAdmin web@이니셜.local
    ```

- 149번 줄 — 디렉토리 리스팅(Indexes) 제거

    ```
    # 변경 전
    Options Indexes FollowSymLinks

    # 변경 후
    Options FollowSymLinks
    ```

    > `Indexes` 옵션을 제거하면 `index.html`이 없는 디렉토리에 접근할 때 파일 목록 대신 **403 Forbidden**이 반환된다. 의도된 보안 동작이다.

- 메인 페이지 작성

    ```bash
    vi /var/www/html/index.html
    ```

    ```html
    <html>
    <body>
    <h1>MAIN-KJY-WEB-1</h1>
    </body>
    </html>
    ```

    ```bash
    systemctl restart httpd
    ```


<br>

### 3. 가상 호스트(Virtual Host) 설정

하나의 서버에서 여러 도메인을 운영할 때 가상 호스트를 사용한다.  
`httpd.conf`에 직접 작성해도 되지만, 별도 파일로 분리하면 관리가 편하다.

- 서브 도메인용 디렉토리 및 페이지 생성

    ```bash
    mkdir /var/www/blog
    vi /var/www/blog/index.html
    ```

    ```html
    <html>
    <body>
    <h1>BLOG-KJY-WEB-1</h1>
    </body>
    </html>
    ```

- 가상 호스트 설정 파일 작성

    ```bash
    vi /etc/httpd/conf.d/vir.conf
    ```

    ```apache
    NameVirtualHost *:80

    # 메인 도메인 — ServerAlias로 이니셜.local도 함께 처리
    <VirtualHost *:80>
        ServerName   www.kjy.local
        ServerAlias  kjy.local
        DocumentRoot /var/www/html
    </VirtualHost>

    # 서브 도메인 — 블로그
    <VirtualHost *:80>
        ServerName   blog.kjy.local
        DocumentRoot /var/www/blog
    </VirtualHost>
    ```

    > **주의:** 첫 번째 `<VirtualHost>` 블록을 명시하지 않으면 도메인에 따라 엉뚱한 페이지가 응답될 수 있다. 기본(main) 가상 호스트는 반드시 첫 번째로 선언한다.

<br>


### 4. 디렉토리 접근 제한

- IP 기반 접근 제한

    특정 IP에서만 접근을 허용하려면 `Directory` 블록을 사용한다.

    ```apache
    <Directory "/var/www/blog">
        Order   deny,allow
        Allow from 10.0.0.101
        Deny from all
    </Directory>
    ```

    > `Order deny,allow`는 **Allow → Deny** 순서로 평가된다. Order의 마지막에 쓴 지시자가 기본값이 되므로, 위 설정은 "기본 Deny, 10.0.0.101만 Allow"가 된다.

- 사용자 인증 (.htaccess)

    인증이 필요한 디렉토리에 `.htaccess`를 사용하려면 먼저 `httpd.conf` 또는 `vir.conf`에서 `AllowOverride`를 허용해야 한다.

    ```apache
    <Directory "/var/www/intra">
        AllowOverride AuthConfig
    </Directory>
    ```

    `.htaccess` 파일 작성:

    ```bash
    vi /var/www/intra/.htaccess
    ```

    ```
    AuthName     "Auth Test"
    AuthType     Basic
    AuthUserFile /web/.user
    Require user a b
    ```

- 사용자 계정 생성:

    ```bash
    mkdir /web
    htpasswd -c /web/.user a   # -c 옵션: 파일 신규 생성 (최초 1회만 사용)
    htpasswd /web/.user b      # 이후 계정 추가 시 -c 없이
    ```

    > **주의:** `-c` 옵션은 파일을 새로 생성한다. 두 번째 계정 추가 시 `-c`를 사용하면 기존 계정이 전부 삭제된다.

    ```bash
    systemctl restart httpd
    ```

<br>

### 5. DNS Server 설치

```bash
dnf install -y bind bind-utils bind-libs
```

<br>

### 6. named.conf 설정

```bash
vi /etc/named.conf
```

| 줄 번호 | 항목 | 변경 내용 |
|--------|------|----------|
| 11번 줄 | listen-on port | `127.0.0.1` → `any` |
| 19번 줄 | allow-query | `localhost` → `any` |

```
# 11번 줄
listen-on port 53 { any; };

# 19번 줄
allow-query { any; };
```

> 기본값은 `localhost`만 허용이므로 외부 클라이언트의 DNS 질의를 받으려면 반드시 `any`로 변경해야 한다.


<br>

### 7. Zone 파일 설정 (주 영역)

주 영역(Master) 서버에서 설정한다.

```bash
vi /etc/named.rfc1912.zones
```

기존 23~27번 줄(정방향 zone 예시)을 복사해 끝에 붙여넣는다.

```
:23,27co$
```

복사된 블록(약 46번 줄부터)을 아래와 같이 수정:

```
zone "이니셜.local" IN {
    type master;
    file "1";
    allow-update { 10.0.0.12; 10.0.0.13; };
};
```

기존 41~45번 줄(역방향 zone 예시)도 복사해 끝에 붙여넣는다.

```
:41,45co$
```

복사된 블록(약 51번 줄부터)을 아래와 같이 수정:

```
zone "0.0.10.in-addr.arpa" IN {
    type master;
    file "2";
    allow-update { 10.0.0.12; 10.0.0.13; };
};
```

> `allow-update`에는 보조(Slave) DNS 서버의 IP를 입력한다. 보조 영역이 없으면 `none;`으로 두면 된다.

<br>

### 8. Zone 파일 설정 (보조 영역)

보조 영역(Slave) 서버에서 설정한다. 주 영역과 zone 이름은 동일하게 입력한다.

```bash
vi /etc/named.rfc1912.zones
```

정방향 zone:

```
zone "이니셜.local" IN {
    type slave;
    file "1";
    masters { 10.0.0.11; };
};
```

역방향 zone:

```
zone "0.0.10.in-addr.arpa" IN {
    type slave;
    file "2";
    masters { 10.0.0.11; };
};
```

> `masters`에는 주(Master) DNS 서버의 IP를 입력한다. 보조 영역 서버는 zone 파일을 직접 작성하지 않고, 주 영역 서버로부터 자동으로 동기화된다.

<br>

### 9. 정방향/역방향 Zone 파일 작성

보조 영역이 없는 경우 기본 템플릿을 복사해서 사용한다.

```bash
cp /var/named/{named.localhost,1}
cp /var/named/{named.loopback,2}
```

- 정방향 Zone 파일 (`/var/named/1`)

```bash
vi /var/named/1
```

```
$TTL 1D
@   IN SOA  ns1.이니셜.local.  web. (
                    0   ; serial
                    1D  ; refresh
                    1H  ; retry
                    1W  ; expire
                    3H )    ; minimum
        NS      ns1.이니셜.local.
        NS      ns2.이니셜.local.
        NS      ns3.이니셜.local.
        MX 10   mx1.이니셜.local.
        A       10.0.0.11
        A       10.0.0.12
        A       10.0.0.13
www     A       10.0.0.11
www     A       10.0.0.12
www     A       10.0.0.13
ftp     A       10.0.0.12
babo    CNAME   ftp
ns1     A       10.0.0.11
ns2     A       10.0.0.12
ns3     A       10.0.0.13
mx1     A       10.0.0.13
blog    A       10.0.0.11
```

> `www`, `ftp` 같은 서비스 레코드는 없으면 생략 가능하지만, `NS` 레코드가 가리키는 `ns1`, `ns2`, `ns3`와 `MX` 레코드가 가리키는 `mx1`은 반드시 A 레코드가 존재해야 한다.

- 역방향 Zone 파일 (`/var/named/2`)

```bash
vi /var/named/2
```

```
$TTL 1D
@   IN SOA  ns1.이니셜.local.  web. (
                    0   ; serial
                    1D  ; refresh
                    1H  ; retry
                    1W  ; expire
                    3H )    ; minimum
        NS      ns1.이니셜.local.
        NS      ns2.이니셜.local.
        NS      ns3.이니셜.local.
11      IN PTR  ns1.이니셜.local.
12      IN PTR  ns2.이니셜.local.
13      IN PTR  ns3.이니셜.local.
```

> 역방향 zone에서 `11`, `12`, `13`은 IP 주소의 마지막 옥텟(10.0.0.**11**, 10.0.0.**12**, 10.0.0.**13**)을 의미한다.

- 파일 권한 설정

```bash
chmod o+r /var/named/1
chmod o+r /var/named/2
```

> named(BIND) 프로세스가 zone 파일을 읽으려면 other 권한에 읽기(r)가 있어야 한다. 권한이 없으면 DNS 질의에 응답하지 못한다.

<br>

### 10. DNS 서비스 시작 및 방화벽 설정

```bash
systemctl enable --now named
firewall-cmd --permanent --add-port=53/tcp
firewall-cmd --permanent --add-port=53/udp
firewall-cmd --reload
```

<br>

### 11. Windows에서 DNS 동작 확인

- DNS 서버 주소 설정

    `Win+R` → `ncpa.cpl` → Ethernet0 → 속성 → 인터넷 프로토콜 버전 4(TCP/IPv4) → DNS 서버: `10.0.0.11`

- nslookup으로 확인

    ```
    Win+R → cmd
    nslookup
    > 이니셜.local
    > www.이니셜.local
    > babo.이니셜.local
    > ftp.이니셜.local
    ```

    각 도메인에 대한 IP 주소가 반환되면 정상이다.

- FTP 접속 확인

    ```
    ftp ftp.이니셜.local
    ftp babo.이니셜.local
    ```

- 웹 브라우저 접속 확인

    브라우저 주소창에 아래를 입력해 HTTP 페이지가 정상 출력되는지 확인한다.

    ```
    http://이니셜.local
    http://www.이니셜.local
    http://blog.이니셜.local
    ```

<br>

### 12. 알아두면 좋은 것들

- 삭제 방법 <br>

  - HTTP Server 제거
  
  ```bash
  firewall-cmd --permanent --remove-port=80/tcp
  firewall-cmd --reload
  dnf autoremove -y httpd
  ```
  
  - DNS Server 제거
  
  ```bash
  firewall-cmd --permanent --remove-port=53/tcp
  firewall-cmd --permanent --remove-port=53/udp
  firewall-cmd --reload
  dnf autoremove -y bind bind-utils bind-libs
  rm -rf /etc/named.conf.rpmsave /etc/named.rfc1912.zones.rpmsave /var/named
  ```

  <br>