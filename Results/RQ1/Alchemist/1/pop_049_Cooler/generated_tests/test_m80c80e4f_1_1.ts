import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m80c80e4f - rollLoan expiry check", function () {
  it("should revert on rollLoan after expiry in original, but succeed before expiry; mutant inverts this", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for borrower with collateral and debt tokens
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 7 * 24 * 60 * 60; // 7 days in seconds

    // Mint tokens and approve
    await collateral.mint(borrower.address, ethers.parseEther("1000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));
    await debt.mint(lender.address, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));

    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Clear request (lender provides the loan)
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now loanID 0 exists, rollLoan should work before expiry
    // We are still before expiry (just created), so rollLoan should succeed in original
    // Mutant would revert with "Default" because block.timestamp < loan.expiry
    await expect(cooler.connect(borrower).rollLoan(0)).to.not.be.reverted;

    // Now advance time past expiry to test the opposite case
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    // After expiry, original would revert with "Default", mutant would succeed
    // This second part confirms the mutant behavior
    await expect(cooler.connect(borrower).rollLoan(0)).to.be.revertedWith("Default");
  });
});