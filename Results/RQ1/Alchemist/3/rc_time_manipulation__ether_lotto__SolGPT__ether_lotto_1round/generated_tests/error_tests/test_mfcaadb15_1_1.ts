import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should reject a play call with incorrect ticket amount (mutant mfcaadb15)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with wrong msg.value (5 wei instead of required 10 wei)
    await expect(
      instance.connect(addr1).play({ value: 5 })
    ).to.be.reverted;
  });
});