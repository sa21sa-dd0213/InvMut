import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - uri function", function () {
  it("should return custom token URI when set, not the base URI", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Owner creates a game item with a custom token URI
    const customURI = "ipfs://custom-uri-for-testing";
    await instance.createGameItem(
      "TestItem",    // name
      customURI,     // tokenURI
      true,          // finiteSupply
      true,          // transferable
      100,           // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10             // dailyAllowance
    );

    // Call uri(0) - should return the custom URI
    const returnedURI = await instance.uri(0);
        
    // The mutant removes the custom URI return, so it would return the base URI instead
    expect(returnedURI).to.equal(customURI);
  });
});