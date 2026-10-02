import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m544f8216 - clearRequest with inactive request", function () {
  it("should revert when trying to clear an already rescinded request", async function () {
    const [owner, lender] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for collateral and debt tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateral = await MockERC20.deploy("Collateral", "COL", 18);
    const debt = await MockERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a Cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);
    
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 3600; // 30 days
    
    // Mint collateral tokens to owner and approve cooler
    const collateralAmount = (amount * loanToCollateral) / ethers.parseEther("1");
    await collateral.mint(owner.address, collateralAmount);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Rescind the request (making it inactive)
    await cooler.connect(owner).rescindRequest(0);
    
    // Now try to clear the same request - this should revert because req.active is false
    // In the mutant, this will succeed instead of reverting
    await expect(
      cooler.connect(lender).clearRequest(0, true, false)
    ).to.be.revertedWith("Deactivated");
  });
});