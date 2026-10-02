import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m090a8313 - getRequest", function () {
  it("should return correct request data after creating a request, mutant removes return statement so it would return zeros", async function () {
    const [owner, lender] = await ethers.getSigners();
    
    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Deploy CoolerFactory (which deploys Cooler implementation)
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Owner approves collateral to cooler
    const collateralAmount = ethers.parseEther("1000");
    await collateral.connect(owner).approve(await cooler.getAddress(), collateralAmount);
    
    // Create a request with specific parameters
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Get the request data
    const request = await cooler.getRequest(0);
    
    // Assert the returned values match what was submitted
    expect(request.amount).to.equal(amount);
    expect(request.interest).to.equal(interest);
    expect(request.loanToCollateral).to.equal(loanToCollateral);
    expect(request.duration).to.equal(duration);
    expect(request.active).to.equal(true);
  });
});