defmodule MutexManager do
  @moduledoc """
  A GenServer-based module to manage simple mutex locks with expiration.

  This module provides basic lock management functionality for keys with an expiration timeout.
  """

  use GenServer

  # Lock expires in timeout ms
  @timeout 3000

  # Client API

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def lock(key) do
    GenServer.call(__MODULE__, {:lock, key})
  end

  def is_locked(key) do
    GenServer.call(__MODULE__, {:is_locked, key})
  end

  def release(key) do
    GenServer.cast(__MODULE__, {:release, key})
  end

  # Server Callbacks

  @impl true
  def init(mutexes) do
    {:ok, mutexes}
  end

  @impl true
  def handle_call({:lock, key}, _from, mutexes) do
    if is_locked?(mutexes, key) do
      {:reply, {:error, :busy}, mutexes}
    else
      {:reply, {:ok, key}, lock(mutexes, key)}
    end
  end

  @impl true
  def handle_call({:is_locked, key}, _from, mutexes) do
    is_locked = is_locked?(mutexes, key)
    {:reply, is_locked, mutexes}
  end

  @impl true
  def handle_cast({:release, key}, mutexes) do
    mutexes = release(mutexes, key)
    {:noreply, mutexes}
  end

  # Private function

  defp is_locked?(mutexes, key) do
    case Map.get(mutexes, key) do
      nil ->
        false

      timestamp ->
        !is_expired(timestamp)
    end
  end

  defp lock(mutexes, key) do
    if is_locked?(mutexes, key) do
      mutexes
    else
      Map.put(mutexes, key, DateTime.utc_now())
    end
  end

  defp release(mutexes, key) do
    Map.delete(mutexes, key)
  end

  defp is_expired(timestamp) do
    time_diff = DateTime.diff(DateTime.utc_now(), timestamp, :millisecond)
    time_diff > @timeout
  end
end
