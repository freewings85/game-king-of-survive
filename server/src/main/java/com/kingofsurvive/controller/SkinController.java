package com.kingofsurvive.controller;

import com.kingofsurvive.model.SkinInfo;
import com.kingofsurvive.service.SkinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/skins")
public class SkinController {

    @Autowired
    private SkinService skinService;

    @GetMapping
    public ResponseEntity<List<SkinInfo>> getAllSkins() {
        return ResponseEntity.ok(skinService.getAllSkins());
    }

    @GetMapping("/{skinId}")
    public ResponseEntity<SkinInfo> getSkin(@PathVariable String skinId) {
        SkinInfo skin = skinService.getSkin(skinId);
        if (skin == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(skin);
    }
}
