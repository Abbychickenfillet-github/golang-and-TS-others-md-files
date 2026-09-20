from abc import ABC, abstractmethod

# ==========================================
# 1. 抽象類別 Hero (展現：抽象 & 封裝)
# ==========================================
class Hero(ABC):
    def __init__(self, name: str, hp: int, attack_power: int):
        self._name = name            # 封裝：使用 protected 底線開頭
        self._hp = hp
        self._max_hp = hp
        self._attack_power = attack_power

    def get_name(self) -> str:
        return self._name

    def is_alive(self) -> bool:
        return self._hp > 0

    def get_status(self) -> str:
        return f"[{self._name}] HP: {self._hp}/{self._max_hp}"

    def take_damage(self, amount: int) -> None:
        actual_damage = max(0, amount)
        self._hp = max(0, self._hp - actual_damage)
        print(f"  💥 {self._name} 受到了 {actual_damage} 點傷害！ (剩餘 HP: {self._hp}/{self._max_hp})")

    @abstractmethod
    def attack(self, target: 'Hero') -> None:
        """抽象方法：強制所有子類別必須實作攻擊邏輯"""
        pass


# ==========================================
# 2. 繼承類別 Warrior (展現：繼承 & 多型)
# ==========================================
class Warrior(Hero):
    def __init__(self, name: str, hp: int, attack_power: int, armor: int):
        super().__init__(name, hp, attack_power) # 呼叫父類別建構子
        self._armor = armor

    def take_damage(self, amount: int) -> None:
        # 覆寫受傷邏輯：先用護甲抵扣
        blocked = min(amount, self._armor)
        reduced_damage = max(0, amount - self._armor)
        print(f"  🛡️ {self._name} 的護甲擋下了 {blocked} 點傷害！")
        super().take_damage(reduced_damage)

    def attack(self, target: Hero) -> None:
        print(f"🗡️ [戰士] {self._name} 對 {target.get_name()} 發動砍擊！(基礎攻擊力: {self._attack_power})")
        target.take_damage(self._attack_power)


# ==========================================
# 3. 繼承類別 Mage (展現：繼承 & 多型)
# ==========================================
class Mage(Hero):
    def __init__(self, name: str, hp: int, attack_power: int, mp: int):
        super().__init__(name, hp, attack_power)
        self._mp = mp
        self._max_mp = mp

    def attack(self, target: Hero) -> None:
        if self._mp >= 10:
            self._mp -= 10
            magic_damage = self._attack_power * 2
            print(f"🔥 [法師] {self._name} 消耗 10 MP 發動大火球術！(剩餘 MP: {self._mp}/{self._max_mp})")
            target.take_damage(magic_damage)
        else:
            self._mp += 5
            print(f"✨ [法師] {self._name} MP 不足，改用吟唱杖擊並恢復 5 MP！(當前 MP: {self._mp}/{self._max_mp})")
            target.take_damage(self._attack_power)

    def get_status(self) -> str:
        return f"[{self._name}] HP: {self._hp}/{self._max_hp} | MP: {self._mp}/{self._max_mp}"


# ==========================================
# 4. 戰鬥模擬測試主程式
# ==========================================
if __name__ == "__main__":
    print("============== ⚔️ 英雄 RPG 戰鬥模擬開始 ⚔️ ==============\n")

    # 建立英雄隊伍 (多型展示：列表內同時存放 Warrior 與 Mage)
    party = [
        Warrior(name="亞瑟", hp=120, attack_power=20, armor=5),
        Mage(name="梅林", hp=80, attack_power=15, mp=15)
    ]

    boss = Warrior(name="首領石像鬼", hp=250, attack_power=10, armor=8)

    print("【隊伍初始狀態】")
    for hero in party:
        print(f"  - {hero.get_status()}")
    print(f"  - Boss: {boss.get_status()}\n")

    # 進行 3 回合戰鬥
    for round_num in range(1, 4):
        print(f"------------------ 第 {round_num} 回合 ------------------")
        for hero in party:
            if hero.is_alive() and boss.is_alive():
                hero.attack(boss)
                print("")

        print("【本回合結束戰況】")
        for hero in party:
            print(f"  {hero.get_status()}")
        print(f"  {boss.get_status()}\n")

    print("==================== 戰鬥結束 ====================")