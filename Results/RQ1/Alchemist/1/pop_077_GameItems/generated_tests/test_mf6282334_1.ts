import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - uri return statement", function () {
  it("should return the base URI when no custom token URI is set", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with constructor arguments: owner address and treasury address
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item to have a token ID to test
    await instance.connect(owner).createGameItem(
      "Test Item",           // name_
      "",                    // tokenURI (empty, so no custom URI)
      true,                  // finiteSupply
      true,                  // transferable
      100,                   // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10                     // dailyAllowance
    );

    // The base URI was set in constructor: "https://ipfs.io/ipfs/"
    // For tokenId 0, no custom URI was set, so it should return the base URI
    const result = await instance.uri(0);
    
    // The original contract returns the base URI; the mutant does not return anything
    expect(result).to.equal("https://ipfs.io/ipfs/");
  });
});