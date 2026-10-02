import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m22c6afe0 - transferOwnership authorization", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let approvedAddress: any;
  let unauthorizedAddress: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender, approvedAddress, unauthorizedAddress] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20.deploy("Collateral", "COLL", 18);
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Get the cooler implementation address
    coolerImplementation = await coolerFactory.coolerImplementation();

    // Generate a cooler for the owner
    const tx = await coolerFactory.connect(owner).generateCooler(collateralToken.target, debtToken.target);
    const receipt = await tx.wait();
    
    // Find the cooler address from events
    const event = receipt.logs.find((log: any) => {
      try {
        return coolerFactory.interface.parseLog(log)?.name === "RequestLoan";
      } catch {
        return false;
      }
    });
    
    // Get cooler address from factory
    const coolerAddress = await coolerFactory.coolerFor(owner.address, collateralToken.target, debtToken.target);
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Create a loan first
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Owner needs to have collateral tokens
    await collateralToken.mint(owner.address, ethers.parseEther("1000"));
    await collateralToken.connect(owner).approve(cooler.target, ethers.parseEther("1000"));
    
    // Create request
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await debtToken.mint(lender.address, ethers.parseEther("1000"));
    await debtToken.connect(lender).approve(cooler.target, ethers.parseEther("1000"));
    
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Lender approves transfer to approvedAddress
    await cooler.connect(lender).approveTransfer(approvedAddress.address, 0);
  });

  it("should allow approved address to transfer ownership, but mutant will revert", async function () {
    // This test should pass on original but fail on mutant
    // The approved address should be able to call transferOwnership
    await expect(
      cooler.connect(approvedAddress).transferOwnership(0)
    ).to.not.be.reverted;
    
    // Verify the lender was updated
    const loan = await cooler.getLoan(0);
    expect(loan.lender).to.equal(approvedAddress.address);
  });

  it("should revert when unauthorized address tries to transfer ownership", async function () {
    // This test should pass on both original and mutant
    await expect(
      cooler.connect(unauthorizedAddress).transferOwnership(0)
    ).to.be.revertedWithCustomError(cooler, "OnlyApproved");
  });
});