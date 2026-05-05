---
layout: post
title: "VMWare NAT 설정"
date: 2026-05-04 01:00:00 +0900
category: lab
permalink: /lab/vmware-nat/
---

VMWare에서 가상머신이 외부 네트워크와 통신할 수 있도록 NAT 네트워크를 설정하였다. <br>
NAT 방식은 가상머신이 사설 IP를 사용하면서도 호스트 PC를 통해 외부 인터넷에 접속할 수 있도록 하는 방식이다.

---

<br>

### 1. Virtual Network Editor
![이미지](/assets/images/VMWareNat/NAT1.png) <br>
VMWare Workstation에서 Edit-Virtual Network Editor을 누른다. <br>

<br>

### 2. 관리자 권한으로 실행
![이미지](/assets/images/VMWareNat/NAT2.png) <br>
기본 설정에서는 네트워크 설정을 수정할 수 없기 때문에 Change Settings 버튼을 눌러 관리자 권한으로 실행한다. <br>

<br>

### 3. NAT 네트워크로 사용할 VMnet8
![이미지](/assets/images/VMWareNat/NAT3.png) <br>
VMnet8은 VMWare에서 기본적으로 NAT 용도로 사용되는 가상 네트워크이다. <br>
Connect a host virtual adapter to this network 항목을 체크하여, 호스트 PC에도 VMnet8 가상 어댑터가 연결되도록 설정하였다. <br>
VMnet8의 네트워크 대역을 다음과 같이 설정하였다.
```text
Subnet IP   : 10.0.0.0
Subnet mask : 255.255.255.0
Gateway IP  : 10.0.0.254
```
<br>

### 4. Host-only 네트워크로 사용할 VMnet1
![이미지](/assets/images/VMWareNat/NAT4.png) <br>
VMnet1은 VMWare에서 기본적으로 Host-only 용도로 사용되며, 외부 네트워크와 직접 연결되지 않고 호스트 PC와 가상머신 간의 내부 통신을 위한 네트워크이다.<br>
Connect a host virtual adapter to this network 항목을 체크하여, 호스트 PC에도 VMnet1 가상 어댑터가 연결되도록 설정하였다. <br>
현재 단계에서는 VMnet1의 대역대를 기본값으로 두고, 이후 실습 환경에 맞게 수정하도록 한다. <br>
<br>


### 5. 실행창 열기
<br>
![이미지](/assets/images/VMWareNat/NAT5.png)<br>
Window+R키로 실행창을 열어 `ncpa.cpl` 명령어를 치고 네트워크 설정 화면으로 이동한다.
<br>
<br>


### 6. 네트워크 어댑터 설정
![이미지](/assets/images/VMWareNat/NAT6.png) <br>
VMWare Network Adapter VMnet8 어댑터는 호스트 PC가 VMnet8 NAT 네트워크와 통신하기 위한 가상 어탭터이다.<br>
VMnet8 어댑터는 다음과 같이 설정하였다.
```text
IP address  : 10.0.0.253
Subnet mask : 255.255.255.0
```
<br>