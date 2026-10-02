import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - remainingSupply mutant test", function () {
  it("should return correct remaining supply after creating a finite supply game item", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item with finite supply and specific items remaining
    const itemName = "TestItem";
    const tokenURI = "ipfs://test";
    const finiteSupply = true;
    const transferable = true;
    const itemsRemaining = 100;
    const itemPrice = ethers.parseEther("1");
    const dailyAllowance = 10;

    await instance.createGameItem(
      itemName,
      tokenURI,
      finiteSupply,
      transferable,
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );

    // Token ID should be 0 (first item created)
    const tokenId = 0;

    // Call remainingSupply and verify it returns the correct value
    const remaining = await instance.remainingSupply(tokenId);
    expect(remaining).to.equal(itemsRemaining);
  });
});