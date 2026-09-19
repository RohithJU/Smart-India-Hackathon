import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "ocean_temperature_model.pkl")

model = None
try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Successfully loaded model from {MODEL_PATH}")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}")
except Exception as e:
    print(f"Warning: Failed to load model from {MODEL_PATH}: {e}")

app = FastAPI(title="OceanXplore Marine Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "OceanXplore Marine Intelligence API is running",
        "status": "online",
        "model_loaded": model is not None
    }

@app.get("/health")
def health():
    return {
        "status": "online",
        "model_loaded": model is not None
    }

@app.get("/predict")
def predict_temperature(
    lat:float,
    lon:float,
    depth:float,
    sst:float,
    surface_current_speed:float,
    wind_speed:float,
    salinity:float
):
    if depth<0:
        return{
            "error":"Depth cannot be negative"
        }

    # Reference synthetic ocean profile
    reference_depths=np.array([
        0,
        10,
        25,
        50,
        100,
        200,
        500,
        1000,
        1500,
        2000
    ])

    reference_temperatures=np.array([
        sst,
        sst-0.20,
        sst-0.50,
        sst-1.10,
        sst-2.70,
        sst-6.50,
        sst-14.60,
        sst-20.60,
        sst-23.00,
        sst-24.30
    ])

    # Interpolate temperature between reference depths
    prediction=np.interp(
        depth,
        reference_depths,
        reference_temperatures
    )

    # Keep temperature physically consistent with surface temperature
    prediction=min(prediction,sst)
    prediction=max(prediction,2.0)

    return{
        "location":{
            "latitude":lat,
            "longitude":lon
        },
        "depth":{
            "value":depth,
            "unit":"m"
        },
        "sst":{
            "value":round(sst,2),
            "unit":"°C"
        },
        "surface_current_speed":{
            "value":round(surface_current_speed,2),
            "unit":"km/h"
        },
        "wind_speed":{
            "value":round(wind_speed,2),
            "unit":"km/h"
        },
        "salinity":{
            "value":round(salinity,2),
            "unit":"PSU"
        },
        "predicted_temperature":{
            "value":round(prediction,2),
            "unit":"°C"
        },
        "difference_from_sst_c":round(prediction-sst,2),
        "model":"Physics-Guided Synthetic Ocean Profile",
        "data_type":"SIMULATED_DEMO_DATA"
    }