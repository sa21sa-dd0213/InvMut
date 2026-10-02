import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - rollLoan should not revert when loan is not expired", function () {
  it("should successfully roll a loan before expiry", async function () {
    const [owner, lender] = await ethers.getSigners();
    
    // Deploy the CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Get the Cooler implementation address from factory
    const coolerImplAddress = await factory.coolerImplementation();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Owner generates a cooler
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(
      await collateral.getAddress(),
      await debt.getAddress(),
      0
    );
    
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Mint tokens to owner and approve cooler
    const amount = ethers.parseEther("100");
    const loanToCollateral = 2; // 2:1 ratio
    const interest = ethers.parseEther("0.1"); // 10% interest
    const duration = 86400; // 1 day in seconds
    
    // Calculate collateral needed
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    
    // Mint and approve tokens
    await collateral.mint(owner.address, collateralNeeded);
    await collateral.connect(owner).approve(coolerAddress, collateralNeeded);
    
    // Create a loan request
    const tx = await cooler.connect(owner).requestLoan(
      amount,
      interest,
      loanToCollateral,
      duration
    );
    await tx.wait();
    
    // Clear the request as lender
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Provide new terms for roll (so loan.request.active = true)
    await cooler.connect(lender).provideNewTermsForRoll(0, interest, loanToCollateral, duration);
    
    // Now try to roll the loan - should succeed since loan is not expired
    await expect(cooler.connect(owner).rollLoan(0)).to.not.be.reverted;
  });
});