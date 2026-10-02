import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m4b376363 - approveTransfer", function () {
  it("should allow the lender to approve a transfer, but the mutant reverts unconditionally", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs to have collateral tokens
    await collateral.connect(owner).mint(owner.address, ethers.parseEther("1000"));
    await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));

    // Owner requests a loan
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.connect(lender).mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now lender should be able to call approveTransfer
    // The original contract allows it, but the mutant reverts with true
    await expect(
      cooler.connect(lender).approveTransfer(borrower.address, 0)
    ).to.not.be.reverted;
  });
});