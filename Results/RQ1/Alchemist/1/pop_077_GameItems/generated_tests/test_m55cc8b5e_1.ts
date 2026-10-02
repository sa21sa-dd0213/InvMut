import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - adjustTransferability Locked event", function () {
  it("should emit Locked event when setting transferable to false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item first
    await instance.createGameItem(
      "TestItem",
      "https://test.uri",
      false,  // finiteSupply
      true,   // transferable initially
      100,    // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10      // dailyAllowance
    );

    // Now adjust transferability to false - should emit Locked event
    await expect(instance.adjustTransferability(0, false))
      .to.emit(instance, "Locked")
      .withArgs(0);
  });
});