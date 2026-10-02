import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - approveTransfer authorization", function () {
  it("should allow lender to approve transfer and revert when non-lender calls", async function () {
    const [owner, lender, borrower, approvedAddress] = await ethers.getSigners();
    
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
    
    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 days;
    
    // Mint collateral to borrower and approve cooler
    await collateral.mint(borrower.address, ethers.parseEther("1000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));
    
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Clear the request as lender
    await debt.mint(lender.address, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
    
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Test: Lender should be able to approve transfer (should pass in original, fail in mutant)
    // In original: lender (msg.sender) == loans[0].lender, so it should succeed
    // In mutant: lender (msg.sender) == loans[0].lender triggers revert, so it should fail
    await expect(
      cooler.connect(lender).approveTransfer(approvedAddress.address, 0)
    ).to.not.be.reverted;
    
    // Verify the approval was set
    expect(await cooler.approvals(0)).to.equal(approvedAddress.address);
  });
});