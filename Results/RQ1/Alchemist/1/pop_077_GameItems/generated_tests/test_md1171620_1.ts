import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant md1171620 (uri function operator change)", function () {
  it("should return custom URI when set, not fallback to base URI", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item to get a tokenId
    await instance.createGameItem(
      "TestItem",
      "ipfs://customURI",
      false,
      true,
      100,
      ethers.parseEther("1"),
      10
    );

    const tokenId = 0;
    const customURI = "ipfs://customURI";

    // Set a custom URI for tokenId 0
    await instance.setTokenURI(tokenId, customURI);

    // Call uri function and expect the custom URI to be returned
    const result = await instance.uri(tokenId);
    expect(result).to.equal(customURI);
  });
});