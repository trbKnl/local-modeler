import json
import httpx

import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation


###################################################################################
# LDA related functions


def serialize_random_state(rs: np.random.RandomState) -> str:
    """
    Serializes np.random.RandomState to a json string
    """
    state = rs.get_state()
    # tolist if item is ndarray
    serializable_state = [item.tolist() if isinstance(item, np.ndarray) else item for item in state]
    return json.dumps(serializable_state)


def deserialize_random_state(serialized_state: str) -> np.random.RandomState:
    """
    Deserializes a json string containing a random state and returns np.random.RandomState object
    """
    deserialized_state = tuple(
        np.array(item, dtype=np.uint32) if isinstance(item, list) 
        else item 
        for item in json.loads(serialized_state)
    )
    rs = np.random.RandomState()
    rs.set_state(deserialized_state) #pyright: ignore
    return rs


def save_lda_model(lda: LatentDirichletAllocation) -> str:
    model_params = {
        'components_': lda.components_.tolist(),
        'exp_dirichlet_component_': lda.exp_dirichlet_component_.tolist(),
        'doc_topic_prior_': lda.doc_topic_prior_,
        'n_components': lda.n_components,
        'learning_decay': lda.learning_decay,
        'learning_offset': lda.learning_offset,
        'max_iter': lda.max_iter,
        'random_state': lda.random_state,
        'n_batch_iter_': lda.n_batch_iter_,
        'topic_word_prior_': lda.topic_word_prior_,
    }
    model = {
        "model_params": model_params,
        "random_state": serialize_random_state(lda.random_state_)
    }
    return json.dumps(model)


def load_lda_model(serialized_model: str) -> LatentDirichletAllocation:
    if serialized_model == "not initialized":
        lda = LatentDirichletAllocation(n_components=3, learning_method='online', max_iter=1)
        return lda

    model: dict = json.loads(serialized_model)
    model_params = model['model_params']
    random_state = model['random_state']
    
    lda = LatentDirichletAllocation(
        learning_method='online',
        n_components=model_params['n_components'],
        learning_decay=model_params['learning_decay'],
        learning_offset=model_params['learning_offset'],
        max_iter=model_params['max_iter'],
        random_state=model_params['random_state']
    )

    lda.components_ = np.array(model_params['components_'])
    lda.exp_dirichlet_component_ = np.array(model_params['exp_dirichlet_component_'])
    lda.doc_topic_prior_ = model_params['doc_topic_prior_']
    lda.n_batch_iter_ = model_params['n_batch_iter_'] 
    lda.topic_word_prior_ = model_params['topic_word_prior_'] 

    lda.random_state_ = deserialize_random_state(random_state)
    return lda


def learn_params(data, vocabulary, model: str) -> str:
    # TODO: check conditions of data

    lda = load_lda_model(model)

    #predefined_vocab = {'this': 0, 'is': 1, 'first': 2, 'third': 3, 'second': 4, 'batch': 5, 'asd': 6}
    vectorizer = CountVectorizer(vocabulary=vocabulary)

    # data should be list of a list of strings
    batch_term_matrix = vectorizer.fit_transform(data)
    lda.partial_fit(batch_term_matrix)
    new_model = save_lda_model(lda)

    return new_model


#################################################################

import numpy as np
from scipy.stats import dirichlet, multinomial


def generate_lda_test_data(ndocs, ntopics, nwords, alpha, beta):
    """
    Parameters:
    - num_docs M: Number of documents to generate
    - num_topics K: Number of topics
    - num_words N: Number of words per document
    - vocab_size: Size of the vocabulary
    - alpha: Dirichlet prior on the per-document topic distributions
    - beta: Dirichlet prior on the per-topic word distribution
    
    Returns:
    - documents: List of documents, where each document is a list of word indices
    - theta: Topic distribution for each document
    - phi: Word distribution for each topic

    ---
    This function is based on the section: "Generative process"
    from https://en.wikipedia.org/wiki/Latent_Dirichlet_allocation 

    Generate test data for Latent Dirichlet Allocation (LDA).
    
    In laymans terms the code works as follows:

    phi[k] is the word distribution for topic k
    theta[i] is the topic distribution for document i

    Repeat for i..M documents:
    Assign each of the N words in a document to a topic k using theta_i,
    for example: K=5 N=10 count result in: [3, 0, 0, 0, 7],
    3 words for the 1st topic and 7 words for 5th topic

    Draw the actual words for document i given the counts per topic using phi_k
    """

    # Mapping to make function more like the wiki article for ease of understanding
    K = ntopics
    M = ndocs
    N = nwords

    documents = []
    theta = []
    
    phi = dirichlet.rvs(beta, size=K)    # ndarray K by N 
    phi = phi / phi.sum(axis=1, keepdims=True) # normalize

    theta = dirichlet.rvs(alpha, size=M) # ndarray M by K
    theta = theta / theta.sum(axis=1, keepdims=True) # normalize

    for theta_i in theta:
        # Assign each word in a doc to a topic 
        # Note: in constract to the wiki article we draw the counts per topic all at once
        # So N words are divided over K topics based on probability theta_i
        word_count_per_topic = multinomial.rvs(n=N, p=theta_i)
        
        # Generate words for each topic
        doc = []
        for k, count in enumerate(word_count_per_topic):
            if count > 0:
                words = multinomial.rvs(n=count, p=phi[k])
                for word, word_count in enumerate(words):
                    doc.extend([str(word)] * word_count)
        
        np.random.shuffle(doc)  # Shuffle to mix words from different topics
        documents.append(doc)
    
    return documents, theta, phi

# Generate some data

num_docs = 100
num_topics = 5
num_words = 50
vocab_size = 1000
alpha = np.ones(num_topics) * 0.1  # Symmetric Dirichlet prior for theta
beta = np.ones(vocab_size) * 0.01  # Symmetric Dirichlet prior for phi

docs, theta, phi = generate_lda_test_data(num_docs, num_topics, num_words, alpha, beta)


#####################################################

import os
import uuid
import httpx
from prisma import Prisma
import itertools
import json
import random

# Initialize Prisma
os.environ["DATABASE_URL"] = "file:../prisma/dev.db"
prisma = Prisma()
prisma.connect()



def create_new_study(study_id: str, description: str, n_runs: int):
    prisma.study.create(
        data={
            "id": study_id,
            "description": description,
        }
    )
    for _ in range(n_runs):
        prisma.run.create(
            data={
                'studyId': study_id,
                'model': 'not initialized',
                'checkValue': str(uuid.uuid4())
            }
        )


def delete_study(study_id: str):
    prisma.study.delete(
        where={
            'id': study_id
        }
    )


def initialize_study(study_id: str, description: str, n_runs: int, delete: bool = True):
    study = prisma.study.find_unique(
        where={
            'id': study_id
            }
    )

    if study:
        print(f"Study with ID {study_id} exists")
        if delete == True:
            prisma.study.delete(
                where={
                    'id': study_id
                }
            )
            print(f"Study with ID {study_id} has been deleted.")
            print(f"Creating new")
            create_new_study(study_id, description, n_runs)

    else:
        print(f"Study with ID {study_id} does not exist. creating new")
        create_new_study(study_id, description, n_runs)



# study combinations


def initialize_condition(condition):
    n_words, n_topics, n_participants = condition

    # change later to create different entropy R^2 conditions
    vocab_size = 1000                  
    alpha = np.ones(n_topics) * 0.1   # Symmetric Dirichlet prior for theta
    beta = np.ones(vocab_size) * 0.01  # Symmetric Dirichlet prior for phi
    vocabulary = {f"{i}": i-1 for i in range(1, 1001)}
    replications = 10

    out = []
    for i in range(replications):

        study_id = f"{n_words}_{n_topics}_{n_participants}_{i}"
        seed = abs(hash(study_id)) % (2**32)
        random.seed(seed)

        docs, theta, phi = generate_lda_test_data(n_participants, n_topics, n_words, alpha, beta)

        study_settings = {
            "study_id": study_id,
            "n_words": n_words,
            "n_topics": n_topics,
            "n_participants": n_participants,
            "vocab_size": vocab_size,
            "replications": replications,
            "alpha": alpha.tolist(),
            "beta": beta.tolist(),
            "n_replications": replications,
            "replication": i,
            "seed": seed,
            "docs": docs,
            "theta": theta.tolist(),
            "phi": phi.tolist(),
            "vocabulary": vocabulary,
        }

        description = json.dumps(study_settings)
        initialize_study(study_id, description=description, n_runs=1)

        out.append(study_settings)

    return out


###############################################################
# Start simulation study of condition

LOCAL_MODELER_URL = "http://localhost:3000/api"
HEADERS = { "Content-Type": "application/json" }

# all study combination

n_words = [50, 100]
n_topics = [5, 10]
n_participants = [50, 100, 200]
combinations = list(itertools.product(n_words, n_topics, n_participants))


# run simulation

for combination in combinations:
    condition = initialize_condition(combination)
    n_replications = len(condition)

    for i in range(n_replications):
        replication_settings = condition[i]

        study_id = replication_settings["study_id"]
        n_participants = replication_settings["n_participants"]
        vocabulary = replication_settings["vocabulary"]
        docs = replication_settings["docs"]
        seed = replication_settings["seed"]

        # set the unique seed for each replication
        random.seed(seed)

        for n in range(n_participants):
            # get model
            params = { "studyId": study_id, "participantId": f"{n}" }
            response = httpx.get(LOCAL_MODELER_URL, params=params)

            # check if already ran
            if response.text == "No runs are available":
                break

            run = json.loads(response.text)

            # train model
            data = docs[n]
            new_model = learn_params(data, vocabulary, run["model"])
            run["model"] = new_model

            # post newly trained model
            response = httpx.post(LOCAL_MODELER_URL, headers=HEADERS, params=params, json=run)
            print(response.text)


