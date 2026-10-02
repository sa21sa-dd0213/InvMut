import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mbe4865c2 - distr balance multiplication", function () {
  it("should kill mutant by verifying balance is added not multiplied on second distribution", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First distribution to addr1 - should set balance to value (1000e18)
    const value = ethers.parseEther("1000");
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
    const balanceAfterFirst = await instance.balanceOf(addr1.address);
    
    // Verify first distribution worked
    expect(balanceAfterFirst).to.equal(value);

    // Second distribution to addr1 - original would add, mutant would multiply
    // We need to trigger another distribution. Since addr1 is now blacklisted,
    // we need to use a different approach. Let's call distr directly via owner
    // by deploying with a fresh account that has balance
    const [owner2, addr2] = await ethers.getSigners();
    const Factory2 = await ethers.getContractFactory("XBORNID");
    const instance2 = await Factory2.deploy();
    await instance2.waitForDeployment();

    // Give addr2 initial balance via first distribution
    await instance2.connect(addr2).getTokens({ value: ethers.parseEther("1") });
    const addr2BalanceFirst = await instance2.balanceOf(addr2.address);
    expect(addr2BalanceFirst).to.equal(value);

    // Second distribution: call getTokens again (addr2 is now blacklisted but function still runs)
    // In the mutant, balances[addr2] = balances[addr2] * value = 1000e18 * 1000e18 (overflow)
    // In original, balances[addr2] = balances[addr2] + value = 1000e18 + 1000e18 = 2000e18
    await instance2.connect(addr2).getTokens({ value: ethers.parseEther("1") });
    const addr2BalanceSecond = await instance2.balanceOf(addr2.address);

    // Original would give 2000e18, mutant gives something else (overflow or huge number)
    const expectedBalance = value + value; // 2000e18
    expect(addr2BalanceSecond).to.equal(expectedBalance);
  });
});