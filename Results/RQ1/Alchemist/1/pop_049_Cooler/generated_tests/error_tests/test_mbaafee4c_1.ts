import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mbaafee4c - setDirectRepay authorization", function () {
  it("should revert when non-lender calls setDirectRepay", async function () {
    const [owner, lender, attacker] = await ethers.getSigners();
    
    // Deploy the factory first (CoolerFactory creates Cooler instances)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Get the Cooler implementation address from the factory
    const coolerImpl = await factory.coolerImplementation();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COLL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Generate a cooler for owner with the tokens
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolerFor(
      await owner.getAddress(),
      await collateral.getAddress(),
      await debt.getAddress()
    );
    
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // First mint collateral to owner and approve
    await collateral.mint(await owner.getAddress(), ethers.parseEther("1000"));
    await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));
    
    // Create loan request
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request to create a loan
    await debt.mint(await lender.getAddress(), ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now attacker tries to call setDirectRepay on loan ID 0 - should revert
    await expect(
      cooler.connect(attacker).setDirectRepay(0, true)
    ).to.be.revertedWith("OnlyApproved");
    
    // Lender can still call it successfully
    await expect(
      cooler.connect(lender).setDirectRepay(0, true)
    ).to.not.be.reverted;
  });
});