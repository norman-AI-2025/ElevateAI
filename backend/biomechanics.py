import numpy as np

def calc_jump_metrics(weight_kg, flight_time_s, contraction_time_s, peak_accel_ms2, landing_l_vel, landing_r_vel):
    # 1. Jump Height
    height_cm = round(0.5 * 9.81 * ((flight_time_s / 2) ** 2) * 100, 1)
    height_m = height_cm / 100.0

    # 2. RSI (Reactive Strength Index)
    ct = max(contraction_time_s, 0.20)
    rsi = round(height_m / ct, 2)

    # 3. Max Force
    standing_force = weight_kg * 9.81
    max_force = round(standing_force + (weight_kg * max(peak_accel_ms2, 5.0)), 1)

    # 4. Max Power
    max_power = round((60.7 * height_cm) + (45.3 * weight_kg) - 2055, 1)
    max_power = max(max_power, 500.0)

    # 5. Power-to-Mass Ratio
    power_to_mass = round(max_power / weight_kg, 1)

    # 6. EUR & SSC Efficiency
    estimated_sj_height = max(height_cm * 0.90, 5.0)
    eur = round(height_cm / estimated_sj_height, 2)
    ssc_efficiency = round(((height_cm - estimated_sj_height) / estimated_sj_height) * 100, 1)

    # 7. Landing Symmetry
    vl = abs(landing_l_vel) + 1e-4
    vr = abs(landing_r_vel) + 1e-4
    landing_symmetry = round((min(vl, vr) / max(vl, vr)) * 100, 1)

    # 8. Score
    h_score = min((height_cm / 70.0) * 35, 35)
    rsi_score = min((rsi / 2.5) * 25, 25)
    sym_score = (landing_symmetry / 100.0) * 20
    pwr_score = min((power_to_mass / 60.0) * 20, 20)
    total_score = round(h_score + rsi_score + sym_score + pwr_score, 1)

    return {
        "height_cm": height_cm,
        "rsi": rsi,
        "max_force_n": max_force,
        "max_power_w": max_power,
        "eur": eur,
        "power_to_mass": power_to_mass,
        "ssc_efficiency_pct": ssc_efficiency,
        "landing_symmetry_pct": landing_symmetry,
        "score": total_score
    }