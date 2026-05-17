---
layout: post
title: "Rocky Linux에 Active mode FTP 서버 구성"
date: 2026-05-17 00:00:00 +0900
category: lab
permalink: /lab/rocky-active-ftp-server/
---
Rocky Linux 9.4에 vsftpd를 설치하고 Active mode로 FTP 서버를 구성한 뒤, Windows 10 / 11 클라이언트에서 CMD와 FileZilla로 접속하는 과정을 정리하였다.

---

### 1. vsftpd 설치

```bash
dnf install -y vsftpd
```

Rocky Linux에서 FTP 서버 패키지인 vsftpd를 설치한다.

<br>

### 2. 사용자 계정 생성

```bash
useradd a
useradd b
echo 'It1' | passwd --stdin a
echo 'It1' | passwd --stdin b
```

FTP 접속에 사용할 계정을 생성하고 비밀번호를 설정한다. <br>

<br>

  > 생성된 계정 확인 <br>
  > `cat /etc/passwd` : 계정 목록 확인 <br>
  > `cat /etc/shadow` : 비밀번호 해시값 확인 (SHA-256)


<br>

### 3. vsftpd 설정 파일 수정

```bash
vi /etc/vsftpd/vsftpd.conf
```

아래 항목들을 주석 제거 및 수정한다.

| 줄 번호 | 설정 내용 |
|---|---|
| 52번줄 | `xferlog_file=/var/log/xferlog` (주석 제거) |
| 59번줄 | `idle_session_timeout=300` (주석 제거 후 300초로 변경) |
| 62번줄 | `data_connection_timeout=60` (주석 제거 후 60초로 변경) |
| 86번줄 | `ftpd_banner=Warning!` (주석 제거 후 내용 변경) |
| 101번줄 | `chroot_list_enable=YES` (주석 제거) |
| 103번줄 | `chroot_list_file=/etc/vsftpd/chroot_list` (주석 제거) |

마지막 줄에 아래 내용을 추가한 후 저장한다.

```
allow_writeable_chroot=YES
```

<br>

### 4. chroot_list 파일 설정

```bash
vi /etc/vsftpd/chroot_list
```

상위 디렉터리로 이동을 제한할 계정을 등록한다. 여기서는 `a` 계정만 등록한다. <br>

- `chroot_list`에 등록된 계정은 자신의 홈 디렉터리 밖으로 나갈 수 없다.
- 등록되지 않은 `b` 계정은 `cd ..` 명령어로 상위 디렉터리 이동이 가능하다.

<br>

### 5. 테스트용 파일 생성

```bash
dd if=/dev/zero of=/home/a/a.txt bs=300 count=1
dd if=/dev/zero of=/home/b/b.txt bs=300 count=1
ls -alh
ls -alh /home/{a,b}
```

파일 생성 후 확인한다.

<br>

### 6. vsftpd 서비스 시작

```bash
systemctl enable --now vsftpd
ss -nat
```

![이미지](/assets/images/activeFTP/activeftp2.png) <br>

FTP 서버를 시작하고 부팅 시 자동으로 실행되도록 등록하고 네트워크 연결 상태를 확인한다. (21번 포트 LISTEN 확인)


<br>

### 7. 방화벽 설정

```bash
firewall-cmd --permanent --zone=public --add-port=20-21/tcp
firewall-cmd --reload
firewall-cmd --list-all
```

![이미지](/assets/images/activeFTP/activeftp3.png) <br>

FTP Active mode에서는 20번(데이터), 21번(제어) 포트를 모두 열어야 한다. <br>
기본 존(public)에 추가하는 경우 `--zone=public`은 생략 가능하고 포트를 삭제하려면 `--remove-port` 옵션을 사용한다. <br>

<br>

### 8. 로그 확인

```bash
vi /var/log/xferlog
```

![이미지](/assets/images/activeFTP/activeftp18.png) <br>

FTP 전송 로그를 확인할 수 있다. <br>

- `10.0.0.101` : 접속한 클라이언트 IP
- `o` : 다운로드 (outbound)
- `i` : 업로드 (inbound)

<br>

### 9. 설정 파일을 한 폴더로 관리하는 방법

설정 파일들을 한 곳에 모아서 관리할 수도 있다.

```bash
mkdir /ftp
vi /ftp/ch       # chroot 설정 파일
vi /ftp/ba       # 배너 파일
```

vsftpd.conf에서 경로를 아래와 같이 변경한다.

```
xferlog_file=/ftp/xferlog   # 52번줄
banner_file=/ftp/ba         # 86번줄
chroot_list_file=/ftp/ch    # 103번 줄
```

<br>

### 10. Windows CMD에서 FTP 접속하기

- **CMD에서 접속하는 방법** <br>

  ![이미지](/assets/images/activeFTP/activeftp4.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp5.png) <br>
  접속 후 `ls`를 명령어를 입력하면 Windows 보안 경고가 나온다. <br>
  이를 취소하고 Windows 방화벽 설정에서 따로 설정할 것이다. <br>

<br>

- **Windows 방화벽 설정** <br>
  ![이미지](/assets/images/activeFTP/activeftp6.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp7.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp8.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp9.png) <br>
  기존에 있던 파일 전송 프로그램은 삭제해준다. <br>

  <br>

  ![이미지](/assets/images/activeFTP/activeftp10.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp11.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp13.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp14.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp15.png) <br>
  방화벽 설정 후 CMD를 다시 열고 동일하게 접속해보면 Windows 보안 경고가 나오지 않고 결과를 확인할 수 있다. <br>

<br>

- **계정별 동작 차이 확인** <br>

  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; align-items: start;">
    <img src="/assets/images/activeFTP/activeftp16.png" alt="이미지" style="width: 100%; height: auto; display: block;">
    <img src="/assets/images/activeFTP/activeftp17.png" alt="이미지" style="width: 100%; height: auto; display: block;">
  </div>

  <br>
  - `a` 계정: `cd ..` 해도 홈 디렉터리 밖으로 나가지지 않음 (`chroot_list` 등록됨) <br>
  - `b` 계정: `cd ..` 하면 상위 디렉터리로 이동 가능 (`chroot_list` 미등록) <br>

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
  ![이미지](/assets/images/activeFTP/activeftp19.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp20.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp21.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp22.png) <br>

<br>

- **접속** <br>
  ![이미지](/assets/images/activeFTP/activeftp23.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp24.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp25.png) <br>
  접속하면 Windows 보안 경고가 나온다. CMD에서 처럼 Windows 방화벽 설정에서 따로 설정할 것이다. <br>

<br>

- **Windows 방화벽 설정 (FileZilla)** <br>
  ![이미지](/assets/images/activeFTP/activeftp26.png) <br>
  FileZilla의 경로를 복사해준다 <br>

  <br>

  ![이미지](/assets/images/activeFTP/activeftp27.png) <br>
  기존에 있던 FileZilla FTP Client은 삭제해준다. <br>

  <br>

  ![이미지](/assets/images/activeFTP/activeftp28.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp29.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp30.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp31.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp32.png) <br>
  설정 후 다시 연결해보면 정상 연결된다.

<br>

- **계정별 동작 차이 확인** <br>
  ![이미지](/assets/images/activeFTP/activeftp33.png) <br>
  ![이미지](/assets/images/activeFTP/activeftp34.png) <br>
  - `a` 계정: 홈 디렉터리 밖이 보이지 않음 (`chroot_list` 등록됨) <br>
  - `b` 계정: 상위 디렉터리가 보임 (`chroot_list` 미등록) <br>

<br>

### 알아두면 좋은 것들

- **vsftpd 및 계정 삭제**

  ```bash
  dnf autoremove -y vsftpd
  rm -rf /etc/vsftpd
  userdel -r a      # -r 옵션으로 홈 디렉터리까지 함께 삭제
  ```

  > `-r` 옵션 없이 삭제하면 `/home/a`, `/var/spool/mail/a` 디렉터리가 남아 있어, 동일 이름으로 계정을 재생성했을 때 UID 불일치 문제가 발생할 수 있다.

<br>

- **트리 구조로 디렉터리 확인**

  ```bash
  dnf install -y tree
  tree /home
  ```
  ![이미지](/assets/images/activeFTP/activeftp1.png)
