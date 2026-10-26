package com.smarthome.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record NetworkDto(@NotNull @Size(max=100) List<@Valid Device> devices,@NotNull @Size(max=400) List<@Valid Link> links){
 public record Device(@NotBlank @Size(max=100) String id,@NotBlank @Size(max=60) String name,@NotNull @Pattern(regexp="Router ISR 4321|Switch 2960|Firewall ASA|PC|Laptop|Access Point|Servidor|Cámara IP|Bombilla IoT") String kind,@Min(0) @Max(8) int room,@DecimalMin("-1.8") @DecimalMax("1.8") double x,@DecimalMin("-1.5") @DecimalMax("1.5") double z,double rotation,@NotNull @Pattern(regexp="(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])(?:\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])){3}") String ip,@Min(1) @Max(30) int prefix,boolean on){}
 public record Link(@NotBlank @Size(max=100) String id,@NotBlank String a,@NotBlank String b,@Min(0) @Max(7) int ap,@Min(0) @Max(7) int bp){}
 @com.fasterxml.jackson.annotation.JsonIgnore
 @AssertTrue(message="Enlaces o dispositivos inválidos")
 public boolean isTopologyValid(){if(devices==null||links==null)return false;var ids=new java.util.HashMap<String,Device>();var used=new java.util.HashSet<String>();var lids=new java.util.HashSet<String>();for(var d:devices){if(d==null||ids.put(d.id(),d)!=null||!Double.isFinite(d.rotation()))return false;}for(var l:links){if(l==null)return false;var a=ids.get(l.a());var b=ids.get(l.b());if(a==null||b==null||a==b||!lids.add(l.id())||l.ap()>=ports(a)||l.bp()>=ports(b)||!used.add(l.a()+":"+l.ap())||!used.add(l.b()+":"+l.bp()))return false;}return true;}
 private int ports(Device d){return "Switch 2960".equals(d.kind())?8:"Router ISR 4321".equals(d.kind())?4:"Firewall ASA".equals(d.kind())?2:1;}
}
