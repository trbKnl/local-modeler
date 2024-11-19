defmodule Local.Schema.Run do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "runs" do
    field :model, :string
    field :check_value, :string
    belongs_to :study, MyMutex.Study, foreign_key: :study_id, type: :string
    has_many :updates, MyMutex.Update
  end

  def changeset(run, params) do
    run
    |> cast(params, [:model, :check_value, :study_id])
    |> validate_required([:study_id])
    |> foreign_key_constraint(:study_id)
    |> put_change(:check_value, Ecto.UUID.generate())
  end 
end
