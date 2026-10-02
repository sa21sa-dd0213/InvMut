import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection tests", function () {
  it("should kill mutant m3cc43a01 by verifying tokenFromReflection returns correct non-zero value", async function () {
    // Get signers
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract with constructor arguments
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Get the contract instance address
    const contractAddress = await instance.getAddress();

    // First, we need to set up an allowed role to perform transfers
    // Since _allowedRoles is private, we need to work with what we have
    // The owner should have tokens from the mint in constructor

    // Get the total supply and rate to calculate a valid reflection amount
    const totalSupply = await instance.totalSupply();
    const totalReflections = await instance.totalFees(); // This is _tFeeTotal, not _rTotal
    // Actually, we need to call tokenFromReflection with a valid rAmount
    // The rAmount should be less than _rTotal, so let's use a known value

    // The contract mints _rTotal to msg.sender (owner)
    // We can get the owner's balance and calculate the rate
    const ownerBalance = await instance.balanceOf(owner.address);

    // Get the reflection balance by calling tokenFromReflection with a value
    // First, let's get the current rate by checking a known reflection
    const testRAmount = ethers.parseEther("1000"); // Some reflection amount
    const result = await instance.tokenFromReflection(testRAmount);

    // The mutant returns 0, the original returns a non-zero value
    // For the original, if testRAmount is 1000 * 10^18 and rate is positive, result should be > 0
    expect(result).to.be.gt(0);

    // Additional verification: the result should be less than the input
    // because rAmount / rate where rate > 1
    expect(result).to.be.lt(testRAmount);

    // Also verify that tokenFromReflection(0) returns 0 in both cases
    const zeroResult = await instance.tokenFromReflection(0);
    expect(zeroResult).to.equal(0);

    // Verify that a very large valid amount still returns non-zero
    const largeRAmount = ethers.parseEther("1000000");
    const largeResult = await instance.tokenFromReflection(largeRAmount);
    expect(largeResult).to.be.gt(0);
  });
});