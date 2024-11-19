defmodule Local.Schema.Study do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  schema "studies" do
    field :description, :string
    has_many :runs, MyMutex.Run
  end

  def changeset(study, params) do
    study
    |> cast(params, [:id, :description])
    |> validate_required([:id])
  end 
end



#study = %MyMutex.Study{}
#changeset = MyMutex.Study.changeset(study, %{id: "asd", description: "test"})
#MyMutex.Repo.insert!(changeset)
#
#study = %MyMutex.Study{}
#changeset = MyMutex.Study.changeset(study, %{id: "qwe"})
#MyMutex.Repo.insert!(changeset)
#
#
#import Ecto.Query
#
#from(s in MyMutex.Study, where: s.id == "asd") 
#  |> MyMutex.Repo.delete_all()
#
#run = %MyMutex.Run{}
#changeset = MyMutex.Run.changeset(run, %{model: "asd", study_id: "asd"})
#MyMutex.Repo.insert!(changeset)
#
#
#run = MyMutex.Repo.get(MyMutex.Study, "asd") |> 
#  MyMutex.Repo.preload(runs: [:updates])
#


