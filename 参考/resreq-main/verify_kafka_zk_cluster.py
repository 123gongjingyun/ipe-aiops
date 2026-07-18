#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import openpyxl

def verify_kafka_zookeeper_cluster_configurations(file_path):
    """验证Kafka和Zookeeper集群架构配置"""
    try:
        workbook = openpyxl.load_workbook(file_path, data_only=True)
        sheet = workbook["配置详细说明"]

        print(f"=== 验证Kafka和Zookeeper集群架构配置 ===")
        print(f"工作表最大行: {sheet.max_row}")
        print()

        # 验证Kafka 3节点集群架构配置
        print("=== Kafka 3节点集群架构配置 (111-120行) ===")
        for row_num in range(111, 121):
            row_data = []
            for col in sheet[row_num]:
                row_data.append(col.value)
            print(f"Row {row_num}: {row_data}")

        print()
        print("=== Kafka + Zookeeper组合架构配置 (121-130行) ===")
        for row_num in range(121, 131):
            row_data = []
            for col in sheet[row_num]:
                row_data.append(col.value)
            print(f"Row {row_num}: {row_data}")

        print()
        print("=== Zookeeper 3节点集群架构配置 (131-140行) ===")
        for row_num in range(131, 141):
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
    verify_kafka_zookeeper_cluster_configurations(file_path)