import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - adjustTransferability mutant kill test", function () {
  it("should emit Locked event when adjustTransferability is called with transferable=false, not Unlocked", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // First create a game item with transferable = true
    await instance.createGameItem(
      "TestItem",
      "https://test.uri",
      false,  // finiteSupply
      true,   // transferable
      100,    // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10      // dailyAllowance
    );

    // Now call adjustTransferability with transferable = false
    // In the original contract, this should emit Locked event
    // In the mutant, it will incorrectly emit Unlocked event
    const tx = await instance.adjustTransferability(0, false);
    const receipt = await tx.wait();

    // Check that Locked event was emitted (not Unlocked)
    const lockedEvent = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("Locked(uint256)")
    );
    const unlockedEvent = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("Unlocked(uint256)")
    );

    // Original contract: Locked should be emitted
    expect(lockedEvent).to.not.be.undefined;
    // Mutant: Unlocked would be emitted instead, so this assertion fails the mutant
    expect(unlockedEvent).to.be.undefined;
  });
});