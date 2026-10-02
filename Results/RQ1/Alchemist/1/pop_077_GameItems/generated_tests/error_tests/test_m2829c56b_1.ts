import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - adjustTransferability", function () {
  it("should emit Unlocked event when transferable is set to true, but mutant always emits Locked", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with constructor arguments: owner address and treasury address
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();
    
    // First create a game item with transferable = false (initially locked)
    await instance.createGameItem(
      "Test Item",
      "ipfs://test",
      true,  // finiteSupply
      false, // transferable (initially locked)
      100,   // itemsRemaining
      ethers.parseEther("1"),
      10     // dailyAllowance
    );
    
    // Now call adjustTransferability with transferable = true
    // This should emit Unlocked event in original code
    // But mutant will always emit Locked event
    const tx = await instance.adjustTransferability(0, true);
    const receipt = await tx.wait();
    
    // Check that Unlocked event was NOT emitted (mutant behavior)
    // In the original, Unlocked should be emitted
    // In the mutant, Locked is emitted instead
    const unlockedEvents = receipt.logs.filter(
      (log: any) => log.eventName === "Unlocked"
    );
    const lockedEvents = receipt.logs.filter(
      (log: any) => log.eventName === "Locked"
    );
    
    // The mutant should have 0 Unlocked events and 1 Locked event
    // The original would have 1 Unlocked event and 0 Locked events
    // This test kills the mutant by verifying the correct event is emitted
    expect(unlockedEvents.length).to.equal(1);
    expect(lockedEvents.length).to.equal(0);
    
    // Also verify the transferable state was actually changed
    const item = await instance.allGameItemAttributes(0);
    expect(item.transferable).to.equal(true);
  });
});