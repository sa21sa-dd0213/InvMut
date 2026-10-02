import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m7f5a1584 - rescindRequest deactivated check", function () {
  it("should revert when trying to rescind an already deactivated request", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();
    
    // Deploy CoolerFactory first since Cooler is cloned from it
    const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactoryFactory.deploy();
    await factory.waitForDeployment();
    
    // Get the cooler implementation address from factory
    const coolerImplementation = await factory.coolerImplementation();
    
    // Generate a cooler for owner with the tokens
    await factory.connect(owner).generateCooler(collateralToken.target, debtToken.target);
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(collateralToken.target, debtToken.target, 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Mint collateral tokens to owner and approve
    const collateralAmount = ethers.parseEther("1000");
    await collateralToken._mint(owner.address, collateralAmount);
    await collateralToken.connect(owner).approve(cooler.target, collateralAmount);
    
    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05"); // 5% interest
    const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    const tx = await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    await tx.wait();
    
    // First rescind should succeed
    const rescindTx = await cooler.connect(owner).rescindRequest(0);
    await rescindTx.wait();
    
    // Second rescind on the same (now deactivated) request should revert
    await expect(
      cooler.connect(owner).rescindRequest(0)
    ).to.be.revertedWith("Deactivated");
  });
});