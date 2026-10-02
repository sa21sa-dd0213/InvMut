import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - uri function", function () {
  it("should return default base URI when no custom token URI is set, but mutant returns empty string", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with required constructor arguments
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Create a game item WITHOUT setting a custom token URI (empty string)
    // The createGameItem function takes: name_, tokenURI, finiteSupply, transferable, itemsRemaining, itemPrice, dailyAllowance
    await gameItems.createGameItem(
      "Test Item",     // name_
      "",              // tokenURI - empty string, so no custom URI will be set
      true,            // finiteSupply
      true,            // transferable
      100,             // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10               // dailyAllowance
    );
    
    // Call uri(0) - this should return the default base URI from the ERC1155 constructor
    // Original: returns "https://ipfs.io/ipfs/" since bytes(customURI).length is 0
    // Mutant: returns empty string since condition is always true and _tokenURIs[0] is ""
    const result = await gameItems.uri(0);
    
    // The original contract should return the base URI, not an empty string
    expect(result).to.equal("https://ipfs.io/ipfs/");
  });
});