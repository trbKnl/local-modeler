defmodule Local.Studies do
  @moduledoc """
  The Studies context for local modeler
  This module handles all study-related business logic and database operations.
  """
  
  alias Local.Schema.{Study, Run, Participant, Update}
  alias Local.Repo
  import Ecto.Query

  # Create functions

  @doc """
  Creates or updates a record with the given params.
  The params map should contain:
  - :study_id
  - :description
  """
  def create_study(id, params \\ %{}) do
    %Study{}
    |> Study.changeset(Map.put(params, :id, id))
    |> Repo.insert()
  end

  def upsert_participant(id) do
    %Participant{} 
    |> Participant.changeset(%{id: id}) 
    |> Repo.insert(
      on_conflict: :nothing,
      conflict_target: [:id]
    )
  end

  def create_run(study_id, params \\ %{}) do
    %Run{}
    |> Run.changeset(Map.put(params, :study_id, study_id))
    |> Repo.insert()
  end

  @doc """
  Creates or updates a record with the given params.
  The params map should contain:
  - :run_id
  - :participant_id
  """
  def create_update(run_id, participant_id) do
    %Update{} 
    |> Update.changeset(%{run_id: run_id, participant_id: participant_id})
    |> Repo.insert()
  end

  def initialize_study(study_id, n_runs) do
    case create_study(study_id) do
      {:error, changeset_error} ->
        {:error, changeset_error}

      {:ok, study} -> 
        Enum.each(1..n_runs, 
          fn _ -> create_run(study.id) 
        end)
        {:ok, study}

      _ -> 
        {:error, "unknown error occurred"}
    end
  end

  # Update functions

  def update_run(%Run{} = run, attrs) do
    run
    |> Run.changeset(attrs)
    |> Repo.update()
  end

  # get functions
  
  def get_all_studies() do
    Repo.all(Local.Schema.Study) 
  end

  def get_all_runs(study_id) do
    from(r in Run,
      where: r.study_id == ^study_id
    )
    |> Repo.all()
    |> Repo.preload([:updates])
  end

  def get_run(nil) do nil end
  def get_run(run_id) do
    from(r in Run,
      where: r.id == ^run_id
    )
    |> Repo.one()
  end

  def get_uncompleted_runs(study_id, participant_id) do
    from(r in Run,
      where: r.study_id == ^study_id,
      left_join: u in Update, on: u.run_id == r.id and u.participant_id == ^participant_id,
      where: is_nil(u.id),  # Ensures there is no matching update record
      select: r.id
    )
    |> Repo.all()
  end

  def is_run_updated_by_participant?(run_id, participant_id) do
    result = from(u in Update,
      where: u.participant_id == ^participant_id and u.run_id == ^run_id,
      select: u.id
    )
    |> Repo.one()

    result != nil
  end

  ## Delete functions

  def delete_study(study_id) do
    from(s in Study,
      where: s.id == ^study_id
    )
    |> Repo.one()
    |> Repo.delete()
  end

  # Export to zip functions

  def export_study_runs(study_id) do
    get_all_runs(study_id) 
    |> create_files(fn x -> x.id <> ".json" end, fn x -> x |> Jason.encode!() end)
    |> create_in_memory_zip(study_id <> "_study.zip")
  end

  def create_files(objects, filename_fun, data_fun) do
    Enum.map(objects, fn o -> {filename_fun.(o), data_fun.(o)} end)
  end

  def create_in_memory_zip(files, filename) do
    zipped_files = Enum.map(files, fn {filename, content} -> 
      {String.to_charlist(filename), content} 
    end)

    {:ok, zip_content} = :zip.zip(filename, zipped_files, [:memory])

    zip_content # {filename, bytes}
  end
end
