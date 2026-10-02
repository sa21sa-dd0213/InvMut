import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - md47f1219", function () {
  it("should kill mutant by sending 0 wei when balance is non-zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, add some balance to addr1
    const addTx = await instance.connect(addr1).addToBalance({ value: ethers.parseEther("1") });
    await addTx.wait();

    // Now attempt to add 0 wei - should revert in mutant but pass in original
    await expect(
      instance.connect(addr1).addToBalance({ value: 0 })
    ).to.be.reverted;
  });
});