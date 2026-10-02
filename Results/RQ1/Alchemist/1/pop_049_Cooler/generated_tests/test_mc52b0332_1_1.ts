import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mc52b0332 - interestFor mutation", function () {
  it("should kill the mutant by verifying interestFor calculation with non-zero rate and duration", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Set up test values: rate = 5e18 (5 tokens with 18 decimals), duration = 30 days
    const rate = ethers.parseEther("5");
    const duration = 30 * 24 * 60 * 60; // 30 days in seconds

    // Expected result from original: (rate * duration) / 365 days
    const expectedInterest = (rate * BigInt(duration)) / BigInt(365 * 24 * 60 * 60);

    // Mutant result would be: (rate + duration) / 365 days
    const mutantInterest = (rate + BigInt(duration)) / BigInt(365 * 24 * 60 * 60);

    // Call interestFor and verify it matches original calculation, not mutant
    const actualInterest = await cooler.interestFor(rate, rate, duration);

    // This assertion will pass on original but fail on mutant
    expect(actualInterest).to.equal(expectedInterest);

    // Additional verification that mutant would give different result
    expect(actualInterest).to.not.equal(mutantInterest);
  });
});