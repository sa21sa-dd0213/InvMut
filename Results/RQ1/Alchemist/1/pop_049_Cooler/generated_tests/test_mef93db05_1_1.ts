import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mef93db05 - transferOwnership", function () {
  it("should kill mutant by calling transferOwnership from unauthorized address with higher numeric value than approved lender", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy CoolerFactory first (needed for Cooler deployment)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Generate a cooler using the factory
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address for this combination
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Owner creates a loan request
    const loanAmount = ethers.parseEther("1000");
    const interest = ethers.parseEther("10");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Owner needs to approve and transfer collateral first
    const collateralAmount = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    await cooler.connect(owner).requestLoan(loanAmount, interest, loanToCollateral, duration);
    
    // Lender (addr1) clears the request
    await debt.connect(addr1).approve(coolerAddress, loanAmount);
    await cooler.connect(addr1).clearRequest(0, false, false);
    
    // Owner approves addr2 to transfer ownership
    await cooler.connect(addr1).approveTransfer(await addr2.getAddress(), 0);
    
    // Get addr2's address as a BigInt for comparison
    const addr2Address = await addr2.getAddress();
    const addr2BigInt = BigInt(addr2Address);
    
    // Create a wallet with address higher than addr2
    let higherAddr;
    do {
      higherAddr = ethers.Wallet.createRandom().connect(ethers.provider);
    } while (BigInt(await higherAddr.getAddress()) <= addr2BigInt);
    
    // Fund the wallet so it can pay for gas
    await owner.sendTransaction({
      to: await higherAddr.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Attempt to call transferOwnership from the unauthorized high-value address
    await cooler.connect(higherAddr).transferOwnership(0);
    
    const loanAfter = await cooler.loans(0);
    const loanLenderAfter = loanAfter.lender;
    
    expect(loanLenderAfter).to.equal(await higherAddr.getAddress(),
      "Mutant detected: unauthorized address with higher numeric value transferred ownership");
  });
});