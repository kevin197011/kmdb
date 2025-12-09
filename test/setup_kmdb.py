#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import os
import sys

API_URL = "http://localhost/api/v1"
ADMIN_USER = "admin"
ADMIN_PASS = "Admin123"

def print_step(step, message):
    print(f"\n\033[1;33m[{step}] {message}\033[0m")

def print_success(message):
    print(f"\033[0;32m✓ {message}\033[0m")

def print_error(message):
    print(f"\033[0;31m✗ {message}\033[0m")

def main():
    print("\033[0;32m========================================\033[0m")
    print("\033[0;32mKMDB 测试环境自动配置\033[0m")
    print("\033[0;32m========================================\033[0m")

    # 1. 登录
    print_step("1/5", "正在登录...")
    login_data = {
        "username": ADMIN_USER,
        "password": ADMIN_PASS
    }
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        token = response.json()["access_token"]
        print_success("登录成功")
    except Exception as e:
        print_error(f"登录失败: {e}")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}

    # 2. 检查或创建项目
    print_step("2/5", "检查测试项目...")
    project_name = "测试项目"
    try:
        response = requests.get(f"{API_URL}/projects", headers=headers)
        response.raise_for_status()
        projects = response.json()

        project_id = None
        if isinstance(projects, list):
            for p in projects:
                if p.get("name") == project_name:
                    project_id = p["id"]
                    break
        elif isinstance(projects, dict) and "data" in projects:
            for p in projects["data"]:
                if p.get("name") == project_name:
                    project_id = p["id"]
                    break

        if not project_id:
            print(f"\033[1;33m项目不存在，正在创建...\033[0m")
            project_data = {
                "name": project_name,
                "description": "用于测试的项目"
            }
            response = requests.post(f"{API_URL}/projects", headers=headers, json=project_data)
            response.raise_for_status()
            project_id = response.json()["id"]
            print_success(f"项目创建成功 (ID: {project_id})")
        else:
            print_success(f"项目已存在 (ID: {project_id})")
    except Exception as e:
        print_error(f"处理项目失败: {e}")
        sys.exit(1)

    # 3. 检查或创建资产
    print_step("3/5", "检查测试资产...")
    asset_name = "test-ubuntu"
    try:
        response = requests.get(f"{API_URL}/assets?limit=100", headers=headers)
        response.raise_for_status()
        assets_data = response.json()

        asset_id = None
        if isinstance(assets_data, dict) and "data" in assets_data:
            for asset in assets_data["data"]:
                if asset.get("name") == asset_name:
                    asset_id = asset["id"]
                    break
        elif isinstance(assets_data, list):
            for asset in assets_data:
                if asset.get("name") == asset_name:
                    asset_id = asset["id"]
                    break

        if not asset_id:
            print(f"\033[1;33m资产不存在，正在创建...\033[0m")
            metadata = {
                "ip": "192.168.56.100",
                "os": "Ubuntu 22.04 LTS",
                "location": "测试环境",
                "cpu": "1核",
                "memory": "1GB"
            }
            asset_data = {
                "name": asset_name,
                "type": "server",
                "status": "active",
                "project_id": project_id,
                "ssh_port": 22,
                "metadata": json.dumps(metadata, ensure_ascii=False)
            }
            response = requests.post(f"{API_URL}/assets", headers=headers, json=asset_data)
            response.raise_for_status()
            asset_id = response.json()["id"]
            print_success(f"资产创建成功 (ID: {asset_id})")
        else:
            print_success(f"资产已存在 (ID: {asset_id})")
    except Exception as e:
        print_error(f"处理资产失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_error(f"响应内容: {e.response.text}")
        sys.exit(1)

    # 4. 读取密钥
    script_dir = os.path.dirname(os.path.abspath(__file__))
    private_key_path = os.path.join(script_dir, "vagrant_key")
    public_key_path = os.path.join(script_dir, "vagrant_key.pub")

    try:
        with open(private_key_path, 'r') as f:
            private_key = f.read()
        with open(public_key_path, 'r') as f:
            public_key = f.read().strip()
    except Exception as e:
        print_error(f"读取密钥文件失败: {e}")
        sys.exit(1)

    # 5. 检查或创建密钥凭证
    print_step("4/5", "检查密钥凭证...")
    try:
        response = requests.get(f"{API_URL}/asset-credentials", headers=headers)
        response.raise_for_status()
        credentials = response.json()

        key_cred_id = None
        if isinstance(credentials, list):
            for cred in credentials:
                if cred.get("name") == "testuser密钥":
                    key_cred_id = cred["id"]
                    break
        elif isinstance(credentials, dict) and "data" in credentials:
            for cred in credentials["data"]:
                if cred.get("name") == "testuser密钥":
                    key_cred_id = cred["id"]
                    break

        if not key_cred_id:
            print(f"\033[1;33m密钥凭证不存在，正在创建...\033[0m")
            cred_data = {
                "name": "testuser密钥",
                "username": "testuser",
                "auth_type": "key",
                "private_key": private_key,
                "public_key": public_key,
                "description": "测试虚拟机SSH密钥"
            }
            response = requests.post(f"{API_URL}/asset-credentials", headers=headers, json=cred_data)
            response.raise_for_status()
            key_cred_id = response.json()["id"]
            print_success(f"密钥凭证创建成功 (ID: {key_cred_id})")
        else:
            print_success(f"密钥凭证已存在 (ID: {key_cred_id})")
    except Exception as e:
        print_error(f"处理密钥凭证失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_error(f"响应内容: {e.response.text}")
        sys.exit(1)

    # 6. 检查或创建密码凭证
    print_step("5/5", "检查密码凭证...")
    try:
        response = requests.get(f"{API_URL}/asset-credentials", headers=headers)
        response.raise_for_status()
        credentials = response.json()

        pass_cred_id = None
        if isinstance(credentials, list):
            for cred in credentials:
                if cred.get("name") == "testuser密码":
                    pass_cred_id = cred["id"]
                    break
        elif isinstance(credentials, dict) and "data" in credentials:
            for cred in credentials["data"]:
                if cred.get("name") == "testuser密码":
                    pass_cred_id = cred["id"]
                    break

        if not pass_cred_id:
            print(f"\033[1;33m密码凭证不存在，正在创建...\033[0m")
            cred_data = {
                "name": "testuser密码",
                "username": "testuser",
                "auth_type": "password",
                "password": "Test123456",
                "description": "测试虚拟机密码"
            }
            response = requests.post(f"{API_URL}/asset-credentials", headers=headers, json=cred_data)
            response.raise_for_status()
            pass_cred_id = response.json()["id"]
            print_success(f"密码凭证创建成功 (ID: {pass_cred_id})")
        else:
            print_success(f"密码凭证已存在 (ID: {pass_cred_id})")
    except Exception as e:
        print_error(f"处理密码凭证失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_error(f"响应内容: {e.response.text}")
        sys.exit(1)

    # 输出总结
    print("\n\033[0;32m========================================\033[0m")
    print("\033[0;32m配置完成！\033[0m")
    print("\033[0;32m========================================\033[0m")
    print(f"\n\033[1;33m配置信息：\033[0m")
    print(f"  资产名称: \033[0;32m{asset_name}\033[0m")
    print(f"  资产ID: \033[0;32m{asset_id}\033[0m")
    print(f"  IP地址: \033[0;32m192.168.56.100\033[0m")
    print(f"  SSH端口: \033[0;32m22\033[0m")
    print(f"\n\033[1;33m凭证信息：\033[0m")
    print(f"  密钥凭证: \033[0;32mtestuser密钥\033[0m (ID: {key_cred_id})")
    print(f"  密码凭证: \033[0;32mtestuser密码\033[0m (ID: {pass_cred_id})")
    print(f"\n\033[1;33m现在可以在 WebSSH 页面连接测试了！\033[0m")
    print("\033[0;32m========================================\033[0m")

if __name__ == "__main__":
    main()

