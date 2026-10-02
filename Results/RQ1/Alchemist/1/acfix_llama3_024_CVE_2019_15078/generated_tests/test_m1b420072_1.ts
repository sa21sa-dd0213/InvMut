import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant m1b420072 (approve condition inverted)", function () {
  it("should allow approve with non-zero value when current allowance is zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial approval with non-zero value when allowance is zero
    const tx = await instance.connect(owner).approve(addr1.address, ethers.parseEther("100"));
    await tx.wait();

    // Verify approval was successful
    const allowance = await instance.allowance(owner.address, addr1.address);
    expect(allowance).to.equal(ethers.parseEther("100"));
  });
});