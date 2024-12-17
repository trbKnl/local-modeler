defmodule LocalWeb.LocalPage do
  use LocalWeb, :live_view
  import Phoenix.Component

  alias Local.Studies
  alias Local.Schema.Study

  # CHANGE THE ERRORS BECAUSE FORM ALREADY HAS ERRORS key
  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, 
      new_study: to_form(%{ 
        "errors" => [],
        "n_runs" => 2
      }),
      select_study: to_form(%{
        "studies" => get_all_study_ids(),
        "selected_study" => "",
      }),
      run_information: to_form(%{
        "runs" => nil,
        "selected_run_information" => ""
      })
    )}
  end


  @impl true
  def handle_event("create_study", %{"study_id" => study_id, "n_runs" => n_runs}, socket) do
    updated_socket = handle_study_creation(validate(study_id), study_id, n_runs, socket)
    {:noreply, updated_socket}
  end

  @impl true
  def handle_event("update_n_runs", %{"n_runs" => n_runs}, socket) do
    {:noreply, socket |> do_update_form_params(:new_study, "n_runs", n_runs)}
  end
  
  @impl true
  def handle_event("study_selected", %{"study_select" => study_id}, socket) do
    updated_socket = socket
    |> do_update_form_params(:select_study, "selected_study", study_id)
    |> do_update_form_params(:run_information, "runs", get_all_run_ids(study_id))

    {:noreply, updated_socket}
  end

  @impl true
  def handle_event("run_selected", %{"run_select" => id}, socket) do
    updated_socket = socket
    |> do_update_form_params(:run_information, "selected_run_information", get_run_information(id))

    {:noreply, updated_socket}
  end

  @impl true
  def handle_event("delete_study", %{"value" => id}, socket) do
    Studies.delete_study(id)

    updated_socket = socket
    |> do_update_form_params(:select_study, "studies", get_all_study_ids())
    |> do_update_form_params(:select_study, "selected_study", "")

    {:noreply, updated_socket}
  end

  @impl true
  def handle_event("download_study", %{"value" => id}, socket) do
    IO.puts(id)
    {file_name, content} = Studies.export_study_runs(id)
    File.write(Path.join(get_static_exports_dir(), file_name), content)

    # TDOD: perform some cleanup
    {:noreply, push_event(socket, "download_study", %{uri: Path.join("exports", file_name)})}
  end

  # TODO: decompose this render into multiple small ones, for composability
  @impl true
  def render(assigns) do
      ~H"""
      <!-- Create a new study -->
      <div class="text-2xl font-semibold border-b" >Create a new study</div>
      <.simple_form class="border rounded-lg p-5" for={@new_study} phx-change="update_n_runs" phx-submit="create_study">
        <div class="">Configure a study id</div>
        <.input 
          name="study_id"
          value=""
          type="text"
          placeholder="Choose your study id, stick to lowercase"
          errors={@new_study.errors |> extract_error(:id)}
        />
        <div class="">Select the number of runs your study should have</div>
        <.input 
          name="n_runs"
          value={@new_study.params["n_runs"]}
          type="range"
          min="1"
          max="10"
          class="w-full mb-2"
        />
        <div class="flex justify-between text-sm text-gray-600">
          <span>1</span>
          <span>Current: <%= @new_study.params["n_runs"] %></span>
          <span>10</span>
        </div>
        <.button type="submit" >
          Create Study
        </.button>
      </.simple_form>

      <!-- Study selection -->
      <div class="text-2xl font-semibold border-b mt-10" >Configure and examine an existing study</div>
      <div class="border rounded-lg p-5">
        <.simple_form class="mb-10" for={@select_study} phx-change="study_selected">
          <.input 
            name="study_select"
            value={ nil }
            type="select"
            options={@select_study.params["studies"]}  
            prompt="Select a study"
          />
        </.simple_form>

        <div :if={@select_study.params["selected_study"] != ""}>

          <div class="text-xl font-semibold border-b mb-5" >Download study</div>
          <.button 
            name="download_button"
            phx-click="download_study"
            value={@select_study.params["selected_study"]}
          >
            Download Study
          </.button>

          <div class="text-xl font-semibold border-b mb-5 mt-10" >Delete study</div>
          <.button 
            name="delete_button"
            data-confirm="Are you sure you want to delete this study?" 
            phx-click="delete_study"
            value={@select_study.params["selected_study"]}
          >
            Delete Study
          </.button>

          <!-- Run selection -->
          <div class="text-xl font-semibold border-b mt-10" >Inspect a run</div>
          <.simple_form class="mb-10" for={@run_information} phx-change="run_selected">
            <.input 
              name="run_select"
              value={ nil }
              type="select"
              options={@run_information.params["runs"]}  
              prompt="Select a run"
            />
          <.input
            name="run_information"
            value={ @run_information.params["selected_run_information"] }
            readonly
            type="textarea"
            class="w-full h-48 p-4 border border-gray-300 bg-gray-100 text-gray-700 font-mono overflow-auto whitespace-pre-wrap"
            placeholder="Information about the run will be shown here"
          />
          </.simple_form>
        </div>
      </div>
    """
  end

  # Private functions 

  defp get_all_study_ids do
    Studies.get_all_studies() |> extract_id()
  end

  defp get_all_run_ids(study_id) do
    Studies.get_all_runs(study_id) |> extract_id()
  end

  defp extract_id(map) do
    Enum.map(map, fn x -> x.id end)
  end

  defp get_run_information("") do "" end
  defp get_run_information(id) do
    Studies.get_run(id) |> Jason.encode!()
  end

  defp validate(study_id) do
    Study.changeset(%Study{}, %{id: study_id})
  end

  defp handle_study_creation(%{valid?: true}, study_id, n_runs, socket) do
    case Studies.initialize_study(study_id, String.to_integer(n_runs)) do
      {:ok, _} ->
        socket 
        |> do_update_form_params(:select_study, "studies", get_all_study_ids())
        |> do_update_form(:new_study, :errors, [])
      
      {:error, error_changeset} -> 
        socket 
        |> do_update_form(:new_study, :errors, error_changeset.errors)
    end
  end

  defp handle_study_creation(%{valid?: false} = changeset, _, _, socket) do
    socket 
    |> do_update_form(:new_study, :errors, changeset.errors)
  end

  defp extract_error(errors, key) do
    case Keyword.get(errors, key) do
      nil -> [] 
      {error, _} -> [error]
    end
  end

  defp do_update_form_params(socket, key, nested_key, value) do
    socket 
    |> update(key, fn form ->
      put_in(form.params[nested_key], value)
    end)
  end

  defp do_update_form(socket, key, nested_key, value) do
    IO.inspect(nested_key)
    socket 
    |> update(key, fn form ->
      put_in(form, [Access.key!(nested_key)], value)
    end)
  end

  defp get_static_exports_dir() do
    Path.join(:code.priv_dir(:local), "static/exports")
  end
end

