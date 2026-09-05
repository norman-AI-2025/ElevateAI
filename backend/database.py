import csv
import os
import json
from datetime import datetime
import pandas as pd

PATH = "data/athlete_results.csv"
PROFILE_PATH = "data/athlete_profile.json"

def get_profile():
    if os.path.exists(PROFILE_PATH):
        with open(PROFILE_PATH, 'r') as f:
            return json.load(f)
    return None

def save_profile(data: dict):
    os.makedirs("data", exist_ok=True)
    with open(PROFILE_PATH, 'w') as f:
        json.dump(data, f)
    return data

def save_result(data: dict):
    os.makedirs("data", exist_ok=True)
    exists = os.path.isfile(PATH)
    data_to_save = {"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), **data}

    if exists:
        df = pd.read_csv(PATH)
        if not df.empty:
            last_row = df.iloc[-1]
            for key in ["height_cm", "rsi", "max_force_n", "max_power_w", "power_to_mass", "score"]:
                if key in last_row and key in data:
                    data_to_save[f"diff_{key}"] = round(float(data[key]) - float(last_row[key]), 2)
        else:
            for key in ["height_cm", "rsi", "max_force_n", "max_power_w", "power_to_mass", "score"]:
                data_to_save[f"diff_{key}"] = 0.0
    else:
        for key in ["height_cm", "rsi", "max_force_n", "max_power_w", "power_to_mass", "score"]:
            data_to_save[f"diff_{key}"] = 0.0

    with open(PATH, mode='a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=data_to_save.keys())
        if not exists:
            writer.writeheader()
        writer.writerow(data_to_save)

    return data_to_save

def get_recent_history():
    if os.path.exists(PATH):
        df = pd.read_csv(PATH)
        return df.tail(10).fillna(0).to_dict(orient="records")
    return []