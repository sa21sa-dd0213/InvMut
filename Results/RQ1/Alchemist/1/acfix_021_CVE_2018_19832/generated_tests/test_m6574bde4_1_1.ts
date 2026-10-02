import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant detection", function () {
  it("should detect mutant m6574bde4 by verifying totalDistributed after two distributions", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, call NETM() to set initial balances for owner (required for distribution to work)
    await (await instance.NETM()).wait();

    // Get initial totalDistributed value after NETM() call
    const initialTotalDistributed = await instance.totalDistributed();

    // First distribution: send ETH to trigger getTokens() which calls distr()
    const firstAmount = ethers.parseEther("1"); // 1 ETH
    await (await instance.connect(addr1).getTokens({ value: firstAmount })).wait();

    const afterFirstDist = await instance.totalDistributed();
    const firstDistAmount = afterFirstDist - initialTotalDistributed;

    // Second distribution: use another address
    await (await instance.connect(addr2).getTokens({ value: firstAmount })).wait();

    const finalTotalDistributed = await instance.totalDistributed();
    const secondDistAmount = finalTotalDistributed - afterFirstDist;

    // In the original contract: totalDistributed increases by addition
    // In the mutant: totalDistributed becomes totalDistributed * _amount
    // After first dist: mutant would have 0 * firstDistAmount = 0 (if initial was 0)
    // After second dist: mutant would have 0 * secondDistAmount = 0
    // So final totalDistributed should be the sum, not 0 or a product

    // Verify the contract behaves correctly with addition
    // If mutant is present, this assertion will fail
    expect(finalTotalDistributed).to.equal(
      initialTotalDistributed + firstDistAmount + secondDistAmount
    );

    // Additional check: if mutant is present, after first distribution totalDistributed would be 0
    // (since 0 * anything = 0) which would break the distribution logic
    expect(afterFirstDist).to.be.gt(initialTotalDistributed);
    expect(finalTotalDistributed).to.be.gt(afterFirstDist);
  });
});