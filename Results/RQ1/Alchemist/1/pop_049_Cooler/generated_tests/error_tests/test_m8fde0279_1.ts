import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m8fde0279 - isActive", function () {
  it("should return true for an active request, but mutant returns false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy CoolerFactory first since Cooler is created through it
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(collateral.target, debt.target);
    const coolerAddress = await factory.coolersFor(collateral.target, debt.target, 0);
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Mint collateral tokens to owner and approve
    const collateralAmount = ethers.parseEther("100");
    await collateral.mint(owner.address, collateralAmount);
    await collateral.connect(owner).approve(cooler.target, collateralAmount);

    // Create a loan request
    const amount = ethers.parseEther("10");
    const interest = ethers.parseEther("1");
    const loanToCollateral = 2;
    const duration = 7 * 24 * 60 * 60; // 7 days
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Get the request ID (should be 0)
    const reqID = 0;

    // Call isActive - should return true for an active request
    const isActive = await cooler.isActive(reqID);
    
    // This assertion will fail on the mutant because it returns false instead of true
    expect(isActive).to.equal(true);
  });
});