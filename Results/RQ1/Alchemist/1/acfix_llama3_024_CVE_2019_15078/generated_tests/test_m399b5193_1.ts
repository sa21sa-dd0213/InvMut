import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m399b5193", function () {
  it("should kill mutant by verifying distribution continues after first call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed = 200,000,000e18, totalSupply = 500,000,000e18
    // value = 1000e18

    // First distribution via getTokens from addr1
    await instance.connect(addr1).getTokens({ value: 0 });

    // Verify distribution happened
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    expect(balanceAddr1).to.equal(ethers.parseEther("1000"));

    // Check that distributionFinished is still false (mutant would set it to true)
    const finished = await instance.distributionFinished();
    expect(finished).to.equal(false);

    // Second distribution via getTokens from addr2 - should succeed in original
    await instance.connect(addr2).getTokens({ value: 0 });

    // Verify second distribution happened
    const balanceAddr2 = await instance.balanceOf(addr2.address);
    expect(balanceAddr2).to.equal(ethers.parseEther("1000"));

    // Verify totalDistributed increased
    const totalDistributed = await instance.totalDistributed();
    expect(totalDistributed).to.equal(ethers.parseEther("200002000"));
  });
});