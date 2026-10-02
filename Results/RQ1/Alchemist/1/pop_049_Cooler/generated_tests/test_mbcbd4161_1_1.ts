import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - clearRequest active check", function () {
  it("should successfully clear an active request, killing the mutant that always reverts with Deactivated", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy the CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Generate a cooler for the owner
    const coolerAddress = await factory.generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Fund owner with collateral tokens
    const collateralAmount = ethers.parseEther("1000");
    await collateralToken._mint(owner.address, collateralAmount);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralAmount);

    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05"); // 5% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    const tx = await cooler.connect(owner).requestLoan(
      amount,
      interest,
      loanToCollateral,
      duration
    );
    await tx.wait();

    // Verify the request is active
    const request = await cooler.getRequest(0);
    expect(request.active).to.be.true;

    // Fund lender with debt tokens for clearing
    const debtAmount = ethers.parseEther("1000");
    await debtToken._mint(lender.address, debtAmount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), debtAmount);

    // Clear the request - this should succeed in the original but fail in the mutant
    // because the mutant always reverts with "Deactivated" even when req.active is true
    await expect(
      cooler.connect(lender).clearRequest(0, false, false)
    ).to.not.be.reverted;

    // Verify the loan was created
    const loan = await cooler.getLoan(0);
    expect(loan.amount).to.be.gt(0);
  });
});