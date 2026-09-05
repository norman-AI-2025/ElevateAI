import numpy as np
from backend.biomechanics import calc_jump_metrics

def process_kinematics(weight_kg, athlete_height_m, hip_y_series, l_ankle_y_series, r_ankle_y_series, frame_times):
    n = len(hip_y_series)
    if n < 5:
        return {
            "metrics": calc_jump_metrics(weight_kg, 0.45, 0.35, 12.0, 1.0, 1.0),
            "curve": {"time": [0.1, 0.2, 0.3], "force": [weight_kg*9.81]*3, "velocity": [0.0]*3}
        }

    hip_y = np.array(hip_y_series)
    l_ankle_y = np.array(l_ankle_y_series)
    r_ankle_y = np.array(r_ankle_y_series)
    t_array = np.array(frame_times)

    # Dynamic Pixel-to-Meter Calibration using true physical height
    standing_hip_y = np.mean(hip_y[:5])
    standing_ankle_y = np.mean(l_ankle_y[:5])
    
    leg_length_norm = abs(standing_ankle_y - standing_hip_y)
    total_height_norm = leg_length_norm / 0.53 if leg_length_norm > 0 else 1.0
    scale_m = athlete_height_m / total_height_norm
    
    disp_m = (standing_hip_y - hip_y) * scale_m

    velocity = np.gradient(disp_m, t_array)
    acceleration = np.gradient(velocity, t_array)

    base_force = weight_kg * 9.81
    forces = [round(float(base_force + (weight_kg * a)), 1) for a in acceleration]
    velocities = [round(float(v), 2) for v in velocity]

    min_ankle_y = np.min(l_ankle_y)
    max_ankle_y = np.max(l_ankle_y)
    ankle_thresh = max_ankle_y - (max_ankle_y - min_ankle_y) * 0.25
    
    flight_indices = np.where(l_ankle_y < ankle_thresh)[0]
    if len(flight_indices) > 1:
        flight_time_s = float(t_array[flight_indices[-1]] - t_array[flight_indices[0]])
    else:
        flight_time_s = 0.25
    flight_time_s = max(flight_time_s, 0.25)

    dip_start_idx = int(np.argmin(disp_m[:max(n // 2, 2)]))
    takeoff_idx = int(np.argmax(velocity))
    
    contraction_time_s = float(abs(t_array[takeoff_idx] - t_array[dip_start_idx]))
    contraction_time_s = max(contraction_time_s, 0.20)

    peak_accel = float(np.max(acceleration))
    l_land_vel = float(np.min(np.gradient(l_ankle_y, t_array)))
    r_land_vel = float(np.min(np.gradient(r_ankle_y, t_array)))

    metrics = calc_jump_metrics(weight_kg, flight_time_s, contraction_time_s, peak_accel, l_land_vel, r_land_vel)
    rounded_times = [round(float(t), 3) for t in t_array]

    return {
        "metrics": metrics,
        "curve": {
            "time": rounded_times,
            "force": forces,
            "velocity": velocities
        }
    }