package com.kingofsurvive.config;

import com.kingofsurvive.service.GameService;
import com.kingofsurvive.websocket.GameWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private GameService gameService;

    @Bean
    public GameWebSocketHandler gameWebSocketHandler() {
        GameWebSocketHandler handler = new GameWebSocketHandler();
        handler.setGameLoop(gameService.getGameLoop());
        return handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(gameWebSocketHandler(), "/ws/game")
                .setAllowedOrigins("*");
    }
}
