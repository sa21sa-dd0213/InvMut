import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant mafd2c245", function () {
  it("should allow owner to call onlyOwner functions (mutant reverses access control)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls withdrawAll() - should succeed in original, fail in mutant
    // where require(msg.sender != owner) reverts for owner
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});