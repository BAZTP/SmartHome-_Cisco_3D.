package com.smarthome.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public record ModelLibrary(
    @NotNull @Size(max = 8) Map<String, @Valid Asset> assets,
    @NotNull @Size(max = 20) Map<String, String> devices) {
  public record Asset(
      @NotBlank @Size(max = 100) String name,
      @NotNull @Pattern(regexp = "glb|gltf") String format,
      @NotNull @Size(max = 2796204) String data) {}

  private static final ObjectMapper JSON = new ObjectMapper();

  @JsonIgnore
  @AssertTrue(message = "Biblioteca GLTF inválida o con recursos externos")
  public boolean isValid() {
    if (assets == null || devices == null) return false;
    long total = 0;
    try {
      for (var entry : assets.entrySet()) {
        if (!entry.getKey().matches("[a-zA-Z0-9-]{1,100}")) return false;
        var a = entry.getValue();
        if (a == null || a.data() == null || a.format() == null) return false;
        total += a.data().length();
        if (total > 8 * 1024 * 1024) return false;
        byte[] bytes = Base64.getDecoder().decode(a.data());
        if (bytes.length == 0 || bytes.length > 2 * 1024 * 1024) return false;
        String json;
        if (a.format().equals("glb")) {
          if (bytes.length < 20) return false;
          var header = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
          if (header.getInt() != 0x46546c67
              || header.getInt() != 2
              || header.getInt() != bytes.length) return false;
          int length = header.getInt();
          if (length < 0 || length > bytes.length - 20 || header.getInt() != 0x4e4f534a)
            return false;
          json = new String(bytes, 20, length, StandardCharsets.UTF_8);
        } else if (a.format().equals("gltf")) json = new String(bytes, StandardCharsets.UTF_8);
        else return false;
        JsonNode doc = JSON.readTree(json);
        if (!doc.path("asset").path("version").isTextual()
            || !doc.path("asset").path("version").asText().equals("2.0")
            || !doc.path("meshes").isArray()
            || doc.get("meshes").isEmpty()
            || doc.get("meshes").size() > 256
            || !doc.path("nodes").isArray()
            || doc.get("nodes").size() > 512) return false;
        for (String key : List.of("extensionsUsed", "extensionsRequired"))
          for (var extension : doc.path(key))
            if (!Set.of("KHR_materials_unlit", "KHR_materials_emissive_strength")
                .contains(extension.asText())) return false;
        long count = 0;
        for (var accessor : doc.path("accessors")) {
          if (!accessor.path("count").canConvertToInt() || accessor.path("count").asInt() < 0)
            return false;
          count += accessor.get("count").asInt();
        }
        if (count > 200000 || !safeUris(doc)) return false;
        int[] colors = new int[doc.get("nodes").size()];
        for (int i = 0; i < colors.length; i++)
          if (!visit(doc.get("nodes"), i, colors)) return false;
      }
      for (var id : devices.values()) if (id == null || !assets.containsKey(id)) return false;
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  private static boolean safeUris(JsonNode node) {
    if (node.isObject()) {
      var fields = node.fields();
      while (fields.hasNext()) {
        var field = fields.next();
        if (field.getKey().equals("uri")
            && (!field.getValue().isTextual()
                || !field
                    .getValue()
                    .asText()
                    .matches(
                        "data:(application/(octet-stream|gltf-buffer)|image/(png|jpeg));base64,[A-Za-z0-9+/]+=*")))
          return false;
        if (!safeUris(field.getValue())) return false;
      }
    } else if (node.isArray()) for (var child : node) if (!safeUris(child)) return false;
    return true;
  }

  private static boolean visit(JsonNode nodes, int index, int[] colors) {
    if (index < 0 || index >= colors.length || colors[index] == 1) return false;
    if (colors[index] == 2) return true;
    colors[index] = 1;
    for (var child : nodes.get(index).path("children"))
      if (!child.isIntegralNumber() || !visit(nodes, child.asInt(), colors)) return false;
    colors[index] = 2;
    return true;
  }
}
