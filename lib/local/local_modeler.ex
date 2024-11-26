defmodule LocalModeler do
  alias Local.Schema.Run
  alias Local.Studies

  @max_attemps 3

  # GET method

  # TODO: MAKE  CODE MORE READABLE
  # Make clear what happens with edge cases
  # returns either the run or nil
  # CHANGE LATER
  def get(study_id, participant_id) do
    Studies.upsert_participant(participant_id)
    Studies.get_uncompleted_runs(study_id, participant_id)
    |> get_run_id_with_timeout(@max_attemps)
    |> Studies.get_run()
  end

  # PUT method

  def put(%Run{} = updated_run, participant_id) do
    current_run = Studies.get_run(updated_run.id)

    # check conditions
    not_yet_updated = !Studies.is_run_updated_by_participant?(updated_run.id, participant_id)
    check_values_match = current_run.check_value == updated_run.check_value

    with true <- not_yet_updated,
         true <- check_values_match do

      Studies.update_run(current_run, %{model: updated_run.model})
      Studies.create_update(updated_run.id, participant_id)
      MutexManager.release(updated_run.id)

    end
  end
  def put(_, _) do raise "Pattern matching put parameters failed" end

  # Helpers

  defp get_run_id(run_ids) do
    Enum.find(run_ids, fn run_id ->
      case MutexManager.lock(run_id) do
        {:ok, run_id} -> 
          run_id
        {:error, :busy} -> 
          false
        end
    end)
  end

  defp get_run_id_with_timeout([], _), do: nil
  defp get_run_id_with_timeout(_, 0), do: nil
  defp get_run_id_with_timeout(run_ids, attempts) do
    case get_run_id(run_ids) do
      nil ->
        Process.sleep(1000)
        get_run_id_with_timeout(run_ids, attempts - 1)
      run_id -> run_id
    end
  end

end


#participant_id = "p1"
#
#participant_id = "p2"
#study_id = "asd"
#
#run = MyMutex.get(study_id, participant_id)
#run = Map.put(run, :model, "yolo")
#MyMutex.put(participant_id, run)
#
#MyMutex.Studies.get_run(run.id)

