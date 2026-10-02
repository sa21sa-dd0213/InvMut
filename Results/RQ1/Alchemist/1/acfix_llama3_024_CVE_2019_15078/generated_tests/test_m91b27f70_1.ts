import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m91b27f70 test", function () {
  it("should detect mutant that changes addition to subtraction in totalDistributed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial totalDistributed
    const initialTotalDistributed = await instance.totalDistributed();

    // Call getTokens from a non-blacklisted address to trigger distr
    await instance.connect(addr1).getTokens({ value: 0 });

    // Get totalDistributed after distribution
    const finalTotalDistributed = await instance.totalDistributed();

    // In original, totalDistributed increases; in mutant it decreases
    // So we expect totalDistributed to be greater than initial
    expect(finalTotalDistributed).to.be.gt(initialTotalDistributed);
  });
});