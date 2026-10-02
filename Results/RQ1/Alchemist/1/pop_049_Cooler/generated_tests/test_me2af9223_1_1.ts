import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant me2af9223 - setDirectRepay access control", function () {
  it("should allow the lender to call setDirectRepay, but mutant reverts for lender", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 mock tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys the Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(collateral.target, debt.target);
    const coolerAddress = await factory.coolerFor(borrower.address, collateral.target, debt.target);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Borrower approves and deposits collateral
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.mint(borrower.address, collateralNeeded);
    await collateral.connect(borrower).approve(coolerAddress, collateralNeeded);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    const tx = await cooler.connect(lender).clearRequest(0, false, false);
    await tx.wait();

    // Now lender tries to call setDirectRepay on loanID 0
    // Original contract: should succeed because lender == msg.sender
    // Mutant: should revert because it checks msg.sender == lender (which is true) and reverts
    await expect(
      cooler.connect(lender).setDirectRepay(0, true)
    ).to.not.be.reverted;
  });
});