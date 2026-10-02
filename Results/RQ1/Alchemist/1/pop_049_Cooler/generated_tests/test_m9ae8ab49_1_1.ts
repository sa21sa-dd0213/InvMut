import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m9ae8ab49 - interestFor", function () {
  it("should detect mutant that removes division by DECIMALS_INTEREST", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Cooler through the factory to get a valid instance
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Create a mock ERC20 token for testing
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Test interestFor with specific values
    // Using amount = 1000e18, rate = 1e18 (100% APR), duration = 365 days
    const amount = ethers.parseEther("1000");
    const rate = ethers.parseEther("1"); // 100% interest rate
    const duration = 365 * 24 * 60 * 60; // 365 days in seconds

    const expectedInterest = ethers.parseEther("1000"); // (1000 * 1 * 365) / (365 * 1e18) * 1e18 = 1000e18

    // Call interestFor
    const result = await cooler.interestFor(amount, rate, duration);

    // The mutant returns amount * interest = 1000e18 * 1e18 = 1e39
    // The original returns (amount * interest) / 1e18 = 1000e18
    // If mutant is present, result will be ~1e39, which is NOT equal to expectedInterest
    expect(result).to.equal(expectedInterest);
  });
});