import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m60464ad2 test", function () {
  it("should revert when unauthorized address calls provideNewTermsForRoll", async function () {
    const [owner, lender, unauthorized] = await ethers.getSigners();
    
    // Deploy factory first (needed to create cooler)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Get cooler implementation address from factory
    const coolerImpl = await factory.coolerImplementation();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate cooler for owner with collateral and debt tokens
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get cooler address from factory
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    
    // Attach to cooler contract
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);
    
    // First create a loan to have something to roll
    // Request a loan
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Calculate collateral needed
    const collatAmount = await cooler.collateralFor(amount, loanToCollateral);
    
    // Transfer collateral to owner and approve cooler
    await collateral.mint(owner.address, collatAmount);
    await collateral.connect(owner).approve(coolerAddress, collatAmount);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Clear request as lender
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now unauthorized tries to provide new terms for the loan
    await expect(
      cooler.connect(unauthorized).provideNewTermsForRoll(0, interest, loanToCollateral, duration)
    ).to.be.revertedWithCustomError(cooler, "OnlyApproved");
  });
});