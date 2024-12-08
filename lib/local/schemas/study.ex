defmodule Local.Schema.Study do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  schema "studies" do
    field :description, :string
    has_many :runs, Local.Schema.Run
  end

  def changeset(study, params) do
    study
    |> cast(params, [:id, :description])
    |> validate_required([:id])
    |> validate_format(:id, ~r/^[a-z]+$/, message: "Must contain only lowercase letters")
    |> unique_constraint([:id],
      name: :studies_pkey,
      message: "Study with that id already exist"
    )
  end 
end

