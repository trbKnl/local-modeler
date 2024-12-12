defmodule Local.Repo.Migrations.CreateLocalModelerTables do
  use Ecto.Migration

  def change do
    create table(:studies, primary_key: false) do
      add :id, :string, primary_key: true
      add :description, :string

      timestamps(default: fragment("NOW()"))
    end

    create table(:runs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :model, :text
      add :check_value, :string, default: fragment("gen_random_uuid()")
      add :study_id, references(:studies, type: :string, on_delete: :delete_all)

      timestamps(default: fragment("NOW()"))
    end

    create table(:participants, primary_key: false) do
      add :id, :string, primary_key: true

      timestamps(default: fragment("NOW()"))
    end

    create table(:updates, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :run_id, references(:runs, type: :binary_id, on_delete: :delete_all)
      add :participant_id, references(:participants, type: :string, on_delete: :nothing)

      timestamps(default: fragment("NOW()"))
    end

    # create unique indices
    create unique_index(:updates, [:run_id, :participant_id])
    create unique_index(:studies, [:id])
  end
end
