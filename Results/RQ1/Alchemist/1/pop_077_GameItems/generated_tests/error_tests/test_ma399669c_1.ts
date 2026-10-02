import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit Locked event when creating a non-transferable game item", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Create a non-transferable game item and expect Locked event to be emitted
    await expect(
      instance.createGameItem(
        "Test Item",           // name_
        "ipfs://test",         // tokenURI
        true,                  // finiteSupply
        false,                 // transferable = false (non-transferable)
        100,                   // itemsRemaining
        ethers.parseEther("1"), // itemPrice
        10                     // dailyAllowance
      )
    ).to.emit(instance, "Locked").withArgs(0); // First item has tokenId 0
  });
});