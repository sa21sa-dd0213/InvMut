import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - adjustTransferability event emission", function () {
  it("should emit Unlocked event when adjustTransferability sets transferable to true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // First create a game item that is initially non-transferable
    await instance.createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // finiteSupply
      false,  // transferable = false initially
      100,    // itemsRemaining
      ethers.parseEther("1"),
      10      // dailyAllowance
    );

    // Now adjust transferability to true and expect Unlocked event
    await expect(instance.adjustTransferability(0, true))
      .to.emit(instance, "Unlocked")
      .withArgs(0);
  });
});