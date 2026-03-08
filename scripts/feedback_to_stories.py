#!/usr/bin/env python3
"""
feedback_to_stories.py — AI 玩家反馈 → prd.json 改进任务桥梁

读取 feedback/ 目录下的 AI 玩家报告，根据分数阈值和已有特征
自动生成新的 user stories + 测试文件，追加到 prd.json。

这是 auto-developing 框架中 "Loss → 新训练数据" 的关键环节。
"""
import json
import os
import re
import sys
from datetime import datetime
from typing import Any

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEEDBACK_DIR = os.path.join(PROJECT_ROOT, "feedback")
PRD_FILE = os.path.join(PROJECT_ROOT, "prd.json")
TESTS_DIR = os.path.join(PROJECT_ROOT, "tests")
DEMO_FILE = os.path.join(PROJECT_ROOT, "demo", "survivor.html")


# ── 改进目录：每个条目定义一个可能的游戏改进 ──

IMPROVEMENTS: list[dict[str, Any]] = [
    # ─── 紧张感 (tension) ───
    {
        "id_suffix": "heartbeat",
        "dimension": "tension",
        "threshold": 95,
        "title": "心跳效果：低血量屏幕脉冲",
        "description": "HP<25%时heartBeat脉冲效果：屏幕边缘红色随心跳节奏闪烁(0.8s周期)",
        "check_pattern": r"heartBeat|heartbeat.*timer|heartPulse",
        "test_funcs": [
            ("test_heartbeat_effect",
             "Low HP should trigger heartbeat visual.",
             r"heartBeat|heartbeat|heartPulse|heart.*pulse"),
        ],
    },
    {
        "id_suffix": "last_stand",
        "dimension": "tension",
        "threshold": 95,
        "title": "最后一搏：濒死技能加速",
        "description": "HP<15%时lastStand模式：cooldown-30%+移速+20%，增加翻盘可能",
        "check_pattern": r"lastStand|last_stand|desperateMode",
        "test_funcs": [
            ("test_last_stand",
             "Near death should trigger last stand boost.",
             r"lastStand|last_stand|desperateMode|desperate.*mode"),
        ],
    },
    # ─── 节奏 (pacing) ───
    {
        "id_suffix": "gap_filler",
        "dimension": "pacing",
        "threshold": 95,
        "title": "空窗填充：无击杀自动补怪",
        "description": "noKillTimer超过3秒时在玩家200px范围内生成小怪，消除节奏空窗",
        "check_pattern": r"noKillTimer|gapFiller|gap.*spawn",
        "test_funcs": [
            ("test_gap_filler",
             "Should fill kill gaps with auto-spawned enemies.",
             r"noKillTimer|gapFiller|gap.*spawn|idle.*spawn"),
        ],
    },
    {
        "id_suffix": "wave_breather",
        "dimension": "pacing",
        "threshold": 95,
        "title": "波次喘息：波间短暂安全期",
        "description": "波次切换时waveBreather给2秒安全期(敌人不攻击)，让玩家喘口气",
        "check_pattern": r"waveBreather|wave.*breather|wave.*safe",
        "test_funcs": [
            ("test_wave_breather",
             "Should have brief safe period between waves.",
             r"waveBreather|wave.*breather|wave.*safe|wave.*calm"),
        ],
    },
    # ─── 留存 (retention) ───
    {
        "id_suffix": "daily_modifier",
        "dimension": "retention",
        "threshold": 0,  # always beneficial
        "title": "每日挑战修改器",
        "description": "dailyModifier基于日期种子(双倍速敌/弹幕地狱/巨人模式等)，完成奖励metaCoin",
        "check_pattern": r"dailyModifier|DAILY_MODIFIERS|daily.*modifier",
        "test_funcs": [
            ("test_daily_modifier",
             "Should have daily challenge modifier system.",
             r"dailyModifier|DAILY_MODIFIERS|daily.*modifier"),
            ("test_daily_modifier_variety",
             "Should have multiple modifier types.",
             r"DAILY_MODIFIERS.*name|modifier.*name.*modifier.*name"),
        ],
    },
    {
        "id_suffix": "unlock_progression",
        "dimension": "retention",
        "threshold": 0,
        "title": "解锁进度：成就解锁新角色皮肤",
        "description": "achievementUnlock系统：达成特定成就解锁新角色皮肤/特效颜色",
        "check_pattern": r"achievementUnlock|unlock.*skin|skin.*unlock",
        "test_funcs": [
            ("test_unlock_progression",
             "Should have achievement-based unlocks.",
             r"achievementUnlock|unlock.*skin|unlockable|UNLOCKABLES"),
        ],
    },
    # ─── 病毒传播 (viral) ───
    {
        "id_suffix": "challenge_friend",
        "dimension": "viral",
        "threshold": 0,
        "title": "挑战好友：生成挑战链接",
        "description": "challengeFriend功能：死亡后可生成挑战(目标分数)，好友需超过才算赢",
        "check_pattern": r"challengeFriend|challenge.*friend|friendChallenge",
        "test_funcs": [
            ("test_challenge_friend",
             "Should have friend challenge feature.",
             r"challengeFriend|challenge.*friend|friendChallenge"),
        ],
    },
    # ─── 内容丰富度 ───
    {
        "id_suffix": "elite_variants",
        "dimension": "content",
        "threshold": 0,
        "title": "精英敌人变体：新词缀效果",
        "description": "添加新精英词缀(vampiric吸血/explosive爆炸/summoner召唤)丰富战斗体验",
        "check_pattern": r"vampiric|summoner.*affix|ELITE.*vampiric",
        "test_funcs": [
            ("test_elite_variants",
             "Should have diverse elite enemy affixes.",
             r"vampiric|summoner|explosive.*affix|ELITE.*vampir"),
        ],
    },
    # ─── 平衡性 (balance) ───
    {
        "id_suffix": "defensive_viable",
        "dimension": "balance",
        "threshold": 0,
        "title": "防御流加强：被动回血+荆棘伤害提升",
        "description": "防御类技能加强：shield冷却8s→6s, thorns伤害*1.5, hp_regen效果+50%",
        "check_pattern": r"defensiveBalance|defenseBoost|DEFENSE_BUFF",
        "test_funcs": [
            ("test_defensive_balance",
             "Should have improved defensive viability.",
             r"defensiveBalance|defenseBoost|DEFENSE_BUFF|defense.*buff"),
        ],
    },
    # ─── Phase 2: 爆款关键机制 ───
    {
        "id_suffix": "almost_there",
        "dimension": "retention",
        "threshold": 0,
        "title": "差一点就赢：死亡时展示遗憾信息",
        "description": "almostThere系统：死亡时展示'再坚持N秒就到下一波/Boss/成就'，激发重试欲望",
        "check_pattern": r"almostThere|almost.*there|so.*close",
        "test_funcs": [
            ("test_almost_there",
             "Death screen should show 'almost there' hints.",
             r"almostThere|almost.*there|soClose|so_close"),
        ],
    },
    {
        "id_suffix": "run_recap",
        "dimension": "retention",
        "threshold": 0,
        "title": "局后回顾：高光时刻回放",
        "description": "runRecap统计：死亡时展示本局高光(最大连杀/最大单次伤害/最快升级)",
        "check_pattern": r"runRecap|run_recap|highlightMoment",
        "test_funcs": [
            ("test_run_recap",
             "Should show run highlights after death.",
             r"runRecap|run_recap|highlightMoment|highlight.*moment"),
        ],
    },
    {
        "id_suffix": "next_unlock_preview",
        "dimension": "retention",
        "threshold": 0,
        "title": "下一个解锁预告：进度条提示",
        "description": "nextUnlockPreview：死亡界面展示最接近解锁的成就及进度百分比",
        "check_pattern": r"nextUnlockPreview|next_unlock|unlock.*preview|unlock.*progress",
        "test_funcs": [
            ("test_next_unlock_preview",
             "Should show nearest unlock progress.",
             r"nextUnlockPreview|next_unlock|unlock.*preview|unlock.*progress"),
        ],
    },
    {
        "id_suffix": "screen_shake_juice",
        "dimension": "tension",
        "threshold": 95,
        "title": "打击感强化：更多屏幕震动触发",
        "description": "screenShakeJuice：Boss受击/大范围技能/进化时触发不同强度震动",
        "check_pattern": r"screenShakeJuice|shakeOnBossHit|juicyShake",
        "test_funcs": [
            ("test_screen_shake_juice",
             "Should have enhanced screen shake feedback.",
             r"screenShakeJuice|shakeOnBossHit|juicyShake|shake.*juice"),
        ],
    },
    {
        "id_suffix": "speed_run_timer",
        "dimension": "viral",
        "threshold": 0,
        "title": "速通计时器：最快到达每波的时间",
        "description": "speedRunTimer：记录到达每波的时间，与个人最佳对比，达成新纪录时金色闪烁",
        "check_pattern": r"speedRunTimer|speed_run|speedRun|wave.*best.*time",
        "test_funcs": [
            ("test_speed_run_timer",
             "Should track wave completion times.",
             r"speedRunTimer|speed_run|speedRun|wave.*best.*time"),
        ],
    },
    {
        "id_suffix": "build_name",
        "dimension": "viral",
        "threshold": 0,
        "title": "流派命名：根据技能组合显示流派名称",
        "description": "buildNameSystem：根据当前技能组合自动判断流派(弹幕流/坦克流/速攻流等)并在HUD显示",
        "check_pattern": r"buildNameSystem|BUILD_NAMES|buildName|playstyle.*name",
        "test_funcs": [
            ("test_build_name",
             "Should name player's build based on skills.",
             r"buildNameSystem|BUILD_NAMES|buildName|playstyle.*name"),
        ],
    },
    # ─── Phase 3: 视觉升级（AI视觉玩家反馈驱动）───
    {
        "id_suffix": "gradient_bg",
        "dimension": "visual",
        "threshold": 0,
        "title": "动态渐变背景：星空+星云效果",
        "description": "gradientBackground: 深蓝→紫色渐变背景+闪烁星星粒子+缓慢飘动的星云色块, 替代纯黑背景",
        "check_pattern": r"gradientBackground|gradient.*bg|nebula.*bg|starfield",
        "test_funcs": [
            ("test_gradient_background",
             "Should have colorful gradient background.",
             r"gradientBackground|gradient.*bg|nebula|starfield|drawStarfield"),
        ],
    },
    {
        "id_suffix": "enemy_shapes",
        "dimension": "visual",
        "threshold": 0,
        "title": "敌人形状多样化：三角/方形/星形",
        "description": "enemyShapes: fast=三角形 tank=方形 ranged=菱形 boss=多边形, 每种有独特绘制函数",
        "check_pattern": r"enemyShapes|drawTriangleEnemy|drawSquareEnemy|enemyShape",
        "test_funcs": [
            ("test_enemy_shapes",
             "Should draw enemies with different shapes.",
             r"enemyShapes|drawTriangleEnemy|drawSquareEnemy|enemyShape|triangle.*enemy"),
        ],
    },
    {
        "id_suffix": "glow_projectiles",
        "dimension": "visual",
        "threshold": 0,
        "title": "发光弹幕：光晕+拖尾效果",
        "description": "glowProjectiles: 弹幕带shadowBlur光晕+半透明拖尾, 颜色随技能变化",
        "check_pattern": r"glowProjectile|projectile.*glow|shadowBlur.*proj|projGlow",
        "test_funcs": [
            ("test_glow_projectiles",
             "Should have glowing projectile effects.",
             r"glowProjectile|projectile.*glow|projGlow|shadowBlur.*proj"),
        ],
    },
    {
        "id_suffix": "death_explosion",
        "dimension": "visual",
        "threshold": 0,
        "title": "华丽死亡爆炸：大范围粒子+闪光",
        "description": "deathExplosion: 敌人死亡时大范围彩色粒子爆发+短暂白色闪光+数字飞溅",
        "check_pattern": r"deathExplosion|bigDeathBurst|death.*burst|burstParticles",
        "test_funcs": [
            ("test_death_explosion",
             "Should have flashy death explosion effects.",
             r"deathExplosion|bigDeathBurst|death.*burst|burstParticle"),
        ],
    },
    {
        "id_suffix": "menu_overhaul",
        "dimension": "visual",
        "threshold": 0,
        "title": "菜单视觉升级：角色预览+最佳记录+动画",
        "description": "menuOverhaul: 菜单显示角色3D旋转预览+历史最佳记录+浮动粒子背景+动画标题",
        "check_pattern": r"menuOverhaul|menuCharPreview|drawMenuParticles|animatedTitle",
        "test_funcs": [
            ("test_menu_overhaul",
             "Menu should have character preview and best score.",
             r"menuOverhaul|menuCharPreview|drawMenuParticles|animatedTitle|menu.*preview"),
        ],
    },
    {
        "id_suffix": "levelup_celebration",
        "dimension": "visual",
        "threshold": 0,
        "title": "升级庆祝特效：全屏扩散环+金色闪光",
        "description": "levelUpCelebration: 升级时全屏金色扩散环+短暂时间冻结(0.3s)+闪光, 强化power fantasy",
        "check_pattern": r"levelUpCelebration|levelup.*ring|celebration.*ring",
        "test_funcs": [
            ("test_levelup_celebration",
             "Level-up should have impressive visual celebration.",
             r"levelUpCelebration|levelup.*ring|celebration.*ring|levelUp.*celebration"),
        ],
    },
    # ─── Phase 4: 视觉精细化（AI视觉玩家二次反馈）───
    {
        "id_suffix": "player_detail",
        "dimension": "visual",
        "threshold": 0,
        "title": "角色视觉细节：光环+面部+职业特征",
        "description": "playerDetail: 玩家角色添加外圈光环glow+内部面部细节(眼睛)+职业色彩变化, 让角色有个性",
        "check_pattern": r"playerDetail|drawPlayerFace|playerGlowAura|drawPlayerDetail",
        "test_funcs": [
            ("test_player_detail",
             "Player should have visual detail beyond a plain circle.",
             r"playerDetail|drawPlayerFace|playerGlowAura|drawPlayerDetail|player.*face.*draw"),
        ],
    },
    {
        "id_suffix": "gem_glow",
        "dimension": "visual",
        "threshold": 0,
        "title": "经验宝石发光+脉冲动画",
        "description": "gemGlow: XP宝石添加发光效果+大小脉冲动画+根据价值变色(小=绿 中=蓝 大=紫)",
        "check_pattern": r"gemGlow|gem.*pulse|gem.*glow|drawGemGlow",
        "test_funcs": [
            ("test_gem_glow",
             "XP gems should have glow and pulse animation.",
             r"gemGlow|gem.*pulse|gem.*glow|drawGemGlow"),
        ],
    },
    {
        "id_suffix": "env_decoration",
        "dimension": "visual",
        "threshold": 0,
        "title": "环境装饰物：漂浮碎片+能量漩涡",
        "description": "envDecoration: 添加漂浮环境装饰(能量漩涡/闪光点/小行星碎片), 填充早期空旷感",
        "check_pattern": r"envDecoration|envDebris|floatingDebris|energyWisp",
        "test_funcs": [
            ("test_env_decoration",
             "Should have environmental decorations for visual density.",
             r"envDecoration|envDebris|floatingDebris|energyWisp|environment.*decor"),
        ],
    },
    {
        "id_suffix": "skill_icons",
        "dimension": "visual",
        "threshold": 0,
        "title": "技能卡片图标：emoji+颜色标识",
        "description": "skillIcons: 升级技能选择卡片添加emoji图标和技能类型色带, 提升可读性和吸引力",
        "check_pattern": r"skillIcons|skill.*icon.*draw|skillCardIcon|drawSkillIcon",
        "test_funcs": [
            ("test_skill_icons",
             "Level-up skill cards should have visual icons.",
             r"skillIcons|skill.*icon|skillCardIcon|drawSkillIcon"),
        ],
    },
    # ─── Phase 5: 视觉打磨（视觉分数72→85目标）───
    {
        "id_suffix": "enemy_glow",
        "dimension": "visual",
        "threshold": 0,
        "title": "敌人发光效果：光环+精英脉冲",
        "description": "enemyGlowRing: 所有敌人添加半透明外圈光环, elite/boss有脉冲动画, 增加视觉丰富度",
        "check_pattern": r"enemyGlowRing|enemy.*glow.*ring|drawEnemyGlow",
        "test_funcs": [
            ("test_enemy_glow",
             "Enemies should have glow ring effects.",
             r"enemyGlowRing|enemy.*glow.*ring|drawEnemyGlow"),
        ],
    },
    {
        "id_suffix": "damage_style",
        "dimension": "visual",
        "threshold": 0,
        "title": "伤害数字样式化：颜色+大小+描边",
        "description": "styledDamageNumbers: 伤害数字根据伤害量变色(白=普通,黄=暴击,红=大伤害), 字号随伤害缩放, 描边增加可读性",
        "check_pattern": r"styledDamageNumbers|damage.*style.*color|dmgFontSize|damageFontScale",
        "test_funcs": [
            ("test_damage_style",
             "Damage numbers should be styled by damage type/amount.",
             r"styledDamageNumbers|damage.*style|dmgFontSize|damageFontScale"),
        ],
    },
    {
        "id_suffix": "vignette",
        "dimension": "visual",
        "threshold": 0,
        "title": "画面暗角效果：柔和边缘渐变",
        "description": "screenVignette: 画面四周添加radialGradient暗角, 聚焦视线到中央动作区域",
        "check_pattern": r"screenVignette|vignette.*gradient|drawVignette",
        "test_funcs": [
            ("test_vignette",
             "Screen should have vignette effect for visual framing.",
             r"screenVignette|vignette|drawVignette"),
        ],
    },
    {
        "id_suffix": "wave_banner",
        "dimension": "visual",
        "threshold": 0,
        "title": "波次公告横幅：滑入动画+敌人预览",
        "description": "waveBanner: 新波次开始时显示大字横幅动画(Wave N), 从上方滑入, 2秒后淡出",
        "check_pattern": r"waveBanner|wave.*banner|drawWaveBanner|waveAnnounce",
        "test_funcs": [
            ("test_wave_banner",
             "New waves should have dramatic banner announcement.",
             r"waveBanner|wave.*banner|drawWaveBanner|waveAnnounce"),
        ],
    },
    # ─── Phase 6: 爆款冲刺（AI视觉玩家截图分析驱动）───
    {
        "id_suffix": "early_density",
        "dimension": "viral",
        "threshold": 0,
        "title": "早期敌人密度提升：5秒内满屏战斗",
        "description": "earlySpawnBoost: Wave 1初始生成敌人数翻倍, 基础生成间隔缩短30%, 确保开局5秒内屏幕有8+敌人, 让玩家立刻感受战斗爽快感",
        "check_pattern": r"earlySpawnBoost|early.*spawn.*boost|initialSpawnBurst",
        "test_funcs": [
            ("test_early_density",
             "Early game should spawn more enemies for immediate action.",
             r"earlySpawnBoost|early.*spawn|initialSpawnBurst"),
        ],
    },
    {
        "id_suffix": "mega_combo",
        "dimension": "viral",
        "threshold": 0,
        "title": "超级连杀特效：全屏爆发+慢动作",
        "description": "megaComboDisplay: 10x/25x/50x连杀触发全屏中央大字显示+粒子爆发+短暂慢动作(0.2s), 让连杀成为截图分享的高光时刻",
        "check_pattern": r"megaComboDisplay|mega.*combo|comboSpectacle|bigComboEffect",
        "test_funcs": [
            ("test_mega_combo",
             "High combos should trigger spectacular screen-center effects.",
             r"megaComboDisplay|mega.*combo|comboSpectacle|bigComboEffect"),
        ],
    },
    {
        "id_suffix": "menu_bestscore",
        "dimension": "retention",
        "threshold": 0,
        "title": "菜单最佳记录展示+挑战目标",
        "description": "menuBestScore: 菜单页显示历史最佳分数/最长存活/最高连杀, 以及下一个目标里程碑(差X杀达到下一里程碑), 驱动重玩欲望",
        "check_pattern": r"menuBestScore|bestScoreDisplay|menu.*best.*score|highScore.*menu",
        "test_funcs": [
            ("test_menu_bestscore",
             "Menu should display best scores and progression targets.",
             r"menuBestScore|bestScoreDisplay|menu.*best.*score|highScore.*menu"),
        ],
    },
    {
        "id_suffix": "death_share_card",
        "dimension": "viral",
        "threshold": 0,
        "title": "死亡分享卡片：精美结算+分享按钮",
        "description": "deathShareCard: 死亡后显示精美结算卡片(成绩/连杀/build名称/排名), 带'挑战好友'按钮和格式化分享文案",
        "check_pattern": r"deathShareCard|shareCard|death.*share|shareResultCard",
        "test_funcs": [
            ("test_death_share_card",
             "Death screen should have shareable result card.",
             r"deathShareCard|shareCard|death.*share|shareResultCard"),
        ],
    },
    {
        "id_suffix": "screen_shake_juice",
        "dimension": "viral",
        "threshold": 0,
        "title": "打击感强化：频率震动+击中暂停",
        "description": "hitPauseJuice: 击杀敌人时添加1-2帧hitpause冻结, 增强打击反馈; 多杀时震屏频率和力度递增; crit时特殊闪白效果",
        "check_pattern": r"hitPauseJuice|hitPause|hitFreeze|hit.*pause.*frame",
        "test_funcs": [
            ("test_hit_pause_juice",
             "Kills should have hit-pause freeze frames for impact.",
             r"hitPauseJuice|hitPause|hitFreeze|hit.*pause"),
        ],
    },
    # ─── Phase 7: 病毒突破（截图驱动的精准改进）───
    {
        "id_suffix": "boss_warning",
        "dimension": "viral",
        "threshold": 0,
        "title": "Boss预警：全屏红色警告+震动",
        "description": "bossWarning: Boss波前2秒显示全屏'WARNING'大字+红色闪烁边框+震屏, 制造截图高光时刻和紧张感",
        "check_pattern": r"bossWarning|boss.*warning|BOSS.*WARNING|drawBossWarning",
        "test_funcs": [
            ("test_boss_warning",
             "Boss waves should have dramatic warning splash.",
             r"bossWarning|boss.*warning|BOSS.*WARNING|drawBossWarning"),
        ],
    },
    {
        "id_suffix": "gem_magnet_trail",
        "dimension": "viral",
        "threshold": 0,
        "title": "经验宝石磁铁拖尾：吸附光流效果",
        "description": "gemMagnetTrail: XP宝石被吸引时留下发光拖尾线, 多宝石同时吸附形成华丽光流效果, 增强收集满足感",
        "check_pattern": r"gemMagnetTrail|gem.*magnet.*trail|gem.*attract.*trail|magnetTrail",
        "test_funcs": [
            ("test_gem_magnet_trail",
             "XP gems should leave glowing trails when attracted to player.",
             r"gemMagnetTrail|gem.*magnet.*trail|magnetTrail|gem.*trail"),
        ],
    },
    {
        "id_suffix": "edge_danger",
        "dimension": "viral",
        "threshold": 0,
        "title": "屏幕边缘危险指示器：方向红色箭头",
        "description": "edgeDangerIndicator: 屏幕边缘显示红色箭头/光芒指示屏幕外敌人方向, 敌人越近箭头越大越亮, 增加战术信息和紧迫感",
        "check_pattern": r"edgeDangerIndicator|edge.*danger|offscreen.*indicator|drawEdgeArrow",
        "test_funcs": [
            ("test_edge_danger",
             "Screen edges should indicate off-screen enemy directions.",
             r"edgeDangerIndicator|edge.*danger|offscreen.*indicator|drawEdgeArrow"),
        ],
    },
    {
        "id_suffix": "player_hp_bar",
        "dimension": "visual",
        "threshold": 85,
        "title": "角色脚下HP条：直观血量显示",
        "description": "playerHpBar: 在玩家角色正下方绘制小型HP条(绿→黄→红渐变), 让血量一目了然不用看HUD角落",
        "check_pattern": r"playerHpBar|player.*hp.*bar|drawPlayerHpBar|hpBar.*player",
        "test_funcs": [
            ("test_player_hp_bar",
             "Player should have visible HP bar below character.",
             r"playerHpBar|player.*hp.*bar|drawPlayerHpBar|hpBar.*below"),
        ],
    },
    {
        "id_suffix": "kill_milestone",
        "dimension": "viral",
        "threshold": 0,
        "title": "击杀里程碑庆祝：100/500/1000特效",
        "description": "killMilestone: 累计击杀达100/500/1000时触发独特全屏庆祝(金色文字+粒子烟花+成就音效提示), 不同于combo的即时效果",
        "check_pattern": r"killMilestone|kill.*milestone|KILL_MILESTONES|milestone.*kill",
        "test_funcs": [
            ("test_kill_milestone",
             "Kill count milestones should trigger unique celebrations.",
             r"killMilestone|kill.*milestone|KILL_MILESTONES|milestone.*celebration"),
        ],
    },
    {
        "id_suffix": "proj_trail",
        "dimension": "visual",
        "threshold": 85,
        "title": "弹幕持久拖尾线：高可见度攻击轨迹",
        "description": "projTrailLine: 弹幕飞行时留下半透明拖尾线(3-5帧长度), 让攻击在深色背景上清晰可见, 配合技能颜色变化",
        "check_pattern": r"projTrailLine|proj.*trail.*line|projectile.*trail|drawProjTrail",
        "test_funcs": [
            ("test_proj_trail",
             "Projectiles should leave visible trail lines.",
             r"projTrailLine|proj.*trail|projectile.*trail|drawProjTrail"),
        ],
    },
    {
        "id_suffix": "biome_transition",
        "dimension": "viral",
        "threshold": 0,
        "title": "生态区过渡动画：震撼切换效果",
        "description": "biomeTransition: 进入新生态区时全屏闪白+新生态区名称大字显示+渐变色过渡动画, 让世界变化有仪式感",
        "check_pattern": r"biomeTransition|biome.*transition|drawBiomeTransition|biome.*flash",
        "test_funcs": [
            ("test_biome_transition",
             "Biome changes should have dramatic transition effects.",
             r"biomeTransition|biome.*transition|drawBiomeTransition|biome.*name.*display"),
        ],
    },
    # ─── Phase 8: 截图病毒力冲刺 ───
    {
        "id_suffix": "proj_size_boost",
        "dimension": "viral",
        "threshold": 0,
        "title": "弹幕加大加亮：核心+光圈双层渲染",
        "description": "projSizeBoost: 基础弹幕radius从6→9, 外层光晕从3x→4x半径, 光晕alpha从0.35→0.5, 暴击弹幕额外闪白; 让攻击在截图中清晰可见",
        "check_pattern": r"projSizeBoost|projVisibility|projectile.*size.*boost",
        "test_funcs": [
            ("test_proj_size_boost",
             "Projectiles should be larger and more visible.",
             r"projSizeBoost|projVisibility|projectile.*size.*boost"),
        ],
    },
    {
        "id_suffix": "menu_anim_char",
        "dimension": "viral",
        "threshold": 0,
        "title": "菜单角色动画：呼吸光环+浮动效果",
        "description": "menuAnimChar: 菜单页角色放大2x显示, 带呼吸光环(缓慢脉冲)和上下浮动动画, 背景粒子环绕, 让第一印象更震撼",
        "check_pattern": r"menuAnimChar|menuCharAnim|menu.*char.*float|menu.*breathe",
        "test_funcs": [
            ("test_menu_anim_char",
             "Menu character should have breathing glow and float animation.",
             r"menuAnimChar|menuCharAnim|menu.*char.*float|menu.*breathe"),
        ],
    },
    {
        "id_suffix": "crit_flash",
        "dimension": "viral",
        "threshold": 0,
        "title": "暴击闪光：命中时全屏微闪+特效数字",
        "description": "critFlashEffect: 暴击命中时短暂白色屏闪(0.05s)+伤害数字放大1.5x并显示'CRIT!'前缀, 让暴击有明显视觉反馈",
        "check_pattern": r"critFlashEffect|crit.*flash|critScreenFlash|CRIT.*flash",
        "test_funcs": [
            ("test_crit_flash",
             "Critical hits should trigger visible screen flash.",
             r"critFlashEffect|crit.*flash|critScreenFlash|CRIT.*text"),
        ],
    },
    {
        "id_suffix": "minimap_radar",
        "dimension": "viral",
        "threshold": 0,
        "title": "小地图雷达：敌人分布一览",
        "description": "minimapRadar: 右下角半透明小地图(80x80px), 显示玩家(白点)+敌人(红点)+Boss(大红点)+宝石(绿点), 增加战术深度和信息密度",
        "check_pattern": r"minimapRadar|minimap|drawMinimap|radar.*display",
        "test_funcs": [
            ("test_minimap_radar",
             "Should have minimap showing enemy positions.",
             r"minimapRadar|minimap|drawMinimap|radar.*map"),
        ],
    },
    {
        "id_suffix": "score_popup",
        "dimension": "viral",
        "threshold": 0,
        "title": "分数倍率弹出：连杀倍率实时显示",
        "description": "scoreMultiplierPopup: 连杀时显示当前经验/金币倍率(x1.5/x2/x3)动画弹出, 数字随倍率增大而变大变亮, 激励维持连杀",
        "check_pattern": r"scoreMultiplierPopup|multiplier.*popup|killMultiplier.*display|multiplier.*show",
        "test_funcs": [
            ("test_score_popup",
             "Kill multiplier should have visible popup display.",
             r"scoreMultiplierPopup|multiplier.*popup|killMultiplier.*display|multiplier.*anim"),
        ],
    },
    # ─── Phase 9: 分享爆发力（viral readiness 82→90+）───
    {
        "id_suffix": "share_card_art",
        "dimension": "viral",
        "threshold": 0,
        "title": "分享卡片背景艺术：渐变+星空+角色剪影",
        "description": "shareCardArt: 死亡分享卡片添加渐变背景(与当前生态区配色)+星星粒子+玩家角色剪影, 让截图更有视觉冲击力",
        "check_pattern": r"shareCardArt|shareCard.*gradient|shareCard.*bg|card.*starfield",
        "test_funcs": [
            ("test_share_card_art",
             "Share card should have gradient background art.",
             r"shareCardArt|shareCard.*gradient|card.*bg.*grad|card.*starfield"),
        ],
    },
    {
        "id_suffix": "new_record_firework",
        "dimension": "viral",
        "threshold": 0,
        "title": "新纪录烟花：打破记录时粒子庆祝",
        "description": "newRecordFirework: 打破个人最佳时触发多轮彩色粒子烟花+金色文字放大缩小动画+'NEW RECORD!'持续闪烁3秒",
        "check_pattern": r"newRecordFirework|record.*firework|new.*record.*particle|recordCelebration",
        "test_funcs": [
            ("test_new_record_firework",
             "New records should trigger firework particle celebration.",
             r"newRecordFirework|record.*firework|recordCelebration|new.*record.*emit"),
        ],
    },
    {
        "id_suffix": "death_bg_anim",
        "dimension": "viral",
        "threshold": 0,
        "title": "死亡屏幕动态背景：粒子+慢动作残影",
        "description": "deathBgAnim: 死亡时游戏画面不完全冻结——背景粒子慢速飘动+最后位置的敌人慢慢消散, 创造电影感死亡场景",
        "check_pattern": r"deathBgAnim|death.*bg.*anim|death.*slow.*particle|deathSceneEffect",
        "test_funcs": [
            ("test_death_bg_anim",
             "Death screen should have animated background effects.",
             r"deathBgAnim|death.*bg.*anim|deathSceneEffect|death.*particle.*slow"),
        ],
    },
    {
        "id_suffix": "streak_flame",
        "dimension": "viral",
        "threshold": 0,
        "title": "连杀火焰光环：高连杀时角色燃烧特效",
        "description": "streakFlameAura: 连杀>=15时角色周围出现火焰粒子光环, >=30时火焰变大变亮+颜色偏蓝, 让高连杀有视觉回报",
        "check_pattern": r"streakFlameAura|streak.*flame|killStreak.*flame|streakFire",
        "test_funcs": [
            ("test_streak_flame",
             "High kill streaks should show flame aura around player.",
             r"streakFlameAura|streak.*flame|streakFire|killStreak.*fire"),
        ],
    },
    {
        "id_suffix": "evolve_cutscene",
        "dimension": "viral",
        "threshold": 0,
        "title": "技能进化演出：短暂全屏特写+技能名称",
        "description": "evolveCutscene: 技能进化时短暂(0.5s)暗幕+技能图标放大居中+进化名称金色大字+光束粒子, 让进化成为高光时刻",
        "check_pattern": r"evolveCutscene|evolve.*cutscene|evolution.*scene|evoDisplay",
        "test_funcs": [
            ("test_evolve_cutscene",
             "Skill evolution should trigger dramatic cutscene display.",
             r"evolveCutscene|evolve.*cutscene|evolution.*scene|evoDisplay|evo.*announce"),
        ],
    },
    # ─── Phase 10: 留存+社交（viral 82→90, retention 80→85）───
    {
        "id_suffix": "endless_scaling",
        "dimension": "retention",
        "threshold": 0,
        "title": "无尽挑战：超越波次15后指数难度",
        "description": "endlessScaling: 波次15+后添加新敌人类型(teleporter闪现怪/healer治疗怪), 每5波增加新词缀组合, BOSS每次出现多一个技能, 保证老玩家有持续挑战",
        "check_pattern": r"endlessScaling|endless.*scale|teleporter.*enemy|healer.*enemy",
        "test_funcs": [
            ("test_endless_scaling",
             "Late game should introduce new enemy types and challenges.",
             r"endlessScaling|endless.*scale|teleporter|healer.*enemy|endgame.*enemy"),
        ],
    },
    {
        "id_suffix": "prestige_system",
        "dimension": "retention",
        "threshold": 0,
        "title": "声望系统：累计成就解锁永久被动",
        "description": "prestigeSystem: 每局获得的金币可在主菜单购买永久被动加成(+5%伤害/+10HP/+10%暴击率), 最多10级, 创造长期进度感",
        "check_pattern": r"prestigeSystem|prestige.*upgrade|permanent.*buff|prestige.*level",
        "test_funcs": [
            ("test_prestige_system",
             "Should have permanent progression upgrades between runs.",
             r"prestigeSystem|prestige.*upgrade|permanent.*buff|META_UPGRADES.*name"),
        ],
    },
    {
        "id_suffix": "weekly_boss",
        "dimension": "retention",
        "threshold": 0,
        "title": "周挑战Boss：每周特殊Boss+专属奖励",
        "description": "weeklyBoss: 基于周数种子的特殊Boss(独特技能模式+弹幕图案), 击败给weeklyReward标记, 激励周回",
        "check_pattern": r"weeklyBoss|weekly.*boss|WEEKLY_BOSS|weeklyChallengeBoss",
        "test_funcs": [
            ("test_weekly_boss",
             "Should have weekly rotating challenge boss.",
             r"weeklyBoss|weekly.*boss|WEEKLY_BOSS|weeklyChallenge"),
        ],
    },
    {
        "id_suffix": "replay_ghost",
        "dimension": "viral",
        "threshold": 0,
        "title": "幽灵回放：死亡后展示最佳路径对比",
        "description": "replayGhost: 记录每局玩家移动轨迹, 死亡后可选择观看'最佳一局'路径回放(半透明幽灵), 激励改进并提供可分享内容",
        "check_pattern": r"replayGhost|replay.*ghost|ghost.*replay|pathReplay",
        "test_funcs": [
            ("test_replay_ghost",
             "Should have ghost replay of best run.",
             r"replayGhost|replay.*ghost|pathReplay|ghost.*path"),
        ],
    },
    {
        "id_suffix": "taunt_system",
        "dimension": "viral",
        "threshold": 0,
        "title": "嘲讽文案系统：分享时动态挑战语",
        "description": "tauntSystem: 死亡分享卡根据成绩等级动态生成不同挑战文案(S级:'不服来战!'→D级:'至少我试过了...'), 增加社交传播趣味性",
        "check_pattern": r"tauntSystem|TAUNT_MESSAGES|taunt.*text|share.*taunt",
        "test_funcs": [
            ("test_taunt_system",
             "Share card should have dynamic taunt messages based on grade.",
             r"tauntSystem|TAUNT_MESSAGES|taunt.*grade|share.*taunt"),
        ],
    },
    # ─── Phase 11: 手感打磨（gameplay feel polish）───
    {
        "id_suffix": "time_slow_kill",
        "dimension": "viral",
        "threshold": 0,
        "title": "击杀慢动作：大量击杀时短暂时间减速",
        "description": "timeSlowOnMassKill: 同时击杀3+敌人时触发0.15s慢动作(timeScale=0.3), 让爆发瞬间更有电影感, 配合粒子效果更华丽",
        "check_pattern": r"timeSlowOnMassKill|massKill.*slow|killTimeSlow|slowMotion.*kill",
        "test_funcs": [
            ("test_time_slow_kill",
             "Mass kills should trigger brief slow-motion effect.",
             r"timeSlowOnMassKill|massKill.*slow|killTimeSlow|slowMotion.*mass"),
        ],
    },
    {
        "id_suffix": "screen_tint_biome",
        "dimension": "visual",
        "threshold": 90,
        "title": "生态区色调滤镜：全屏颜色渲染",
        "description": "biomeTintOverlay: 每个生态区添加半透明色调滤镜(森林=绿/熔岩=橙/深渊=紫/虚空=暗红), 增强沉浸感和截图色调统一性",
        "check_pattern": r"biomeTintOverlay|biome.*tint|biome.*color.*overlay|drawBiomeTint",
        "test_funcs": [
            ("test_screen_tint_biome",
             "Each biome should have a color tint overlay.",
             r"biomeTintOverlay|biome.*tint|drawBiomeTint|biome.*overlay"),
        ],
    },
    {
        "id_suffix": "xp_bar_glow",
        "dimension": "visual",
        "threshold": 90,
        "title": "经验条发光脉冲：接近升级时闪烁提示",
        "description": "xpBarGlow: 经验条接近满(>80%)时外圈发光脉冲, 满时金色闪烁, 让升级时机有明确视觉预期",
        "check_pattern": r"xpBarGlow|xp.*bar.*glow|levelUp.*bar.*pulse|xp.*pulse.*bar",
        "test_funcs": [
            ("test_xp_bar_glow",
             "XP bar should glow when close to level-up.",
             r"xpBarGlow|xp.*bar.*glow|xp.*pulse|levelUp.*bar.*glow"),
        ],
    },
    {
        "id_suffix": "enemy_spawn_anim",
        "dimension": "visual",
        "threshold": 90,
        "title": "敌人出生动画：从小到大缩放+闪光",
        "description": "enemySpawnAnim: 敌人生成时从0缩放到正常大小(0.3s)+短暂白色闪光, 而非突然出现, 让战场变化更有节奏感",
        "check_pattern": r"enemySpawnAnim|spawn.*scale|spawnAlpha|enemy.*spawn.*anim",
        "test_funcs": [
            ("test_enemy_spawn_anim",
             "Enemies should have spawn animation instead of appearing instantly.",
             r"enemySpawnAnim|spawn.*scale|spawnAlpha|spawnAnimation"),
        ],
    },
    # ─── Phase 12: 密度爆炸 — 真正的弹幕地狱（对标 Vampire Survivors）───
    {
        "id_suffix": "swarm_density",
        "dimension": "viral",
        "threshold": 0,
        "title": "怪物海洋：大幅增加敌人数量上限",
        "description": "swarmDensity: 基础生成数从7+wave*4提升到12+wave*6, 上限从50提升到120, trickle间隔减半, 让中后期屏幕充满敌人形成'怪物海洋'视觉",
        "check_pattern": r"swarmDensity|swarm.*density|MAX_ENEMIES.*1[0-9][0-9]|enemy.*cap.*1[0-9][0-9]",
        "test_funcs": [
            ("test_swarm_density",
             "Late game should have massive enemy swarms on screen.",
             r"swarmDensity|swarm.*density|enemy.*cap.*[89]\d|MAX_ENTITIES"),
        ],
    },
    {
        "id_suffix": "aoe_sweep",
        "dimension": "viral",
        "threshold": 0,
        "title": "范围横扫特效：大量击杀时扇形冲击波",
        "description": "aoeSweepEffect: 单次攻击命中5+敌人时触发扇形冲击波视觉效果(弧形白光+粒子扩散), 让AOE攻击有华丽的视觉回报",
        "check_pattern": r"aoeSweepEffect|aoe.*sweep|sweepWave|aoeVisual",
        "test_funcs": [
            ("test_aoe_sweep",
             "Multi-hit attacks should create visual sweep wave.",
             r"aoeSweepEffect|aoe.*sweep|sweepWave|aoeVisual"),
        ],
    },
    {
        "id_suffix": "chain_visual",
        "dimension": "viral",
        "threshold": 0,
        "title": "连锁闪电可视化：敌人间跳跃光弧",
        "description": "chainLightningVisual: 连锁闪电击中时绘制发光弧线连接被击中的敌人(闪烁+渐细), 让连锁效果看起来像真正的闪电",
        "check_pattern": r"chainLightningVisual|chain.*arc|lightning.*arc|drawChainArc",
        "test_funcs": [
            ("test_chain_visual",
             "Chain lightning should show visible arcs between enemies.",
             r"chainLightningVisual|chain.*arc|lightning.*arc|drawChainArc|chain.*visual"),
        ],
    },
    {
        "id_suffix": "orbit_ring_visual",
        "dimension": "viral",
        "threshold": 0,
        "title": "环绕球轨道线：发光轨迹环",
        "description": "orbitRingVisual: 环绕球飞行时绘制半透明轨道环线+球体拖尾粒子, 让轨道攻击形成华丽的光环效果",
        "check_pattern": r"orbitRingVisual|orbit.*ring.*line|orbit.*trail.*ring|drawOrbitRing",
        "test_funcs": [
            ("test_orbit_ring_visual",
             "Orbit skill should show visible ring trail.",
             r"orbitRingVisual|orbit.*ring|orbit.*trail.*ring|drawOrbitRing"),
        ],
    },
    {
        "id_suffix": "screen_nuke",
        "dimension": "viral",
        "threshold": 0,
        "title": "屏幕核弹：终极技能全屏清场特效",
        "description": "screenNukeEffect: 终极技能释放时全屏白色闪光+从中心扩散的冲击波环+所有敌人同时爆炸+大量粒子, 创造'核弹级'视觉高潮",
        "check_pattern": r"screenNukeEffect|screen.*nuke|nukeWave|ult.*nuke|nuke.*effect",
        "test_funcs": [
            ("test_screen_nuke",
             "Ultimate skill should create massive screen-clearing nuke effect.",
             r"screenNukeEffect|screen.*nuke|nukeWave|nuke.*effect|ult.*blast"),
        ],
    },
    # ─── Phase 13: 第一印象+高光密度（开局5秒决定一切）───
    {
        "id_suffix": "instant_action",
        "dimension": "viral",
        "threshold": 0,
        "title": "即时行动：跳过前摇直接战斗",
        "description": "instantAction: 选完角色后0.5秒内就有敌人到达攻击范围，技能自动攻击无需等待，确保前3秒就有击杀和粒子爆发",
        "check_pattern": r"instantAction|instant.*action|immediate.*combat|firstKill.*fast",
        "test_funcs": [
            ("test_instant_action",
             "Game should start combat immediately after character select.",
             r"instantAction|instant.*action|immediate.*combat|firstKillTimer"),
        ],
    },
    {
        "id_suffix": "afterimage_dash",
        "dimension": "viral",
        "threshold": 0,
        "title": "移动残影：高速移动时半透明分身拖尾",
        "description": "afterimageDash: 玩家移动速度超过阈值时留下3-5个半透明残影(逐渐缩小消失), 让移动本身也有视觉华丽感",
        "check_pattern": r"afterimageDash|afterimage|player.*trail.*ghost|dashAfterimage",
        "test_funcs": [
            ("test_afterimage_dash",
             "Fast movement should create afterimage trail effect.",
             r"afterimageDash|afterimage|player.*ghost.*trail|dashAfterimage"),
        ],
    },
    {
        "id_suffix": "near_miss",
        "dimension": "viral",
        "threshold": 0,
        "title": "擦弹奖励：近距离闪避得分加成",
        "description": "nearMissBonus: 敌人经过玩家5px范围内但没碰到时触发'CLOSE!'文字+短暂金色闪光+额外经验, 鼓励冒险操作",
        "check_pattern": r"nearMissBonus|near.*miss|closeDodge|dodge.*bonus",
        "test_funcs": [
            ("test_near_miss",
             "Near misses should reward the player with bonus XP.",
             r"nearMissBonus|near.*miss|closeDodge|dodge.*bonus|CLOSE.*text"),
        ],
    },
    {
        "id_suffix": "skill_card_anim",
        "dimension": "viral",
        "threshold": 0,
        "title": "技能卡片滑入动画：选择界面华丽展开",
        "description": "skillCardAnim: 升级时技能卡片从屏幕外滑入(左中右三方向, 带弹性缓动), 选中后未选卡片向外飞出消失, 让选择过程也是视觉享受",
        "check_pattern": r"skillCardAnim|card.*slide.*in|cardEntrance|skill.*card.*enter",
        "test_funcs": [
            ("test_skill_card_anim",
             "Skill selection cards should have slide-in animation.",
             r"skillCardAnim|card.*slide|cardEntrance|skill.*card.*anim"),
        ],
    },
    {
        "id_suffix": "score_ticker",
        "dimension": "viral",
        "threshold": 0,
        "title": "分数滚动计数器：数字逐位递增动画",
        "description": "scoreTicker: 分数/击杀数变化时数字从旧值逐帧递增到新值(而非跳变), 大额变化加速滚动, 让每次得分都有满足感",
        "check_pattern": r"scoreTicker|score.*ticker|score.*roll|displayScore.*lerp",
        "test_funcs": [
            ("test_score_ticker",
             "Score display should animate counting up.",
             r"scoreTicker|score.*ticker|score.*roll|displayScore.*lerp|score.*animate"),
        ],
    },
    {
        "id_suffix": "death_rewind",
        "dimension": "viral",
        "threshold": 0,
        "title": "死亡倒放：最后3秒慢动作回放",
        "description": "deathRewind: 死亡时播放最后3秒的慢动作倒带效果(画面缩放+色调变灰+时间倒流文字), 创造电影感死亡体验",
        "check_pattern": r"deathRewind|death.*rewind|death.*slowmo|lastMoments",
        "test_funcs": [
            ("test_death_rewind",
             "Death should have a dramatic slow-motion rewind effect.",
             r"deathRewind|death.*rewind|death.*slowmo|lastMoments|death.*replay"),
        ],
    },
    {
        "id_suffix": "env_hazards",
        "dimension": "content",
        "threshold": 0,
        "title": "环境危险区：地面陷阱+毒圈收缩",
        "description": "envHazards: 随机出现地面危险区(红色警告圈→爆炸/毒雾区域), 后期出现逐渐收缩的安全区边界, 增加空间压力和走位深度",
        "check_pattern": r"envHazards|hazardZone|ground.*trap|danger.*zone|ENV_HAZARDS",
        "test_funcs": [
            ("test_env_hazards",
             "Should have environmental hazard zones on the ground.",
             r"envHazards|hazardZone|ground.*trap|danger.*zone|ENV_HAZARDS"),
        ],
    },
    {
        "id_suffix": "combo_text_variety",
        "dimension": "viral",
        "threshold": 0,
        "title": "连击文字花样：不同连击数不同动画风格",
        "description": "comboTextVariety: 5x=放大弹出 10x=彩虹色旋转 25x=全屏居中+震屏 50x=金色+粒子爆发+慢动作, 让每个连击里程碑都有独特的视觉签名",
        "check_pattern": r"comboTextVariety|combo.*text.*style|comboMilestoneStyle|COMBO_STYLES",
        "test_funcs": [
            ("test_combo_text_variety",
             "Different combo milestones should have distinct visual styles.",
             r"comboTextVariety|combo.*text.*style|COMBO_STYLES|comboMilestone.*visual"),
        ],
    },
    # ─── Phase 14: 社交病毒力冲刺（viral readiness 85→95）───
    {
        "id_suffix": "screenshot_mode",
        "dimension": "viral",
        "threshold": 0,
        "title": "截图模式：一键隐藏UI拍美图",
        "description": "screenshotMode: 暂停时可切换'截图模式'隐藏所有HUD/UI, 只保留角色和战场, 方便玩家截取分享美图",
        "check_pattern": r"screenshotMode|screenshot.*mode|hideUI.*screenshot|cleanScreenshot",
        "test_funcs": [
            ("test_screenshot_mode",
             "Should have screenshot mode that hides UI.",
             r"screenshotMode|screenshot.*mode|hideUI|cleanScreenshot"),
        ],
    },
    {
        "id_suffix": "dynamic_music_cue",
        "dimension": "viral",
        "threshold": 0,
        "title": "动态音乐提示：危险时画面节奏变化",
        "description": "dynamicMusicCue: 用视觉节拍模拟音乐——低HP时屏幕边缘按BPM脉冲, Boss战时背景色周期闪烁, 高连杀时粒子跟随节奏爆发",
        "check_pattern": r"dynamicMusicCue|music.*cue|bpm.*pulse|rhythmVisual|beat.*sync",
        "test_funcs": [
            ("test_dynamic_music_cue",
             "Game should have rhythm-synced visual cues.",
             r"dynamicMusicCue|music.*cue|bpm.*pulse|rhythmVisual|beat.*sync"),
        ],
    },
    {
        "id_suffix": "grade_animation",
        "dimension": "viral",
        "threshold": 0,
        "title": "评级动画：死亡时等级逐步揭晓",
        "description": "gradeAnimation: 死亡后评级不直接显示, 而是从D→C→B→A→S逐级翻转揭晓(抽卡感), 最终等级停留时放大+粒子庆祝",
        "check_pattern": r"gradeAnimation|grade.*reveal|grade.*flip|ratingReveal",
        "test_funcs": [
            ("test_grade_animation",
             "Death grade should have dramatic reveal animation.",
             r"gradeAnimation|grade.*reveal|grade.*flip|ratingReveal|grade.*anim"),
        ],
    },
    {
        "id_suffix": "achievement_popup",
        "dimension": "viral",
        "threshold": 0,
        "title": "成就弹出动画：游戏内即时通知",
        "description": "achievementPopup: 达成成就时屏幕顶部滑出金色横幅(成就图标+名称+描述), 2秒后滑出, 不打断游戏但有明显反馈",
        "check_pattern": r"achievementPopup|achievement.*banner|achieveNotify|drawAchievementPopup",
        "test_funcs": [
            ("test_achievement_popup",
             "Achievements should trigger in-game popup notification.",
             r"achievementPopup|achievement.*banner|achieveNotify|drawAchievementPopup"),
        ],
    },
    # ─── Phase 15: 视觉冲击顶峰（从95→98 Visual / 89→95 Viral）───
    {
        "id_suffix": "player_power_glow",
        "dimension": "viral",
        "threshold": 0,
        "title": "角色等级光环：随等级增强的可见力量感",
        "description": "playerPowerGlow: 角色外圈光环随等级增大(Lv.1=微弱, Lv.10=明显, Lv.20=华丽光柱), 颜色从蓝→紫→金, 让截图中一眼看出角色有多强",
        "check_pattern": r"playerPowerGlow|power.*glow.*level|levelGlow|powerAura.*scale",
        "test_funcs": [
            ("test_player_power_glow",
             "Player aura should scale with level for visible power progression.",
             r"playerPowerGlow|power.*glow.*level|levelGlow|powerAura"),
        ],
    },
    {
        "id_suffix": "loot_beam",
        "dimension": "viral",
        "threshold": 0,
        "title": "稀有掉落光柱：宝箱/金币带天光指引",
        "description": "lootBeam: 宝箱和高价值XP宝石上方绘制细长光柱(从物品到屏幕顶部), 颜色匹配稀有度, 让稀有掉落一眼可见",
        "check_pattern": r"lootBeam|loot.*beam|treasure.*beam|drawLootBeam|light.*pillar",
        "test_funcs": [
            ("test_loot_beam",
             "Rare drops should have visible light beam effect.",
             r"lootBeam|loot.*beam|treasure.*beam|drawLootBeam|light.*pillar"),
        ],
    },
    {
        "id_suffix": "dmg_number_shower",
        "dimension": "viral",
        "threshold": 0,
        "title": "伤害数字雨：AOE多个小数字同时飞出",
        "description": "dmgNumberShower: AOE攻击命中多个敌人时每个敌人同时弹出伤害数字, 形成'数字雨'视觉效果, 而非单个大数字",
        "check_pattern": r"dmgNumberShower|damage.*shower|numberRain|multiDmgFloat",
        "test_funcs": [
            ("test_dmg_number_shower",
             "AOE hits should show multiple simultaneous damage numbers.",
             r"dmgNumberShower|damage.*shower|numberRain|multiDmgFloat"),
        ],
    },
    {
        "id_suffix": "power_surge",
        "dimension": "viral",
        "threshold": 0,
        "title": "技能获取冲击波：选技能后短暂全身发光",
        "description": "powerSurgeEffect: 选择技能后角色短暂(0.5s)全身白色发光+向外扩散能量环, 视觉强化'变强了'的感觉",
        "check_pattern": r"powerSurgeEffect|power.*surge|skillPickFlash|pickupGlow",
        "test_funcs": [
            ("test_power_surge",
             "Picking skills should create visual power surge effect.",
             r"powerSurgeEffect|power.*surge|skillPickFlash|pickupGlow"),
        ],
    },
    {
        "id_suffix": "auto_highlight",
        "dimension": "viral",
        "threshold": 0,
        "title": "自动高光检测：精彩时刻标记分享",
        "description": "autoHighlight: 检测精彩时刻(首次进化/大连杀/Boss击杀/新纪录)并标记, 死亡分享卡上显示本局高光时刻列表",
        "check_pattern": r"autoHighlight|highlight.*detect|spectacularMoment|HIGHLIGHT_EVENTS",
        "test_funcs": [
            ("test_auto_highlight",
             "Game should detect and mark spectacular moments for sharing.",
             r"autoHighlight|highlight.*detect|spectacularMoment|HIGHLIGHT_EVENTS"),
        ],
    },
    {
        "id_suffix": "aurora_bg",
        "dimension": "viral",
        "threshold": 0,
        "title": "极光背景：流动的彩色光带",
        "description": "auroraBackground: 背景添加缓慢流动的极光光带(2-3条sin波彩色半透明带), 随生态区变色, 大幅提升截图的'壁纸级'美感",
        "check_pattern": r"auroraBackground|aurora.*band|drawAurora|aurora.*wave",
        "test_funcs": [
            ("test_aurora_bg",
             "Background should have flowing aurora light bands.",
             r"auroraBackground|aurora.*band|drawAurora|aurora.*wave"),
        ],
    },
    # ─── Phase 16: 社交裂变最后一公里（viral readiness 95→100）───
    {
        "id_suffix": "share_replay_gif",
        "dimension": "viral",
        "threshold": 0,
        "title": "精彩回放数据：记录高光帧序列",
        "description": "shareReplayData: 在高光时刻(大连杀/Boss击杀)记录5秒位置帧数据, 死亡时可在分享卡上展示'最佳时刻'的路径+敌人轨迹",
        "check_pattern": r"shareReplayData|replay.*frame|highlight.*record|replayBuffer",
        "test_funcs": [
            ("test_share_replay_data",
             "Should record highlight moment frame data for replay.",
             r"shareReplayData|replay.*frame|highlight.*record|replayBuffer"),
        ],
    },
    {
        "id_suffix": "streak_counter_persist",
        "dimension": "retention",
        "threshold": 0,
        "title": "连续游戏记录：跨局连胜/天数追踪",
        "description": "streakCounterPersist: 追踪连续游玩天数和连续达到特定目标(如Wave 5+)的次数, 菜单显示'连续X天'徽章",
        "check_pattern": r"streakCounterPersist|play.*streak|daily.*streak|consecutiveDays",
        "test_funcs": [
            ("test_streak_counter_persist",
             "Should track consecutive play streaks across sessions.",
             r"streakCounterPersist|play.*streak|daily.*streak|consecutiveDays"),
        ],
    },
    {
        "id_suffix": "enemy_death_variety",
        "dimension": "viral",
        "threshold": 0,
        "title": "敌人死亡多样化：不同敌人不同消亡动画",
        "description": "enemyDeathVariety: fast敌人=快速碎裂 tank=慢速崩塌+大量碎片 boss=多阶段爆炸+震屏 ranged=内爆, 让每种击杀都有独特手感",
        "check_pattern": r"enemyDeathVariety|death.*type.*anim|deathStyle.*fast|deathAnim.*boss",
        "test_funcs": [
            ("test_enemy_death_variety",
             "Different enemy types should have distinct death animations.",
             r"enemyDeathVariety|death.*type|deathStyle|deathAnim.*type"),
        ],
    },
    {
        "id_suffix": "color_theme_sync",
        "dimension": "viral",
        "threshold": 0,
        "title": "全局配色同步：弹幕/粒子跟随生态区配色",
        "description": "colorThemeSync: 弹幕颜色、粒子颜色、UI强调色跟随当前生态区主题色变化, 让每张截图有统一的色调美学",
        "check_pattern": r"colorThemeSync|theme.*color.*sync|biome.*proj.*color|projectile.*biome",
        "test_funcs": [
            ("test_color_theme_sync",
             "Projectile and particle colors should sync with biome theme.",
             r"colorThemeSync|theme.*color|biome.*proj|projectile.*biome.*color"),
        ],
    },
    # ─── Phase 17: 精品打磨（Visual 96→99, Viral 91→95）───
    {
        "id_suffix": "tutorial_auto_dismiss",
        "dimension": "viral",
        "threshold": 0,
        "title": "教程自动关闭：首次击杀后立即消失",
        "description": "tutorialAutoDismiss: 教程在首次击杀敌人后立即消失(而非等5秒), 让早期截图不被教程文字遮挡",
        "check_pattern": r"tutorialAutoDismiss|tutorial.*auto.*dismiss|tutorial.*first.*kill|dismissTutorial",
        "test_funcs": [
            ("test_tutorial_auto_dismiss",
             "Tutorial should auto-dismiss on first kill.",
             r"tutorialAutoDismiss|tutorial.*dismiss|dismissTutorial|tutorialDone.*kill"),
        ],
    },
    {
        "id_suffix": "particle_shape_variety",
        "dimension": "viral",
        "threshold": 0,
        "title": "粒子形状多样化：星形/菱形/十字替代纯圆",
        "description": "particleShapeVariety: 30%粒子用星形/菱形/十字替代圆形, 不同效果用不同形状(击杀=星, 升级=菱形, 暴击=十字)",
        "check_pattern": r"particleShapeVariety|particle.*shape|drawStarParticle|particleType.*star",
        "test_funcs": [
            ("test_particle_shape_variety",
             "Particles should have shape variety beyond circles.",
             r"particleShapeVariety|particle.*shape|drawStarParticle|particleType"),
        ],
    },
    {
        "id_suffix": "proj_biome_color",
        "dimension": "viral",
        "threshold": 0,
        "title": "弹幕生态区染色：攻击颜色随区域变化",
        "description": "projBiomeColor: 玩家弹幕颜色使用colorThemeSync的当前生态区色, 森林=绿光弹, 熔岩=橙火弹, 深渊=紫暗弹",
        "check_pattern": r"projBiomeColor|projectile.*biome.*color|biomeProjectile|proj.*theme",
        "test_funcs": [
            ("test_proj_biome_color",
             "Projectiles should change color based on current biome.",
             r"projBiomeColor|projectile.*biome|biomeProjectile|proj.*theme.*color"),
        ],
    },
    {
        "id_suffix": "kill_counter_anim",
        "dimension": "viral",
        "threshold": 0,
        "title": "击杀数滚动动画：数字跳动而非直接更新",
        "description": "killCounterAnim: HUD的击杀数每次增加时短暂放大+颜色闪亮, 百位进位时额外闪白, 让击杀积累有持续的视觉满足",
        "check_pattern": r"killCounterAnim|kill.*counter.*anim|killDisplayPulse|animatedKillCount",
        "test_funcs": [
            ("test_kill_counter_anim",
             "Kill counter should have animated updates.",
             r"killCounterAnim|kill.*counter.*anim|killDisplayPulse|animatedKillCount"),
        ],
    },
    # ─── Phase 18: 终极视觉密度（让每帧都是壁纸）───
    {
        "id_suffix": "enemy_hit_flash",
        "dimension": "viral",
        "threshold": 0,
        "title": "敌人受击闪白增强：更明显的命中反馈",
        "description": "enemyHitFlashEnhanced: 敌人受击时整体变白0.1s(而非仅小闪烁), Boss受击额外发出冲击波小环, 让每次命中都清晰可见",
        "check_pattern": r"enemyHitFlashEnhanced|hitFlash.*enhanced|strongHitFlash|hitImpactRing",
        "test_funcs": [
            ("test_enemy_hit_flash",
             "Enemy hit feedback should be visually enhanced.",
             r"enemyHitFlashEnhanced|hitFlash.*enhance|strongHitFlash|hitImpactRing"),
        ],
    },
    {
        "id_suffix": "gem_size_variety",
        "dimension": "viral",
        "threshold": 0,
        "title": "经验宝石大小多样：小中大三种视觉层次",
        "description": "gemSizeVariety: XP宝石根据价值分三档显示(小=4px绿, 中=7px蓝+脉冲, 大=10px紫+光柱), 让高价值宝石在截图中醒目",
        "check_pattern": r"gemSizeVariety|gem.*size.*tier|gemTier|gem.*large.*glow",
        "test_funcs": [
            ("test_gem_size_variety",
             "XP gems should have size tiers based on value.",
             r"gemSizeVariety|gem.*size.*tier|gemTier|gem.*value.*size"),
        ],
    },
    {
        "id_suffix": "wave_complete_reward",
        "dimension": "retention",
        "threshold": 0,
        "title": "波次通关奖励：金币雨+经验爆发",
        "description": "waveCompleteReward: 每波完成时短暂金币雨粒子(10-20个金色小点从上方降落)+经验奖励, 让波次切换有明确的奖励感",
        "check_pattern": r"waveCompleteReward|wave.*complete.*reward|goldRain|wave.*bonus.*gold",
        "test_funcs": [
            ("test_wave_complete_reward",
             "Wave completion should reward with visual gold rain.",
             r"waveCompleteReward|wave.*complete.*reward|goldRain|wave.*bonus"),
        ],
    },
    # ─── Phase 19: 爆款关键缺失（截图分析驱动的精准打击）───
    {
        "id_suffix": "wave1_density_boost",
        "dimension": "viral",
        "threshold": 0,
        "title": "首波密度翻倍：开局就满屏战斗",
        "description": "wave1DensityBoost: Wave 1初始怪物数量从5+6→12+8, 且生成范围缩小到100-200px, 确保5秒截图里有15+敌人密集围攻的视觉冲击",
        "check_pattern": r"wave1DensityBoost|wave1.*density|firstWave.*extra|initialDensity",
        "test_funcs": [
            ("test_wave1_density_boost",
             "Wave 1 should spawn many more enemies for dense first impression.",
             r"wave1DensityBoost|wave1.*density|firstWave.*extra|initialDensity"),
        ],
    },
    {
        "id_suffix": "power_glow_cap",
        "dimension": "visual",
        "threshold": 95,
        "title": "光环上限：高等级时收敛为精致光圈",
        "description": "powerGlowCap: playerPowerGlow半径上限2.5x(不再无限增大), 高等级改为精致多层光环+旋转光点, 避免遮挡角色和周围战场",
        "check_pattern": r"powerGlowCap|glow.*cap|glow.*max.*radius|glowClamp",
        "test_funcs": [
            ("test_power_glow_cap",
             "Player power glow should be capped to avoid obscuring gameplay.",
             r"powerGlowCap|glow.*cap|glow.*clamp|glowMaxRadius"),
        ],
    },
    {
        "id_suffix": "combo_text_reposition",
        "dimension": "viral",
        "threshold": 0,
        "title": "连击文字重定位：移到角落不挡画面",
        "description": "comboTextReposition: 10x+大连击文字从屏幕正中移到右上角区域(缩小30%), 用描边保持可读, 让中央战场在截图中完整可见",
        "check_pattern": r"comboTextReposition|combo.*reposition|combo.*corner|comboDisplayPos",
        "test_funcs": [
            ("test_combo_text_reposition",
             "Large combo text should be repositioned to not block center.",
             r"comboTextReposition|combo.*reposition|combo.*corner|comboDisplayPos"),
        ],
    },
    {
        "id_suffix": "gameplay_watermark",
        "dimension": "viral",
        "threshold": 0,
        "title": "游戏品牌水印：截图自带游戏名",
        "description": "gameplayWatermark: 游戏画面右下角显示半透明'幸存者'小字水印, 确保任何截图分享都自带品牌标识",
        "check_pattern": r"gameplayWatermark|watermark.*brand|brandOverlay|game.*name.*overlay",
        "test_funcs": [
            ("test_gameplay_watermark",
             "Gameplay should have subtle game name watermark for viral sharing.",
             r"gameplayWatermark|watermark|brandOverlay|game.*name.*watermark"),
        ],
    },
    {
        "id_suffix": "chinese_skill_names",
        "dimension": "viral",
        "threshold": 0,
        "title": "中文技能名：技能显示中文名称",
        "description": "chineseSkillNames: 所有技能HUD显示从英文改为中文名(如attack_up→攻击强化, chain_lightning→连锁闪电), 强化中国文化认同感",
        "check_pattern": r"chineseSkillNames|cnSkillName|skill.*chinese|技能.*中文|攻击强化",
        "test_funcs": [
            ("test_chinese_skill_names",
             "Skills should display Chinese names for cultural identity.",
             r"chineseSkillNames|cnSkillName|攻击强化|连锁闪电|冰霜光环"),
        ],
    },
    # ─── Phase 20: 截图级别视觉爆发（每帧都值得分享）───
    {
        "id_suffix": "proj_count_visual",
        "dimension": "viral",
        "threshold": 0,
        "title": "弹幕密度可视化：更多弹幕同屏",
        "description": "projCountVisual: 在updateGame攻击逻辑中确保scatter技能弹幕扇形角度更宽(60°→120°), 每颗弹幕带明显拖尾, 让'弹幕流'在截图中形成华丽扇形",
        "check_pattern": r"projCountVisual|scatter.*wide|scatterAngle.*120|wideScatter",
        "test_funcs": [
            ("test_proj_count_visual",
             "Scatter projectiles should spread wider for visual impact.",
             r"projCountVisual|scatter.*wide|scatterAngle|wideScatter|scatter.*angle"),
        ],
    },
    {
        "id_suffix": "boss_size_dramatic",
        "dimension": "viral",
        "threshold": 0,
        "title": "Boss体型放大：更有压迫感的Boss战",
        "description": "bossSizeDramatic: Boss半径从30→45, 绘制时添加脉冲光环+旋转护盾碎片, mini-boss也加大到25, 让Boss在截图中成为视觉焦点",
        "check_pattern": r"bossSizeDramatic|boss.*size.*big|bossRadiusBoost|dramaticBoss",
        "test_funcs": [
            ("test_boss_size_dramatic",
             "Bosses should be significantly larger for dramatic visual presence.",
             r"bossSizeDramatic|boss.*size|bossRadiusBoost|dramaticBoss|boss.*radius.*4"),
        ],
    },
    {
        "id_suffix": "xp_collect_burst",
        "dimension": "viral",
        "threshold": 0,
        "title": "XP收集爆发：大量宝石同时吸入时光流效果",
        "description": "xpCollectBurst: 同时吸收5+宝石时触发短暂光流汇聚特效(所有宝石到玩家的线条同时闪亮), 让'吸宝石'成为可截图的爽快瞬间",
        "check_pattern": r"xpCollectBurst|gem.*burst|collect.*burst|massCollect|gemBurst",
        "test_funcs": [
            ("test_xp_collect_burst",
             "Collecting many gems at once should create visual burst effect.",
             r"xpCollectBurst|gem.*burst|collect.*burst|massCollect|gemBurst"),
        ],
    },
    # ─── Phase 21: 弹幕拖尾+宝箱美化+Boss视觉压迫 ───
    {
        "id_suffix": "projectile_trail",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "弹幕拖尾：每颗子弹后面拖光线",
        "description": "projectileTrail: 每颗player projectile绘制时添加3-4帧位置历史, 用渐变线条连接形成拖尾, 进化弹幕用更亮颜色拖尾, 让弹幕扇形在截图中更华丽",
        "check_pattern": r"projectileTrail|proj.*trail|bullet.*trail|projHistory",
        "test_funcs": [
            ("test_projectile_trail",
             "Projectiles should have trailing visual effect.",
             r"projectileTrail|proj.*trail|bullet.*trail|projHistory"),
        ],
    },
    {
        "id_suffix": "chest_sparkle",
        "dimension": "screenshot_shareability",
        "threshold": 0,
        "title": "宝箱闪光：宝箱不再是纯色方块",
        "description": "chestSparkle: 宝箱绘制增加旋转闪光粒子+金色边框+浮动'!'感叹号, 让宝箱在截图中像真正的宝物而不是橙色方块",
        "check_pattern": r"chestSparkle|chest.*sparkle|treasure.*glow|chestDecor",
        "test_funcs": [
            ("test_chest_sparkle",
             "Treasure chests should have sparkle decoration.",
             r"chestSparkle|chest.*sparkle|treasure.*glow|chestDecor"),
        ],
    },
    {
        "id_suffix": "boss_aura_ring",
        "dimension": "character_appeal",
        "threshold": 0,
        "title": "Boss光环：Boss脚下旋转魔法阵",
        "description": "bossAuraRing: Boss实体绘制时在脚下画旋转虚线圆环(dashed circle, 每帧旋转), 颜色随Boss血量变化(绿→黄→红), 增加Boss的仪式感",
        "check_pattern": r"bossAuraRing|boss.*aura.*ring|bossCircle|boss.*magic.*circle",
        "test_funcs": [
            ("test_boss_aura_ring",
             "Boss should have rotating aura ring for dramatic presence.",
             r"bossAuraRing|boss.*aura.*ring|bossCircle|boss.*magic"),
        ],
    },
    {
        "id_suffix": "background_star_parallax",
        "dimension": "background_depth",
        "threshold": 0,
        "title": "星空视差：两层星星不同速度移动",
        "description": "starParallax: 背景星星分两层, 近层星星大且跟随玩家移动快, 远层小且慢, 产生深度视差效果, 让背景在截图中更有层次感",
        "check_pattern": r"starParallax|parallax.*star|star.*layer|depthStar",
        "test_funcs": [
            ("test_background_star_parallax",
             "Background stars should have parallax depth layers.",
             r"starParallax|parallax.*star|star.*layer|depthStar"),
        ],
    },
    {
        "id_suffix": "kill_flash_ring",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "击杀闪环：每次击杀扩散白色光圈",
        "description": "killFlashRing: 敌人死亡时在死亡位置产生一个快速扩散的白色半透明圆环(0.2s从0扩到40px), 连杀时多个光圈叠加产生'波纹海洋'视觉",
        "check_pattern": r"killFlashRing|kill.*flash.*ring|deathRipple|killRipple",
        "test_funcs": [
            ("test_kill_flash_ring",
             "Enemy death should produce expanding flash ring.",
             r"killFlashRing|kill.*flash.*ring|deathRipple|killRipple"),
        ],
    },
    # ─── Phase 22: 弹幕拖尾+玩家角色辨识度+战斗统计 ───
    {
        "id_suffix": "projectile_trail",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "弹幕拖尾：每颗子弹后面拖光线",
        "description": "projectileTrail: 每颗player projectile实体增加_trail数组记录最近4帧位置, drawGame中用渐变线条连接形成拖尾, 进化弹幕用更亮颜色",
        "check_pattern": r"projectileTrail|_trail|proj.*trail|bullet.*trail",
        "test_funcs": [
            ("test_projectile_trail",
             "Projectiles should have trailing visual effect.",
             r"projectileTrail|_trail.*push|proj.*trail|bullet.*trail"),
        ],
    },
    {
        "id_suffix": "player_face",
        "dimension": "character_appeal",
        "threshold": 0,
        "title": "玩家角色面部：给玩家小人加上眼睛和表情",
        "description": "playerFace: 在drawPlayer中给玩家角色画上两只眼睛(面朝鼠标方向), 低HP时变成惊恐表情, 高combo时变成兴奋表情, 增加角色辨识度和情感连接",
        "check_pattern": r"playerFace|player.*face|player.*eye|drawPlayerFace",
        "test_funcs": [
            ("test_player_face",
             "Player character should have facial expression.",
             r"playerFace|player.*face|player.*eye|drawPlayerFace"),
        ],
    },
    {
        "id_suffix": "wave_progress_bar",
        "dimension": "ui_polish",
        "threshold": 0,
        "title": "波次进度条：顶部显示下波倒计时",
        "description": "waveProgressBar: 屏幕顶部绘制细条进度条显示当前波次时间进度(waveTimer/waveIv), 让玩家知道下一波什么时候来, 增加紧迫感",
        "check_pattern": r"waveProgressBar|wave.*progress|waveTimerBar|nextWaveBar",
        "test_funcs": [
            ("test_wave_progress_bar",
             "Should show wave timer progress bar at top.",
             r"waveProgressBar|wave.*progress|waveTimerBar|nextWaveBar"),
        ],
    },
    # ─── Phase 23: 边缘警告+敌人溶解+死亡屏幕增强 ───
    {
        "id_suffix": "edge_danger_arrow",
        "dimension": "tension",
        "threshold": 0,
        "title": "屏幕边缘威胁箭头：画外敌人方向指示",
        "description": "edgeDangerArrow: 当敌人在视野外(距玩家>300px)但正在靠近时, 在屏幕边缘绘制红色三角箭头指向该敌人方向, Boss用更大金色箭头, 增加空间意识和紧迫感",
        "check_pattern": r"edgeDangerArrow|edge.*arrow|offscreen.*indicator|threatArrow",
        "test_funcs": [
            ("test_edge_danger_arrow",
             "Off-screen enemies should show directional arrow indicators.",
             r"edgeDangerArrow|edge.*arrow|offscreen.*indicator|threatArrow"),
        ],
    },
    {
        "id_suffix": "enemy_dissolve",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "敌人溶解死亡：不是直接消失而是碎裂分解",
        "description": "enemyDissolve: 敌人死亡时不直接splice, 先标记dead=true并播放0.2s溶解动画(缩小+透明度降低+碎片粒子飞散), 然后才删除, 让击杀更有质感",
        "check_pattern": r"enemyDissolve|dissolve.*enemy|enemy.*dissolve|deathDissolve",
        "test_funcs": [
            ("test_enemy_dissolve",
             "Enemies should have dissolve death animation.",
             r"enemyDissolve|dissolve|deathDissolve|enemy.*dissolve"),
        ],
    },
    {
        "id_suffix": "death_screen_stats",
        "dimension": "screenshot_shareability",
        "threshold": 0,
        "title": "死亡屏增强：大字评分+战绩卡片+分享构图",
        "description": "deathScreenStats: 死亡画面增加战绩卡片样式(总击杀/最大连杀/到达波次/总DPS), 底部居中显示分享号召'截图分享你的战绩!', 让死亡屏本身就是高质量分享素材",
        "check_pattern": r"deathScreenStats|death.*stats.*card|sharePrompt|deathCard",
        "test_funcs": [
            ("test_death_screen_stats",
             "Death screen should show detailed stats card for sharing.",
             r"deathScreenStats|death.*stats|sharePrompt|deathCard"),
        ],
    },
    # ─── Phase 24: 游戏深度+新敌人+环境变化 ───
    {
        "id_suffix": "enemy_spawn_warning",
        "dimension": "tension",
        "threshold": 0,
        "title": "敌人出生预警：地面红色圈闪烁",
        "description": "spawnWarning: 敌人出生前0.5s在出生位置显示红色脉冲圆圈预警, Boss用更大的金色预警圈, 给玩家反应时间同时增加期待感",
        "check_pattern": r"spawnWarning|spawn.*warning|spawn.*circle|preSpawnIndicator",
        "test_funcs": [
            ("test_enemy_spawn_warning",
             "Enemies should show pre-spawn warning indicator.",
             r"spawnWarning|spawn.*warning|spawn.*circle|preSpawnIndicator"),
        ],
    },
    {
        "id_suffix": "pickup_vacuum",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "拾取真空：升级后吸收全屏宝石",
        "description": "pickupVacuum: 每次升级时触发全屏宝石吸收效果(所有gems瞬间飞向玩家), 配合xpCollectBurst产生壮观的光流汇聚, 让升级时刻更有仪式感",
        "check_pattern": r"pickupVacuum|vacuum.*gem|levelup.*absorb|globalPickup",
        "test_funcs": [
            ("test_pickup_vacuum",
             "Level up should vacuum all gems on screen.",
             r"pickupVacuum|vacuum|levelup.*absorb|globalPickup"),
        ],
    },
    {
        "id_suffix": "boss_entrance_anim",
        "dimension": "character_appeal",
        "threshold": 0,
        "title": "Boss入场动画：震屏+慢动作+特写",
        "description": "bossEntranceAnim: Boss波开始时触发0.5s慢动作+全屏震动+Boss位置放大光柱, 配合'BOSS WAVE'横幅, 让Boss出场成为电影般的仪式时刻",
        "check_pattern": r"bossEntranceAnim|boss.*entrance|bossIntro|boss.*slowmo",
        "test_funcs": [
            ("test_boss_entrance_anim",
             "Boss wave should have dramatic entrance animation.",
             r"bossEntranceAnim|boss.*entrance|bossIntro|boss.*slowmo"),
        ],
    },
    # ─── Phase 25: 技能描述强化+视觉爆发时刻+自动存档 ───
    {
        "id_suffix": "skill_tooltip_dps",
        "dimension": "ui_polish",
        "threshold": 0,
        "title": "技能选择DPS预估：展示伤害提升百分比",
        "description": "skillTooltipDps: 升级选技能时每个卡片底部显示预估DPS变化(如'+25%伤害'或'+15%生存'), 帮助玩家做出informed选择, 减少随机乱点",
        "check_pattern": r"skillTooltipDps|tooltip.*dps|skill.*dps.*preview|damagePreview",
        "test_funcs": [
            ("test_skill_tooltip_dps",
             "Skill cards should show estimated DPS impact.",
             r"skillTooltipDps|tooltip.*dps|skill.*dps|damagePreview"),
        ],
    },
    {
        "id_suffix": "screen_crack",
        "dimension": "tension",
        "threshold": 0,
        "title": "屏幕龟裂：受到大伤害时屏幕出现裂痕",
        "description": "screenCrack: 单次受伤>=30%maxHP时在受伤方向绘制白色裂痕线条(2-3条随机折线), 0.5s后消失, 增强受伤的视觉冲击力",
        "check_pattern": r"screenCrack|screen.*crack|damageCrack|impactCrack",
        "test_funcs": [
            ("test_screen_crack",
             "Heavy damage should create screen crack visual.",
             r"screenCrack|screen.*crack|damageCrack|impactCrack"),
        ],
    },
    {
        "id_suffix": "auto_best_record",
        "dimension": "screenshot_shareability",
        "threshold": 0,
        "title": "自动最佳记录：localStorage保存历史最佳",
        "description": "autoBestRecord: 使用localStorage保存历史最佳记录(kills/wave/time), 死亡屏对比显示'NEW BEST!'标记, 增加长期追求目标感",
        "check_pattern": r"autoBestRecord|localStorage.*best|saveBest|persistRecord",
        "test_funcs": [
            ("test_auto_best_record",
             "Should persist best record across sessions.",
             r"autoBestRecord|localStorage.*best|saveBest|persistRecord"),
        ],
    },
    # ─── Phase 26: 持久化+社交钩子+视觉冲击 ───
    {
        "id_suffix": "persist_gold_upgrades",
        "dimension": "ui_polish",
        "threshold": 0,
        "title": "金币和强化持久化：localStorage保存进度",
        "description": "persistGold: 使用localStorage保存gold和metaUpgrades, 页面刷新后仍然保留。让玩家有长期积累感和回访动力",
        "check_pattern": r"persistGold|localStorage.*gold|saveGold|gold.*persist|save.*metaUpgrades",
        "test_funcs": [
            ("test_persist_gold_upgrades",
             "Gold and upgrades should persist via localStorage.",
             r"persistGold|localStorage.*gold|saveGold|gold.*persist|save.*meta"),
        ],
    },
    {
        "id_suffix": "kill_milestone_banner",
        "dimension": "screenshot_shareability",
        "threshold": 0,
        "title": "击杀里程碑全屏横幅：大字+闪光效果",
        "description": "killMilestoneBanner: 100/500/1000击杀时全屏横幅动画(大字从左滑入→停留1s→右滑出), 配合金色粒子雨和震屏, 创造必截图的史诗时刻",
        "check_pattern": r"killMilestoneBanner|milestone.*banner|killBanner|milestone.*slide",
        "test_funcs": [
            ("test_kill_milestone_banner",
             "Kill milestones should show dramatic full-screen banner.",
             r"killMilestoneBanner|milestone.*banner|killBanner|milestone.*slide"),
        ],
    },
    {
        "id_suffix": "enemy_elite_visual",
        "dimension": "character_appeal",
        "threshold": 0,
        "title": "精英敌人视觉光环：词缀可视化",
        "description": "eliteVisualAura: 带词缀(burning/frozen/teleport等)的精英敌人在脚下画对应颜色的小光环(红=燃烧, 蓝=冰冻, 紫=传送), 让精英敌人一眼可辨",
        "check_pattern": r"eliteVisualAura|elite.*visual|elite.*aura|affix.*visual|affixGlow",
        "test_funcs": [
            ("test_enemy_elite_visual",
             "Elite enemies should have visual aura matching their affix.",
             r"eliteVisualAura|elite.*visual|elite.*aura|affix.*visual|affixGlow"),
        ],
    },
    # ─── Phase 27+: 爆款关键要素 ───
    {
        "id_suffix": "sound_effects",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "Web Audio音效：攻击/击杀/升级/大招音效",
        "description": "soundEffects: 用Web Audio API生成简短合成音效(shoot=嘟, hit=噗, kill=叮, levelUp=升调琶音, ultimate=低沉轰鸣, combo=连续叮叮), 无需加载音频文件, 纯代码合成",
        "check_pattern": r"soundEffects|playSound|sfx\.\w+|oscillator.*frequency|audioSfx",
        "test_funcs": [
            ("test_sound_effects",
             "Game should have synthesized sound effects.",
             r"soundEffects|playSound|sfx\.\w+|oscillator|audioSfx"),
        ],
    },
    {
        "id_suffix": "minimap_display",
        "dimension": "ui_polish",
        "threshold": 0,
        "title": "迷你地图：右上角显示敌人分布",
        "description": "minimapDisplay: 右上角70x70半透明小地图, 白点=玩家, 红点=敌人, 金点=宝箱, 显示摄像头视野范围框, 帮助玩家判断威胁方向",
        "check_pattern": r"minimapDisplay|minimap.*draw|drawMinimap|miniMap",
        "test_funcs": [
            ("test_minimap_display",
             "Should have a minimap showing enemy positions.",
             r"minimapDisplay|minimap|drawMinimap|miniMap"),
        ],
    },
    {
        "id_suffix": "slow_motion_kill",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "击杀慢动作：Boss死亡子弹时间",
        "description": "slowMotionKill: Boss被击杀瞬间触发0.3秒慢动作(gameSpeed=0.2), 配合放大镜头效果, 让Boss击杀时刻更史诗。普通敌人50连杀也触发短暂慢动作",
        "check_pattern": r"slowMotionKill|bulletTime|slow.*motion.*kill|timeScale.*boss.*kill",
        "test_funcs": [
            ("test_slow_motion_kill",
             "Boss kills should trigger slow motion effect.",
             r"slowMotionKill|bulletTime|slow.*motion|boss.*slow"),
        ],
    },
    {
        "id_suffix": "damage_number_style",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "伤害数字美化：暴击大字+颜色分级",
        "description": "damageNumberStyle: 伤害数字按大小分级显示—小伤害白色小字, 中等黄色, 大伤害橙色大字, 暴击红色超大字+星星特效。数字有弹性缩放动画",
        "check_pattern": r"damageNumberStyle|critDamageText|damage.*color.*grade|dmgTextStyle",
        "test_funcs": [
            ("test_damage_number_style",
             "Damage numbers should have styled colors based on amount.",
             r"damageNumberStyle|critDamageText|dmgTextStyle|dmg.*color.*grade"),
        ],
    },
    {
        "id_suffix": "screen_freeze_frame",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "打击顿帧：命中瞬间微停顿",
        "description": "screenFreezeFrame: 暴击命中时游戏暂停1帧(16ms hitStop), Boss被击中暂停2帧, 增强打击感。配合屏幕微震",
        "check_pattern": r"screenFreezeFrame|hitStop|freeze.*frame|hit.*pause",
        "test_funcs": [
            ("test_screen_freeze_frame",
             "Critical hits should cause brief hit-stop effect.",
             r"screenFreezeFrame|hitStop|freeze.*frame|hit.*pause"),
        ],
    },
    {
        "id_suffix": "fake_leaderboard",
        "dimension": "screenshot_shareability",
        "threshold": 0,
        "title": "模拟排行榜：死亡页展示排名激励",
        "description": "fakeLeaderboard: 死亡结算页显示模拟排行榜(5个AI名字+分数), 玩家排名根据实际表现插入, '再来一局超越xxx!' 提示语激励重试",
        "check_pattern": r"fakeLeaderboard|fake.*rank|simulated.*rank|leaderboardDisplay|aiRanking",
        "test_funcs": [
            ("test_fake_leaderboard",
             "Death screen should show simulated leaderboard.",
             r"fakeLeaderboard|fake.*rank|leaderboardDisplay|aiRanking|simulated.*rank"),
        ],
    },
    {
        "id_suffix": "lucky_drop_excitement",
        "dimension": "power_fantasy",
        "threshold": 0,
        "title": "稀有掉落光柱：金色/紫色掉落提示",
        "description": "luckyDropExcitement: 宝箱开出稀有道具时显示金色光柱+全屏短暂闪光+飘落金色粒子, 普通掉落绿光, 稀有紫光, 传说金光。触发截图欲望",
        "check_pattern": r"luckyDropExcitement|lootBeam.*rare|rare.*drop.*beam|legendaryDrop",
        "test_funcs": [
            ("test_lucky_drop_excitement",
             "Rare drops should have exciting visual beam effects.",
             r"luckyDropExcitement|lootBeam.*rare|rare.*drop.*beam|legendaryDrop"),
        ],
    },
    {
        "id_suffix": "countdown_timer_mode",
        "dimension": "pacing",
        "threshold": 0,
        "title": "限时冲刺模式：90秒速通挑战",
        "description": "countdownTimerMode: 新增90秒限时模式, 菜单可选。倒计时显示在屏幕顶部, 最后10秒数字变红闪烁+加速心跳音效, 时间到自动结算。追求最高击杀数",
        "check_pattern": r"countdownTimerMode|timeAttack|countdown.*mode|timedMode|speedRunMode",
        "test_funcs": [
            ("test_countdown_timer_mode",
             "Should have a timed mode with countdown.",
             r"countdownTimerMode|timeAttack|countdown.*mode|timedMode|speedRunMode"),
        ],
    },
    {
        "id_suffix": "weapon_evolve_preview",
        "dimension": "build_diversity",
        "threshold": 0,
        "title": "进化预览：技能选择时显示可能的进化路径",
        "description": "weaponEvolvePreview: 技能选择卡片底部小字提示'搭配XXX可进化为YYY', 引导玩家有目标地构建build, 增加策略深度",
        "check_pattern": r"weaponEvolvePreview|evolve.*preview|evolution.*hint|evoHint",
        "test_funcs": [
            ("test_weapon_evolve_preview",
             "Skill cards should hint at possible evolutions.",
             r"weaponEvolvePreview|evolve.*preview|evolution.*hint|evoHint"),
        ],
    },
    {
        "id_suffix": "camera_zoom_boss",
        "dimension": "juice_factor",
        "threshold": 0,
        "title": "Boss出场镜头拉远：全场景可视",
        "description": "cameraZoomBoss: Boss出现时镜头缓慢缩小到0.8x持续2秒, 让玩家看到Boss全貌和战场全局, 然后平滑恢复。增加Boss登场仪式感",
        "check_pattern": r"cameraZoomBoss|camera.*zoom|bossZoom|zoomLevel.*boss",
        "test_funcs": [
            ("test_camera_zoom_boss",
             "Boss entrance should trigger camera zoom effect.",
             r"cameraZoomBoss|camera.*zoom|bossZoom|zoomLevel"),
        ],
    },
]


def read_feedback() -> dict[str, Any]:
    """Read all feedback sources into a unified dict."""
    result: dict[str, Any] = {}
    for fname in ["ai_suggestions.json", "retention_report.json", "visual_player_report.json",
                   "visual_evaluation.json"]:
        fpath = os.path.join(FEEDBACK_DIR, fname)
        if os.path.exists(fpath):
            with open(fpath) as f:
                result[fname.replace(".json", "")] = json.load(f)
    return result


def get_max_story_id() -> int:
    """Get highest US-NNN id from prd.json."""
    with open(PRD_FILE) as f:
        prd = json.load(f)
    max_id = 0
    for s in prd["userStories"]:
        m = re.match(r"US-(\d+)", s["id"])
        if m:
            max_id = max(max_id, int(m.group(1)))
    return max_id


def read_demo() -> str:
    """Read current game source."""
    with open(DEMO_FILE) as f:
        return f.read()


def feature_exists(src: str, pattern: str) -> bool:
    """Check if feature already exists in game source."""
    return bool(re.search(pattern, src, re.IGNORECASE))


def get_existing_suffixes() -> set[str]:
    """Get id_suffixes already present in prd.json (from test filenames)."""
    with open(PRD_FILE) as f:
        prd = json.load(f)
    suffixes: set[str] = set()
    for s in prd["userStories"]:
        ac = s.get("acceptanceCriteria", "")
        if isinstance(ac, list):
            ac = " ".join(ac)
        if not isinstance(ac, str):
            continue
        m = re.search(r"test_us\d+_(\w+)\.py", ac)
        if m:
            suffixes.add(m.group(1))
    return suffixes


def should_generate(improvement: dict[str, Any], feedback: dict[str, Any], src: str,
                    existing_suffixes: set[str]) -> bool:
    """Decide if this improvement should be generated."""
    # Skip if already has a story with this suffix
    if improvement["id_suffix"] in existing_suffixes:
        return False

    # Skip if feature already exists in code
    if feature_exists(src, improvement["check_pattern"]):
        return False

    # Also check using ALL test patterns (broader match)
    for _, _, pattern in improvement["test_funcs"]:
        if feature_exists(src, pattern):
            return False

    dim = improvement["dimension"]
    threshold = improvement["threshold"]

    # For score-based dimensions, check against threshold
    if dim in ("tension", "pacing"):
        scores = feedback.get("ai_suggestions", {}).get("fun_scores", {})
        current = scores.get(dim, 100)
        return current < threshold

    # For retention, check viral score
    if dim == "retention":
        viral = feedback.get("retention_report", {}).get("viral_score", 100)
        return viral < 90 or threshold == 0

    # For visual, check visual evaluation score
    if dim == "visual":
        ve = feedback.get("visual_evaluation", {})
        visual_score = ve.get("overall_visual_score", 100)
        return visual_score < 90  # generate if visual quality below 90

    # For other dimensions, always generate if not existing
    return True


def generate_test_file(story_id: str, title: str, test_funcs: list[tuple[str, str, str]]) -> str:
    """Generate test file content."""
    lines = [
        f'"""{story_id}: {title}."""',
        "import os",
        "import re",
        "",
        "DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')",
        "",
        "",
        "def _read_demo():",
        "    with open(DEMO) as f:",
        "        return f.read()",
        "",
    ]

    for func_name, doc, pattern in test_funcs:
        lines.extend([
            "",
            f"def {func_name}():",
            f'    """{doc}"""',
            "    src = _read_demo()",
            f"    assert re.search(r'{pattern}', src, re.DOTALL | re.IGNORECASE), \\",
            f'        "{doc}"',
        ])

    return "\n".join(lines) + "\n"


def main() -> None:
    feedback = read_feedback()
    if not feedback:
        print("No feedback files found. Run AI players first.")
        sys.exit(1)

    src = read_demo()
    max_id = get_max_story_id()

    with open(PRD_FILE) as f:
        prd = json.load(f)

    # Check which existing stories are still pending
    pending = [s for s in prd["userStories"] if not s["passes"]]
    if pending:
        print(f"Still have {len(pending)} pending stories. Skipping generation.")
        for s in pending:
            print(f"  - {s['id']}: {s['title']}")
        return

    existing_suffixes = get_existing_suffixes()
    new_stories: list[dict[str, Any]] = []
    next_id = max_id + 1

    for imp in IMPROVEMENTS:
        if not should_generate(imp, feedback, src, existing_suffixes):
            continue

        story_id = f"US-{next_id:03d}"
        test_filename = f"test_us{next_id:03d}_{imp['id_suffix']}.py"
        test_path = os.path.join(TESTS_DIR, test_filename)

        # Generate test file
        test_content = generate_test_file(story_id, imp["title"], imp["test_funcs"])
        with open(test_path, "w") as f:
            f.write(test_content)

        # Create story entry
        story = {
            "id": story_id,
            "title": imp["title"],
            "description": imp["description"],
            "acceptanceCriteria": f"uv run pytest tests/{test_filename} -v",
            "passes": False,
        }
        new_stories.append(story)
        next_id += 1

        print(f"  Generated {story_id}: {imp['title']} → tests/{test_filename}")

    if not new_stories:
        print("All improvements already exist or scores are satisfactory. Nothing to generate.")
        # Log scores for reference
        scores = feedback.get("ai_suggestions", {}).get("fun_scores", {})
        print(f"  Fun scores: {json.dumps(scores)}")
        viral = feedback.get("retention_report", {}).get("viral_score", "N/A")
        print(f"  Viral score: {viral}")
        return

    # Append new stories to prd.json
    prd["userStories"].extend(new_stories)
    with open(PRD_FILE, "w") as f:
        json.dump(prd, f, indent=2, ensure_ascii=False)

    print(f"\nGenerated {len(new_stories)} new improvement stories.")
    print(f"Total stories: {len(prd['userStories'])} ({len(new_stories)} pending)")
    print(f"\nRun `./ralph.sh --tool claude 3` to implement them.")


if __name__ == "__main__":
    main()
