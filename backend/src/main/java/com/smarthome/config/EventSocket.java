package com.smarthome.config;

import java.util.concurrent.CopyOnWriteArraySet;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Configuration
@EnableWebSocket
public class EventSocket extends TextWebSocketHandler implements WebSocketConfigurer {
  private final CopyOnWriteArraySet<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

  public void registerWebSocketHandlers(WebSocketHandlerRegistry r) {
    r.addHandler(this, "/ws/events")
        .setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
  }

  public void afterConnectionEstablished(WebSocketSession s) {
    sessions.add(s);
  }

  public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
    sessions.remove(s);
  }

  public void handleTransportError(WebSocketSession s, Throwable error) throws Exception {
    sessions.remove(s);
    s.close();
  }

  public void publish(String event) {
    for (var s : sessions) {
      try {
        synchronized (s) {
          if (s.isOpen()) s.sendMessage(new TextMessage(event));
          else sessions.remove(s);
        }
      } catch (Exception e) {
        sessions.remove(s);
        try {
          s.close();
        } catch (Exception ignored) {
        }
      }
    }
  }
}
