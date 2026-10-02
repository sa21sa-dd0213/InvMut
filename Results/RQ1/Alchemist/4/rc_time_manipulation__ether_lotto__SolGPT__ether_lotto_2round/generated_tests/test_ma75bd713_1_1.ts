import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant test - block.prevrandao vs block.timestamp", function () {
  it("should detect mutant that uses block.prevrandao by observing identical outcomes in same block", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    
    // Mine a block to ensure clean state
    await ethers.provider.send("evm_mine", []);

    // Perform two calls in the same block
    await ethers.provider.send("evm_setAutomine", [false]);
    
    const tx1 = await instance.connect(addr1).play({ value: TICKET_AMOUNT });
    const tx2 = await instance.connect(addr2).play({ value: TICKET_AMOUNT });
    
    await ethers.provider.send("evm_mine", []);

    const receipt1 = await tx1.wait();
    const receipt2 = await tx2.wait();
    
    // In the original contract, block.timestamp changes between calls (even within same block, miners can adjust)
    // In the mutant, block.prevrandao is constant within a block, causing identical random results
    // The transfer events will show who won - if both won or both lost, the mutant is exposed
    const potAfter = await instance.pot();
    
    // If mutant is active, both players get the same outcome (both win or both lose)
    // Either pot is 0 (both won) or pot is 20 (both lost) - both impossible with fair randomness
    // In original, one wins and one loses, so pot is always 10 after two plays
    const expectedFairPot = ethers.parseEther("10");
    expect(potAfter).to.equal(expectedFairPot);
  });
});