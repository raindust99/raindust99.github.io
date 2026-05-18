---
layout: post
title: "Rocky Linux에 Passive mode FTP 서버 구성"
date: 2026-05-19 00:00:00 +0900
category: lab
permalink: /lab/rocky-passive-ftp-server/
---
Rocky Linux 9.4에 vsftpd를 설치하고 Passive mode로 FTP 서버를 구성한 뒤, Windows 10 / 11 클라이언트에서 CMD와 FileZilla로 접속하는 과정을 정리하였다.

---

### 1. vsftpd 설치

```bash
dnf install -y vsftpd
```

Rocky Linux에서 FTP 서버 패키지인 vsftpd를 설치한다.

<br>

### 2. FTP 관련 폴더 및 파일 생성

```bash
mkdir /ftp
vi /ftp/ch       # chroot 설정 파일
vi /ftp/ba       # 배너 파일
```

설정 파일들을 한 곳에서 관리하기 위해 `/ftp` 디렉터리를 생성한다. <br>

- `/ftp/ch` : chroot 적용 계정 목록 파일
- `/ftp/ba` : 접속 시 출력할 배너 메시지 파일

<br>

### 3. 사용자 계정 생성

```bash
useradd z
echo 'It1' | passwd --stdin z
```

FTP 접속에 사용할 계정을 생성하고 비밀번호를 설정한다.

<br>

  > 생성된 계정 확인 <br>
  > `cat /etc/passwd` : 계정 목록 확인 <br>
  > `cat /etc/shadow` : 비밀번호 해시값 확인 (SHA-256)

<br>

### 4. 테스트용 파일 생성

```bash
dd if=/dev/zero of=/home/z/z.txt bs=100M count=1
ls -alh /home/z
```

100MB 크기의 테스트 파일을 생성한다. Passive mode에서 데이터 전송이 정상적으로 동작하는지 확인하는 데 사용한다.

<br>

### 5. vsftpd 설정 파일 수정

```bash
vi /etc/vsftpd/vsftpd.conf
```

아래 항목들을 주석 제거 및 수정한다.

| 줄 번호 | 설정 내용 |
|---|---|
| 42번줄 | `#connect_from_port_20=YES` (주석 처리) |
| 52번줄 | `xferlog_file=/ftp/xferlog` (주석 제거 후 경로 변경) |
| 59번줄 | `idle_session_timeout=300` (주석 제거 후 300초로 변경) |
| 62번줄 | `data_connection_timeout=60` (주석 제거 후 60초로 변경) |
| 86번줄 | `banner_file=/ftp/ba` (주석 제거 후 내용 변경) |
| 101번줄 | `chroot_list_enable=YES` (주석 제거) |
| 103번줄 | `chroot_list_file=/ftp/ch` (주석 제거 후 경로 변경) |

<br>

  > **42번줄 주석 처리 이유** <br>
  > `connect_from_port_20=YES`는 Active mode 전용 설정이다. Passive mode에서는 서버가 데이터 포트를 직접 열기 때문에 이 옵션이 불필요하며, 주석 처리하지 않아도 동작은 하지만 명확하게 구분하기 위해 비활성화한다.

<br>

마지막 줄에 아래 내용을 추가한 후 저장한다.

```
allow_writeable_chroot=YES
pasv_enable=YES
pasv_min_port=65000
pasv_max_port=65010
deny_file={*.exe}
```

- `pasv_enable=YES` : Passive mode 활성화
- `pasv_min_port` / `pasv_max_port` : 데이터 전송에 사용할 포트 범위 지정 (방화벽에서 동일하게 개방 필요)
- `deny_file={*.exe}` : `.exe` 확장자 파일 전송 차단 (선택 사항)

<br>

### 6. chroot 설정 파일 작성

```bash
vi /ftp/ch
```

상위 디렉터리로 이동을 제한할 계정을 등록한다. 여기서는 `z` 계정을 등록한다. <br>

- `/ftp/ch`에 등록된 계정은 자신의 홈 디렉터리 밖으로 나갈 수 없다.
- 등록되지 않은 계정은 `cd ..` 명령어로 상위 디렉터리 이동이 가능하다.

<br>

### 7. vsftpd 서비스 시작

```bash
systemctl enable --now vsftpd
ss -nat
```

FTP 서버를 시작하고 부팅 시 자동으로 실행되도록 등록한다. 21번 포트가 LISTEN 상태인지 확인한다.

<br>

### 8. 방화벽 설정

```bash
firewall-cmd --permanent --add-port={21,65000-65010}/tcp
firewall-cmd --reload
firewall-cmd --list-all
```

Passive mode에서는 제어 포트(21번)와 데이터 포트 범위(65000~65010)를 모두 열어야 한다. <br>

  > **직접 XML 파일 수정으로 포트를 추가하는 방법** <br>
  > ```bash
  > vi /etc/firewalld/zones/public.xml
  > ```
  > 아래 내용을 추가해도 동일하게 방화벽에 포트가 등록된다.
  > ```xml
  > <port port="65000-65010" protocol="tcp"/>
  > ```
  > 수정 후 `firewall-cmd --reload`를 실행해야 적용된다.

<br>

### 9. 로그 확인

```bash
vi /ftp/xferlog
```

FTP 전송 로그를 확인할 수 있다. <br>

- `o` : 다운로드 (outbound)
- `i` : 업로드 (inbound)

<br>

### 10. Windows CMD에서 FTP 접속하기

- **CMD에서 접속하는 방법** <br>

  ```
  ftp 10.0.0.12
  사용자: z
  암호: It1
  ```

  접속 후 `ls`를 입력하면 Windows 보안 경고가 나온다. <br>
  이를 취소하고 Windows 방화벽 설정에서 따로 설정할 것이다. <br>

<br>

- **Windows 방화벽 설정** <br>

  Win+R → `control` → 범주 → 작은 아이콘 → Windows Defender 방화벽 → 고급 설정 → 인바운드 규칙 <br>

  1. 기존에 있던 **파일 전송 프로그램** 규칙을 삭제한다.
  2. 인바운드 규칙 우클릭 → 새 규칙 → **프로그램** 선택
  3. 다음 프로그램 경로 찾아보기 : `ftp.exe` 선택
  4. 연결 허용 → 다음 → 이름 : `ftp` → 마침

  방화벽 설정 후 CMD를 다시 열고 동일하게 접속하면 보안 경고 없이 정상 동작한다. <br>

<br>

- **계정별 동작 차이 확인** <br>

  - `z` 계정 (`/ftp/ch` 등록됨): `cd ..` 해도 홈 디렉터리 밖으로 나가지지 않음 <br>
  - 미등록 계정: `cd ..` 하면 상위 디렉터리로 이동 가능 <br>

<br>

- **Active mode vs Passive mode 동작 차이** <br>

  FileZilla 사이트 관리자의 **전송 설정** 탭에서 능동형(Active) / 수동형(Passive)을 선택하여 전환할 수 있다. <br>
  Passive mode에서는 클라이언트가 서버에 데이터 포트를 요청하고, 서버가 지정한 포트(65000~65010)로 연결되는 방식이다. <br>

<br>

- **Windows CMD에서 유용한 FTP 명령어**

  | 명령어 | 설명 |
  |---|---|
  | `ls` | 원격 서버 파일 목록 확인 |
  | `!dir` | 로컬 파일 목록 확인 |
  | `lcd` | 로컬 폴더 이동 |

<br>

### 11. Windows에서 FileZilla를 통해 접속하는 방법

- **사이트 등록** <br>

  파일 → 사이트 관리자 → 새 사이트 → 이름 설정 <br>

  - 일반 탭 : 호스트 `10.0.0.12`, 로그온 유형 `비밀번호 묻기`, 사용자 `z`
  - 전송 설정 탭 : **수동형(Passive)** 선택
  - 확인 → 저장

<br>

- **접속** <br>

  파일 밑에 사이트관리자 열기 → 사이트 선택 → 비밀번호 : `It1` <br>
  접속 시 Windows 보안 경고가 나오면 취소 후 방화벽 설정을 진행한다. <br>

<br>

- **Windows 방화벽 설정 (FileZilla)** <br>

  1. FileZilla 바로가기 우클릭 → 속성 → 대상 경로 복사
  2. Windows Defender 방화벽 → 고급 설정 → 인바운드 규칙
  3. 기존 **FileZilla FTP Client** 규칙 삭제
  4. 새 규칙 → 프로그램 → 복사한 경로 붙여넣기 (`"` 제거)
  5. 연결 허용 → 다음 → 이름 : `filezilla` → 마침

  설정 후 상단의 연결 아이콘(컴퓨터에 체크 표시)을 클릭하면 정상 연결된다. <br>

<br>

- **계정 전환 방법** <br>

  파일 → 사이트 관리자 → 해당 사이트에서 사용자 변경 → 파일 밑에 사이트관리자 열기 → 사이트 선택 → 비밀번호 : `It1`

<br>

### 알아두면 좋은 것들

- **vsftpd 및 계정 삭제**

  ```bash
  dnf autoremove -y vsftpd
  rm -rf /etc/vsftpd
  rm -rf /ftp
  userdel -r z      # -r 옵션으로 홈 디렉터리까지 함께 삭제
  ```

  > `-r` 옵션 없이 삭제하면 `/home/z`, `/var/spool/mail/z` 디렉터리가 남아 있어, 동일 이름으로 계정을 재생성했을 때 UID 불일치 문제가 발생할 수 있다.

<br>

- **Active mode와 Passive mode 비교**

  | 구분 | Active mode | Passive mode |
  |---|---|---|
  | 데이터 연결 주체 | 서버 → 클라이언트 | 클라이언트 → 서버 |
  | 서버 개방 포트 | 20, 21 | 21, pasv 포트 범위 |
  | 방화벽 친화성 | 낮음 (클라이언트 인바운드 필요) | 높음 (클라이언트 아웃바운드만 필요) |
  | 주요 설정 | `connect_from_port_20=YES` | `pasv_enable=YES`, `pasv_min/max_port` |

<br>

- **트리 구조로 디렉터리 확인**

  ```bash
  dnf install -y tree
  tree /home
  tree /ftp
  ```

