defmodule LocalWeb.PortPage do
  use LocalWeb, :live_view
  alias Local.Schema.Run

  @impl true
  def mount(params, _session, socket) do
      socket = 
        socket
        |> assign(:url, "http://localhost:4000/uploads/port/build/index.html")
        |> assign(:query_params, params)

    {:ok, socket}
  end


  @impl true
  def handle_event(
    "feldspar_event",
    %{"__type__" => "CommandSystemDonate", "json_string" => _}, 
    socket
  ) do
    IO.puts("Donation received")
    {:noreply, socket}
  end

  @impl true
  def handle_event(
        "feldspar_event",
        %{"__type__" => "CommandSystemGetParameters"},
        %{assigns: %{query_params: %{"studyId" => study_id, "participantId" => participant_id}}} = socket
      ) do
    run = LocalModeler.get(study_id, participant_id) |> Jason.encode!()

    send_params(socket, run)
  end

  @impl true
  def handle_event(
        "feldspar_event",
        %{
          "__type__" => "CommandSystemPutParameters",
          "check_value" => check_value,
          "id" => run_id,
          "model" => model,
        } = params,
        %{assigns: %{query_params: %{"studyId" => study_id, "participantId" => participant_id}}} = socket
      ) do

    %Run{id: run_id, model: model, check_value: check_value, study_id: study_id} 
    |> LocalModeler.put(participant_id)

    socket 
    |> send_ack(params["__type__"])
  end

  @impl true
  def handle_event(
      "feldspar_event",
    params,
    socket
  ) do
    IO.inspect("No implementation for feldspar event: #{params["__type__"]}")
    {:noreply, socket}
  end


  @impl true
  def render(assigns) do
    ~H"""
      <button 
        class="bg-red-500 text-white font-bold py-2 px-4 rounded"
        phx-click="send_params"
      >
      </button>
      <button 
        class="bg-blue-500 text-white font-bold py-2 px-4 rounded"
        phx-click="send_something_else"
      >
      </button>
      <div phx-update="ignore" phx-hook="FeldsparApp" id="asd" data-locale={"en"} data-src={@url}>
        <iframe class="w-full outline-none"></iframe>
      </div>
    """
  end


  defp send_params(socket, run) do
    {:noreply, push_event(socket, "to_feldspar_event", %{action: "CommandSystemGetParameters", data: run})}
  end

  defp send_ack(socket, action) do
    {:noreply, push_event(socket, "to_feldspar_event", %{action: action, data: "ok"})}
  end
end

