import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m395351c8 - rescindRequest always reverts", function () {
  it("should allow owner to rescind an active request (mutant kills this by always reverting)", async function () {
    const [owner, lender] = await ethers.getSigners();
    
    // Deploy ERC20 mock tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Deploy CoolerFactory
    const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactoryFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Owner approves and creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.mint(owner.address, collateralNeeded);
    await collateral.connect(owner).approve(coolerAddress, collateralNeeded);
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Verify request is active
    const request = await cooler.getRequest(0);
    expect(request.active).to.be.true;
    
    // Owner rescinds the active request - should succeed on original, revert on mutant
    await expect(cooler.connect(owner).rescindRequest(0)).to.not.be.reverted;
    
    // Verify request is now inactive
    const updatedRequest = await cooler.getRequest(0);
    expect(updatedRequest.active).to.be.false;
  });
});