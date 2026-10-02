import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant mb987cd67 - approveTransfer authorization check", function () {
  it("should revert when unauthorized user (with address > lender) calls approveTransfer", async function () {
    // Get signers
    const [owner, lender, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy CoolerFactory first (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Create a mock ERC20 for collateral and debt (simplified - we need actual ERC20 tokens)
    // Since Cooler works with ERC20 tokens, we deploy simple ERC20 tokens for testing
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);
    
    // Create a loan request first
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Owner needs to approve collateral transfer
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(owner).approve(await cooler.getAddress(), collateralAmount);
    
    // Request loan
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Clear the request as lender
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now test: unauthorizedUser (with address numerically > lender) calls approveTransfer
    // Ensure unauthorizedUser's address is indeed greater than lender's address
    // We'll just attempt the call and expect revert
    await expect(
      cooler.connect(unauthorizedUser).approveTransfer(owner.address, 0)
    ).to.be.revertedWith("OnlyApproved");
  });
});