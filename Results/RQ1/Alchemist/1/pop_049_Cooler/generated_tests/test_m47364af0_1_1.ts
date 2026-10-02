import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - rescindRequest authorization", function () {
  it("should revert when non-owner calls rescindRequest on original contract, but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address for owner
    const coolersForCollateralDebt = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersForCollateralDebt[0];

    // Get the Cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days

    // First, owner needs to approve and transfer collateral to the cooler
    const collateralAmount = (amount * BigInt(10 ** 18)) / loanToCollateral;
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);

    // Owner requests a loan
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Now test: non-owner (addr1) tries to rescind the request - should revert on original
    await expect(
      cooler.connect(addr1).rescindRequest(0)
    ).to.be.revertedWithCustomError(cooler, "OnlyApproved");
  });
});