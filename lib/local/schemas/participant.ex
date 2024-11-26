defmodule Local.Schema.Participant do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  schema "participants" do
    has_many :updates, Local.Schema.Update
  end

  def changeset(participant, params) do
    participant
    |> cast(params, [:id])
    |> validate_required([:id])
  end 
end
