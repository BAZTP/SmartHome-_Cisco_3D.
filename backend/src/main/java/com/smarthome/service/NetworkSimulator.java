package com.smarthome.service;
import com.smarthome.controller.SimulationController.Request;
import com.smarthome.controller.SimulationController.Result;
import java.util.*;
@org.springframework.stereotype.Service
public class NetworkSimulator {
 private Result fail(String message){return new Result(false,message,List.of());}
 private long ip(String value){long n=0;for(String part:value.split("\\."))n=n*256+Integer.parseInt(part);return n;}
 private long mask(int p){return (0xffffffffL << (32-p)) & 0xffffffffL;}
 public Result ping(Request req){
  var n=req.network();var a=n.devices().stream().filter(d->d.id().equals(req.source())).findFirst().orElse(null);var b=n.devices().stream().filter(d->d.ip().equals(req.target())).findFirst().orElse(null);
  if(a==null||!a.on())return fail("Origen apagado o inexistente");if(b==null)return fail("IP de destino desconocida");if(!b.on())return fail("Destino apagado");
  if(n.devices().stream().filter(d->d.ip().equals(a.ip())).count()!=1||n.devices().stream().filter(d->d.ip().equals(b.ip())).count()!=1)return fail("Dirección IP duplicada");
  if((ip(a.ip())&mask(a.prefix()))!=(ip(b.ip())&mask(a.prefix()))||(ip(a.ip())&mask(b.prefix()))!=(ip(b.ip())&mask(b.prefix())))return fail("Subred incompatible; enrutamiento entre subredes aún no disponible");
  var queue=new ArrayDeque<List<String>>();queue.add(List.of(a.id()));var seen=new HashSet<String>();
  while(!queue.isEmpty()){var path=queue.remove();var id=path.getLast();if(id.equals(b.id()))return new Result(true,"Respuesta ICMP virtual · 32 bytes · recorrido verificado",path);if(!seen.add(id))continue;var d=n.devices().stream().filter(v->v.id().equals(id)).findFirst().orElseThrow();if(!d.on()||!id.equals(a.id())&&!d.kind().startsWith("Switch")&&!d.kind().startsWith("Access"))continue;
   for(var l:n.links()){String next=l.a().equals(id)?l.b():l.b().equals(id)?l.a():null;if(next!=null&&!seen.contains(next)&&n.devices().stream().anyMatch(v->v.id().equals(next)&&v.on())){var route=new ArrayList<>(path);route.add(next);queue.add(route);}}
  }return fail("Sin enlace operativo hasta el destino");
 }
}
