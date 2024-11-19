defmodule Local.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      LocalWeb.Telemetry,
      Local.Repo,
      {DNSCluster, query: Application.get_env(:local, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Local.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: Local.Finch},
      MutexManager,

      # Start a worker by calling: Local.Worker.start_link(arg)
      # {Local.Worker, arg},
      # Start to serve requests, typically the last entry
      LocalWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Local.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    LocalWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
