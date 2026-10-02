import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m96558568 - repayLoan default check", function () {
  it("should revert when repaying a loan after expiry on original, but succeed on mutant (kill the mutant)", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Deploy Cooler implementation
    const Cooler = await ethers.getContractFactory("Cooler");
    const coolerImpl = await Cooler.deploy();
    await coolerImpl.waitForDeployment();
    
    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = Cooler.attach(coolerAddress);
    
    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("10"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Mint and approve collateral for borrower
    await collateral.mint(borrower.address, ethers.parseEther("10000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("10000"));
    
    // Borrower requests loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await debt.mint(lender.address, ethers.parseEther("10000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("10000"));
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Get loan details to know expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;
    
    // Fast forward past expiry
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expiry) + 1]);
    await ethers.provider.send("evm_mine");
    
    // Now try to repay after expiry - original would revert with "Default"
    // Mutant would incorrectly allow this repayment (because it checks block.timestamp < loan.expiry instead of >)
    await debt.connect(borrower).approve(coolerAddress, amount);
    
    // This should revert on original contract (loan is defaulted)
    // But on mutant, it would succeed, thus killing the mutant
    await expect(
      cooler.connect(borrower).repayLoan(0, amount)
    ).to.be.revertedWith("Default");
  });
});