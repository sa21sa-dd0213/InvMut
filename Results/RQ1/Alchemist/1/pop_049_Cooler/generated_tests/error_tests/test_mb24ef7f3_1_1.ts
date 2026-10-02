import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mb24ef7f3 - interestFor division vs subtraction", function () {
  it("should return correct interest using division, not subtraction", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Cooler with required constructor arguments
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = await Cooler.deploy();
    await cooler.waitForDeployment();

    // Test interestFor with values where (amount_ * interest) > DECIMALS_INTEREST (1e18)
    // Using amount_ = 2e18, rate_ = 1e18 (100% interest), duration_ = 365 days (1 year)
    // Expected: (2e18 * 1e18) / 1e18 = 2e18
    // Mutant: (2e18 * 1e18) - 1e18 = 2e36 - 1e18 (wrong)
    const amount = ethers.parseEther("2");
    const rate = ethers.parseEther("1"); // 100% interest
    const duration = 365 * 24 * 60 * 60; // 365 days in seconds

    const expectedInterest = ethers.parseEther("2"); // (2 * 1 * 365 days) / 365 days = 2
    const actualInterest = await cooler.interestFor(amount, rate, duration);

    expect(actualInterest).to.equal(expectedInterest);
  });
});