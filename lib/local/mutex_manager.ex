defmodule Mutex do
  defstruct [locked: false, release_timer: nil]
end

defmodule MutexManager do
  @moduledoc """
  A GenServer-based module to manage simple mutex locks with expiration.
  Mutexes expire after @timeout miliseconds

  Mutexes are stored in a map upon a release
  RunTaskQueue is notified that a mutex freed up
  """

  @timeout 3000
  #@timeout 100_000

  use GenServer

  # Client API

  def start_link() do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def lock(id) do
    GenServer.call(__MODULE__, {:lock, id})
  end

  def is_locked(id) do
    GenServer.call(__MODULE__, {:is_locked, id})
  end

  def release(id) do
    GenServer.cast(__MODULE__, {:release, id})
  end

  # Server Callbacks

  @impl true
  def init(state) do
    {:ok, state}
  end

  @impl true
  def handle_call({:lock, id}, _from, state) do
    if is_locked?(state, id) do
      {:reply, {:error, :busy}, state}
    else 
      {:reply, {:ok, id}, state |> set_locked(id)}
    end
  end

  @impl true
  def handle_call({:is_locked, id}, _from, state) do
    {:reply, is_locked?(state, id), state}
  end

  @impl true
  def handle_cast({:release, id}, state) do
    {:noreply, state |> set_release(id)}
  end

  @impl true
  def handle_info({:release, id}, state) do
    {:noreply, state |> set_release(id)}
  end

  # Private function

  defp set_release(state, id) do
    state
    |> ensure_mutex_exists(id)
    |> set_locked(id, false)
    |> kill_release_timer(id)
    |> then(fn state ->
        RunTaskQueue.notify_mutex_unlocked(id)
        state
      end)
  end

  defp set_locked(state, id) do
    state
    |> ensure_mutex_exists(id)
    |> set_locked(id, true)
    |> set_release_timer(id)
  end

  defp is_locked?(state, id) do
    case Map.get(state, id) do
      nil ->
        false

      %Mutex{} = mutex ->
        mutex.locked
      end
  end

  defp set_locked(state, id, bool) do
    put_in(state[id].locked, bool)
  end

  defp set_release_timer(state, id) do
    timer_ref = Process.send_after(self(), {:release, id}, @timeout)
    put_in(state[id].release_timer, timer_ref)
  end

  defp kill_release_timer(state, id) do
    case state[id].release_timer do
      nil ->
        state

      timer_ref ->
        Process.cancel_timer(timer_ref)
        put_in(state[id].release_timer, nil)
    end
  end

  defp ensure_mutex_exists(state, id) do
    if is_nil(Map.get(state, id)) do
      Map.put(state, id, %Mutex{})
    else
      state
    end
  end
end

