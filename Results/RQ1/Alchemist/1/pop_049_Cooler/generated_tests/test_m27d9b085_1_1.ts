import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - setDirectRepay access control", function () {
  it("should revert when unauthorized address with numerically smaller address than lender calls setDirectRepay", async function () {
    const [owner, lender, borrower, attacker] = await ethers.getSigners();
    
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
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);
    
    // Fund borrower with collateral and approve
    const collateralAmount = ethers.parseEther("1000");
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralAmount);
    
    // Create a loan request
    const loanAmount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    await cooler.connect(borrower).requestLoan(loanAmount, interest, loanToCollateral, duration);
    
    // Lender funds debt token and clears the request
    const debtAmount = ethers.parseEther("200");
    await debt.connect(lender).approve(await cooler.getAddress(), debtAmount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now attacker tries to call setDirectRepay on loan 0
    // Attacker has a numerically smaller address than lender
    // This should revert in the original but pass in the mutant
    await expect(
      cooler.connect(attacker).setDirectRepay(0, true)
    ).to.be.revertedWith("OnlyApproved");
  });
});