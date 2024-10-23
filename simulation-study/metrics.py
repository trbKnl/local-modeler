from sklearn.metrics.pairwise import cosine_similarity
from scipy.stats import entropy
from sklearn.metrics import adjusted_rand_score as ars
from itertools import combinations
from random import sample
import numpy as np


def average_max_cosine_similarity(phi, phi_hat):
    max_similarities = []

    for p in phi:
        similarities = cosine_similarity(np.array([p]), phi_hat)
        max_similarity = np.max(similarities)
        max_similarities.append(max_similarity)

    average_similarity = np.mean(max_similarities)
    
    return average_similarity



def kl_divergence(p, q):
    """
    Calculate KL divergence between two probability distributions.
    
    Args:
        p: First probability distribution vector
        q: Second probability distribution vector
        
    Returns:
        KL(P||Q): The KL divergence from Q to P
    """
    # Ensure the vectors are normalized
    p = p / np.sum(p)
    q = q / np.sum(q)
    
    # Add small epsilon to avoid division by zero
    epsilon = 1e-10
    q = q + epsilon
    p = p + epsilon
    
    # Renormalize after adding epsilon
    p = p / np.sum(p)
    q = q / np.sum(q)
    
    # Calculate KL divergence
    return entropy(p, q)


def average_min_kl_divergence(phi, phi_hat):

    res = []
    for p in phi:
        div = []
        for ph in phi_hat:
            div.append(kl_divergence(p, ph))
        res.append(min(div))

    average_min_kl_divergence = np.mean(res)
    
    return average_min_kl_divergence


def average_kl_divergence(phi):

    combs = list(combinations(range(0, len(phi)), 2))
    # if too much to compare
    if len(combs) > 100:
        combs = sample(combs, 100)

    res = []
    for (i, j) in combs:
        res.append(kl_divergence(phi[i], phi[j]))
    
    return np.mean(res)


def adjusted_rand_score(theta, theta_hat):

    true_assignments = np.argmax(theta, axis=1)
    predicted_assignments = np.argmax(theta_hat, axis=1)

    return ars(true_assignments, predicted_assignments)
