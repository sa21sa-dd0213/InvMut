import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - uniqueTokensOutstanding", function () {
  it("should kill mutant mbf540d8b by verifying uniqueTokensOutstanding returns correct count after creating game items", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item so that allGameItemAttributes has length > 0
    await instance.createGameItem(
      "TestItem",
      "ipfs://test",
      true,   // finiteSupply
      true,   // transferable
      100,    // itemsRemaining
      ethers.parseEther("10"), // itemPrice
      5       // dailyAllowance
    );

    // uniqueTokensOutstanding should return 1 after creating 1 item
    // The mutant returns 0 (default value) instead of allGameItemAttributes.length
    const result = await instance.uniqueTokensOutstanding();
    expect(result).to.equal(1);
  });
});