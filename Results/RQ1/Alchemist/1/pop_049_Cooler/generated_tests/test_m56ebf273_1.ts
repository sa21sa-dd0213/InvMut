import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m56ebf273 - repayLoan timestamp boundary test", function () {
  it("should repay loan exactly at expiry timestamp (original passes, mutant reverts with Default)", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy the factory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Mint tokens to borrower and lender
    const mintAmount = ethers.parseEther("1000");
    await collateral.mint(borrower.address, mintAmount);
    await debt.mint(lender.address, mintAmount);
    
    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Approve tokens
    await collateral.connect(borrower).approve(coolerAddress, mintAmount);
    await debt.connect(lender).approve(coolerAddress, mintAmount);
    
    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = 2; // 2x collateral
    const duration = 86400; // 1 day in seconds
    
    const tx = await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    await tx.wait();
    
    // Get current timestamp and mine blocks to set exact expiry
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Calculate expiry
    const expiry = currentTimestamp + duration;
    
    // Clear the loan (lender funds it)
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Mine blocks to reach exactly the expiry timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [expiry]);
    await ethers.provider.send("evm_mine");
    
    // Verify we're at exactly the expiry timestamp
    const blockNow = await ethers.provider.getBlock("latest");
    expect(blockNow.timestamp).to.equal(expiry);
    
    // Attempt to repay the loan exactly at expiry
    // Original: should succeed (block.timestamp > expiry is false)
    // Mutant: should revert with Default (block.timestamp >= expiry is true)
    const repayAmount = ethers.parseEther("110"); // amount + interest
    await debt.connect(borrower).approve(coolerAddress, repayAmount);
    
    await expect(
      cooler.connect(borrower).repayLoan(0, repayAmount)
    ).to.be.revertedWith("Default");
  });
});