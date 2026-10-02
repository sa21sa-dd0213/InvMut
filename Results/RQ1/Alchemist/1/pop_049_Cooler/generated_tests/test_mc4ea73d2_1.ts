import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mc4ea73d2 - repayDirect bypass", function () {
  it("should kill the mutant by showing that repayLoan with repayDirect=false does not update unclaimed", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy required contracts
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Mint tokens and approve
    const loanAmount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2; // 200% collateralization
    const duration = 7 * 24 * 60 * 60; // 7 days
    const collateralAmount = await cooler.collateralFor(loanAmount, loanToCollateral);

    await collateralToken.mint(owner.address, collateralAmount);
    await collateralToken.connect(owner).approve(coolerAddress, collateralAmount);
    await debtToken.mint(lender.address, loanAmount);
    await debtToken.connect(lender).approve(coolerAddress, loanAmount);

    // Owner creates a loan request
    const tx = await cooler.connect(owner).requestLoan(loanAmount, interest, loanToCollateral, duration);
    await tx.wait();

    // Lender clears the request with repayDirect=false
    const clearTx = await cooler.connect(lender).clearRequest(0, false, false);
    await clearTx.wait();

    // Get initial balance of lender
    const initialLenderBalance = await debtToken.balanceOf(lender.address);

    // Borrower (owner) repays the loan
    const repayAmount = loanAmount;
    await debtToken.mint(owner.address, repayAmount);
    await debtToken.connect(owner).approve(coolerAddress, repayAmount);
    const repayTx = await cooler.connect(owner).repayLoan(0, repayAmount);
    await repayTx.wait();

    // In the original contract, since repayDirect=false, the repaid amount should be stored as unclaimed
    // In the mutant (repayDirect always true), the amount goes directly to lender
    
    // Get the loan details to check unclaimed
    const loan = await cooler.getLoan(0);
    
    // If mutant is active, unclaimed will be 0 (since payment went directly to lender)
    // If original, unclaimed will be > 0
    // The test should detect the mutant by checking that lender can claim repaid
    // In mutant, claiming will transfer 0 (or revert if claiming 0)
    
    // Try to claim - this should work in original but fail or give 0 in mutant
    const claimTx = cooler.connect(lender).claimRepaid(0);
    
    // In the original, this should succeed and transfer the repaid amount
    // In the mutant, unclaimed is 0, so this should either revert or transfer 0
    // We expect the lender's balance to NOT increase by the full amount
    await expect(claimTx).to.not.changeTokenBalance(debtToken, lender, repayAmount);
  });
});