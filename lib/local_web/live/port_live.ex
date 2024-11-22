defmodule LocalWeb.PortPage do
  use LocalWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    socket = assign(socket, 
      url: "http://localhost:4000/uploads/port/build/index.html"
    )
    {:ok, socket}
  end

  # FROM PORT TO PHOENIX

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
    socket
  ) do
    socket |> printer("Here is your model!! Good luck")
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

  # FROM PHOENIX TO PORT

  @impl true
  def handle_event("send_params", _params, socket) do
    socket |> printer("Good Luck with the params!!!")
  end

  @impl true
  def handle_event("send_something_else", _params, socket) do
    {:noreply, push_event(socket, "to_feldspar_event", %{action: "something undefined", data: "asd"})}
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


  defp printer(socket, message) do
    {:noreply, push_event(socket, "to_feldspar_event", %{action: "CommandSystemGetParameters", data: message})}
  end
end

