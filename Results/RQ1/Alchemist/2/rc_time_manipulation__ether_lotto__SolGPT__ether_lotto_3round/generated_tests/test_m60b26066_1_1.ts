import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m60b26066", function () {
  it("should detect the mutant that replaces % with / by verifying that the player can win and receive payout", async function () {
    const [owner, player] = await ethers.getSigners();
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Player plays the lottery
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();
    
    // In the original contract, there is a 50% chance the player wins.
    // To reliably kill the mutant (where winning is virtually impossible),
    // we play multiple times and assert that at least once the player's
    // balance increases (meaning they won and received pot - fee).
    const initialBalance = await ethers.provider.getBalance(player.address);
    
    let won = false;
    for (let i = 0; i < 20; i++) {
      const currentBalance = await ethers.provider.getBalance(player.address);
      if (currentBalance > initialBalance) {
        won = true;
        break;
      }
      
      // Send another play attempt if we haven't won yet
      const playTx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await playTx.wait();
    }
    
    // Assert that the player won at least once (should pass on original, fail on mutant)
    expect(won).to.be.true;
  });
});