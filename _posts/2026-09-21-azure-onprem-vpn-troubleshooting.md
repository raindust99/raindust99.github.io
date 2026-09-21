---
layout: post
title: "Azure-온프레미스 Site-to-Site VPN 연결 실패 원인 분석"
date: 2026-09-21 00:00:00 +0900
category: troubleshooting
permalink: /troubleshooting/azure-onprem-vpn-connection-failure/
---

Azure VMSS의 웹 서버와 온프레미스 MySQL을 Site-to-Site IPsec VPN으로 연결하는 과정에서 터널이 정상적으로 수립되지 않아 웹 서비스가 DB에 접근하지 못하는 문제가 발생했다. 이 글은 설정값을 하나씩 비교해 원인을 좁히고, 양쪽 IPsec/IKE 정책을 일치시켜 연결을 복구한 과정을 정리한 기록이다.

> 연관 프로젝트: [온프레미스-Azure 하이브리드 인프라 구축](/project/hybrid-cloud-security/)

---

### 1. 구성 환경

전체 구조는 Azure와 온프레미스를 암호화 터널로 연결하고, Azure 웹 서버가 온프레미스 DB에 사설 IP로 접근하는 방식이다.

| 구분 | 구성 |
|---|---|
| Azure | Hub-Spoke VNet, VPN Gateway, Local Network Gateway, VMSS |
| 온프레미스 | SECUI Bluemax NGF 100, Rocky Linux 9, MySQL |
| VPN 방식 | Site-to-Site IPsec VPN |
| IKE 버전 | IKEv2 |
| 애플리케이션 통신 | Azure WEB → 온프레미스 MySQL TCP/3306 |

보안을 위해 공인 IP와 PSK는 기록에서 제외했다. Azure VNet과 온프레미스 내부망은 서로 겹치지 않는 사설 대역으로 설계했다.

---

### 2. 장애 증상

인프라 구성 후 다음과 같은 증상이 나타났다.

- Azure VPN Gateway와 Bluemax 사이의 IPsec 터널이 정상 상태가 되지 않음
- Azure 웹 서버에서 온프레미스 MySQL의 3306 포트로 연결할 수 없음
- WordPress가 DB에 접근하지 못해 웹 서비스가 정상적으로 동작하지 않음

웹 애플리케이션의 오류만 보면 DB나 방화벽 문제처럼 보일 수 있었다. 그러나 웹 서버부터 DB까지의 통신 경로에는 NSG, UDR, Azure Firewall, VPN Gateway, 온프레미스 방화벽, 내부 라우팅이 모두 포함되어 있어 한 구간씩 나누어 확인할 필요가 있었다.

---

### 3. 점검 순서

처음부터 설정을 무작정 변경하지 않고 다음 순서로 장애 구간을 좁혔다.

#### 3.1 IP 대역 중복 여부

Azure VNet과 온프레미스 내부망의 주소 공간이 겹치면 VPN 경로를 정확하게 결정할 수 없다. 먼저 양쪽 네트워크 대역이 중복되지 않는지 확인했다.

#### 3.2 Azure 네트워크 설정

- Local Network Gateway에 온프레미스 공인 IP와 내부 주소 공간이 정확히 등록됐는지 확인
- VPN Connection의 PSK와 IKE 버전 확인
- VMSS 서브넷에서 온프레미스 대역으로 향하는 UDR 확인
- NSG와 Azure Firewall에서 MySQL TCP/3306 통신 허용 여부 확인

#### 3.3 온프레미스 설정

- Bluemax의 Azure 원격 게이트웨이 정보 확인
- 내부 대역에서 Azure VNet으로 향하는 정적 경로 확인
- Azure WEB 대역과 MySQL 사이의 방화벽 허용 정책 확인
- VPN 터널 트래픽이 NAT 대상에서 제외됐는지 확인

라우팅과 접근제어 항목을 확인했지만 터널은 여전히 수립되지 않았다. 이 단계에서 단순 통신 허용 문제가 아니라 IKE 협상 단계의 설정 불일치 가능성을 의심했다.

---

### 4. 원인 분석

Azure 측에는 사용자 지정 IPsec/IKE 정책이 명시돼 있었지만, Bluemax 측에는 일부 정책값이 동일하게 설정되지 않은 상태였다.

비교한 항목은 다음과 같다.

| 파라미터 | Azure 정책 | Bluemax 초기 상태 | 판정 |
|---|---|---|---|
| IKE / IPsec 암호화 | AES256 | 불일치 또는 미지정 | 불일치 |
| IKE / IPsec 무결성 | SHA256 | 불일치 또는 미지정 | 불일치 |
| DH Group | DHGroup14 | 불일치 또는 미지정 | 불일치 |
| PFS Group | None | 확인 필요 | 확인 |
| SA Lifetime | 27000초 | 불일치 또는 미지정 | 불일치 |
| 모드 / 프로토콜 | IKEv2 / ESP-Tunnel | IKEv2 기반 | 확인 |

IPsec VPN은 양쪽 장비가 암호화 방식, 무결성 알고리즘, 키 교환 그룹, SA 수명 등의 제안값에 합의해야 터널이 수립된다. 한쪽에만 값이 지정되어 있거나 양쪽 값이 다르면 IKE 협상이 완료되지 않는다.

따라서 이번 장애의 직접적인 원인은 **Azure VPN Connection과 Bluemax 방화벽의 IPsec/IKE 정책 불일치**였다.

---

### 5. 조치 내용

Bluemax의 IKE/IPsec 정책을 Azure 사용자 지정 정책과 동일하게 맞췄다.

```text
IKE Version        : IKEv2
IKE Encryption     : AES256
IKE Integrity      : SHA256
IPsec Encryption   : AES256
IPsec Integrity    : SHA256
DH Group           : Group 14
PFS Group          : None
SA Lifetime        : 27000 seconds
Mode               : ESP Tunnel
```

또한 터널 수립 이후 데이터 통신이 다른 설정 때문에 차단되지 않도록 다음 항목도 함께 재확인했다.

- Azure와 Bluemax의 PSK 일치
- 양쪽 로컬·원격 네트워크 대역 방향 일치
- VPN 구간의 NAT 예외 처리
- Azure WEB 대역 ↔ 온프레미스 DB 간 TCP/3306 허용
- 온프레미스 DB 서버의 기본 게이트웨이와 반환 경로

---

### 6. 복구 검증

설정을 변경한 뒤에는 터널 상태만 확인하고 끝내지 않고, 네트워크부터 애플리케이션까지 단계별로 검증했다.

1. Azure VPN Connection 상태가 연결 상태로 전환되는지 확인
2. Bluemax에서 IKE SA와 IPsec SA가 정상 생성되는지 확인
3. Azure 웹 서버에서 온프레미스 DB 사설 IP까지 경로 확인
4. MySQL TCP/3306 연결 확인
5. 웹 서버에서 DB 연결 및 쿼리 수행 확인
6. WordPress 페이지가 정상적으로 표시되는지 최종 확인

정책값을 일치시킨 후 IPsec 터널이 정상적으로 연결됐고, Azure 웹 서버와 온프레미스 DB 간 통신 및 웹 서비스가 정상 동작했다.

---

### 7. 재발 방지 체크리스트

향후 Site-to-Site VPN 구성 시에는 다음 항목을 양쪽 장비 기준으로 표로 만들어 비교한다.

- [ ] 공인 IP와 Local Network Gateway 정보
- [ ] 로컬·원격 사설 네트워크 대역
- [ ] IKE 버전
- [ ] IKE 암호화·무결성 알고리즘
- [ ] IPsec 암호화·무결성 알고리즘
- [ ] DH Group과 PFS Group
- [ ] SA Lifetime
- [ ] PSK
- [ ] 정적·동적 라우팅 경로
- [ ] 방화벽 허용 정책
- [ ] VPN 트래픽 NAT 예외
- [ ] 반환 경로

설정 변경 후에는 터널의 `Connected` 상태만 보는 것이 아니라 실제 서비스 포트 연결과 애플리케이션 동작까지 확인해야 한다.

---

### 8. 배운 점

이번 장애를 통해 VPN 연결 문제는 한쪽 장비의 설정만 확인해서는 해결하기 어렵다는 점을 배웠다. Azure 설정이 정상이어도 상대 장비가 동일한 조건을 제안하지 않으면 IKE 협상은 성립하지 않는다.

또한 웹 서비스 장애를 애플리케이션 문제로만 보지 않고, **애플리케이션 → 포트 → 방화벽 → 라우팅 → VPN 협상** 순서로 계층을 나누어 확인하면 원인을 더 빠르게 좁힐 수 있었다. 앞으로도 장애를 해결한 결과뿐 아니라 가설, 확인 순서, 조치, 검증 과정을 함께 기록해 재현 가능한 운영 지식으로 남기고자 한다.
