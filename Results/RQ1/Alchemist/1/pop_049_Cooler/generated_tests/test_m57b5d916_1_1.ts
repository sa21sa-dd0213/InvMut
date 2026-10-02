import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m57b5d916 - transferOwnership", function () {
  it("should allow approved address to transfer ownership, but mutant always reverts", async function () {
    const [owner, lender, newLender, borrower] = await ethers.getSigners();

    // Deploy factory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get a mock ERC20 for testing
    const ERC20Mock = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Mock.deploy("Collateral", "COL", 18);
    const debt = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address from the factory
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];

    // Get the Cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Create a loan by making a request and clearing it
    const loanAmount = ethers.parseEther("100");
    const interestRate = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs collateral tokens to make request
    const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateral.mint(await borrower.getAddress(), collateralNeeded);
    await collateral.connect(borrower).approve(coolerAddress, collateralNeeded);

    // Make request
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);

    // Lender needs debt tokens to clear request
    await debt.mint(await lender.getAddress(), loanAmount);
    await debt.connect(lender).approve(coolerAddress, loanAmount);

    // Clear the request as lender
    const tx = await cooler.connect(lender).clearRequest(0, false, false);
    await tx.wait();

    // Now approve transfer to newLender
    await cooler.connect(lender).approveTransfer(await newLender.getAddress(), 0);

    // Verify approval was set
    const approvedAddress = await cooler.approvals(0);
    expect(approvedAddress).to.equal(await newLender.getAddress());

    // This should succeed on original but revert on mutant (which has `if (true) revert OnlyApproved()`)
    await expect(
      cooler.connect(newLender).transferOwnership(0)
    ).to.not.be.reverted;

    // Verify the ownership was transferred
    const loan = await cooler.getLoan(0);
    expect(loan.lender).to.equal(await newLender.getAddress());
  });
});