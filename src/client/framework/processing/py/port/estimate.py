import numpy as np
import autograd.numpy as anp
from autograd import grad
import pandas as pd


def linear_model(params: anp.ndarray, x: anp.ndarray) -> anp.ndarray:
    return anp.dot(x, params)


def mse_loss(params: anp.ndarray, x: anp.ndarray, y: anp.ndarray) -> float:
    predictions = linear_model(params, x)
    return anp.mean((predictions - y) ** 2)


gradient = grad(mse_loss)


# Stochastic Gradient Descent function
def sgd(x: np.ndarray, y: np.ndarray, params: np.ndarray, lr: float = 0.01, epochs: int = 100, batch_size: int = 32) -> np.ndarray:
    n_samples, _ = x.shape

    for epoch in range(epochs):
        # Shuffle the dataset
        indices = np.arange(n_samples)
        np.random.shuffle(indices)
        x_shuffled = x[indices]
        y_shuffled = y[indices]
        
        # Iterate over batches
        for i in range(0, n_samples, batch_size):
            x_batch = x_shuffled[i:i + batch_size]
            y_batch = y_shuffled[i:i + batch_size]
            
            # Compute the gradient for the current batch
            grads = gradient(params, x_batch, y_batch)
            
            # Update parameters
            params -= lr * grads
        
        # Optionally print the loss to track the training progress
        loss = mse_loss(params, x, y)
        print(f"Epoch {epoch+1}, Loss: {loss}")
    
    return params


def learn_params(df: pd.DataFrame, x_colnames: list[str], y_colname: str, params: list[float]) -> list[float]:
    # test_conditions_about_data(df)
    # if conditions fail do something

    # convert to x and y
    x =  df.loc[:, x_colnames].values
    y =  df.loc[:, y_colname].values
    params_array = np.array(params, dtype=np.float64)

    learned_params_sgd = sgd(x, y, params_array, lr=0.1, epochs=50, batch_size=len(x))

    return learned_params_sgd.tolist()
    

#####################################################################################

# Example usage
# Generate some synthetic data for testing

#np.random.seed()
#n = 50
#x = np.random.randn(n, 2)
#true_params = np.array([-10, -2])
#y = np.dot(x, true_params) + np.random.randn(n) * 0.5  # y = 3*x1 - 2*x2 + noise
#
#df = pd.DataFrame(np.hstack((x, y.reshape(-1, 1))), columns=['x1', 'x2', 'y'])
#
#learn_params(df, ["x1", "x2"], "y", [1, 2])
