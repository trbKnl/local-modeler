defmodule MapTransform do
  def remove_structs(x) when is_list(x) do
    Enum.map(x, &remove_structs/1)
  end

  def remove_structs(x) when is_struct(x) do
    remove_structs(Map.from_struct(x))
  end

  def remove_structs(x) when is_map(x) do
    x
    |> Enum.filter(fn {_key, value} -> should_include?(value) end)
    |> Enum.filter(fn {key, _value} -> should_include?(key) end)
    |> Map.new(fn {k, v} ->
      {k, remove_structs(v)}
    end)
  end

  def remove_structs(x) do
    x
  end

  defp should_include?(elem) do
    case elem do
      %Ecto.Association.NotLoaded{} -> false
      :__meta__ -> false
      _ -> true
    end
  end
end
