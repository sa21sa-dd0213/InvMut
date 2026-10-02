import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - mutant mc7de0bcd", function () {
  it("should revert when non-admin calls setTokenURI", async function () {
    const [owner, nonAdmin] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item first so we have a tokenId to set URI for
    await instance.connect(owner).createGameItem(
      "TestItem",
      "ipfs://test",
      false,
      true,
      100,
      ethers.parseEther("1"),
      10
    );

    // Non-admin should NOT be able to set token URI
    await expect(
      instance.connect(nonAdmin).setTokenURI(0, "ipfs://malicious")
    ).to.be.reverted;
  });
});