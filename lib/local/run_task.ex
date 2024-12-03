defmodule RunTask do
  @moduledoc """
  Obtain the run id of a run the participant still needs to process

  This module asks the queue for a run id
  it will return a run id of a freshly locked run
  or it times out after @timeout seconds
  """

  @timeout 10_000
  #@timeout 100_000

  defstruct [:pid, wants: []]

  # Client API

  def get_run_id(wants) do
    Task.async(fn -> 
      ask_queue_for_run(wants)
    end)
    |> Task.await(:infinity)
  end

  # private functions

  defp ask_queue_for_run([]) do {:ok, :done} end
  defp ask_queue_for_run(wants) do
    task = %RunTask{pid: self(), wants: wants}

    RunTaskQueue.add(task)
    result = wait_for_run_id()
    RunTaskQueue.delete(task)

    result
  end

  defp wait_for_run_id do
    receive do
      {:ok, run_id} -> {:ok, run_id}
      {:error, reason} -> {:error, reason}
    after
      @timeout -> {:error, :timeout}
    end
  end
end
