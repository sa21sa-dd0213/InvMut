import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m3b6bfd45 - claimDefaulted timestamp vs prevrandao", function () {
  it("should return correct time since default using block.timestamp, not block.prevrandao", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy factory and Cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Get Cooler implementation address from factory
    const coolerImpl = await factory.coolerImplementation();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DBT", 18);
    await debt.waitForDeployment();
    
    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Setup: mint tokens and approve
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2; // 2:1 ratio
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    // Borrower needs collateral tokens
    await collateral.mint(borrower.address, ethers.parseEther("1000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));
    
    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await debt.mint(lender.address, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Fast forward past loan expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expiry) + 100]);
    await ethers.provider.send("evm_mine");
    
    // Record current timestamp before claiming default
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore.timestamp;
    
    // Claim defaulted loan
    const tx = await cooler.connect(lender).claimDefaulted(0);
    const receipt = await tx.wait();
    
    // Get block after transaction
    const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
    const timestampAfter = blockAfter.timestamp;
    
    // Calculate expected time since default
    // The function returns (amount, collateral, block.timestamp - loan.expiry)
    // We need to check the third return value
    const result = await cooler.callStatic.claimDefaulted(0);
    const actualTimeSinceDefault = result[2];
    
    // The expected value should be block.timestamp - loan.expiry
    // block.timestamp is captured when the transaction executes
    const expectedTimeSinceDefault = BigInt(timestampAfter) - BigInt(expiry);
    
    // If the mutant uses block.prevrandao, this value will be different
    // block.prevrandao is typically a very large random number, not a timestamp
    expect(actualTimeSinceDefault).to.equal(expectedTimeSinceDefault);
    
    // Also verify it's not equal to block.prevrandao (which would be huge)
    const prevrandao = (await ethers.provider.getBlock("latest")).prevrandao;
    if (prevrandao) {
      expect(actualTimeSinceDefault).to.not.equal(BigInt(prevrandao) - BigInt(expiry));
    }
  });
});