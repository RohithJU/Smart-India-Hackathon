import numpy as np
import pandas as pd

np.random.seed(42)

n=15000

latitude=np.random.uniform(-60,60,n)
longitude=np.random.uniform(-180,180,n)
depth=np.random.uniform(0,2000,n)

time=pd.date_range("2026-01-01","2026-09-18",periods=n)

# Surface temperature
sst=30-(np.abs(latitude)*0.10)+np.random.normal(0,0.4,n)

# Environmental variables
surface_current_speed=np.random.uniform(0.1,2.5,n)
wind_speed=np.random.uniform(2,30,n)
salinity=35+np.random.normal(0,0.4,n)

# Seasonal variation
seasonal_effect=1.0*np.sin(
    2*np.pi*(time.dayofyear.values/365)
)

# Depth-dependent temperature profile
depth_effect=(
    0.0105*depth
    +0.0000025*(depth**2)
)

temperature=(
    sst
    -depth_effect
    +seasonal_effect
    +(surface_current_speed-1.2)*0.04
    -(wind_speed-15)*0.008
    +(salinity-35)*0.10
    +np.random.normal(0,0.08,n)
)

# Surface temperature must equal SST
temperature=np.where(
    depth<1,
    sst,
    temperature
)

# Keep temperature within a reasonable synthetic ocean range
temperature=np.clip(
    temperature,
    2.0,
    32.0
)

data=pd.DataFrame({
    "latitude":latitude,
    "longitude":longitude,
    "time":time.strftime("%Y-%m-%d"),
    "depth":depth,
    "sst":sst,
    "surface_current_speed":surface_current_speed,
    "wind_speed":wind_speed,
    "salinity":salinity,
    "temperature":temperature
})

data.to_csv(
    "ocean_dummy_dataset.csv",
    index=False
)

print("====================================")
print("AquaVision Ocean Dataset Created!")
print("====================================")
print("Rows:",len(data))
print("Features:",len(data.columns)-1)
print()
print(data.head())
print()
print("Dataset saved as ocean_dummy_dataset.csv")