import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant interestFor test", function () {
  it("should detect mutant that changes * to + in interestFor", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Cooler with constructor arguments
    const Cooler = await ethers.getContractFactory("Cooler");
    const instance = await Cooler.deploy();
    await instance.waitForDeployment();

    // Test interestFor with specific values that will produce different results
    // Using amount_ = 1000, rate_ = 5e18 (5 * 1e18), duration_ = 365 days
    // Original: (1000 * 5e18 * 365 days) / (365 days * 1e18) = (1000 * 5e18) / 1e18 = 5000
    // Mutant:   (1000 + 5e18 * 365 days) / 1e18 = (1000 + 5e18) / 1e18 ≈ 5 + negligible = ~5

    const amount = 1000;
    const rate = ethers.parseEther("5"); // 5 * 1e18
    const duration = 365 * 24 * 60 * 60; // 365 days in seconds

    // Call interestFor function
    const result = await instance.interestFor(amount, rate, duration);

    // The original contract would return approximately 5000
    // The mutant would return approximately 5 (since 1000 + 5e18 ≈ 5e18, divided by 1e18 = 5)
    // We expect the original behavior, so result should be close to 5000
    expect(Number(result)).to.be.closeTo(5000, 100);

    // Additional verification: test with small values where difference is more pronounced
    // amount_ = 1, rate_ = 1, duration_ = 1
    // Original: (1 * 1 * 1) / (365 days * 1e18) = 0 (truncated to 0)
    // Mutant:   (1 + 1 * 1) / 1e18 = 2 / 1e18 = 0 (also 0 due to integer division)
    const result2 = await instance.interestFor(1, 1, 1);
    expect(result2).to.equal(0);

    // Test with values where mutant would give wrong result
    // amount_ = 100, rate_ = 2e18, duration_ = 365 days
    // Original: (100 * 2e18 * 365 days) / (365 days * 1e18) = 200
    // Mutant:   (100 + 2e18 * 365 days) / 1e18 = (100 + 2e18) / 1e18 ≈ 2
    const result3 = await instance.interestFor(100, ethers.parseEther("2"), 365 * 24 * 60 * 60);
    expect(Number(result3)).to.be.closeTo(200, 10);
  });
});