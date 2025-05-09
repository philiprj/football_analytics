import joblib
import numpy as np
import pandas as pd


feature_columns = joblib.load("../models/feature_columns2.joblib")


def calculate_distance_angle(x, y):
    # Goal is at (120, 40) in StatsBomb coordinates
    distance = np.sqrt((x - 120) ** 2 + (y - 40) ** 2)
    angle = np.abs(np.arctan2(y - 40, 120 - x))
    return distance, angle


def calculate_soft_blocking(shot_location, defenders):
    """
    Calculate soft blocking and goal blocking percentage based on defender positions
    """
    x, y = shot_location
    goal_x, goal_y = 120, 40

    # Default values
    soft_blocking = 0
    goal_blocking_percentage = 0

    if defenders:
        # Simple algorithm for blocking calculation
        # This is a placeholder - you might want a more sophisticated algorithm
        for defender in defenders:
            defender_x, defender_y = defender["x"], defender["y"]

            # If defender is between shot and goal
            if defender_x > x:
                # Calculate angles
                shot_to_goal_angle = np.arctan2(goal_y - y, goal_x - x)
                shot_to_defender_angle = np.arctan2(defender_y - y, defender_x - x)

                # If angles are close, defender is potentially blocking
                if abs(shot_to_goal_angle - shot_to_defender_angle) < 0.2:  # ~11 degrees
                    # Closer defenders block more
                    distance_factor = 1 / (1 + np.sqrt((defender_x - x) ** 2 + (defender_y - y) ** 2))
                    soft_blocking += distance_factor

        # Normalize soft blocking (0-1 scale)
        soft_blocking = min(soft_blocking, 1)

        # Simple goal blocking percentage (could be more sophisticated)
        goal_blocking_percentage = soft_blocking * 0.8  # 80% maximum blocking

    return soft_blocking, goal_blocking_percentage


def calculate_defender_features(shot_location, players):
    """
    Calculate defender-related features from player positions
    """
    x, y = shot_location
    defenders = [
        {"x": player.x, "y": player.y} for player in players if not player.teammate and player.position != "Goalkeeper"
    ]

    # Count defenders between shot and goal, and find closest defender
    defenders_in_path = 0
    min_defender_distance = 100  # Initialize with large value

    # Goal coordinates
    goal_x, goal_y = 120, 40

    for defender in defenders:
        player_x, player_y = defender["x"], defender["y"]

        # Check if defender is between shot and goal
        if player_x > x:  # Defender is closer to goal than shooter
            # Calculate if defender is in path (simplified approach)
            shot_to_goal_angle = np.arctan2(goal_y - y, goal_x - x)
            shot_to_defender_angle = np.arctan2(player_y - y, player_x - x)

            # If angles are close, defender is in path
            if abs(shot_to_goal_angle - shot_to_defender_angle) < 0.3:  # ~17 degrees
                defenders_in_path += 1

        # Calculate distance to nearest defender
        defender_distance = np.sqrt((player_x - x) ** 2 + (player_y - y) ** 2)
        min_defender_distance = min(min_defender_distance, defender_distance)

    if min_defender_distance == 100:  # No defenders found
        min_defender_distance = 20

    # Calculate blocking features
    soft_blocking, goal_blocking_percentage = calculate_soft_blocking(shot_location, defenders)

    return defenders_in_path, min_defender_distance, soft_blocking, goal_blocking_percentage


def calculate_gk_features(shot_location, players):
    """
    Calculate goalkeeper-related features from player positions
    """
    x, y = shot_location

    # Find goalkeeper
    goalkeeper = next((player for player in players if not player.teammate and player.position == "Goalkeeper"), None)

    # Default values
    gk_distance = 15
    gk_angle = 0
    gk_goal_line_distance = 5

    if goalkeeper:
        gk_x, gk_y = goalkeeper.x, goalkeeper.y

        # Distance from shooter to goalkeeper
        gk_distance = np.sqrt((gk_x - x) ** 2 + (gk_y - y) ** 2)
        # Distance from goalkeeper to goal line
        gk_goal_line_distance = 120 - gk_x

        # Angle between shot trajectory and goalkeeper
        shot_to_goal_angle = np.arctan2(40 - y, 120 - x)
        shot_to_gk_angle = np.arctan2(gk_y - y, gk_x - x)
        gk_angle = abs(shot_to_goal_angle - shot_to_gk_angle)

    return gk_distance, gk_angle, gk_goal_line_distance


def prepare_features_for_model(shot_data):
    """
    Transform raw shot data into features expected by the model
    """
    # Get shot location
    x, y = shot_data.location

    # Calculate basic features
    distance, angle = calculate_distance_angle(x, y)

    # Calculate defender features
    defenders_in_path, min_defender_distance, soft_blocking, goal_blocking_percentage = calculate_defender_features(
        shot_data.location, shot_data.players
    )

    # Calculate goalkeeper features
    gk_distance, gk_angle, gk_goal_line_distance = calculate_gk_features(shot_data.location, shot_data.players)

    # Create feature dictionary
    features = {
        "x": x,
        "y": y,
        "distance": distance,
        "angle": angle,
        "shot_body_part": shot_data.shot_body_part,
        "shot_type": shot_data.shot_type,
        "shot_technique": shot_data.shot_technique,
        "shot_one_on_one": 1 if shot_data.shot_one_on_one else 0,
        "under_pressure": 1 if shot_data.under_pressure else 0,
        "shot_first_time": 1 if shot_data.shot_first_time else 0,
        "game_period": shot_data.game_period,
        "minute": shot_data.minute,
        "defenders_in_path": defenders_in_path,
        "min_defender_distance": min_defender_distance,
        "soft_blocking": soft_blocking,
        "goal_blocking_percentage": goal_blocking_percentage,
        "gk_distance": gk_distance,
        "gk_angle": gk_angle,
        "gk_goal_line_distance": gk_goal_line_distance,
    }

    return features


def encode_categorical_features(features_dict):
    """
    One-hot encode categorical features to match model requirements
    """
    # Create a single-row DataFrame from the features
    input_df = pd.DataFrame([features_dict])

    # Identify categorical columns
    categorical_columns = ["shot_body_part", "shot_type", "shot_technique"]

    # One-hot encode categorical features
    encoded_df = pd.get_dummies(input_df, columns=categorical_columns, prefix=categorical_columns)

    # Ensure all feature columns from the model are present
    for col in feature_columns:
        if col not in encoded_df.columns:
            encoded_df[col] = 0

    # Select only the columns used by the model, in the correct order
    final_df = encoded_df[feature_columns]

    return final_df
