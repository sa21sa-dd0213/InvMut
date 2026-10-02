import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - mutant kill test for approve (ma4f0bc66)", function () {
  it("should allow setting allowance to zero when a non-zero allowance exists", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approve a non-zero allowance
    const approveTx1 = await instance.connect(owner).approve(spender.address, ethers.parseEther("100"));
    await approveTx1.wait();

    // Verify allowance is set to 100
    expect(await instance.allowance(owner.address, spender.address)).to.equal(ethers.parseEther("100"));

    // Now approve with value = 0 (should succeed in original, fail in mutant)
    const approveTx2 = await instance.connect(owner).approve(spender.address, 0);
    await approveTx2.wait();

    // Verify allowance is now 0
    expect(await instance.allowance(owner.address, spender.address)).to.equal(0);
  });
});