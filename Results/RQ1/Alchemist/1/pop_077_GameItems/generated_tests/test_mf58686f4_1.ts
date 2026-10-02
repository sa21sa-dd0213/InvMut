import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant mf58686f4 (remove Locked event emission)", function () {
  it("should emit Locked event when creating a non-transferable game item", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Create a non-transferable game item and expect Locked event
    const name = "Non-Transferable Sword";
    const tokenURI = "ipfs://test";
    const finiteSupply = true;
    const transferable = false;
    const itemsRemaining = 100;
    const itemPrice = ethers.parseEther("1");
    const dailyAllowance = 10;

    await expect(
      instance.createGameItem(
        name,
        tokenURI,
        finiteSupply,
        transferable,
        itemsRemaining,
        itemPrice,
        dailyAllowance
      )
    )
      .to.emit(instance, "Locked")
      .withArgs(0); // First item created, tokenId = 0
  });
});