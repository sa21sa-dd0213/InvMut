import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m88f20210", function () {
  it("should detect mutant that subtracts 1 from msg.value before adding to pot", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);

    // Call play() with exactly 10 wei
    const tx = await instance.connect(player).play({ value: 10 });
    await tx.wait();

    // Get final balances
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);

    // Calculate net change for player (considering gas costs)
    const playerNetChange = playerBalanceAfter - playerBalanceBefore;

    // In the original contract, if player wins (random == 0):
    // - Player sends 10 wei
    // - Player receives pot - FEE_AMOUNT = 10 - 1 = 9 wei
    // - Net change: 9 - 10 = -1 wei (the fee paid to bank)
    // In the mutant:
    // - Player sends 10 wei
    // - Player receives pot - FEE_AMOUNT = 9 - 1 = 8 wei
    // - Net change: 8 - 10 = -2 wei

    // Since we can't control the random outcome, we need to check the pot value
    // The pot after one play in original should be 10, in mutant should be 9
    const potAfter = await instance.pot();
    
    // If pot is 9, the mutant is active (msg.value-1 was used)
    // If pot is 10, the original behavior is present
    expect(potAfter).to.equal(9);
    
    // Additionally, verify the contract balance reflects the correct amount
    const contractBalanceChange = contractBalanceAfter - contractBalanceBefore;
    // In original: contract gains 10 wei (all in pot)
    // In mutant: contract gains 9 wei in pot, 1 wei stays as msg.value - (msg.value-1) discrepancy
    expect(contractBalanceChange).to.equal(9);
  });
});