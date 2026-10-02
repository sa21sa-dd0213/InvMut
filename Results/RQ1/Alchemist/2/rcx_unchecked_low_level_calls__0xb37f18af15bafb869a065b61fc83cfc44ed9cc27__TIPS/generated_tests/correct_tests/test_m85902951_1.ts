import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - onlyOwner modifier", function () {
  it("should kill mutant by calling onlyOwner function from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call withdrawAll from owner - should succeed in original, revert in mutant
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});