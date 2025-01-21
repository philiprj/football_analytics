import os

import requests
from bs4 import BeautifulSoup


# Base URL for the GitHub repository
base_url = "https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/"
repo_url = "https://github.com/statsbomb/open-data/tree/master/data/events"

# Directory to save the downloaded JSON files
data_dir = "data/events/"
os.makedirs(data_dir, exist_ok=True)

# Scrape the GitHub page to get the list of JSON files
response = requests.get(repo_url)
soup = BeautifulSoup(response.text, "html.parser")
json_files = [a["title"] for a in soup.find_all("a", href=True) if a["href"].endswith(".json")]

print(json_files)

# # Download each JSON file
# for json_file in tqdm(json_files, desc="Downloading JSON files"):
#     url = f"{base_url}{json_file}"
#     response = requests.get(url)
#     if response.status_code == 200:
#         with open(os.path.join(data_dir, json_file), "w") as f:
#             f.write(response.text)
#     else:
#         print(f"Failed to download {json_file}")

# # Process each JSON file to keep only shot events
# for json_file in tqdm(json_files, desc="Processing JSON files"):
#     file_path = os.path.join(data_dir, json_file)
#     df = pd.read_json(file_path)
#     df_shots = df[df["shot"].notna()]

#     # Save the processed DataFrame if needed
#     processed_file_path = os.path.join(data_dir, f"shots_{json_file}")
#     df_shots.to_json(processed_file_path, orient="records", lines=True)

#     # Optionally, print or inspect the DataFrame
#     print(df_shots.head())
