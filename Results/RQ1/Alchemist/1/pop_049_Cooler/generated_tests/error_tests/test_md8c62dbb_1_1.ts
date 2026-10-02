import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler claimDefaulted mutant detection", function () {
  it("should kill mutant md8c62dbb by claiming defaulted loan exactly at expiry", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower requests a loan
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 86400; // 1 day in seconds

    // Mint and approve collateral for borrower
    await collateral.mint(borrower.address, ethers.parseEther("1000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));

    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get loan details
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;

    // Fast forward to exactly the expiry time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expiry)]);
    await ethers.provider.send("evm_mine", []);

    // Verify we are exactly at expiry
    const block = await ethers.provider.getBlock("latest");
    expect(block.timestamp).to.equal(Number(expiry));

    // This should succeed on original (block.timestamp <= expiry is false, so no revert)
    // but should fail on mutant (block.timestamp >= expiry is true, so revert with NoDefault)
    await cooler.connect(lender).claimDefaulted(0);

    // Verify collateral was transferred to lender (successful claim)
    const lenderCollateralBalance = await collateral.balanceOf(lender.address);
    expect(lenderCollateralBalance).to.equal(loan.collateral);
  });
});