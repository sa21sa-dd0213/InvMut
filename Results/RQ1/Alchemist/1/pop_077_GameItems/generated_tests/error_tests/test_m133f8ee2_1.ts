import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - mutant m133f8ee2 test", function () {
  it("should allow owner to call adjustTransferability (original behavior) and detect mutant that blocks owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // First create a game item to have a tokenId to adjust
    await instance.createGameItem(
      "TestItem",
      "ipfs://test",
      true,   // finiteSupply
      true,   // transferable
      100,    // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10      // dailyAllowance
    );

    // Owner calls adjustTransferability - should succeed in original, revert in mutant
    await expect(
      instance.adjustTransferability(0, false)
    ).to.not.be.reverted;

    // Verify the change was applied
    const item = await instance.allGameItemAttributes(0);
    expect(item.transferable).to.equal(false);
  });
});