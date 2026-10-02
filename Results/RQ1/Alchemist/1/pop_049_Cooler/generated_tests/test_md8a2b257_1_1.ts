import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant md8a2b257 - interestFor division replaced with subtraction", function () {
  it("should detect mutant by verifying interest calculation is correct (division vs subtraction)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a minimal test contract that exposes interestFor publicly for testing
    // Since Cooler is abstract (extends Clone), we need to deploy it via the factory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get the cooler implementation address
    const coolerImpl = await factory.coolerImplementation();

    // Create a mock ERC20 for testing (we need collateral and debt tokens)
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    const tx = await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const receipt = await tx.wait();

    // Get the cooler address from the event
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);

    // Get the cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Test interestFor with known values
    // Original: interest = (rate_ * duration_) / 365 days
    // Mutant:   interest = (rate_ * duration_) - 365 days

    const rate = ethers.parseEther("1"); // 1e18 (100% interest rate)
    const duration = 365 * 24 * 60 * 60; // 365 days in seconds
    const expectedInterest = ethers.parseEther("1"); // (1e18 * 365 days) / 365 days = 1e18

    // The mutant would compute: (1e18 * 365 days) - 365 days = huge number - 365 days
    // which would be completely different from the expected 1e18

    const actualInterest = await cooler.interestFor(ethers.parseEther("1"), rate, duration);

    // Assert that the interest is correct (division operation)
    expect(actualInterest).to.equal(expectedInterest);

    // Additional verification: test with different values to be thorough
    const rate2 = ethers.parseEther("0.5"); // 50% interest
    const expectedInterest2 = ethers.parseEther("0.5"); // (0.5e18 * 365 days) / 365 days = 0.5e18
    const actualInterest2 = await cooler.interestFor(ethers.parseEther("1"), rate2, duration);
    expect(actualInterest2).to.equal(expectedInterest2);

    // Test with zero duration (edge case)
    const expectedInterest3 = ethers.parseEther("0"); // (1e18 * 0) / 365 days = 0
    const actualInterest3 = await cooler.interestFor(ethers.parseEther("1"), rate, 0);
    expect(actualInterest3).to.equal(expectedInterest3);
  });
});