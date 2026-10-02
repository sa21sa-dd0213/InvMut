import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test for uri() fallback", function () {
  it("should return base URI when no custom URI is set for a token ID", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy GameItems with constructor arguments: ownerAddress, treasuryAddress
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // First create a game item to have a tokenId to query
    // Need to set admin access for owner first (already done in constructor)
    // Create a game item with name, tokenURI, finiteSupply, transferable, itemsRemaining, itemPrice, dailyAllowance
    await instance.createGameItem(
      "Test Item",
      "",           // Empty tokenURI - no custom URI
      false,        // finiteSupply = false
      true,         // transferable = true
      100,          // itemsRemaining
      ethers.parseEther("1"),  // itemPrice
      10            // dailyAllowance
    );

    // Token ID 0 should have no custom URI set (empty string)
    // The original contract would return the base URI from constructor: "https://ipfs.io/ipfs/"
    // The mutant would return empty string since it removes the fallback to super.uri()
    const result = await instance.uri(0);

    // Original behavior: returns base URI when no custom URI exists
    // Mutant behavior: returns empty string since fallback is removed
    expect(result).to.equal("https://ipfs.io/ipfs/");
  });
});