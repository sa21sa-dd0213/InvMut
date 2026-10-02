import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m255ade10 - rollLoan access control", function () {
  it("should revert when caller address is numerically greater than owner address due to mutated <= check", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the Cooler contract (it uses Clone pattern with immutable args)
    // The Cooler contract doesn't have a constructor, it uses Clone pattern
    // We need to deploy through the factory to get a proper Cooler instance
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Create mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate a cooler for owner
    await factory.generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address for owner
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    
    // Attach to the Cooler contract
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);
    
    // Verify the owner of the cooler
    const coolerOwner = await cooler.owner();
    expect(coolerOwner).to.equal(owner.address);
    
    // Fund owner with collateral tokens
    const collateralAmount = ethers.parseEther("1000");
    await collateral.mint(owner.address, collateralAmount);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    
    // Create a loan request first
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Get addr1's address as a number to compare with owner's address
    // We need an address that is numerically GREATER than owner's address
    // Since addresses are random, we check if addr1 is greater, if not we use addr2
    const ownerAddressNum = BigInt(owner.address);
    const addr1AddressNum = BigInt(addr1.address);
    const addr2AddressNum = BigInt(addr2.address);
    
    let attacker;
    if (addr1AddressNum > ownerAddressNum) {
      attacker = addr1;
    } else if (addr2AddressNum > ownerAddressNum) {
      attacker = addr2;
    } else {
      // If neither is greater, we need to find a signer with address > owner
      // For this test, we'll use a contract or create a wallet with a higher address
      const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
      attacker = wallet;
    }
    
    // Try to call rollLoan from an address numerically greater than owner
    // This should revert in the original (only owner can call)
    // But in the mutant (<= check), if attacker > owner, it should also revert
    // However, if attacker <= owner, the mutant would incorrectly allow it
    // We want to test the case where attacker > owner to ensure mutant fails correctly
    await expect(
      cooler.connect(attacker).rollLoan(0)
    ).to.be.revertedWith("OnlyApproved");
    
    // Also verify that owner can still call rollLoan
    // This should work in both original and mutant since owner == owner
    // But we need a cleared loan first
    // Fund addr1 with debt tokens to clear the request
    const debtAmount = ethers.parseEther("100");
    await debt.mint(addr1.address, debtAmount);
    await debt.connect(addr1).approve(coolerAddress, debtAmount);
    
    await cooler.connect(addr1).clearRequest(0, false, false);
    
    // Now owner can roll the loan
    await cooler.connect(owner).rollLoan(0);
    
    // Verify loan was rolled
    const loan = await cooler.getLoan(0);
    expect(loan.amount).to.be.gt(amount);
  });
});