import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error,r2_score

data=pd.read_csv("ocean_dummy_dataset.csv")

features=[
    "latitude",
    "longitude",
    "depth",
    "sst",
    "surface_current_speed",
    "wind_speed",
    "salinity"
]

X=data[features]
y=data["temperature"]

X_train,X_test,y_train,y_test=train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

model=RandomForestRegressor(
    n_estimators=300,
    max_depth=25,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train,y_train)

predictions=model.predict(X_test)

mae=mean_absolute_error(
    y_test,
    predictions
)

r2=r2_score(
    y_test,
    predictions
)

print("====================================")
print("AquaVision ML Model Trained!")
print("====================================")
print("Training samples:",len(X_train))
print("Testing samples:",len(X_test))
print("MAE:",round(mae,3),"°C")
print("R² Score:",round(r2,3))
print()

joblib.dump(
    model,
    "ocean_temperature_model.pkl"
)

print("Model saved as ocean_temperature_model.pkl")