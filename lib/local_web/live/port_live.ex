defmodule LocalWeb.PortPage do
  use LocalWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    socket = assign(socket, 
      url: "http://localhost:4000/uploads/port/build/index.html"
    )
    {:ok, socket}
  end

  @impl true
  def handle_event("feldspar_event", _, socket) do
    # Handle the event and update the socket
    {:noreply, push_event(socket, "print", %{message: "foo-bar"})}
  end



  @impl true
  def render(assigns) do
    ~H"""
      <div phx-update="ignore" phx-hook="FeldsparApp" id="asd" data-locale={"en"} data-src={@url}>
        <iframe class="w-full outline-none"></iframe>
      </div>
      <p>Yolo</p>
    """
  end
end

