defmodule LocalModeler do
  require Logger

  alias Local.Schema.Run
  alias Local.Studies

  # GET method

  def get(study_id, participant_id) do
    Studies.upsert_participant(participant_id)

    result = Studies.get_uncompleted_runs(study_id, participant_id) 
    |> RunTask.get_run_id()

    case result do
      {:ok, :done} ->
        Logger.info("[LocalModeler] Participant: #{participant_id} is done")
        create_payload("PayloadError", "No runs left, participant is done")

      {:ok, run_id} ->
        Logger.info("[LocalModeler] Sending run id #{run_id} to #{participant_id}, run: #{Studies.get_run(run_id) |> Jason.encode!()}")
        create_payload("[LocalModeler] PayloadString", Studies.get_run(run_id) |> Jason.encode!())

      {_, error} ->
        Logger.info("[LocalModeler] Error: #{IO.inspect(error)}")
        create_payload("PayloadError", error)

      _ ->
        Logger.info("[LocalModeler] unhandeld error")
        create_payload("PayloadError", "Could not return run")
    end
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

      Logger.info("[LocalModeler] Run id: #{current_run.id}, was updated to model: #{updated_run.model}, by: #{participant_id}")
      create_payload("PayloadString", "run id was updated")
    else
      _ -> 
        Logger.error("[LocalModeler] Conditions did not match in put")
        create_payload("PayloadError", "Conditions did not meet, run was not updated")
    end
  end
  def put(_, _) do raise "Pattern matching put parameters failed" end

  # Helpers

  def create_payload(payload, value) do
  %{
    "__type__" => payload,
    "value" => value,
    }
  end

end

