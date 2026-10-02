import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mc5a3716b - rollLoan expiry check", function () {
  it("should revert when rolling an expired loan (mutant removes expiry check)", async function () {
    const [owner, lender] = await ethers.getSigners();
    
    // Deploy the factory which deploys the cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COLL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate cooler for owner with these tokens
    await factory.generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    // Owner needs to approve collateral transfer
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Get the loan to check its expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;
    
    // Fast forward past the expiry
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expiry) + 1]);
    await ethers.provider.send("evm_mine");
    
    // Now try to roll the loan - should revert in original, succeed in mutant
    await expect(
      cooler.connect(owner).rollLoan(0)
    ).to.be.revertedWith("Default");
  });
});