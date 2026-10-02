import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant mbbf52306", function () {
  it("should emit Locked event when adjustTransferability sets transferable to false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item first (required before adjusting transferability)
    await instance.createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // finiteSupply
      true,   // transferable initially set to true
      100,
      ethers.parseEther("1"),
      10
    );

    // Now adjust transferability to false - should emit Locked event
    await expect(instance.adjustTransferability(0, false))
      .to.emit(instance, "Locked")
      .withArgs(0);
  });
});