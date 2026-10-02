import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mea5fc40e test", function () {
  it("should detect mutant that returns incorrect allowance value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 to spend 1000 tokens on behalf of owner
    const approveAmount = ethers.parseEther("1000");
    await instance.approve(addr1.address, approveAmount);

    // Check allowance - this should return the approved amount (1000 tokens)
    const allowance = await instance.allowance(owner.address, addr1.address);

    // If mutant returns 0 or wrong value, this assertion will fail
    expect(allowance).to.equal(approveAmount);
  });
});