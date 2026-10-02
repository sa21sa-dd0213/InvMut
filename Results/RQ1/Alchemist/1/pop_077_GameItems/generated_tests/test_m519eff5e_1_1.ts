import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant m519eff5e", function () {
  it("should revert when non-admin calls createGameItem", async function () {
    const [owner, nonAdmin] = await ethers.getSigners();
    
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();

    // Attempt to call createGameItem from a non-admin address
    await expect(
      gameItems.connect(nonAdmin).createGameItem(
        "TestItem",
        "https://test.uri",
        true,
        true,
        100,
        ethers.parseEther("1"),
        10
      )
    ).to.be.reverted;
  });
});