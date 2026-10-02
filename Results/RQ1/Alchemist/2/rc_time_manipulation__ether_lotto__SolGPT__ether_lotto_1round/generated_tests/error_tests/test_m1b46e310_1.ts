import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m1b46e310 - division instead of subtraction", function () {
  it("should kill the mutant by verifying bank receives the fee when player wins", async function () {
    const [owner, player] = await ethers.getSigners();
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const bankBefore = await ethers.provider.getBalance(owner.address);
    
    // Play the game - we need to ensure we get a win (random == 0)
    // Since we can't control randomness, we play until we win
    let won = false;
    let attempts = 0;
    while (!won && attempts < 20) {
      try {
        const tx = await player.sendTransaction({
          to: await instance.getAddress(),
          value: TICKET_AMOUNT
        });
        await tx.wait();
        
        // Check if player won by checking if pot was reset to 0
        const potAfter = await instance.pot();
        if (potAfter.toString() === "0") {
          won = true;
        }
      } catch (e) {
        // Continue if transaction fails
      }
      attempts++;
    }
    
    if (won) {
      const bankAfter = await ethers.provider.getBalance(owner.address);
      const bankDelta = bankAfter - bankBefore;
      
      // In the original, bank should have received exactly FEE_AMOUNT (1 wei)
      // In the mutant, bank receives 0 wei because pot/1 = pot (no fee deducted)
      // The test will fail on the mutant because bankDelta will be 0 instead of FEE_AMOUNT
      expect(bankDelta).to.equal(FEE_AMOUNT);
    } else {
      // If we didn't win after 20 attempts, something is wrong
      expect.fail("Could not trigger a win condition after 20 attempts");
    }
  });
});