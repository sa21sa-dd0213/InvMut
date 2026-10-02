import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb891f1d2 by checking uri returns base URI for token without custom URI", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Create a game item WITHOUT setting a custom token URI
    // The tokenURI parameter is empty string
    await instance.createGameItem(
      "TestItem",           // name_
      "",                   // tokenURI (empty - no custom URI)
      true,                 // finiteSupply
      true,                 // transferable
      100,                  // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10                    // dailyAllowance
    );

    // Call uri(0) - should return base URI since no custom URI was set
    const result = await instance.uri(0);
    
    // Original contract would return the base URI "https://ipfs.io/ipfs/"
    // Mutant would return empty string (because >= 0 is always true)
    expect(result).to.equal("https://ipfs.io/ipfs/");
  });
});