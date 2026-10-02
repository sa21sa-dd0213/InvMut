import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mddc250d8 - rescindRequest authorization check", function () {
  it("should revert when owner calls rescindRequest on the mutant because msg.sender <= owner() triggers OnlyApproved", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the factory which will deploy the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    const coolerAddress = await factory.generateCooler.staticCall(
      await collateral.getAddress(),
      await debt.getAddress()
    );
    await factory.connect(owner).generateCooler(
      await collateral.getAddress(),
      await debt.getAddress()
    );

    // Get the cooler instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // First create a loan request so we have something to rescind
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = 2;
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Approve and transfer collateral to cooler
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    
    // Create the loan request
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Now try to rescind the request as the owner - should revert on mutant
    await expect(
      cooler.connect(owner).rescindRequest(0)
    ).to.be.revertedWith("OnlyApproved");
  });
});