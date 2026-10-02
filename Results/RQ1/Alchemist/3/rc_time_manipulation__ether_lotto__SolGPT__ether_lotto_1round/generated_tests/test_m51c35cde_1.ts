import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m51c35cde", function () {
  it("should detect mutant that replaces random == 0 with false by verifying player wins after multiple plays", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to increase probability of a win in original
    const plays = 20;
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    
    for (let i = 0; i < plays; i++) {
      await instance.connect(player).play({ value: TICKET_AMOUNT });
    }

    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const totalSpent = TICKET_AMOUNT * BigInt(plays);
    const netChange = finalPlayerBalance - initialPlayerBalance;

    // In the original contract, the player has a chance to win (pot - fee) 
    // In the mutant, the player never wins, so netChange will be exactly -totalSpent
    // We expect that in a live run, at least one win should occur (or the pot is reset)
    // To reliably kill the mutant, we check that the player did NOT lose the full amount
    // (i.e., the player won at least once in the original)
    expect(netChange).to.be.gt(-totalSpent);
  });
});