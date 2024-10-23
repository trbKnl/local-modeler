import json
import os
from prisma import Prisma

import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer

import metrics
import lda


# Initialize Prisma

os.environ["DATABASE_URL"] = "file:../prisma/dev.db"
prisma = Prisma()
prisma.connect()


def fetch_studies():

    studies = prisma.study.find_many(
        include={
            'runs': True  
        }
    )

    return studies


def fetch_study_by_id(study_id: str):
    study = prisma.study.find_unique(
        where={
            'id': study_id
        }, 
        include={
            'runs': True
        } 
    )

    return study



# Calculate metrics for 1 study
metrics_data = []

studies = fetch_studies()

for study in studies:
    try:
        study_settings = json.loads(study.description)

        phi = study_settings["phi"]
        theta = study_settings["theta"]
        study_id = study_settings["study_id"]
        vocabulary = study_settings["vocabulary"]
        docs = study_settings["docs"]
        n_topics = study_settings["n_topics"]
        n_participants = study_settings["n_participants"]
        n_words = study_settings["n_words"]
        vocabulary_size = len(vocabulary)

        vectorizer = CountVectorizer(vocabulary=vocabulary)

        model = lda.load_lda_model(study.runs[0].model, n_topics)
        doc_term_matrix = vectorizer.transform(docs)
        theta_hat = model.transform(doc_term_matrix)
        phi_hat = model.components_

        # Calculate metrics
        avg_kl_div_theta = metrics.average_kl_divergence(theta)
        avg_kl_div_phi = metrics.average_kl_divergence(phi)
        avg_max_cosine_sim = metrics.average_max_cosine_similarity(phi, phi_hat)
        avg_min_kl_div = metrics.average_min_kl_divergence(phi, phi_hat)
        adj_rand_score = metrics.adjusted_rand_score(theta, theta_hat)
        
        # Append the calculated metrics as a dictionary for each iteration
        metrics_data.append({
            "n_participants": n_participants,
            "n_topics": n_topics,
            "n_words": n_words,
            "vocabulary_size": vocabulary_size,
            "avg_kl_divergence_theta_topic_distribution": avg_kl_div_theta,
            "avg_kl_divergence_phi_word_distribution": avg_kl_div_phi,
            "avg_max_cosine_similarity_phi_vs_phi_hat": avg_max_cosine_sim,
            "avg_min_kl_divergence_phi_vs_phi_hat": avg_min_kl_div,
            "adjusted_rand_index_theta_vs_theta_hat": adj_rand_score,
        })

    except Exception as e:
        pass



# Convert the list of dictionaries into a DataFrame
metrics_df = pd.DataFrame(metrics_data)

# Display the DataFrame
metrics_df.to_csv("results.csv", index=False)



