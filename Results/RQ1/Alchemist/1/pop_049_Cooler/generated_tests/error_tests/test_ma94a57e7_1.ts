import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - interestFor exponentiation", function () {
  it("should detect mutant that replaces multiplication with exponentiation in interestFor", async function () {
    // Deploy Cooler - note: Cooler is a minimal proxy clone, we need to deploy the factory first
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get the cooler implementation to test interestFor directly
    const coolerImpl = await factory.coolerImplementation();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler
    const [owner] = await ethers.getSigners();
    await factory.generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    
    // Attach to the cooler
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Test interestFor with realistic values that would expose exponentiation
    // Using rate = 1000 (10% with 18 decimals), duration = 30 days
    // Original: (1000 * 30) / 365 days = 30000 / 31536000 = ~0.00095
    // Mutant: (1000 ** 30) / 365 days = 10^90 / 31536000 = enormous number
    
    const rate = 1000; // 10% interest rate (1000 * 1e18 / 1e18 = 10%)
    const duration = 30 * 86400; // 30 days in seconds
    const amount = ethers.parseEther("1000"); // 1000 tokens
    
    // Calculate loanToCollateral (e.g., 150% collateralization)
    const loanToCollateral = 150; // 150% means 1.5x collateral
    
    // Make a loan request first to have a request to clear
    await collateral.approve(coolerAddress, ethers.parseEther("10000"));
    await cooler.requestLoan(amount, rate, loanToCollateral, duration);
    
    // Now clear the request and check the resulting loan amount
    // The loan amount should be amount + interest
    // With original: interest = (1000 * 30*86400) / 31536000 * 1000 / 1e18 ≈ small amount
    // With mutant: interest = (1000 ** 30*86400) / 31536000 * 1000 / 1e18 = astronomical
    
    // We need to fund the clearer with debt tokens
    await debt.approve(coolerAddress, amount);
    
    // Clear the request
    await cooler.clearRequest(0, true, false);
    
    // Get the loan
    const loan = await cooler.getLoan(0);
    
    // The loan amount should be reasonable - not astronomically large
    // With original: loan.amount ≈ amount + small interest ≈ 1000 + small
    // With mutant: loan.amount would be enormous (exponentiation produces huge numbers)
    
    // A reasonable loan amount should be less than 2x the original amount
    expect(loan.amount).to.be.lt(amount * BigInt(2));
    expect(loan.amount).to.be.gt(amount); // Should have some interest
    
    // Also test interestFor directly if accessible as public function
    // Note: interestFor is public, so we can call it directly
    const interest = await cooler.interestFor(amount, rate, duration);
    
    // The interest should be reasonable - less than the principal
    expect(interest).to.be.lt(amount);
    expect(interest).to.be.gt(0);
  });
});