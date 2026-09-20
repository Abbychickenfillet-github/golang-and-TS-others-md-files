// oop-polymorphism.ts
// 練習目標：抽象（Abstraction）、封裝（Encapsulation）、繼承（Inheritance）、多型（Polymorphism）
// 執行方式：npx tsx oop-polymorphism.ts   或貼到 TypeScript Playground

// ========== 1. 抽象類別 Hero：抽象 + 封裝 ==========
abstract class Hero {
  protected name: string;        // protected：子類別可存取，外部不行
  protected hp: number;
  protected maxHp: number;
  protected attackPower: number;

  constructor(name: string, hp: number, attackPower: number) {
    this.name = name;
    this.hp = hp;
    this.maxHp = hp;
    this.attackPower = attackPower;
  }

  public getName(): string { return this.name; }
  public isAlive(): boolean { return this.hp > 0; }
  public getStatus(): string { return `[${this.name}] HP: ${this.hp}/${this.maxHp}`; }

  public takeDamage(amount: number): void {
    const actual = Math.max(0, amount);
    this.hp = Math.max(0, this.hp - actual);   // 封裝：HP 永遠不會低於 0
    console.log(`  💥 ${this.name} 受到 ${actual} 點傷害（剩餘 HP: ${this.hp}/${this.maxHp}）`);
  }

  // 抽象方法：只立契約，強制子類別實作
  abstract attack(target: Hero): void;
}

// ========== 2. Warrior：繼承 + 覆寫 ==========
class Warrior extends Hero {
  private armor: number;

  constructor(name: string, hp: number, attackPower: number, armor: number) {
    super(name, hp, attackPower);
    this.armor = armor;
  }

  override takeDamage(amount: number): void {
    const blocked = Math.min(amount, this.armor);
    console.log(`  🛡️ ${this.name} 的護甲擋下 ${blocked} 點傷害`);
    super.takeDamage(Math.max(0, amount - this.armor));
  }

  attack(target: Hero): void {
    console.log(`🗡️ [戰士] ${this.name} 對 ${target.getName()} 砍擊（攻擊力 ${this.attackPower}）`);
    target.takeDamage(this.attackPower);
  }
}

// ========== 3. Mage：繼承 + 覆寫 ==========
class Mage extends Hero {
  private mp: number;
  private maxMp: number;

  constructor(name: string, hp: number, attackPower: number, mp: number) {
    super(name, hp, attackPower);
    this.mp = mp;
    this.maxMp = mp;
  }

  attack(target: Hero): void {
    if (this.mp >= 10) {
      this.mp -= 10;
      console.log(`🔥 [法師] ${this.name} 消耗 10 MP 發動火球術（剩餘 MP: ${this.mp}/${this.maxMp}）`);
      target.takeDamage(this.attackPower * 2);
    } else {
      this.mp += 5;
      console.log(`✨ [法師] ${this.name} MP 不足，改用杖擊並回 5 MP（當前 MP: ${this.mp}/${this.maxMp}）`);
      target.takeDamage(this.attackPower);
    }
  }

  override getStatus(): string {
    return `[${this.name}] HP: ${this.hp}/${this.maxHp} | MP: ${this.mp}/${this.maxMp}`;
  }
}

// ========== 4. 多型示範 ==========
function startBattleDemo(): void {
  console.log('============ ⚔️ 英雄 RPG 戰鬥模擬開始 ⚔️ ============\n');

  // 關鍵：陣列型別是 Hero[]，卻裝著 Warrior 與 Mage
  const party: Hero[] = [
    new Warrior('亞瑟', 120, 20, 5),
    new Mage('梅林', 80, 15, 15),
  ];
  const boss = new Warrior('首領石像鬼', 250, 10, 8);

  for (let round = 1; round <= 3; round++) {
    console.log(`---------------- 第 ${round} 回合 ----------------`);
    for (const hero of party) {
      if (hero.isAlive() && boss.isAlive()) {
        hero.attack(boss);   // ← 同一行程式碼，兩種行為，這就是多型
        console.log('');
      }
    }
    party.forEach(h => console.log(`  ${h.getStatus()}`));
    console.log(`  ${boss.getStatus()}\n`);
  }
  console.log('==================== 戰鬥結束 ====================');
}

startBattleDemo();
