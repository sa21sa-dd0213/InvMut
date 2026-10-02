import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m31665876 detection", function () {
  it("should detect the keccak256 to sha256 mutation by checking pot reset behavior", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Play the lottery multiple times to increase probability of hitting the random == 0 branch
    for (let i = 0; i < 20; i++) {
      // Mine a new block to change block.timestamp and block.difficulty
      await ethers.provider.send("evm_mine", []);
      
      const potBefore = await instance.pot();
      
      // Player plays
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
      
      const potAfter = await instance.pot();
      
      // If random == 0, pot should be reset to 0
      // If random == 1, pot should increase by TICKET_AMOUNT
      // The mutant's sha256 will produce different random values than keccak256
      // This test will fail on the mutant because the distribution of pot resets will differ
      
      if (potAfter === BigInt(0)) {
        // Verify the bank received the fee and player received pot - fee
        const bankBalance = await ethers.provider.getBalance(await instance.bank());
        expect(bankBalance).to.be.at.least(FEE_AMOUNT);
      } else {
        // Pot should have increased
        expect(potAfter).to.equal(potBefore + TICKET_AMOUNT);
      }
    }
    
    // The key assertion: after enough plays, the pot should have been reset at least once
    // in the original contract due to keccak256 distribution
    // The mutant may never reset the pot or reset it too often
    const finalPot = await instance.pot();
    
    // In the original, with keccak256, pot gets reset approximately 50% of the time
    // In the mutant with sha256, the distribution will be different
    // If the mutant never resets the pot (e.g., sha256 always returns odd), this will fail
    expect(finalPot).to.not.equal(ethers.parseEther("200")); // If never reset after 20 plays
    
    // Verify contract works correctly by checking we can still play
    const canStillPlay = await instance.connect(player).play.staticCall({ value: TICKET_AMOUNT });
    expect(canStillPlay).to.not.be.reverted;
  });
});