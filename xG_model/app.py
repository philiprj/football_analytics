# app.py (using FastAPI)
import os
from pathlib import Path

import xgboost as xgb

# Add these imports at the top
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, field_validator

from xG_model.xgmodel_helpers import encode_categorical_features, prepare_features_for_model


# Update your FastAPI app initialization
app = FastAPI()

# Set up templates and static files
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# Load model
# Get the directory of the current file
current_dir = Path(__file__).parent
# Construct path to model file
model_path = current_dir.parent / "models" / "xgboost_xg_model2.joblib"
model = xgb.XGBClassifier()
model.load_model(str(model_path))


class PlayerPosition(BaseModel):
    x: int
    y: int
    teammate: bool
    position: str


class ShotInput(BaseModel):
    # Basic shot information
    location: list[int]  # [x, y]
    shot_body_part: str = "Right Foot"
    shot_type: str = "Open Play"
    shot_technique: str = "Normal"
    shot_one_on_one: int = 0
    under_pressure: int = 0
    shot_first_time: int = 0
    game_period: str = "First Half"
    minute: int = 46

    # Player positions
    players: list[PlayerPosition] = [PlayerPosition(x=95, y=42, teammate=False, position="Goalkeeper")]

    @field_validator("minute")
    def validate_minute_with_period(cls, minute, values):
        if "game_period" in values:
            period = values["game_period"]
            # Derive appropriate minute range based on game period
            if period == "First Half":
                if minute < 1 or minute > 45:
                    return 25  # Default to end of first half if out of range
            elif period == "Second Half":
                if minute < 46 or minute > 90:
                    return 75  # Default to middle of second half if out of range
            elif period == "Extra Time First Half":
                if minute < 91 or minute > 105:
                    return 100  # Default to middle of first ET if out of range
            elif period == "Extra Time Second Half":
                if minute < 106 or minute > 120:
                    return 115  # Default to middle of second ET if out of range
        return minute


@app.post("/predict_xg")
def predict_xg(shot: ShotInput):
    # Extract and calculate features
    features = prepare_features_for_model(shot)

    # Encode categorical features
    X = encode_categorical_features(features)

    # Predict xG
    xg_prediction = model.predict_proba(X)[0, 1]

    # Return prediction with features used
    # Return prediction with features used
    return {
        "xG": float(xg_prediction),
        "features": features,  # Include the derived features in the response
    }


# Add this at the end of the file
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("xG_model.app:app", host="0.0.0.0", port=port, reload=True)
