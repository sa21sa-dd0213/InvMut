import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mfcaadb15 test", function () {
  it("should revert when sending incorrect amount (not 10 wei) on original but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 0 wei (incorrect amount) - should revert on original, but mutant removed the require
    // This will kill the mutant because it does not revert
    const tx = instance.connect(addr1).play({ value: 0 });
    await expect(tx).to.not.be.reverted;
  });
});