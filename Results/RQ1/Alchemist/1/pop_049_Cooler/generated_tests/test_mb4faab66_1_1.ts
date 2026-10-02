import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mb4faab66 - claimDefaulted timestamp check", function () {
  it("should revert with NoDefault when block.prevrandao is used instead of block.timestamp", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());

    // Get cooler instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Setup: borrower creates a loan request
    const loanAmount = ethers.parseEther("100");
    const interestRate = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 200% collateral ratio
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Mint collateral to borrower and approve
    await collateralToken.mint(borrower.address, ethers.parseEther("1000"));
    await collateralToken.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));

    // Create loan request
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);

    // Mint debt to lender and approve
    await debtToken.mint(lender.address, ethers.parseEther("1000"));
    await debtToken.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));

    // Clear the request (lender funds the loan)
    await cooler.connect(lender).clearRequest(0, false, false);

    // Fast forward time past loan expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to claim default - should succeed on original but fail on mutant
    // because block.prevrandao will be 0 or some small value <= expiry
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.revertedWith("NoDefault");
  });
});