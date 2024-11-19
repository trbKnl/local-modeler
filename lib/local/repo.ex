defmodule Local.Repo do
  use Ecto.Repo,
    otp_app: :local,
    adapter: Ecto.Adapters.Postgres
end
