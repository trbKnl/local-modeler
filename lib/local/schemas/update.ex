defmodule Local.Schema.Update do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "updates" do
    belongs_to :run, Local.Schema.Run, foreign_key: :run_id
    belongs_to :participant, Local.Schema.Participant, foreign_key: :participant_id, type: :string
  end

  def changeset(update, attrs) do
    update
    |> Ecto.Changeset.cast(attrs, [:run_id, :participant_id])
    |> Ecto.Changeset.validate_required([:run_id, :participant_id])
    |> Ecto.Changeset.unique_constraint([:participant_id, :run_id],
      name: :updates_run_id_participant_id_index,
      message: "Update for run already done by participant"
    )
    |> Ecto.Changeset.foreign_key_constraint(:run_id)
    |> Ecto.Changeset.foreign_key_constraint(:participant_id)
  end
end
