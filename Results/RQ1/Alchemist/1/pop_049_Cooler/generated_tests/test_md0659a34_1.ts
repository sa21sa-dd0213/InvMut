import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant md0659a34 - rollLoan with inactive request", function () {
  it("should revert when rolling a loan whose request is inactive", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Deploy the CoolerFactory (which deploys the Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for owner
    await factory.generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Fund owner with collateral and approve
    const collateralAmount = ethers.parseEther("1000");
    await collateral.mint(owner.address, collateralAmount);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    
    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    const tx = await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    await tx.wait();
    
    // Fund lender with debt tokens
    await debt.mint(lender.address, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
    
    // Clear the request (this sets request.active to false)
    const clearTx = await cooler.connect(lender).clearRequest(0, false, false);
    await clearTx.wait();
    
    // Now try to roll the loan - this should revert because request is inactive
    await expect(
      cooler.connect(owner).rollLoan(0)
    ).to.be.revertedWithCustomError(cooler, "NotRollable");
  });
});