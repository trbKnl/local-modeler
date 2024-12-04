defmodule RunTaskQueue do
  @moduledoc """
  A FIFO queue that stores RunTasks

  It tries to obtain a lock of run that the task wants.
  If run is available the task resolves with the run id, this locks the run.

  if no run is available the task is added to a queue, 
  if in time a run frees up the task wants the task resolves with that run id.
  """

  use GenServer

  # Client API

  def start_link(_) do
    GenServer.start_link(__MODULE__, [] , name: __MODULE__)
  end

  def add(%RunTask{} = task) do
    GenServer.cast(__MODULE__, {:add, task})
  end

  def delete(%RunTask{} = task) do
    GenServer.cast(__MODULE__, {:delete, task})
  end

  def notify_mutex_unlocked(id) do
    GenServer.cast(__MODULE__, {:notify_mutex_unlocked, id})
  end


  # Server Callbacks

  @impl true
  def init(run_task_queue) do
    {:ok, run_task_queue}
  end

  @impl true
  def handle_cast({:add, task}, run_task_queue) do 
    run_task_queue = case get_and_lock_run(task) do
      nil ->
        add_to_queue(run_task_queue, task)
      _ ->
        run_task_queue
    end
    {:noreply, run_task_queue}
  end

  @impl true
  def handle_cast({:delete, task}, run_task_queue) do
    {:noreply, run_task_queue |> delete_from_queue(task)}
  end

  @impl true
  def handle_cast({:notify_mutex_unlocked, id}, run_task_queue) do
    run_task_queue = case get_task_in_queue_that_wants_id(run_task_queue, id) do
      nil -> 
        run_task_queue
      task ->
        task |> get_and_lock_run()
        run_task_queue |> delete_from_queue(task)
    end
    {:noreply, run_task_queue}
  end

  # Private function
  defp add_to_queue(run_task_queue, task) do
    [task | run_task_queue]
  end

  defp delete_from_queue(run_task_queue, task) do
    List.delete(run_task_queue, task)
  end

  defp get_and_lock_run(%{pid: _pid, wants: []} = task) do 
    notify_task(task, {:ok, :done})
  end

  defp get_and_lock_run(task) do
    Enum.find(task.wants, fn id ->
      case MutexManager.lock(id) do
        {:error, :busy} ->
          false

        {:ok, id} ->
          notify_task(task, {:ok, id})
      end
    end)
  end

  defp notify_task(task, message) do
    send(task.pid, message)
  end

  defp get_task_in_queue_that_wants_id(run_task_queue, id) do
    Enum.find(run_task_queue |> Enum.reverse(), fn task ->
      id in task.wants
    end)
  end
end
