import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mf600f35d - setDirectRepay access control", function () {
  it("should revert when non-lender tries to setDirectRepay", async function () {
    const [owner, addr1, addr2, lender] = await ethers.getSigners();
    
    // Deploy CoolerFactory and get the cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COLL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // First approve and transfer collateral to the cooler
    const collateralForLoan = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(owner).approve(await cooler.getAddress(), collateralForLoan);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request to create a loan
    const reqID = 0;
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(reqID, false, false);
    
    const loanID = 0;
    
    // Now try to call setDirectRepay from an unauthorized address (addr1)
    await expect(
      cooler.connect(addr1).setDirectRepay(loanID, true)
    ).to.be.revertedWith("OnlyApproved");
  });
});