defmodule Local.Schema.Update do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "updates" do
    belongs_to :run, Local.Schema.Run, foreign_key: :run_id
    belongs_to :participant, Local.Schema.Participant, foreign_key: :participant_id, type: :string
  end

  def changeset(update, attrs) do
    update
    |> cast(attrs, [:run_id, :participant_id])
    |> validate_required([:run_id, :participant_id])
    |> unique_constraint([:participant_id, :run_id],
      name: :studies_pkey,
      message: "Study with that id already exist"
    )
    |> foreign_key_constraint(:run_id)
    |> foreign_key_constraint(:participant_id)
  end
end
