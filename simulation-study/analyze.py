import json
import os
from prisma import Prisma

from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


# Initialize Prisma
os.environ["DATABASE_URL"] = "file:../prisma/dev.db"
prisma = Prisma()
prisma.connect()


def fetch_studies():
    # Fetch all studies with their associated runs
    studies = prisma.study.find_many(
        include={
            'runs': True  # Include the related runs
        }
    )

    return studies


def average_max_cosine_similarity(phi, phi_hat):
    max_similarities = []

    for p in phi:
        similarities = cosine_similarity(np.array([p]), phi_hat)
        max_similarity = np.max(similarities)
        max_similarities.append(max_similarity)

    average_similarity = np.mean(max_similarities)
    
    return average_similarity


studies = fetch_studies()
study = studies[39]

study_settings = json.loads(study.description)

phi = study_settings["phi"]
study_id = study_settings["study_id"]

model = json.loads(study.runs[0].model)
phi_hat = model["model_params"]["components_"]

average_max_cosine_similarity(phi, phi_hat)




###########################

def fetch_study_by_id(study_id: str):
    study = prisma.study.find_unique(
        where={'id': study_id},  # Assuming 'id' is the field name for the study_id
        include={'runs': True}    # Include the related runs
    )
    
    return study


study = fetch_study_by_id("100_5_1000_6")

study_settings = json.loads(study.description)

phi = study_settings["phi"]
study_id = study_settings["study_id"]

model = json.loads(study.runs[0].model)
phi_hat = model["model_params"]["components_"]

average_max_cosine_similarity(phi, phi_hat)

