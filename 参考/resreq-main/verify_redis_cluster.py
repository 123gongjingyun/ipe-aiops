#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import openpyxl

def verify_redis_cluster_configurations(file_path):
    """验证Redis集群架构配置"""
    try:
        workbook = openpyxl.load_workbook(file_path, data_only=True)
        sheet = workbook["配置详细说明"]

        print(f"=== 验证Redis集群架构配置 ===")
        print(f"工作表最大行: {sheet.max_row}")
        print()

        # 验证Redis 3主3从集群架构配置
        print("=== Redis 3主3从集群架构配置 ===")
        for row_num in range(91, 101):
            row_data = []
            for col in sheet[row_num]:
                row_data.append(col.value)
            print(f"Row {row_num}: {row_data}")

        print()
        print("=== Redis 一主2从3哨兵架构配置 ===")
        for row_num in range(101, 111):
            row_data = []
            for col in sheet[row_num]:
                row_data.append(col.value)
            print(f"Row {row_num}: {row_data}")

        return True

    except Exception as e:
        print(f"验证文件时出错: {e}")
        return False

if __name__ == "__main__":
    file_path = "资源申请模板-资源申请20260520V0.1_updated.xlsx"
    verify_redis_cluster_configurations(file_path)