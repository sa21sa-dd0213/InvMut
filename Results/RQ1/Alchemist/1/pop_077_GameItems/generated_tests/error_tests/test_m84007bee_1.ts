import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m84007bee test", function () {
  it("should NOT emit Locked event when creating a transferable game item", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Create a game item with transferable = true (should NOT emit Locked event)
    const name = "TestItem";
    const tokenURI = "https://test.com/token";
    const finiteSupply = false;
    const transferable = true;
    const itemsRemaining = 0;
    const itemPrice = 100;
    const dailyAllowance = 10;

    // Expect no Locked event to be emitted
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
    ).to.not.emit(instance, "Locked");
  });
});