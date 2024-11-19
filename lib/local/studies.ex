defmodule MyMutex.Studies do
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

end



# Playground testing code

#MyMutex.Studies.initialize_study("qwe872378", 10)


#MyMutex.Repo.delete_all(MyMutex.Study)
#MyMutex.Repo.all(MyMutex.Run)


#test = fn (id) ->
#  %MyMutex.Study{}
#  |> MyMutex.Study.changeset(%{id: id})
#  |> MyMutex.Repo.insert()
#end
#
#test.("asd")
#
## see how the upsert works
#MyMutex.Studies.upsert_participant("asd")
#MyMutex.Repo.all(MyMutex.Participant)
#
#MyMutex.Studies.create_study("test study", %{description: "yolo"})
#MyMutex.Repo.all(MyMutex.Study)
#
#MyMutex.Studies.create_run("test study")
#MyMutex.Repo.all(MyMutex.Run)
#
#import Ecto.Query
#run = MyMutex.Run |> first() |> MyMutex.Repo.one()
#
##MyMutex.Studies.update_run(run, %{model: "cool_model2"})
#update = %{participant_id: "asd", run_id: run.id}
#MyMutex.Studies.create_update(update)
#
#MyMutex.Studies.get_uncompleted_runs("test study", "asd")
#
#MyMutex.Repo.all(MyMutex.Update)
#
#
#MyMutex.Studies.is_run_updated_by_participant?("14d6365c-6401-4c02-b542-db86ab74626a", "asd")
#MyMutex.Studies.get_run("14d6365c-6401-4c02-b542-db86ab74626a")
#
# cascading works
#MyMutex.Studies.delete_study("test study2")
#MyMutex.Studies.delete_study("test study")
