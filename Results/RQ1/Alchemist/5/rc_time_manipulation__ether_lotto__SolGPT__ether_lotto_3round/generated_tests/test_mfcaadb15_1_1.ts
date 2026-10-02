import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - mfcaadb15", function () {
  it("should revert when sending incorrect ticket amount (mutant missing require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to play with wrong amount (5 wei instead of required 10 wei)
    const tx = instance.connect(addr1).play({ value: 5 });
    await expect(tx).to.be.reverted;
  });
});